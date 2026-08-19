import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ship } from "lucide-react";

export default function CarrierSelector({ value, onChange, disabled = false }) {
  const { data: carriers = [] } = useQuery({
    queryKey: ['carriers'],
    queryFn: async () => {
      const allCarriers = await supabase.entities.Carrier.list();
      return allCarriers.filter(c => c.active);
    },
    initialData: [],
  });

  const selectedCarrier = carriers.find(c => c.id === value);

  return (
    <div>
      <Label className="flex items-center gap-2">
        <Ship className="w-4 h-4" />
        Carrier
      </Label>
      <Select 
        value={value || ""} 
        onValueChange={(val) => {
          const carrier = carriers.find(c => c.id === val);
          onChange(val, carrier);
        }}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select carrier" />
        </SelectTrigger>
        <SelectContent>
          {carriers.map((carrier) => (
            <SelectItem key={carrier.id} value={carrier.id}>
              {carrier.carrier_code} - {carrier.carrier_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedCarrier && (
        <p className="text-xs text-gray-500 mt-1">
          SCAC: {selectedCarrier.scac_code} | Mode: {selectedCarrier.mode.replace(/_/g, ' ')}
        </p>
      )}
    </div>
  );
}