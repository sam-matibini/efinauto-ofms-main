import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from "lucide-react";

export default function SubdivisionSelector({ 
  countryIso2, 
  value, 
  onChange, 
  placeholder = "Select province/state...", 
  disabled = false,
  className = "" 
}) {
  const { data: subdivisions = [], isLoading } = useQuery({
    queryKey: ['subdivisions', countryIso2],
    queryFn: () => supabase.entities.Subdivision.filter({ 
      country_iso2: countryIso2, 
      active: true 
    }, 'sort_order'),
    enabled: !!countryIso2,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  return (
    <Select 
      value={value} 
      onValueChange={onChange} 
      disabled={disabled || isLoading || !countryIso2}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={
          !countryIso2 ? "Select country first" :
          isLoading ? "Loading..." : 
          placeholder
        } />
      </SelectTrigger>
      <SelectContent>
        {subdivisions.map((subdivision) => (
          <SelectItem key={subdivision.iso_code} value={subdivision.iso_code}>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span>{subdivision.subdivision_name} ({subdivision.iso_code})</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}