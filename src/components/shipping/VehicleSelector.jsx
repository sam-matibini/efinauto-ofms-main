import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Car, Search, X, ChevronDown, Check } from "lucide-react";

export default function VehicleSelector({ 
  vehicles = [], 
  selectedVehicles = [], 
  onSelectionChange, 
  multiple = true,
  placeholder = "Select vehicles...",
  disabled = false
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredVehicles = useMemo(() => {
    if (!searchTerm) return vehicles;
    const term = searchTerm.toLowerCase();
    return vehicles.filter(v =>
      v.vin?.toLowerCase().includes(term) ||
      v.make?.toLowerCase().includes(term) ||
      v.model?.toLowerCase().includes(term) ||
      v.stock_number?.toLowerCase().includes(term) ||
      `${v.year}`.includes(term)
    );
  }, [vehicles, searchTerm]);

  const handleSelect = (vehicleId) => {
    if (multiple) {
      const newSelection = selectedVehicles.includes(vehicleId)
        ? selectedVehicles.filter(id => id !== vehicleId)
        : [...selectedVehicles, vehicleId];
      onSelectionChange(newSelection);
    } else {
      onSelectionChange([vehicleId]);
      setOpen(false);
    }
  };

  const handleRemove = (vehicleId) => {
    onSelectionChange(selectedVehicles.filter(id => id !== vehicleId));
  };

  const selectedVehicleObjects = vehicles.filter(v => selectedVehicles.includes(v.id));

  const statusColors = {
    in_stock: "bg-green-100 text-green-800",
    sold: "bg-blue-100 text-blue-800",
    reserved: "bg-yellow-100 text-yellow-800",
    in_transit: "bg-purple-100 text-purple-800",
    exported: "bg-indigo-100 text-indigo-800"
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-10 py-2"
            disabled={disabled}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Car className="w-4 h-4 text-gray-500 shrink-0" />
              {selectedVehicles.length === 0 ? (
                <span className="text-gray-500">{placeholder}</span>
              ) : multiple ? (
                <span className="text-gray-700">{selectedVehicles.length} vehicle(s) selected</span>
              ) : (
                <span className="text-gray-700">
                  {selectedVehicleObjects[0]?.year} {selectedVehicleObjects[0]?.make} {selectedVehicleObjects[0]?.model}
                </span>
              )}
            </div>
            <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by VIN, make, model, year..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <CommandList>
              <CommandEmpty>No vehicles found.</CommandEmpty>
              <ScrollArea className="h-[300px]">
                <CommandGroup>
                  {filteredVehicles.map((vehicle) => {
                    const isSelected = selectedVehicles.includes(vehicle.id);
                    return (
                      <CommandItem
                        key={vehicle.id}
                        value={vehicle.id}
                        onSelect={() => handleSelect(vehicle.id)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-3 w-full">
                          {multiple && (
                            <Checkbox checked={isSelected} className="shrink-0" />
                          )}
                          {!multiple && isSelected && (
                            <Check className="w-4 h-4 text-blue-600 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {vehicle.year} {vehicle.make} {vehicle.model}
                              </span>
                              <Badge className={`text-[10px] ${statusColors[vehicle.status] || 'bg-gray-100'}`}>
                                {vehicle.status?.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-500 flex gap-2">
                              <span className="font-mono">VIN: {vehicle.vin?.slice(-8) || 'N/A'}</span>
                              {vehicle.stock_number && <span>Stock: {vehicle.stock_number}</span>}
                              {vehicle.color && <span>{vehicle.color}</span>}
                            </div>
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </ScrollArea>
            </CommandList>
            {multiple && selectedVehicles.length > 0 && (
              <div className="border-t p-2 flex justify-between items-center">
                <span className="text-sm text-gray-500">{selectedVehicles.length} selected</span>
                <Button size="sm" variant="ghost" onClick={() => onSelectionChange([])}>
                  Clear all
                </Button>
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected vehicles chips */}
      {multiple && selectedVehicleObjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedVehicleObjects.map((vehicle) => (
            <Badge key={vehicle.id} variant="secondary" className="flex items-center gap-1 py-1 px-2">
              <Car className="w-3 h-3" />
              <span className="text-xs">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </span>
              <span className="text-[10px] text-gray-500 font-mono">
                ({vehicle.vin?.slice(-6)})
              </span>
              <button
                onClick={() => handleRemove(vehicle.id)}
                className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}