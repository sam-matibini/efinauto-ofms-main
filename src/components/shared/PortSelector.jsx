import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Anchor } from "lucide-react";

export default function PortSelector({ 
  countryIso2, 
  value, 
  onChange, 
  placeholder = "Select port...", 
  portType = null,
  disabled = false,
  className = "" 
}) {
  const { data: ports = [], isLoading } = useQuery({
    queryKey: ['ports', countryIso2, portType],
    queryFn: () => {
      const filter = { active: true };
      if (countryIso2) filter.country_iso2 = countryIso2;
      if (portType) filter.port_type = portType;
      return base44.entities.Port.filter(filter, 'sort_order');
    },
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
        {ports.map((port) => (
          <SelectItem key={port.un_locode} value={port.un_locode}>
            <div className="flex items-center gap-2">
              <Anchor className="w-4 h-4 text-gray-400" />
              <span>{port.port_name} ({port.un_locode})</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}