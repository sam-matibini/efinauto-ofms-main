import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw, Sparkles, ArrowRightLeft, TrendingUp, TrendingDown, Save } from "lucide-react";

const CURRENCIES = [
  { code: "CAD", name: "Canadian Dollar", symbol: "$" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "MXN", name: "Mexican Peso", symbol: "$" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "AUD", name: "Australian Dollar", symbol: "$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
];

export function getCurrencySymbol(code) {
  return CURRENCIES.find(c => c.code === code)?.symbol || "$";
}

export function formatCurrency(amount, currencyCode = "CAD") {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${(amount || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CurrencyConverter({ 
  companyId, 
  fromCurrency = "USD", 
  toCurrency = "CAD",
  amount = 0,
  onConvert,
  onRateChange,
  showSaveOption = true,
  compact = false
}) {
  const [sourceCurrency, setSourceCurrency] = useState(fromCurrency);
  const [targetCurrency, setTargetCurrency] = useState(toCurrency);
  const [sourceAmount, setSourceAmount] = useState(amount);
  const [rate, setRate] = useState(1);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const queryClient = useQueryClient();

  const { data: savedRates = [] } = useQuery({
    queryKey: ['exchangeRates', companyId],
    queryFn: () => base44.entities.ExchangeRate.filter({ company_id: companyId }),
    enabled: !!companyId,
  });

  const saveRateMutation = useMutation({
    mutationFn: (data) => base44.entities.ExchangeRate.create({ ...data, company_id: companyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchangeRates'] });
      toast.success("Exchange rate saved");
    },
  });

  // Find saved rate for currency pair
  useEffect(() => {
    const savedRate = savedRates.find(
      r => r.from_currency === sourceCurrency && r.to_currency === targetCurrency && r.is_default
    );
    if (savedRate) {
      setRate(savedRate.rate);
    }
  }, [sourceCurrency, targetCurrency, savedRates]);

  const convertedAmount = sourceAmount * rate;

  const fetchAIRate = async () => {
    setIsLoadingRate(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `What is the current exchange rate from ${sourceCurrency} to ${targetCurrency} as of today? 
                 Provide the rate as a single number representing how many ${targetCurrency} equals 1 ${sourceCurrency}.
                 Also provide the inverse rate.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            rate: { type: "number", description: "Exchange rate (1 source = X target)" },
            inverse_rate: { type: "number" },
            source: { type: "string" },
            date: { type: "string" }
          }
        }
      });
      
      if (response?.rate) {
        setRate(response.rate);
        if (onRateChange) onRateChange(response.rate);
        toast.success(`Rate updated: 1 ${sourceCurrency} = ${response.rate.toFixed(4)} ${targetCurrency}`);
      }
    } catch (error) {
      toast.error("Failed to fetch exchange rate");
    } finally {
      setIsLoadingRate(false);
    }
  };

  const handleSwapCurrencies = () => {
    setSourceCurrency(targetCurrency);
    setTargetCurrency(sourceCurrency);
    setRate(1 / rate);
  };

  const handleSaveRate = () => {
    saveRateMutation.mutate({
      from_currency: sourceCurrency,
      to_currency: targetCurrency,
      rate: rate,
      rate_date: new Date().toISOString().split('T')[0],
      source: "ai_lookup",
      is_default: true
    });
  };

  useEffect(() => {
    if (onConvert) {
      onConvert({
        sourceCurrency,
        targetCurrency,
        sourceAmount,
        convertedAmount,
        rate
      });
    }
  }, [sourceCurrency, targetCurrency, sourceAmount, rate]);

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
        <Select value={sourceCurrency} onValueChange={setSourceCurrency}>
          <SelectTrigger className="w-20 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map(c => (
              <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          value={sourceAmount}
          onChange={(e) => setSourceAmount(parseFloat(e.target.value) || 0)}
          className="w-24 h-8 text-xs"
        />
        <ArrowRightLeft className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-semibold text-blue-700">
          {formatCurrency(convertedAmount, targetCurrency)}
        </span>
        <Button size="sm" variant="ghost" onClick={fetchAIRate} disabled={isLoadingRate} className="h-8 w-8 p-0">
          <Sparkles className={`w-4 h-4 ${isLoadingRate ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-blue-900 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            Currency Converter
          </h4>
          <Button 
            size="sm" 
            onClick={fetchAIRate} 
            disabled={isLoadingRate}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Sparkles className={`w-4 h-4 mr-2 ${isLoadingRate ? 'animate-spin' : ''}`} />
            {isLoadingRate ? 'Fetching...' : 'AI Rate Lookup'}
          </Button>
        </div>

        <div className="grid grid-cols-5 gap-3 items-end">
          <div className="col-span-2">
            <Label className="text-xs text-gray-600">From Currency</Label>
            <Select value={sourceCurrency} onValueChange={setSourceCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.symbol} {c.code} - {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-center">
            <Button variant="ghost" size="icon" onClick={handleSwapCurrencies}>
              <ArrowRightLeft className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="col-span-2">
            <Label className="text-xs text-gray-600">To Currency</Label>
            <Select value={targetCurrency} onValueChange={setTargetCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.symbol} {c.code} - {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-gray-600">Amount ({sourceCurrency})</Label>
            <Input
              type="number"
              value={sourceAmount}
              onChange={(e) => setSourceAmount(parseFloat(e.target.value) || 0)}
              className="text-lg font-semibold"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-600">Exchange Rate</Label>
            <Input
              type="number"
              step="0.0001"
              value={rate}
              onChange={(e) => {
                const newRate = parseFloat(e.target.value) || 1;
                setRate(newRate);
                if (onRateChange) onRateChange(newRate);
              }}
              className="text-lg"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-600">Converted ({targetCurrency})</Label>
            <div className="h-10 flex items-center px-3 bg-green-50 rounded-md border border-green-200">
              <span className="text-lg font-bold text-green-700">
                {formatCurrency(convertedAmount, targetCurrency)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-sm text-gray-600">
            1 {sourceCurrency} = <span className="font-semibold">{rate.toFixed(4)}</span> {targetCurrency}
          </div>
          {showSaveOption && (
            <Button variant="outline" size="sm" onClick={handleSaveRate}>
              <Save className="w-4 h-4 mr-2" />
              Save Rate
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export { CURRENCIES };