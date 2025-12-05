import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Calculator, DollarSign, Sparkles } from "lucide-react";
import { formatCurrency, getCurrencySymbol } from "./CurrencyConverter";

// GL Accounts for FX
export const FX_GL_ACCOUNTS = {
  REALIZED_GAIN: { code: "4600", name: "Foreign Exchange Gain", type: "Revenue" },
  REALIZED_LOSS: { code: "6300", name: "Foreign Exchange Loss", type: "Expense" },
  UNREALIZED_GAIN: { code: "4610", name: "Unrealized FX Gain", type: "Revenue" },
  UNREALIZED_LOSS: { code: "6310", name: "Unrealized FX Loss", type: "Expense" },
};

export function calculateFXGainLoss({
  originalAmount,
  originalCurrency,
  originalRate,
  currentRate,
  reportingCurrency = "CAD"
}) {
  const originalValueInReporting = originalAmount * originalRate;
  const currentValueInReporting = originalAmount * currentRate;
  const difference = currentValueInReporting - originalValueInReporting;
  
  return {
    originalValue: originalValueInReporting,
    currentValue: currentValueInReporting,
    gainLoss: difference,
    isGain: difference > 0,
    percentageChange: originalValueInReporting > 0 
      ? ((difference / originalValueInReporting) * 100).toFixed(2) 
      : 0
  };
}

export default function FXGainLossCalculator({ 
  companyId, 
  transactions = [],
  onRecordGainLoss 
}) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState(null);
  const queryClient = useQueryClient();

  const recordTransactionMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create({ ...data, company_id: companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success("FX gain/loss recorded in GL");
    },
  });

  const calculateAllFXGainLoss = async () => {
    setIsCalculating(true);
    try {
      // Get current rates via AI
      const uniqueCurrencies = [...new Set(transactions
        .filter(t => t.currency && t.currency !== 'CAD')
        .map(t => t.currency))];

      if (uniqueCurrencies.length === 0) {
        toast.info("No foreign currency transactions found");
        setIsCalculating(false);
        return;
      }

      const ratesResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `Get current exchange rates to CAD for these currencies: ${uniqueCurrencies.join(', ')}. 
                 Return the rate as how many CAD equals 1 unit of each currency.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            rates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  currency: { type: "string" },
                  rate_to_cad: { type: "number" }
                }
              }
            }
          }
        }
      });

      const currentRates = {};
      ratesResponse?.rates?.forEach(r => {
        currentRates[r.currency] = r.rate_to_cad;
      });

      // Calculate gains/losses
      let totalGain = 0;
      let totalLoss = 0;
      const details = [];

      transactions.forEach(txn => {
        if (txn.currency && txn.currency !== 'CAD' && txn.exchange_rate && currentRates[txn.currency]) {
          const calc = calculateFXGainLoss({
            originalAmount: txn.foreign_amount || txn.amount,
            originalCurrency: txn.currency,
            originalRate: txn.exchange_rate,
            currentRate: currentRates[txn.currency]
          });

          if (calc.isGain) {
            totalGain += calc.gainLoss;
          } else {
            totalLoss += Math.abs(calc.gainLoss);
          }

          details.push({
            ...txn,
            ...calc,
            currentRate: currentRates[txn.currency]
          });
        }
      });

      setResults({
        totalGain,
        totalLoss,
        netGainLoss: totalGain - totalLoss,
        details,
        currentRates
      });

    } catch (error) {
      toast.error("Failed to calculate FX gain/loss");
    } finally {
      setIsCalculating(false);
    }
  };

  const recordGainLossToGL = () => {
    if (!results) return;

    const today = new Date().toISOString().split('T')[0];

    if (results.totalGain > 0) {
      recordTransactionMutation.mutate({
        date: today,
        description: "Realized Foreign Exchange Gain",
        type: "fx_gain",
        debit_account: "1100", // A/R or relevant asset
        credit_account: FX_GL_ACCOUNTS.REALIZED_GAIN.code,
        amount: results.totalGain,
        currency: "CAD",
        status: "posted"
      });
    }

    if (results.totalLoss > 0) {
      recordTransactionMutation.mutate({
        date: today,
        description: "Realized Foreign Exchange Loss",
        type: "fx_loss",
        debit_account: FX_GL_ACCOUNTS.REALIZED_LOSS.code,
        credit_account: "1100", // A/R or relevant asset
        amount: results.totalLoss,
        currency: "CAD",
        status: "posted"
      });
    }

    if (onRecordGainLoss) {
      onRecordGainLoss(results);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Foreign Exchange Gain/Loss
          </span>
          <Button onClick={calculateAllFXGainLoss} disabled={isCalculating}>
            <Sparkles className={`w-4 h-4 mr-2 ${isCalculating ? 'animate-spin' : ''}`} />
            {isCalculating ? 'Calculating...' : 'Calculate FX'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {results ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">Total Gains</span>
                </div>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(results.totalGain, "CAD")}
                </p>
                <p className="text-xs text-green-600 mt-1">GL: {FX_GL_ACCOUNTS.REALIZED_GAIN.code}</p>
              </div>
              
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-700">Total Losses</span>
                </div>
                <p className="text-2xl font-bold text-red-700">
                  {formatCurrency(results.totalLoss, "CAD")}
                </p>
                <p className="text-xs text-red-600 mt-1">GL: {FX_GL_ACCOUNTS.REALIZED_LOSS.code}</p>
              </div>
              
              <div className={`p-4 rounded-lg border ${results.netGainLoss >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm">Net FX Impact</span>
                </div>
                <p className={`text-2xl font-bold ${results.netGainLoss >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                  {results.netGainLoss >= 0 ? '+' : ''}{formatCurrency(results.netGainLoss, "CAD")}
                </p>
              </div>
            </div>

            {results.details.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3">Transaction</th>
                      <th className="text-right p-3">Original</th>
                      <th className="text-right p-3">Current</th>
                      <th className="text-right p-3">Gain/Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.details.slice(0, 10).map((d, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-3">
                          <p className="font-medium">{d.description || 'Transaction'}</p>
                          <p className="text-xs text-gray-500">{d.currency} @ {d.exchange_rate?.toFixed(4)} → {d.currentRate?.toFixed(4)}</p>
                        </td>
                        <td className="p-3 text-right">{formatCurrency(d.originalValue, "CAD")}</td>
                        <td className="p-3 text-right">{formatCurrency(d.currentValue, "CAD")}</td>
                        <td className={`p-3 text-right font-semibold ${d.isGain ? 'text-green-600' : 'text-red-600'}`}>
                          {d.isGain ? '+' : ''}{formatCurrency(d.gainLoss, "CAD")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={recordGainLossToGL} className="bg-blue-600 hover:bg-blue-700">
                Record to General Ledger
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Calculator className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Click "Calculate FX" to analyze foreign currency transactions</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}