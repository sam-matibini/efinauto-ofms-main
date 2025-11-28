import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Car, Edit, Loader2, TrendingUp, AlertTriangle, DollarSign, Upload, LayoutGrid, List, ArrowUpDown, Trash2 } from "lucide-react";
import ExportButton from "../components/shared/ExportButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCompany } from "../components/shared/CompanyContext";
import AIVehicleSearchLocal from "../components/vehicles/AIVehicleSearchLocal";
import AIVehicleSearchCanada from "../components/vehicles/AIVehicleSearchCanada";
import AIVehicleSearchUSA from "../components/vehicles/AIVehicleSearchUSA";
import AIVehicleSearchMarketplace from "../components/vehicles/AIVehicleSearchMarketplace";
import VehicleBulkImport from "../components/vehicles/VehicleBulkImport";
import AIVINScanner from "../components/vehicles/AIVINScanner";
import AIMileageScanner from "../components/vehicles/AIMileageScanner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import DateRangeFilter, { getDateRangeValues } from "../components/shared/DateRangeFilter";
import CompareWithFilter from "../components/shared/CompareWithFilter";

export default function Vehicles() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownershipFilter, setOwnershipFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("created_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [deletingVehicle, setDeletingVehicle] = useState(null);
  const [dateRange, setDateRange] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [compareWith, setCompareWith] = useState(null);
  const { selectedCompanyId } = useCompany();

  const queryClient = useQueryClient();

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles', selectedCompanyId],
    queryFn: async () => {
      const allVehicles = await base44.entities.Vehicle.filter({ company_id: selectedCompanyId }, '-created_date');
      return allVehicles;
    },
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      console.log("Creating vehicle with data:", data);
      return await base44.entities.Vehicle.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles', selectedCompanyId] }); // Invalidate with company ID
      setDialogOpen(false);
      setEditingVehicle(null);
      toast.success("Vehicle added successfully!");
    },
    onError: (error) => {
      console.error("Create error:", error);
      toast.error("Failed to add vehicle: " + (error.message || "Unknown error"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      console.log("Updating vehicle with data:", data);
      return await base44.entities.Vehicle.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles', selectedCompanyId] });
      setDialogOpen(false);
      setEditingVehicle(null);
      toast.success("Vehicle updated successfully!");
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast.error("Failed to update vehicle: " + (error.message || "Unknown error"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.Vehicle.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles', selectedCompanyId] });
      setDeletingVehicle(null);
      toast.success("Vehicle deleted successfully!");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Failed to delete vehicle: " + (error.message || "Unknown error"));
    },
  });

  const filteredVehicles = vehicles.filter(v => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = v.make?.toLowerCase().includes(search) ||
                          v.model?.toLowerCase().includes(search) ||
                          v.vin?.toLowerCase().includes(search) ||
                          v.stock_number?.toLowerCase().includes(search) ||
                          v.color?.toLowerCase().includes(search) ||
                          v.location?.toLowerCase().includes(search) ||
                          String(v.year).includes(search);
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    const matchesOwnership = ownershipFilter === "all" || v.ownership_type === ownershipFilter;
    
    // Date range filter
    let matchesDateRange = true;
    if (dateRange === "custom" && customStartDate && customEndDate) {
      const vehicleDate = v.transaction_date ? new Date(v.transaction_date) : new Date(v.created_date);
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      matchesDateRange = vehicleDate >= start && vehicleDate <= new Date(end.getTime() + 86400000);
    } else if (dateRange !== "all" && dateRange !== "custom") {
      const { start, end } = getDateRangeValues(dateRange);
      if (start && end) {
        const vehicleDate = v.transaction_date ? new Date(v.transaction_date) : new Date(v.created_date);
        matchesDateRange = vehicleDate >= start && vehicleDate <= new Date(end.getTime() + 86400000);
      }
    }
    
    return matchesSearch && matchesStatus && matchesOwnership && matchesDateRange;
  }).sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    if (sortBy === "vehicle") {
      aVal = `${a.year} ${a.make} ${a.model}`;
      bVal = `${b.year} ${b.make} ${b.model}`;
    }
    if (typeof aVal === "string") aVal = aVal?.toLowerCase() || "";
    if (typeof bVal === "string") bVal = bVal?.toLowerCase() || "";
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const vehicleExportColumns = [
    { label: "VIN", accessor: (v) => v.vin },
    { label: "Stock #", accessor: (v) => v.stock_number },
    { label: "Year", accessor: (v) => v.year },
    { label: "Make", accessor: (v) => v.make },
    { label: "Model", accessor: (v) => v.model },
    { label: "Color", accessor: (v) => v.color },
    { label: "Status", accessor: (v) => v.status },
    { label: "Condition", accessor: (v) => v.condition },
    { label: "Mileage", accessor: (v) => v.mileage },
    { label: "Purchase Price", accessor: (v) => v.purchase_price },
    { label: "Selling Price", accessor: (v) => v.selling_price },
    { label: "Location", accessor: (v) => v.location },
    { label: "Fuel Type", accessor: (v) => v.fuel_type },
    { label: "Transmission", accessor: (v) => v.transmission },
  ];

  const stats = {
    total: filteredVehicles.length,
    inStock: filteredVehicles.filter(v => v.status === "in_stock").length,
    sold: filteredVehicles.filter(v => v.status === "sold").length,
    totalValue: filteredVehicles.reduce((sum, v) => sum + (v.selling_price || 0), 0),
  };

  const handleSave = (formData) => {
    console.log("handleSave called with:", formData);
    
    if (!selectedCompanyId) {
      toast.error("Please select a company first");
      return;
    }

    if (!formData.vin?.trim() || !formData.make?.trim() || !formData.model?.trim() || !formData.year) {
      toast.error("Please fill in all required fields (VIN, Make, Model, Year)");
      return;
    }

    const cleanData = {
      company_id: selectedCompanyId,
      ownership_type: formData.ownership_type || "dealership_owned",
      vin: formData.vin.trim(),
      make: formData.make.trim(),
      model: formData.model.trim(),
      year: Number(formData.year),
      condition: formData.condition || "used",
      status: formData.status || "in_stock",
      fuel_type: formData.fuel_type || "petrol",
      transmission: formData.transmission || "manual",
      mileage: Number(formData.mileage) || 0,
      weight: Number(formData.weight) || 0,
      purchase_price: Number(formData.purchase_price) || 0,
      selling_price: Number(formData.selling_price) || 0
    };

    if (formData.color?.trim()) cleanData.color = formData.color.trim();
    if (formData.location?.trim()) cleanData.location = formData.location.trim();
    if (formData.stock_number?.trim()) cleanData.stock_number = formData.stock_number.trim();
    if (formData.invoice_number?.trim()) cleanData.invoice_number = formData.invoice_number.trim();
    if (formData.transaction_date) cleanData.transaction_date = formData.transaction_date;
    if (formData.engine_capacity?.trim()) cleanData.engine_capacity = formData.engine_capacity.trim();
    if (formData.features?.trim()) cleanData.features = formData.features.trim();
    if (formData.notes?.trim()) cleanData.notes = formData.notes.trim();
    if (formData.images && formData.images.length > 0) cleanData.images = formData.images;

    console.log("Saving vehicle data:", cleanData);

    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, data: cleanData });
    } else {
      createMutation.mutate(cleanData);
    }
  };

  const statusColors = {
    in_stock: "bg-green-100 text-green-800",
    sold: "bg-blue-100 text-blue-800",
    reserved: "bg-yellow-100 text-yellow-800",
    in_transit: "bg-purple-100 text-purple-800",
    exported: "bg-gray-100 text-gray-800"
  };

  const ownershipColors = {
    dealership_owned: "bg-indigo-100 text-indigo-800",
    customer_owned_export: "bg-orange-100 text-orange-800"
  };

  if (!selectedCompanyId) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="text-center py-16">
          <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Company Selected</h3>
          <p className="text-gray-500">Please select a company from the sidebar to view vehicles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Vehicles Inventory</h1>
            <p className="text-sm text-gray-300 mt-1">{filteredVehicles.length} vehicles</p>
          </div>
          <div className="flex gap-2">
            <ExportButton 
              data={filteredVehicles} 
              columns={vehicleExportColumns} 
              filename="vehicles" 
            />
            <Button 
              onClick={() => setBulkImportOpen(true)}
              variant="outline"
              className="bg-white hover:bg-gray-100"
            >
              <Upload className="w-4 h-4 mr-2" />
              Bulk Import
            </Button>
            <Button 
              onClick={() => {
                setEditingVehicle(null);
                setDialogOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Vehicle
            </Button>
          </div>
        </div>
        </div>

        <div className="p-6 md:p-8 max-w-7xl mx-auto">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Vehicles</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats.total}</h3>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Car className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Stock</p>
                <h3 className="text-2xl font-bold text-green-600">{stats.inStock}</h3>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sold</p>
                <h3 className="text-2xl font-bold text-orange-600">{stats.sold}</h3>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inventory Value</p>
                <h3 className="text-2xl font-bold text-green-600">${stats.totalValue.toLocaleString()}</h3>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search VIN, make, model, stock #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={ownershipFilter} onValueChange={setOwnershipFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Ownership" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ownership</SelectItem>
              <SelectItem value="dealership_owned">Dealership Owned</SelectItem>
              <SelectItem value="customer_owned_export">Customer Owned (Export)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="in_stock">In Stock</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="exported">Exported</SelectItem>
            </SelectContent>
          </Select>
          <Select value={`${sortBy}-${sortOrder}`} onValueChange={(v) => { const [field, order] = v.split("-"); setSortBy(field); setSortOrder(order); }}>
            <SelectTrigger>
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_date-desc">Newest First</SelectItem>
              <SelectItem value="created_date-asc">Oldest First</SelectItem>
              <SelectItem value="vehicle-asc">Vehicle (A-Z)</SelectItem>
              <SelectItem value="vehicle-desc">Vehicle (Z-A)</SelectItem>
              <SelectItem value="year-desc">Year (Newest)</SelectItem>
              <SelectItem value="year-asc">Year (Oldest)</SelectItem>
              <SelectItem value="selling_price-desc">Price (High-Low)</SelectItem>
              <SelectItem value="selling_price-asc">Price (Low-High)</SelectItem>
              <SelectItem value="mileage-asc">Mileage (Low-High)</SelectItem>
              <SelectItem value="mileage-desc">Mileage (High-Low)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <DateRangeFilter 
                  value={dateRange} 
                  onChange={setDateRange} 
                  customStart={customStartDate}
                  customEnd={customEndDate}
                  onCustomChange={(start, end) => {
                    setCustomStartDate(start);
                    setCustomEndDate(end);
                  }}
                />
          <CompareWithFilter value={compareWith} onChange={setCompareWith} />
          <div className="flex gap-1 ml-auto">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* AI Vehicle Search - Local Near Me */}
      <AIVehicleSearchLocal />

      {/* AI Vehicle Search - Canada */}
      <div className="mt-6">
        <AIVehicleSearchCanada />
      </div>

      {/* AI Vehicle Search - USA */}
      <div className="mt-6">
        <AIVehicleSearchUSA />
      </div>

      {/* AI Vehicle Search - Marketplaces */}
      <div className="mt-6">
        <AIVehicleSearchMarketplace />
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="text-center py-16">
          <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No vehicles found</h3>
          <p className="text-gray-500 mb-6">Add your first vehicle to get started</p>
        </div>
      ) : viewMode === "list" ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("vehicle"); setSortOrder(sortBy === "vehicle" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Vehicle {sortBy === "vehicle" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("vin"); setSortOrder(sortBy === "vin" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">VIN {sortBy === "vin" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("stock_number"); setSortOrder(sortBy === "stock_number" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Stock # {sortBy === "stock_number" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("invoice_number"); setSortOrder(sortBy === "invoice_number" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Invoice # {sortBy === "invoice_number" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("transaction_date"); setSortOrder(sortBy === "transaction_date" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Transaction Date {sortBy === "transaction_date" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("status"); setSortOrder(sortBy === "status" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Status {sortBy === "status" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("condition"); setSortOrder(sortBy === "condition" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Condition {sortBy === "condition" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("mileage"); setSortOrder(sortBy === "mileage" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Mileage {sortBy === "mileage" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("selling_price"); setSortOrder(sortBy === "selling_price" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Price {sortBy === "selling_price" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("location"); setSortOrder(sortBy === "location" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Location {sortBy === "location" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.map((vehicle) => (
                <TableRow key={vehicle.id} className="cursor-pointer hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                        {vehicle.images?.[0] ? (
                          <img src={vehicle.images[0]} alt="" className="w-full h-full object-cover rounded" />
                        ) : (
                          <Car className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                        <p className="text-xs text-gray-500">{vehicle.color}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{vehicle.vin}</TableCell>
                  <TableCell>{vehicle.stock_number || "-"}</TableCell>
                  <TableCell>{vehicle.invoice_number || "-"}</TableCell>
                  <TableCell>{vehicle.transaction_date || "-"}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[vehicle.status]}>
                      {vehicle.status?.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{vehicle.condition}</TableCell>
                  <TableCell>{vehicle.mileage?.toLocaleString()} km</TableCell>
                  <TableCell className="font-semibold text-blue-600">${vehicle.selling_price?.toLocaleString()}</TableCell>
                  <TableCell>{vehicle.location || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingVehicle(vehicle);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeletingVehicle(vehicle)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((vehicle, index) => (
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="group hover:shadow-lg transition-all duration-300 border-none shadow-md bg-white overflow-hidden">
                <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200">
                  {vehicle.images?.[0] ? (
                    <img 
                      src={vehicle.images[0]} 
                      alt={`${vehicle.make} ${vehicle.model}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Car className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex flex-col gap-2">
                    <Badge className={statusColors[vehicle.status]}>
                      {vehicle.status?.replace(/_/g, ' ')}
                    </Badge>
                    <Badge className={ownershipColors[vehicle.ownership_type || 'dealership_owned']}>
                      {vehicle.ownership_type === 'customer_owned_export' ? 'Customer' : 'Dealership'}
                    </Badge>
                  </div>
                </div>
                
                <CardContent className="p-5">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-bold text-xl text-gray-900">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                      <p className="text-sm text-gray-500">VIN: {vehicle.vin}</p>
                    </div>

                    <div className="flex gap-2 flex-wrap text-xs">
                      <Badge variant="outline">{vehicle.condition}</Badge>
                      <Badge variant="outline">{vehicle.fuel_type}</Badge>
                      <Badge variant="outline">{vehicle.transmission}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                      <div>
                        <p className="text-xs text-gray-500">Price</p>
                        <p className="text-lg font-bold text-blue-600">
                          ${vehicle.selling_price?.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Mileage</p>
                        <p className="text-lg font-bold text-gray-900">
                          {vehicle.mileage?.toLocaleString()} km
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={() => {
                          setEditingVehicle(vehicle);
                          setDialogOpen(true);
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button 
                        onClick={() => setDeletingVehicle(vehicle)}
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <VehicleDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingVehicle(null);
        }}
        vehicle={editingVehicle}
        onSave={handleSave}
        uploading={uploading}
        setUploading={setUploading}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <VehicleBulkImport
        open={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        companyId={selectedCompanyId}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['vehicles', selectedCompanyId] });
          setBulkImportOpen(false);
        }}
      />

      <AlertDialog open={!!deletingVehicle} onOpenChange={() => setDeletingVehicle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingVehicle?.year} {deletingVehicle?.make} {deletingVehicle?.model} (VIN: {deletingVehicle?.vin})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deletingVehicle.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </div>
        </div>
        );
        }

function VehicleDialog({ open, onClose, vehicle, onSave, uploading, setUploading, isSaving }) {
  const [formData, setFormData] = useState({
    ownership_type: "dealership_owned",
    vin: "", stock_number: "", invoice_number: "", transaction_date: "",
    make: "", model: "", year: new Date().getFullYear(),
    color: "", mileage: 0, weight: 0, condition: "used", status: "in_stock",
    purchase_price: 0, selling_price: 0, fuel_type: "petrol",
    transmission: "manual", engine_capacity: "", features: "",
    location: "", images: [], notes: ""
  });

  React.useEffect(() => {
    if (open) {
      if (vehicle) {
        setFormData({
          ownership_type: vehicle.ownership_type || "dealership_owned",
          vin: vehicle.vin || "",
          stock_number: vehicle.stock_number || "",
          invoice_number: vehicle.invoice_number || "",
          transaction_date: vehicle.transaction_date || "",
          make: vehicle.make || "",
          model: vehicle.model || "",
          year: vehicle.year || new Date().getFullYear(),
          color: vehicle.color || "",
          mileage: vehicle.mileage !== undefined ? vehicle.mileage : 0,
          weight: vehicle.weight !== undefined ? vehicle.weight : 0,
          condition: vehicle.condition || "used",
          status: vehicle.status || "in_stock",
          purchase_price: vehicle.purchase_price !== undefined ? vehicle.purchase_price : 0,
          selling_price: vehicle.selling_price !== undefined ? vehicle.selling_price : 0,
          fuel_type: vehicle.fuel_type || "petrol",
          transmission: vehicle.transmission || "manual",
          engine_capacity: vehicle.engine_capacity || "",
          features: vehicle.features || "",
          location: vehicle.location || "",
          images: vehicle.images || [],
          notes: vehicle.notes || ""
        });
      } else {
        setFormData({
          ownership_type: "dealership_owned",
          vin: "", stock_number: "", invoice_number: "", transaction_date: "",
          make: "", model: "", year: new Date().getFullYear(),
          color: "", mileage: 0, weight: 0, condition: "used", status: "in_stock",
          purchase_price: 0, selling_price: 0, fuel_type: "petrol",
          transmission: "manual", engine_capacity: "", features: "",
          location: "", images: [], notes: ""
        });
      }
    }
  }, [vehicle, open]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, images: [...(formData.images || []), file_url] });
      toast.success("Image uploaded!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    }
    setUploading(false);
  };

  const hasRequiredFields = formData.vin.trim().length > 0 && 
                           formData.make.trim().length > 0 && 
                           formData.model.trim().length > 0 && 
                           formData.year;
  const canSave = hasRequiredFields;

  console.log("Vehicle form validation:", { hasRequiredFields, canSave, formData });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vehicle ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ownership Type</Label>
              <Select value={formData.ownership_type} onValueChange={(v) => setFormData({...formData, ownership_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dealership_owned">Dealership Owned</SelectItem>
                  <SelectItem value="customer_owned_export">Customer Owned (Export)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>VIN *</Label>
              <Input 
                value={formData.vin} 
                onChange={(e) => setFormData({...formData, vin: e.target.value})} 
                placeholder="Enter VIN" 
              />
              <AIVINScanner onVINDetected={(vin) => setFormData({...formData, vin})} />
            </div>
            <div className="space-y-2">
              <Label>Stock Number</Label>
              <Input 
                value={formData.stock_number} 
                onChange={(e) => setFormData({...formData, stock_number: e.target.value})} 
                placeholder="e.g., STK-001" 
              />
            </div>
            <div className="space-y-2">
              <Label>Invoice Number</Label>
              <Input 
                value={formData.invoice_number} 
                onChange={(e) => setFormData({...formData, invoice_number: e.target.value})} 
                placeholder="e.g., INV-2024-001" 
              />
            </div>
            <div className="space-y-2">
              <Label>Transaction Date</Label>
              <Input 
                type="date" 
                value={formData.transaction_date} 
                onChange={(e) => setFormData({...formData, transaction_date: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Make *</Label>
              <Input 
                value={formData.make} 
                onChange={(e) => setFormData({...formData, make: e.target.value})} 
                placeholder="e.g., Toyota" 
              />
            </div>
            <div className="space-y-2">
              <Label>Model *</Label>
              <Input 
                value={formData.model} 
                onChange={(e) => setFormData({...formData, model: e.target.value})} 
                placeholder="e.g., Camry" 
              />
            </div>
            <div className="space-y-2">
              <Label>Year *</Label>
              <Input 
                type="number" 
                value={formData.year} 
                onChange={(e) => setFormData({...formData, year: parseInt(e.target.value) || new Date().getFullYear()})} 
                placeholder="e.g., 2023" 
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input 
                value={formData.color} 
                onChange={(e) => setFormData({...formData, color: e.target.value})} 
                placeholder="e.g., Black"
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input 
                value={formData.location} 
                onChange={(e) => setFormData({...formData, location: e.target.value})} 
                placeholder="e.g., Lot A, Row 3"
              />
            </div>
            <div className="space-y-2">
              <Label>Mileage (km)</Label>
              <Input 
                type="number" 
                value={formData.mileage} 
                onChange={(e) => setFormData({...formData, mileage: parseInt(e.target.value) || 0})} 
                placeholder="0" 
              />
              <AIMileageScanner onMileageDetected={(mileage) => setFormData({...formData, mileage})} />
            </div>
            <div className="space-y-2">
              <Label>Weight (kg)</Label>
              <Input 
                type="number" 
                value={formData.weight} 
                onChange={(e) => setFormData({...formData, weight: parseFloat(e.target.value) || 0})} 
                placeholder="0" 
              />
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={formData.condition} onValueChange={(v) => setFormData({...formData, condition: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="used">Used</SelectItem>
                  <SelectItem value="certified_pre_owned">Certified Pre-Owned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="exported">Exported</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Purchase Price ($)</Label>
              <Input 
                type="number" 
                value={formData.purchase_price} 
                onChange={(e) => setFormData({...formData, purchase_price: parseFloat(e.target.value) || 0})} 
                placeholder="0" 
              />
            </div>
            <div className="space-y-2">
              <Label>Selling Price ($)</Label>
              <Input 
                type="number" 
                value={formData.selling_price} 
                onChange={(e) => setFormData({...formData, selling_price: parseFloat(e.target.value) || 0})} 
                placeholder="0" 
              />
            </div>
            <div className="space-y-2">
              <Label>Fuel Type</Label>
              <Select value={formData.fuel_type} onValueChange={(v) => setFormData({...formData, fuel_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="petrol">Petrol</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="electric">Electric</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="lpg">LPG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Transmission</Label>
              <Select value={formData.transmission} onValueChange={(v) => setFormData({...formData, transmission: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="automatic">Automatic</SelectItem>
                  <SelectItem value="semi_automatic">Semi-Automatic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Upload Image</Label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              disabled={uploading} 
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
            />
            {formData.images?.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {formData.images.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img} className="w-20 h-20 object-cover rounded" alt={`Vehicle ${i + 1}`} />
                    <button
                      onClick={() => setFormData({...formData, images: formData.images.filter((_, idx) => idx !== i)})}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea 
              value={formData.notes} 
              onChange={(e) => setFormData({...formData, notes: e.target.value})} 
              rows={3}
              placeholder="Add any additional notes"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button 
            onClick={() => onSave(formData)} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isSaving || !canSave}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>{vehicle ? 'Update' : 'Add'} Vehicle</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}