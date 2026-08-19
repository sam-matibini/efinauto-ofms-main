import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign } from "lucide-react";

export default function CurrencySelector({ 
  value, 
  onChange, 
  placeholder = "Select currency...", 
  disabled = false,
  className = "" 
}) {
  const { data: currencies = [], isLoading } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => supabase.entities.Currency.filter({ active: true }, 'sort_order'),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || isLoading}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={isLoading ? "Loading..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {currencies.map((currency) => (
          <SelectItem key={currency.iso_code} value={currency.iso_code}>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span>{currency.symbol} {currency.currency_name} ({currency.iso_code})</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}