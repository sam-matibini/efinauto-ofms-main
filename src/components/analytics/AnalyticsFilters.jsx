import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function AnalyticsFilters({ filters, onFiltersChange, technicians, parts, vehicles, repairOrders }) {
  // Get unique vehicle makes and models
  const vehicleMakes = React.useMemo(() => {
    const makes = new Set(repairOrders.map(o => o.vehicle_make).filter(Boolean));
    return Array.from(makes).sort();
  }, [repairOrders]);

  const vehicleModels = React.useMemo(() => {
    let orders = repairOrders;
    if (filters.vehicleMake !== "all") {
      orders = orders.filter(o => o.vehicle_make === filters.vehicleMake);
    }
    const models = new Set(orders.map(o => o.vehicle_model).filter(Boolean));
    return Array.from(models).sort();
  }, [repairOrders, filters.vehicleMake]);

  const serviceTypes = [
    { value: "routine_maintenance", label: "Routine Maintenance" },
    { value: "oil_change", label: "Oil Change" },
    { value: "brake_service", label: "Brake Service" },
    { value: "engine_repair", label: "Engine Repair" },
    { value: "transmission_repair", label: "Transmission Repair" },
    { value: "electrical_repair", label: "Electrical Repair" },
    { value: "body_work", label: "Body Work" },
    { value: "tire_service", label: "Tire Service" },
    { value: "inspection", label: "Inspection" },
    { value: "other", label: "Other" },
  ];

  const handleDateRangeChange = (value) => {
    onFiltersChange({
      ...filters,
      dateRange: parseInt(value),
      startDate: null,
      endDate: null,
    });
  };

  const handleCustomDateChange = (field, value) => {
    onFiltersChange({
      ...filters,
      [field]: value,
    });
  };

  const toggleComparison = (enabled) => {
    onFiltersChange({
      ...filters,
      compareWith: enabled ? 'previous' : null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Date Range Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Date Range</Label>
          <Select value={filters.dateRange.toString()} onValueChange={handleDateRangeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="60">Last 60 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="180">Last 6 Months</SelectItem>
              <SelectItem value="365">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Custom Start Date</Label>
          <Input
            type="date"
            value={filters.startDate || ""}
            onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Custom End Date</Label>
          <Input
            type="date"
            value={filters.endDate || ""}
            onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
          />
        </div>
      </div>

      {/* Segmentation Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Technician</Label>
          <Select 
            value={filters.technicianId} 
            onValueChange={(v) => onFiltersChange({...filters, technicianId: v})}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Technicians" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Technicians</SelectItem>
              {technicians.map(tech => (
                <SelectItem key={tech.id} value={tech.id}>
                  {tech.full_name} - {tech.employee_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Vehicle Make</Label>
          <Select 
            value={filters.vehicleMake} 
            onValueChange={(v) => onFiltersChange({...filters, vehicleMake: v, vehicleModel: "all"})}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Makes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Makes</SelectItem>
              {vehicleMakes.map(make => (
                <SelectItem key={make} value={make}>{make}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Vehicle Model</Label>
          <Select 
            value={filters.vehicleModel} 
            onValueChange={(v) => onFiltersChange({...filters, vehicleModel: v})}
            disabled={filters.vehicleMake === "all"}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Models" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Models</SelectItem>
              {vehicleModels.map(model => (
                <SelectItem key={model} value={model}>{model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Service Type</Label>
          <Select 
            value={filters.serviceType} 
            onValueChange={(v) => onFiltersChange({...filters, serviceType: v})}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Service Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Service Types</SelectItem>
              {serviceTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Part Used</Label>
          <Select 
            value={filters.partId} 
            onValueChange={(v) => onFiltersChange({...filters, partId: v})}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Parts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Parts</SelectItem>
              {parts.map(part => (
                <SelectItem key={part.id} value={part.id}>
                  {part.name} ({part.part_number})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Comparison Toggle */}
      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div>
          <Label className="text-base font-semibold">Compare with Previous Period</Label>
          <p className="text-sm text-gray-600 mt-1">
            Show performance changes compared to the previous {filters.dateRange} days
          </p>
        </div>
        <Switch
          checked={filters.compareWith !== null}
          onCheckedChange={toggleComparison}
        />
      </div>
    </div>
  );
}