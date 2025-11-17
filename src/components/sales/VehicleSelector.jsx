import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Car } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useCompany } from "../shared/CompanyContext";

export default function VehicleSelector({ value, onSelect }) {
  const [open, setOpen] = useState(false);
  const { selectedCompanyId } = useCompany();

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', selectedCompanyId],
    queryFn: () => base44.entities.Vehicle.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const availableVehicles = vehicles.filter(v => v.status === 'in_stock');
  const selectedVehicle = vehicles.find(v => v.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedVehicle ? (
            <span className="flex items-center gap-2">
              <Car className="w-4 h-4" />
              {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model} - ${selectedVehicle.selling_price?.toLocaleString()}
            </span>
          ) : (
            "Select vehicle..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search vehicles..." />
          <CommandEmpty>No available vehicles found.</CommandEmpty>
          <CommandGroup>
            {availableVehicles.map((vehicle) => (
              <CommandItem
                key={vehicle.id}
                value={`${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.vin}`}
                onSelect={() => {
                  onSelect(vehicle);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === vehicle.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </div>
                    <div className="text-xs text-gray-500">
                      VIN: {vehicle.vin} • {vehicle.color}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      In Stock
                    </Badge>
                    <span className="font-semibold text-green-600">
                      ${vehicle.selling_price?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}