import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Car, Edit, Loader2 } from "lucide-react";
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

export default function Vehicles() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownershipFilter, setOwnershipFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => base44.entities.Vehicle.list('-created_date'),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Vehicle.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setDialogOpen(false);
      setEditingVehicle(null);
      toast.success("Vehicle added successfully!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vehicle.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setDialogOpen(false);
      setEditingVehicle(null);
      toast.success("Vehicle updated successfully!");
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

  const handleSave = (formData) => {
    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, data: formData });
    } else {
      createMutation.mutate(formData);
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

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Vehicles Inventory</h1>
          <p className="text-gray-600">{filteredVehicles.length} vehicles</p>
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

      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search by make, model, or VIN..."
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
              <SelectItem value="customer_owned_export">Customer Owned (Export Only)</SelectItem>
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
                      {vehicle.ownership_type === 'customer_owned_export' ? 'Customer Export' : 'Dealership'}
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
      />
    </div>
  );
}

function VehicleDialog({ open, onClose, vehicle, onSave, uploading, setUploading }) {
  const [formData, setFormData] = useState(vehicle || {
    ownership_type: "dealership_owned",
    vin: "", make: "", model: "", year: new Date().getFullYear(),
    color: "", mileage: 0, condition: "new", status: "in_stock",
    purchase_price: 0, selling_price: 0, fuel_type: "petrol",
    transmission: "manual", engine_capacity: "", features: "",
    location: "", images: [], notes: ""
  });

  React.useEffect(() => {
    if (vehicle) setFormData(vehicle);
  }, [vehicle]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, images: [...(formData.images || []), file_url] });
      toast.success("Image uploaded!");
    } catch (error) {
      toast.error("Failed to upload image");
    }
    setUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Ownership Type *</Label>
              <Select value={formData.ownership_type} onValueChange={(v) => setFormData({...formData, ownership_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dealership_owned">Dealership Owned</SelectItem>
                  <SelectItem value="customer_owned_export">Customer Owned (Export Only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>VIN *</Label>
              <Input value={formData.vin} onChange={(e) => setFormData({...formData, vin: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Make *</Label>
              <Input value={formData.make} onChange={(e) => setFormData({...formData, make: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Model *</Label>
              <Input value={formData.model} onChange={(e) => setFormData({...formData, model: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Year *</Label>
              <Input type="number" value={formData.year} onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input value={formData.color} onChange={(e) => setFormData({...formData, color: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Mileage (km)</Label>
              <Input type="number" value={formData.mileage} onChange={(e) => setFormData({...formData, mileage: parseInt(e.target.value)})} />
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
              <Input type="number" value={formData.purchase_price} onChange={(e) => setFormData({...formData, purchase_price: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Selling Price ($)</Label>
              <Input type="number" value={formData.selling_price} onChange={(e) => setFormData({...formData, selling_price: parseFloat(e.target.value)})} />
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
            <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="block w-full text-sm" />
            {formData.images?.length > 0 && (
              <div className="flex gap-2 mt-2">
                {formData.images.map((img, i) => (
                  <img key={i} src={img} className="w-20 h-20 object-cover rounded" />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formData)} className="bg-blue-600 hover:bg-blue-700">
            {vehicle ? 'Update' : 'Add'} Vehicle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}