import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Car, Edit, Loader2, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";
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

export default function Vehicles() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownershipFilter, setOwnershipFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [uploading, setUploading] = useState(false);
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
      queryClient.invalidateQueries({ queryKey: ['vehicles', selectedCompanyId] }); // Invalidate with company ID
      setDialogOpen(false);
      setEditingVehicle(null);
      toast.success("Vehicle updated successfully!");
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast.error("Failed to update vehicle: " + (error.message || "Unknown error"));
    },
  });

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = v.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.vin?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    const matchesOwnership = ownershipFilter === "all" || v.ownership_type === ownershipFilter;
    return matchesSearch && matchesStatus && matchesOwnership;
  });

  const stats = {
    total: vehicles.length,
    inStock: vehicles.filter(v => v.status === "in_stock").length,
    sold: vehicles.filter(v => v.status === "sold").length,
    totalValue: vehicles.reduce((sum, v) => sum + (v.selling_price || 0), 0),
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
      </div>

      {/* AI Vehicle Search - Local Near Me */}
      <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            📍 Local Near Me Vehicles Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Find vehicles at local dealerships, auctions, and private sellers near your location
          </p>
          <div className="text-sm text-gray-500 italic">Vehicle search coming soon...</div>
        </CardContent>
      </Card>

      {/* AI Vehicle Search - Canada */}
      <div className="mt-6">
        <Card className="bg-gradient-to-br from-red-50 to-white border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              🇨🇦 Canada-Wide Vehicles Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Search across Canadian vehicle marketplaces and dealerships
            </p>
            <div className="text-sm text-gray-500 italic">Vehicle search coming soon...</div>
          </CardContent>
        </Card>
      </div>

      {/* AI Vehicle Search - USA */}
      <div className="mt-6">
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              🇺🇸 USA-Wide Vehicles Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Search across USA vehicle marketplaces and dealerships
            </p>
            <div className="text-sm text-gray-500 italic">Vehicle search coming soon...</div>
          </CardContent>
        </Card>
      </div>

      {/* AI Vehicle Search - Marketplaces */}
      <div className="mt-6">
        <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              🛒 Marketplace Vehicles Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Search Facebook Marketplace, Kijiji, AutoTrader, and other platforms
            </p>
            <div className="text-sm text-gray-500 italic">Vehicle search coming soon...</div>
          </CardContent>
        </Card>
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

                    <Button 
                      onClick={() => {
                        setEditingVehicle(vehicle);
                        setDialogOpen(true);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Details
                    </Button>
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
        </div>
        </div>
        );
        }

function VehicleDialog({ open, onClose, vehicle, onSave, uploading, setUploading, isSaving }) {
  const [formData, setFormData] = useState({
    ownership_type: "dealership_owned",
    vin: "", make: "", model: "", year: new Date().getFullYear(),
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
          vin: "", make: "", model: "", year: new Date().getFullYear(),
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
              <Label>Mileage (km)</Label>
              <Input 
                type="number" 
                value={formData.mileage} 
                onChange={(e) => setFormData({...formData, mileage: parseInt(e.target.value) || 0})} 
                placeholder="0" 
              />
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