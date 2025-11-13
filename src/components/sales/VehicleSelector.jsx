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

export default function VehicleSelector({ value, onSelect }) {
  const [open, setOpen] = useState(false);

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list('-created_date'),
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
              {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
            </span>
          ) : (
            "Select vehicle..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search vehicle..." />
          <CommandEmpty>No vehicle found.</CommandEmpty>
          <CommandGroup>
            {availableVehicles.map((vehicle) => (
              <CommandItem
                key={vehicle.id}
                value={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
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
                <div className="flex-1">
                  <div className="font-medium">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span>VIN: {vehicle.vin}</span>
                    <Badge variant="outline" className="text-xs">
                      ${vehicle.selling_price?.toLocaleString()}
                    </Badge>
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