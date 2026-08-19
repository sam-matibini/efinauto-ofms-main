import React, { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { CURRENCIES, formatCurrency, getCurrencySymbol } from "./CurrencyConverter";

export default function ForeignCurrencyInput({
  label = "Amount",
  value = 0,
  currency = "CAD",
  reportingCurrency = "CAD",
  exchangeRate = 1,
  onChange,
  onCurrencyChange,
  onExchangeRateChange,
  onConvertedAmountChange,
  disabled = false,
  showAILookup = true
}) {
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [localRate, setLocalRate] = useState(exchangeRate);

  const convertedAmount = value * localRate;

  useEffect(() => {
    setLocalRate(exchangeRate);
  }, [exchangeRate]);

  useEffect(() => {
    if (onConvertedAmountChange) {
      onConvertedAmountChange(convertedAmount);
    }
  }, [convertedAmount]);

  const fetchRate = async () => {
    if (currency === reportingCurrency) {
      setLocalRate(1);
      if (onExchangeRateChange) onExchangeRateChange(1);
      return;
    }

    setIsLoadingRate(true);
    try {
      const response = await supabase.integrations.Core.InvokeLLM({
        prompt: `What is the current exchange rate from ${currency} to ${reportingCurrency}? Return only the numeric rate.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            rate: { type: "number" }
          }
        }
      });
      
      if (response?.rate) {
        setLocalRate(response.rate);
        if (onExchangeRateChange) onExchangeRateChange(response.rate);
        toast.success(`Rate: 1 ${currency} = ${response.rate.toFixed(4)} ${reportingCurrency}`);
      }
    } catch (error) {
      toast.error("Failed to fetch rate");
    } finally {
      setIsLoadingRate(false);
    }
  };

  const isForeignCurrency = currency !== reportingCurrency;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-gray-600">{label}</Label>
          <div className="flex">
            <Select 
              value={currency} 
              onValueChange={(val) => {
                if (onCurrencyChange) onCurrencyChange(val);
                if (val === reportingCurrency) {
                  setLocalRate(1);
                  if (onExchangeRateChange) onExchangeRateChange(1);
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger className="w-24 rounded-r-none border-r-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={value}
              onChange={(e) => onChange && onChange(parseFloat(e.target.value) || 0)}
              className="rounded-l-none"
              disabled={disabled}
            />
          </div>
        </div>
        
        {isForeignCurrency && (
          <div>
            <Label className="text-xs text-gray-600">Exchange Rate</Label>
            <div className="flex gap-1">
              <Input
                type="number"
                step="0.0001"
                value={localRate}
                onChange={(e) => {
                  const newRate = parseFloat(e.target.value) || 1;
                  setLocalRate(newRate);
                  if (onExchangeRateChange) onExchangeRateChange(newRate);
                }}
                className="flex-1"
                disabled={disabled}
              />
              {showAILookup && (
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={fetchRate}
                  disabled={isLoadingRate || disabled}
                  title="AI Rate Lookup"
                >
                  <Sparkles className={`w-4 h-4 ${isLoadingRate ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {isForeignCurrency && (
        <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200">
          <span className="text-sm text-blue-700">
            {formatCurrency(value, currency)} × {localRate.toFixed(4)}
          </span>
          <span className="font-semibold text-blue-900">
            = {formatCurrency(convertedAmount, reportingCurrency)} {reportingCurrency}
          </span>
        </div>
      )}
    </div>
  );
}