import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Plus, X, BarChart3 } from "lucide-react";
import { toast } from "sonner";

const VEHICLE_FIELDS = [
  { id: "stock_number", label: "Stock Number", type: "string" },
  { id: "vin", label: "VIN", type: "string" },
  { id: "make", label: "Make", type: "string" },
  { id: "model", label: "Model", type: "string" },
  { id: "year", label: "Year", type: "number" },
  { id: "color", label: "Color", type: "string" },
  { id: "mileage", label: "Mileage", type: "number" },
  { id: "status", label: "Status", type: "string" },
  { id: "purchase_price", label: "Purchase Price", type: "number" },
  { id: "selling_price", label: "Selling Price", type: "number" },
  { id: "location", label: "Location", type: "string" },
  { id: "vendor_name", label: "Vendor", type: "string" },
  { id: "condition", label: "Condition", type: "string" },
  { id: "fuel_type", label: "Fuel Type", type: "string" },
  { id: "transmission", label: "Transmission", type: "string" },
];

const PART_FIELDS = [
  { id: "part_number", label: "Part Number", type: "string" },
  { id: "name", label: "Name", type: "string" },
  { id: "description", label: "Description", type: "string" },
  { id: "category", label: "Category", type: "string" },
  { id: "quantity", label: "Quantity", type: "number" },
  { id: "reorder_level", label: "Reorder Level", type: "number" },
  { id: "cost_price", label: "Cost Price", type: "number" },
  { id: "selling_price", label: "Selling Price", type: "number" },
  { id: "location", label: "Location", type: "string" },
  { id: "supplier", label: "Supplier", type: "string" },
];

export default function CustomReportBuilder({ vehicles = [], parts = [] }) {
  const [reportType, setReportType] = useState("vehicles");
  const [selectedFields, setSelectedFields] = useState([]);
  const [filters, setFilters] = useState([]);
  const [reportName, setReportName] = useState("");

  const availableFields = reportType === "vehicles" ? VEHICLE_FIELDS : PART_FIELDS;
  const sourceData = reportType === "vehicles" ? vehicles : parts;

  const toggleField = (fieldId) => {
    setSelectedFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(f => f !== fieldId)
        : [...prev, fieldId]
    );
  };

  const addFilter = () => {
    setFilters([...filters, { field: "", operator: "equals", value: "" }]);
  };

  const removeFilter = (index) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index, key, value) => {
    const newFilters = [...filters];
    newFilters[index][key] = value;
    setFilters(newFilters);
  };

  const applyFilters = (data) => {
    return data.filter(item => {
      return filters.every(filter => {
        if (!filter.field || !filter.value) return true;
        
        const itemValue = item[filter.field];
        const filterValue = filter.value.toLowerCase();

        switch (filter.operator) {
          case "equals":
            return String(itemValue).toLowerCase() === filterValue;
          case "contains":
            return String(itemValue).toLowerCase().includes(filterValue);
          case "greater_than":
            return Number(itemValue) > Number(filter.value);
          case "less_than":
            return Number(itemValue) < Number(filter.value);
          default:
            return true;
        }
      });
    });
  };

  const generateReport = () => {
    if (selectedFields.length === 0) {
      toast.error("Please select at least one field");
      return;
    }

    const filteredData = applyFilters(sourceData);
    
    if (filteredData.length === 0) {
      toast.error("No data matches the filters");
      return;
    }

    const reportData = filteredData.map(item => {
      const row = {};
      selectedFields.forEach(fieldId => {
        const field = availableFields.find(f => f.id === fieldId);
        row[field.label] = item[fieldId] || "";
      });
      return row;
    });

    // Export as CSV
    const headers = selectedFields.map(fieldId => 
      availableFields.find(f => f.id === fieldId).label
    );
    
    const csvContent = [
      headers.join(","),
      ...reportData.map(row => 
        headers.map(h => `"${row[h]}"`).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${reportName || 'custom_report'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast.success(`Report generated: ${filteredData.length} records`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Custom Report Builder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Report Configuration */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Report Name</Label>
              <Input
                placeholder="e.g., Low Stock Report"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
              />
            </div>
            <div>
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vehicles">Vehicles</SelectItem>
                  <SelectItem value="parts">Parts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Field Selection */}
          <div>
            <Label className="mb-2 block">Select Fields to Include</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
              {availableFields.map(field => (
                <div key={field.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.id}
                    checked={selectedFields.includes(field.id)}
                    onCheckedChange={() => toggleField(field.id)}
                  />
                  <label
                    htmlFor={field.id}
                    className="text-sm cursor-pointer"
                  >
                    {field.label}
                  </label>
                </div>
              ))}
            </div>
            {selectedFields.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedFields.map(fieldId => {
                  const field = availableFields.find(f => f.id === fieldId);
                  return (
                    <Badge key={fieldId} variant="secondary">
                      {field.label}
                      <X
                        className="w-3 h-3 ml-1 cursor-pointer"
                        onClick={() => toggleField(fieldId)}
                      />
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {/* Filters */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Filters (Optional)</Label>
              <Button size="sm" variant="outline" onClick={addFilter}>
                <Plus className="w-4 h-4 mr-1" />
                Add Filter
              </Button>
            </div>
            {filters.map((filter, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Select
                  value={filter.field}
                  onValueChange={(v) => updateFilter(index, "field", v)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filter.operator}
                  onValueChange={(v) => updateFilter(index, "operator", v)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="greater_than">Greater Than</SelectItem>
                    <SelectItem value="less_than">Less Than</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Value"
                  value={filter.value}
                  onChange={(e) => updateFilter(index, "value", e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeFilter(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-600">
            {sourceData.length} total records
            {filters.length > 0 && ` • ${applyFilters(sourceData).length} after filters`}
          </div>
          <Button onClick={generateReport} disabled={selectedFields.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}