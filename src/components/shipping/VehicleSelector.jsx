import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { Car, Search, X, ChevronDown, Check, Filter, User, Package } from "lucide-react";

export default function VehicleSelector({ 
  vehicles = [], 
  selectedVehicles = [], 
  onSelectionChange, 
  multiple = true,
  placeholder = "Select vehicles...",
  disabled = false,
  customers = [],
  disableShipped = true,
  groupByCustomer = false,
  showFilters = true
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [makeFilter, setMakeFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");

  // Get unique makes for filter
  const uniqueMakes = useMemo(() => {
    const makes = [...new Set(vehicles.map(v => v.make).filter(Boolean))];
    return makes.sort();
  }, [vehicles]);

  // Get unique customers
  const uniqueCustomers = useMemo(() => {
    const customerNames = [...new Set(vehicles.map(v => v.vendor_name).filter(Boolean))];
    return customerNames.sort();
  }, [vehicles]);

  const statusColors = {
    in_stock: "bg-green-100 text-green-800 border-green-200",
    sold: "bg-blue-100 text-blue-800 border-blue-200",
    reserved: "bg-yellow-100 text-yellow-800 border-yellow-200",
    in_transit: "bg-purple-100 text-purple-800 border-purple-200",
    exported: "bg-indigo-100 text-indigo-800 border-indigo-200"
  };

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
          v.vin?.toLowerCase().includes(term) ||
          v.make?.toLowerCase().includes(term) ||
          v.model?.toLowerCase().includes(term) ||
          v.stock_number?.toLowerCase().includes(term) ||
          v.color?.toLowerCase().includes(term) ||
          v.vendor_name?.toLowerCase().includes(term) ||
          `${v.year}`.includes(term);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== "all" && v.status !== statusFilter) return false;

      // Make filter
      if (makeFilter !== "all" && v.make !== makeFilter) return false;

      // Customer filter
      if (customerFilter !== "all" && v.vendor_name !== customerFilter) return false;

      return true;
    });
  }, [vehicles, searchTerm, statusFilter, makeFilter, customerFilter]);

  // Group vehicles by customer if enabled
  const groupedVehicles = useMemo(() => {
    if (!groupByCustomer) return { "All Vehicles": filteredVehicles };
    
    const groups = {};
    filteredVehicles.forEach(v => {
      const customerName = v.vendor_name || "Unassigned";
      if (!groups[customerName]) groups[customerName] = [];
      groups[customerName].push(v);
    });
    return groups;
  }, [filteredVehicles, groupByCustomer]);

  const handleSelect = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    
    // Prevent selecting shipped/exported vehicles if disabled
    if (disableShipped && (vehicle?.status === 'exported' || vehicle?.status === 'sold')) {
      return;
    }

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

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setMakeFilter("all");
    setCustomerFilter("all");
  };

  const hasActiveFilters = searchTerm || statusFilter !== "all" || makeFilter !== "all" || customerFilter !== "all";

  const selectedVehicleObjects = vehicles.filter(v => selectedVehicles.includes(v.id));

  const formatVehicleDisplay = (vehicle) => {
    return `${vehicle.year} ${vehicle.make} ${vehicle.model} – VIN ${vehicle.vin?.slice(-6) || 'N/A'}`;
  };

  return (
    <TooltipProvider>
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
                    {formatVehicleDisplay(selectedVehicleObjects[0])}
                  </span>
                )}
              </div>
              <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[500px] p-0" align="start">
            <Command shouldFilter={false}>
              {/* Search Bar */}
              <div className="p-3 border-b space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search VIN, make, model, year, color, customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Filters */}
                {showFilters && (
                  <div className="flex gap-2 flex-wrap">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="in_stock">In Stock</SelectItem>
                        <SelectItem value="reserved">Reserved</SelectItem>
                        <SelectItem value="in_transit">In Transit</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                        <SelectItem value="exported">Exported</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={makeFilter} onValueChange={setMakeFilter}>
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue placeholder="Make" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Makes</SelectItem>
                        {uniqueMakes.map(make => (
                          <SelectItem key={make} value={make}>{make}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {uniqueCustomers.length > 0 && (
                      <Select value={customerFilter} onValueChange={setCustomerFilter}>
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue placeholder="Customer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Customers</SelectItem>
                          {uniqueCustomers.map(customer => (
                            <SelectItem key={customer} value={customer}>{customer}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
                        <X className="w-3 h-3 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                )}

                {/* Results count */}
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>{filteredVehicles.length} vehicle(s) found</span>
                  {hasActiveFilters && <Badge variant="outline" className="text-[10px]">Filtered</Badge>}
                </div>
              </div>

              <CommandList>
                <CommandEmpty>
                  <div className="py-6 text-center">
                    <Car className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No vehicles found</p>
                    {hasActiveFilters && (
                      <Button variant="link" size="sm" onClick={clearFilters}>Clear filters</Button>
                    )}
                  </div>
                </CommandEmpty>
                <ScrollArea className="h-[300px]">
                  {Object.entries(groupedVehicles).map(([groupName, groupVehicles]) => (
                    <CommandGroup key={groupName} heading={groupByCustomer ? (
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 py-1">
                        <User className="w-3 h-3" />
                        {groupName} ({groupVehicles.length})
                      </div>
                    ) : undefined}>
                      {groupVehicles.map((vehicle) => {
                        const isSelected = selectedVehicles.includes(vehicle.id);
                        const isDisabled = disableShipped && (vehicle.status === 'exported' || vehicle.status === 'sold');
                        
                        return (
                          <Tooltip key={vehicle.id}>
                            <TooltipTrigger asChild>
                              <CommandItem
                                value={vehicle.id}
                                onSelect={() => handleSelect(vehicle.id)}
                                className={`cursor-pointer ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                disabled={isDisabled}
                              >
                                <div className="flex items-center gap-3 w-full">
                                  {multiple && (
                                    <Checkbox 
                                      checked={isSelected} 
                                      className="shrink-0" 
                                      disabled={isDisabled}
                                    />
                                  )}
                                  {!multiple && isSelected && (
                                    <Check className="w-4 h-4 text-blue-600 shrink-0" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium text-sm">
                                        {vehicle.year} {vehicle.make} {vehicle.model}
                                      </span>
                                      <Badge className={`text-[10px] border ${statusColors[vehicle.status] || 'bg-gray-100 border-gray-200'}`}>
                                        {vehicle.status?.replace(/_/g, ' ')}
                                      </Badge>
                                      {vehicle.color && (
                                        <span className="text-[10px] text-gray-500">{vehicle.color}</span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500 flex gap-3 mt-0.5">
                                      <span className="font-mono">VIN: ...{vehicle.vin?.slice(-6) || 'N/A'}</span>
                                      {vehicle.stock_number && <span>Stock: {vehicle.stock_number}</span>}
                                      {vehicle.vendor_name && (
                                        <span className="flex items-center gap-1">
                                          <User className="w-3 h-3" />
                                          {vehicle.vendor_name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CommandItem>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <div className="space-y-1 text-xs">
                                <p className="font-semibold">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                                <p><strong>Full VIN:</strong> {vehicle.vin || 'N/A'}</p>
                                <p><strong>Color:</strong> {vehicle.color || 'N/A'}</p>
                                <p><strong>Mileage:</strong> {vehicle.mileage?.toLocaleString() || 'N/A'} km</p>
                                <p><strong>Status:</strong> {vehicle.status?.replace(/_/g, ' ')}</p>
                                {vehicle.vendor_name && <p><strong>Vendor:</strong> {vehicle.vendor_name}</p>}
                                {vehicle.location && <p><strong>Location:</strong> {vehicle.location}</p>}
                                {isDisabled && (
                                  <p className="text-red-500 font-semibold mt-1">
                                    Cannot select - Vehicle already {vehicle.status}
                                  </p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </CommandGroup>
                  ))}
                </ScrollArea>
              </CommandList>

              {/* Footer */}
              {multiple && (
                <div className="border-t p-2 flex justify-between items-center bg-gray-50">
                  <span className="text-sm text-gray-500">
                    {selectedVehicles.length} of {vehicles.length} selected
                  </span>
                  <div className="flex gap-2">
                    {selectedVehicles.length > 0 && (
                      <Button size="sm" variant="ghost" onClick={() => onSelectionChange([])}>
                        Clear all
                      </Button>
                    )}
                    <Button size="sm" onClick={() => setOpen(false)}>
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </Command>
          </PopoverContent>
        </Popover>

        {/* Selected vehicles chips */}
        {multiple && selectedVehicleObjects.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg border">
            {selectedVehicleObjects.map((vehicle) => (
              <Badge 
                key={vehicle.id} 
                variant="secondary" 
                className="flex items-center gap-1 py-1.5 px-2 bg-white border shadow-sm"
              >
                <Car className="w-3 h-3 text-blue-600" />
                <span className="text-xs font-medium">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  – VIN ...{vehicle.vin?.slice(-6)}
                </span>
                <Badge className={`text-[9px] ml-1 ${statusColors[vehicle.status] || 'bg-gray-100'}`}>
                  {vehicle.status?.replace(/_/g, ' ')}
                </Badge>
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
    </TooltipProvider>
  );
}