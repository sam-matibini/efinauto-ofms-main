import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";

export default function CountrySelector({ value, onChange, placeholder = "Select country...", disabled = false, className = "" }) {
  const { data: countries = [], isLoading } = useQuery({
    queryKey: ['countries'],
    queryFn: () => supabase.entities.Country.filter({ active: true }, 'sort_order'),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || isLoading}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={isLoading ? "Loading..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {countries.map((country) => (
          <SelectItem key={country.iso2_code} value={country.iso2_code}>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400" />
              <span>{country.country_name} ({country.iso2_code})</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}