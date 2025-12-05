import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "../components/shared/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Trash2, Edit, CheckCircle, Package, Barcode, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Salvage() {
  const { selectedCompanyId } = useCompany();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSalvage, setEditingSalvage] = useState(null);
  const queryClient = useQueryClient();

  const { data: salvageVehicles = [], isLoading } = useQuery({
    queryKey: ['salvage-vehicles', selectedCompanyId],
    queryFn: () => base44.entities.SalvageVehicle.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['parts', selectedCompanyId],
    queryFn: () => base44.entities.Part.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const salvage = await base44.entities.SalvageVehicle.create({ ...data, company_id: selectedCompanyId });
      
      // Create GL transaction for salvage vehicle purchase
      if (salvage.purchase_price > 0) {
        await base44.entities.Transaction.create({
          company_id: selectedCompanyId,
          transaction_number: `SALV-${salvage.id.slice(0, 8)}`,
          transaction_type: 'vehicle_purchase',
          category: 'asset',
          amount: salvage.purchase_price,
          account_code: '1200',
          account_name: 'Vehicle Inventory',
          account_type: 'asset',
          contra_account_code: '2000',
          contra_account_name: 'Accounts Payable',
          reference_type: 'SalvageVehicle',
          reference_id: salvage.id,
          reference_number: salvage.salvage_number,
          description: `Salvage vehicle acquisition: ${salvage.year} ${salvage.make} ${salvage.model}`,
          transaction_date: salvage.intake_date || new Date().toISOString().split('T')[0],
          status: 'completed'
        });
      }
      
      return salvage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salvage-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setDialogOpen(false);
      setEditingSalvage(null);
      toast.success("Salvage vehicle added!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const oldSalvage = salvageVehicles.find(s => s.id === id);
      const updated = await base44.entities.SalvageVehicle.update(id, data);
      
      // If status changed to 'scrapped' and has scrap value, record scrap revenue
      if (data.status === 'scrapped' && oldSalvage?.status !== 'scrapped' && data.scrap_weights?.scrap_value > 0) {
        await base44.entities.Transaction.create({
          company_id: selectedCompanyId,
          transaction_number: `SCRAP-${id.slice(0, 8)}`,
          transaction_type: 'other_income',
          category: 'revenue',
          amount: data.scrap_weights.scrap_value,
          account_code: '4400',
          account_name: 'Salvage Revenue',
          account_type: 'revenue',
          reference_type: 'SalvageVehicle',
          reference_id: id,
          reference_number: data.salvage_number,
          description: `Scrap metal sale: ${data.scrap_weights.total_weight_kg}kg from ${data.year} ${data.make} ${data.model}`,
          transaction_date: new Date().toISOString().split('T')[0],
          status: 'completed'
        });
      }
      
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salvage-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setDialogOpen(false);
      setEditingSalvage(null);
      toast.success("Salvage vehicle updated!");
    },
  });

  const filteredVehicles = salvageVehicles.filter(v => {
    const matchesSearch = v.vin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.model?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSave = (formData) => {
    if (!formData.vin || !formData.make || !formData.model || !formData.year) {
      toast.error("VIN, Make, Model, and Year are required");
      return;
    }

    if (editingSalvage) {
      updateMutation.mutate({ id: editingSalvage.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const statusColors = {
    received: "bg-blue-100 text-blue-800",
    dismantling: "bg-yellow-100 text-yellow-800",
    dismantled: "bg-purple-100 text-purple-800",
    scrapped: "bg-gray-100 text-gray-800",
    sold: "bg-green-100 text-green-800"
  };

  if (!selectedCompanyId) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Please select a company to view salvage vehicles</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Salvage & Dismantling</h1>
            <p className="text-sm text-gray-300 mt-1">{filteredVehicles.length} vehicles</p>
          </div>
        <Button onClick={() => {
          setEditingSalvage(null);
          setDialogOpen(true);
        }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Salvage Vehicle
        </Button>
        </div>
        </div>

        <div className="p-6 md:p-8 max-w-7xl mx-auto">

      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search by VIN, make, or model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="dismantling">Dismantling</SelectItem>
              <SelectItem value="dismantled">Dismantled</SelectItem>
              <SelectItem value="scrapped">Scrapped</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <p className="text-center text-gray-500">Loading salvage vehicles...</p>
        ) : filteredVehicles.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No salvage vehicles found.</p>
        ) : (
          filteredVehicles.map((vehicle, index) => (
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-none shadow-md hover:shadow-lg transition-all cursor-pointer"
                onClick={() => {
                  setEditingSalvage(vehicle);
                  setDialogOpen(true);
                }}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-bold text-lg">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </h3>
                        <Badge className={statusColors[vehicle.status]}>
                          {vehicle.status}
                        </Badge>
                        {vehicle.manifest_generated && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Manifest
                          </Badge>
                        )}
                        {vehicle.dismantling_log?.length > 0 && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            <Package className="w-3 h-3 mr-1" />
                            {vehicle.dismantling_log.length} logs
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        <strong>VIN:</strong> {vehicle.vin}
                      </p>
                      <p className="text-sm text-gray-500">
                        <strong>Location:</strong> {vehicle.location || 'Not assigned'} | 
                        <strong className="ml-2">Intake:</strong> {vehicle.intake_date}
                      </p>
                      {vehicle.scrap_weights?.total_weight_kg > 0 && (
                        <p className="text-sm text-gray-500">
                          <strong>Scrap Weight:</strong> {vehicle.scrap_weights.total_weight_kg} kg | 
                          <strong className="ml-2">Value:</strong> ${vehicle.scrap_weights.scrap_value}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold text-gray-900">
                        ${vehicle.estimated_value?.toLocaleString() || 0}
                      </p>
                      <p className="text-sm text-gray-500">Est. Value</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <SalvageDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingSalvage(null);
        }}
        salvage={editingSalvage}
        onSave={handleSave}
        companyId={selectedCompanyId}
        allParts={parts} // Pass the fetched parts to the dialog
        />
        </div>
        </div>
        );
        }

function SalvageDialog({ open, onClose, salvage, onSave, companyId, allParts }) {
  const [activeTab, setActiveTab] = useState("basic");
  const [formData, setFormData] = useState(salvage || {
    salvage_number: `SALV-${Date.now()}`,
    vin: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    mileage: 0,
    intake_date: new Date().toISOString().split('T')[0],
    intake_condition: "complete",
    location: "",
    status: "received",
    purchase_price: 0,
    estimated_value: 0,
    compliance: {
      tires_removed: false,
      fluids_drained: false,
      battery_removed: false,
      airbags_deployed: false,
      catalytic_converter_removed: false,
      hazmat_handled: false
    },
    scrap_weights: {
      ferrous_metal_kg: 0,
      non_ferrous_metal_kg: 0,
      aluminum_kg: 0,
      copper_kg: 0,
      total_weight_kg: 0,
      scrap_value: 0
    },
    dismantling_log: [],
    parts_extracted: [],
    notes: ""
  });

  React.useEffect(() => {
    if (salvage) {
      setFormData({
        ...salvage,
        // Ensure nested objects exist even if undefined from API
        compliance: salvage.compliance || {
          tires_removed: false,
          fluids_drained: false,
          battery_removed: false,
          airbags_deployed: false,
          catalytic_converter_removed: false,
          hazmat_handled: false,
          tires_removed_date: '',
          fluids_drained_date: '',
          battery_removed_date: '',
          airbags_date: '',
          hazmat_notes: '',
          recycler_license_number: ''
        },
        scrap_weights: salvage.scrap_weights || {
          ferrous_metal_kg: 0,
          non_ferrous_metal_kg: 0,
          aluminum_kg: 0,
          copper_kg: 0,
          total_weight_kg: 0,
          scrap_value: 0
        },
        dismantling_log: salvage.dismantling_log || [],
        parts_extracted: salvage.parts_extracted || []
      });
    } else {
      // Reset formData for new vehicle if dialog was previously used for editing
      setFormData({
        salvage_number: `SALV-${Date.now()}`,
        vin: "",
        make: "",
        model: "",
        year: new Date().getFullYear(),
        color: "",
        mileage: 0,
        intake_date: new Date().toISOString().split('T')[0],
        intake_condition: "complete",
        location: "",
        status: "received",
        purchase_price: 0,
        estimated_value: 0,
        compliance: {
          tires_removed: false,
          fluids_drained: false,
          battery_removed: false,
          airbags_deployed: false,
          catalytic_converter_removed: false,
          hazmat_handled: false,
          tires_removed_date: '',
          fluids_drained_date: '',
          battery_removed_date: '',
          airbags_date: '',
          hazmat_notes: '',
          recycler_license_number: ''
        },
        scrap_weights: {
          ferrous_metal_kg: 0,
          non_ferrous_metal_kg: 0,
          aluminum_kg: 0,
          copper_kg: 0,
          total_weight_kg: 0,
          scrap_value: 0
        },
        dismantling_log: [],
        parts_extracted: [],
        notes: ""
      });
    }
  }, [salvage]);

  React.useEffect(() => {
    const total = (formData.scrap_weights?.ferrous_metal_kg || 0) +
                  (formData.scrap_weights?.non_ferrous_metal_kg || 0) +
                  (formData.scrap_weights?.aluminum_kg || 0) +
                  (formData.scrap_weights?.copper_kg || 0);
    setFormData(prev => ({
      ...prev,
      scrap_weights: {
        ...prev.scrap_weights,
        total_weight_kg: total
      }
    }));
  }, [
    formData.scrap_weights?.ferrous_metal_kg,
    formData.scrap_weights?.non_ferrous_metal_kg,
    formData.scrap_weights?.aluminum_kg,
    formData.scrap_weights?.copper_kg
  ]);

  const canSave = formData.vin?.trim().length > 0 && 
                  formData.make?.trim().length > 0 &&
                  formData.model?.trim().length > 0 &&
                  formData.year > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{salvage ? 'Edit Salvage Vehicle' : 'Add Salvage Vehicle'}</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="scrap">Scrap Weights</TabsTrigger>
            <TabsTrigger value="dismantling">Dismantling</TabsTrigger>
            <TabsTrigger value="parts">Parts</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>VIN *</Label>
                <Input value={formData.vin} onChange={(e) => setFormData({...formData, vin: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Salvage Number</Label>
                <Input value={formData.salvage_number} onChange={(e) => setFormData({...formData, salvage_number: e.target.value})} />
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
                <Label>Intake Date</Label>
                <Input type="date" value={formData.intake_date} onChange={(e) => setFormData({...formData, intake_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Intake Condition</Label>
                <Select value={formData.intake_condition} onValueChange={(v) => setFormData({...formData, intake_condition: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="complete">Complete</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="stripped">Stripped</SelectItem>
                    <SelectItem value="burned">Burned</SelectItem>
                    <SelectItem value="flooded">Flooded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Yard Location</Label>
                <Input value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} placeholder="Row A, Bin 12" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="dismantling">Dismantling</SelectItem>
                    <SelectItem value="dismantled">Dismantled</SelectItem>
                    <SelectItem value="scrapped">Scrapped</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Purchase Price ($)</Label>
                <Input type="number" value={formData.purchase_price} onChange={(e) => setFormData({...formData, purchase_price: parseFloat(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Estimated Value ($)</Label>
                <Input type="number" value={formData.estimated_value} onChange={(e) => setFormData({...formData, estimated_value: parseFloat(e.target.value)})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} />
            </div>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={formData.compliance?.tires_removed}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      compliance: { ...formData.compliance, tires_removed: checked }
                    })}
                  />
                  <Label className="font-semibold">Tires Removed</Label>
                </div>
                {formData.compliance?.tires_removed && (
                  <Input
                    type="date"
                    className="w-40"
                    value={formData.compliance?.tires_removed_date || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      compliance: { ...formData.compliance, tires_removed_date: e.target.value }
                    })}
                  />
                )}
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={formData.compliance?.fluids_drained}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      compliance: { ...formData.compliance, fluids_drained: checked }
                    })}
                  />
                  <Label className="font-semibold">Fluids Drained</Label>
                </div>
                {formData.compliance?.fluids_drained && (
                  <Input
                    type="date"
                    className="w-40"
                    value={formData.compliance?.fluids_drained_date || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      compliance: { ...formData.compliance, fluids_drained_date: e.target.value }
                    })}
                  />
                )}
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={formData.compliance?.battery_removed}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      compliance: { ...formData.compliance, battery_removed: checked }
                    })}
                  />
                  <Label className="font-semibold">Battery Removed</Label>
                </div>
                {formData.compliance?.battery_removed && (
                  <Input
                    type="date"
                    className="w-40"
                    value={formData.compliance?.battery_removed_date || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      compliance: { ...formData.compliance, battery_removed_date: e.target.value }
                    })}
                  />
                )}
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={formData.compliance?.airbags_deployed}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      compliance: { ...formData.compliance, airbags_deployed: checked }
                    })}
                  />
                  <Label className="font-semibold">Airbags Deployed/Removed</Label>
                </div>
                {formData.compliance?.airbags_deployed && (
                  <Input
                    type="date"
                    className="w-40"
                    value={formData.compliance?.airbags_date || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      compliance: { ...formData.compliance, airbags_date: e.target.value }
                    })}
                  />
                )}
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Checkbox
                  checked={formData.compliance?.catalytic_converter_removed}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    compliance: { ...formData.compliance, catalytic_converter_removed: checked }
                  })}
                />
                <Label className="font-semibold">Catalytic Converter Removed</Label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={formData.compliance?.hazmat_handled}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      compliance: { ...formData.compliance, hazmat_handled: checked }
                    })}
                  />
                  <Label className="font-semibold">Hazardous Materials Handled</Label>
                </div>
                {formData.compliance?.hazmat_handled && (
                  <Textarea
                    placeholder="Describe hazmat handling procedures..."
                    value={formData.compliance?.hazmat_notes || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      compliance: { ...formData.compliance, hazmat_notes: e.target.value }
                    })}
                    rows={3}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Recycler License Number</Label>
                <Input
                  value={formData.compliance?.recycler_license_number || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    compliance: { ...formData.compliance, recycler_license_number: e.target.value }
                  })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scrap" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ferrous Metal (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.scrap_weights?.ferrous_metal_kg || 0}
                  onChange={(e) => setFormData({
                    ...formData,
                    scrap_weights: { ...formData.scrap_weights, ferrous_metal_kg: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Non-Ferrous Metal (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.scrap_weights?.non_ferrous_metal_kg || 0}
                  onChange={(e) => setFormData({
                    ...formData,
                    scrap_weights: { ...formData.scrap_weights, non_ferrous_metal_kg: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Aluminum (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.scrap_weights?.aluminum_kg || 0}
                  onChange={(e) => setFormData({
                    ...formData,
                    scrap_weights: { ...formData.scrap_weights, aluminum_kg: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Copper (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.scrap_weights?.copper_kg || 0}
                  onChange={(e) => setFormData({
                    ...formData,
                    scrap_weights: { ...formData.scrap_weights, copper_kg: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Total Weight (kg)</Label>
                <Input
                  type="number"
                  value={formData.scrap_weights?.total_weight_kg || 0}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label>Scrap Value ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.scrap_weights?.scrap_value || 0}
                  onChange={(e) => setFormData({
                    ...formData,
                    scrap_weights: { ...formData.scrap_weights, scrap_value: parseFloat(e.target.value) || 0 }
                  })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="dismantling" className="space-y-4">
            <DismantlingLogTab formData={formData} setFormData={setFormData} />
          </TabsContent>

          <TabsContent value="parts" className="space-y-4">
            <PartsExtractedTab 
              formData={formData} 
              setFormData={setFormData} 
              companyId={companyId}
              salvageVehicle={salvage}
              allParts={allParts} // Pass allParts down
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={() => onSave(formData)} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!canSave}
          >
            {salvage ? 'Update' : 'Add'} Vehicle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DismantlingLogTab({ formData, setFormData }) {
  const [newLog, setNewLog] = useState({
    date: new Date().toISOString().split('T')[0],
    operator: "",
    part_extracted: "",
    condition: "good",
    notes: ""
  });

  const addLogEntry = () => {
    if (!newLog.operator || !newLog.part_extracted) {
      toast.error("Operator and part extracted are required");
      return;
    }

    const logEntry = {
      ...newLog,
      timestamp: new Date().toISOString()
    };

    setFormData({
      ...formData,
      dismantling_log: [...(formData.dismantling_log || []), logEntry]
    });

    setNewLog({
      date: new Date().toISOString().split('T')[0],
      operator: "",
      part_extracted: "",
      condition: "good",
      notes: ""
    });

    toast.success("Log entry added");
  };

  const removeLogEntry = (index) => {
    const updatedLog = formData.dismantling_log.filter((_, i) => i !== index);
    setFormData({ ...formData, dismantling_log: updatedLog });
    toast.success("Log entry removed");
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-3">Add Dismantling Log Entry</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={newLog.date}
              onChange={(e) => setNewLog({ ...newLog, date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Operator *</Label>
            <Input
              value={newLog.operator}
              onChange={(e) => setNewLog({ ...newLog, operator: e.target.value })}
              placeholder="Operator name"
            />
          </div>
          <div className="space-y-2">
            <Label>Part Extracted *</Label>
            <Input
              value={newLog.part_extracted}
              onChange={(e) => setNewLog({ ...newLog, part_extracted: e.target.value })}
              placeholder="e.g., Engine, Transmission"
            />
          </div>
          <div className="space-y-2">
            <Label>Condition</Label>
            <Select value={newLog.condition} onValueChange={(v) => setNewLog({ ...newLog, condition: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="excellent">Excellent</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="fair">Fair</SelectItem>
                <SelectItem value="poor">Poor</SelectItem>
                <SelectItem value="scrap">Scrap</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Notes</Label>
            <Textarea
              value={newLog.notes}
              onChange={(e) => setNewLog({ ...newLog, notes: e.target.value })}
              rows={2}
              placeholder="Additional notes..."
            />
          </div>
        </div>
        <Button onClick={addLogEntry} className="mt-3 bg-blue-600 hover:bg-blue-700" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Log Entry
        </Button>
      </div>

      <div className="space-y-3">
        <h4 className="font-semibold text-gray-900">Dismantling History ({formData.dismantling_log?.length || 0})</h4>
        {formData.dismantling_log?.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No dismantling logs yet</p>
        ) : (
          formData.dismantling_log?.map((log, index) => (
            <Card key={index} className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-semibold">{log.part_extracted}</span>
                      <Badge variant="outline" className="text-xs">{log.condition}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      <strong>Operator:</strong> {log.operator} | <strong>Date:</strong> {log.date}
                    </p>
                    {log.timestamp && (
                      <p className="text-xs text-gray-400">
                        Logged: {format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                    {log.notes && (
                      <p className="text-sm text-gray-600 mt-1">{log.notes}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLogEntry(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function PartsExtractedTab({ formData, setFormData, companyId, salvageVehicle, allParts }) {
  const [showPartForm, setShowPartForm] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState(null);
  const queryClient = useQueryClient();

  // The parts query is now handled in the parent Salvage component and passed via allParts prop
  // const { data: parts = [] } = useQuery({ ... });

  const createPartMutation = useMutation({
    mutationFn: (data) => base44.entities.Part.create({ ...data, company_id: companyId }),
    onSuccess: (newPart) => {
      queryClient.invalidateQueries({ queryKey: ['parts'] }); // Invalidate global parts query
      
      const updatedPartsExtracted = [...(formData.parts_extracted || []), newPart.id];
      setFormData({ ...formData, parts_extracted: updatedPartsExtracted });
      
      setShowPartForm(false);
      toast.success("Part created and linked!");
    },
  });

  const linkExistingPart = () => {
    if (!selectedPartId) {
      toast.error("Please select a part");
      return;
    }

    if (formData.parts_extracted?.includes(selectedPartId)) {
      toast.error("Part already linked");
      return;
    }

    const updatedPartsExtracted = [...(formData.parts_extracted || []), selectedPartId];
    setFormData({ ...formData, parts_extracted: updatedPartsExtracted });
    setSelectedPartId(null);
    toast.success("Part linked!");
  };

  const unlinkPart = (partId) => {
    const updatedPartsExtracted = formData.parts_extracted.filter(id => id !== partId);
    setFormData({ ...formData, parts_extracted: updatedPartsExtracted });
    toast.success("Part unlinked");
  };

  const generateBarcode = (part) => {
    const barcodeData = `${part.part_number}-${part.id}`;
    
    toast.success(`Barcode: ${barcodeData}`, {
      duration: 5000,
      description: "Copy this code for your barcode printer"
    });
  };

  const linkedParts = allParts.filter(p => formData.parts_extracted?.includes(p.id));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button 
          onClick={() => setShowPartForm(!showPartForm)} 
          variant="outline"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Part
        </Button>
      </div>

      {showPartForm && (
        <CreatePartForm 
          onSubmit={(data) => createPartMutation.mutate(data)}
          onCancel={() => setShowPartForm(false)}
          salvageVehicle={salvageVehicle}
        />
      )}

      <div className="bg-gray-50 p-4 rounded-lg">
        <Label className="mb-2 block">Link Existing Part</Label>
        <div className="flex gap-2">
          <Select value={selectedPartId} onValueChange={setSelectedPartId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a part..." />
            </SelectTrigger>
            <SelectContent>
              {allParts.map((part) => (
                <SelectItem key={part.id} value={part.id}>
                  {part.name} ({part.part_number})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={linkExistingPart} size="sm">Link</Button>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="font-semibold text-gray-900">Linked Parts ({linkedParts.length})</h4>
        {linkedParts.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No parts extracted yet</p>
        ) : (
          <div className="grid gap-3">
            {linkedParts.map((part) => (
              <Card key={part.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1">
                      <h5 className="font-semibold">{part.name}</h5>
                      <p className="text-sm text-gray-600">
                        <strong>Part #:</strong> {part.part_number} | 
                        <strong className="ml-2">Category:</strong> {part.category}
                      </p>
                      {part.selling_price && (
                        <p className="text-sm text-gray-600">
                          <strong>Price:</strong> ${part.selling_price} | 
                          <strong className="ml-2">Stock:</strong> {part.quantity}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateBarcode(part)}
                      >
                        <Barcode className="w-4 h-4 mr-1" />
                        Barcode
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => unlinkPart(part.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreatePartForm({ onSubmit, onCancel, salvageVehicle }) {
  const [partData, setPartData] = useState({
    part_number: `PART-${Date.now()}`,
    name: "",
    description: "",
    category: "engine",
    compatible_makes: salvageVehicle?.make || "",
    compatible_models: salvageVehicle?.model || "",
    quantity: 1,
    cost_price: 0,
    selling_price: 0,
    location: salvageVehicle?.location || ""
  });

  return (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
      <h4 className="font-semibold text-blue-900 mb-3">Create New Part</h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Part Name *</Label>
          <Input
            value={partData.name}
            onChange={(e) => setPartData({ ...partData, name: e.target.value })}
            placeholder="e.g., Engine Block"
          />
        </div>
        <div className="space-y-2">
          <Label>Part Number</Label>
          <Input
            value={partData.part_number}
            onChange={(e) => setPartData({ ...partData, part_number: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={partData.category} onValueChange={(v) => setPartData({ ...partData, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="engine">Engine</SelectItem>
              <SelectItem value="transmission">Transmission</SelectItem>
              <SelectItem value="brakes">Brakes</SelectItem>
              <SelectItem value="suspension">Suspension</SelectItem>
              <SelectItem value="electrical">Electrical</SelectItem>
              <SelectItem value="body_parts">Body Parts</SelectItem>
              <SelectItem value="interior">Interior</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Quantity</Label>
          <Input
            type="number"
            value={partData.quantity}
            onChange={(e) => setPartData({ ...partData, quantity: parseInt(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Cost Price ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={partData.cost_price}
            onChange={(e) => setPartData({ ...partData, cost_price: parseFloat(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Selling Price ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={partData.selling_price}
            onChange={(e) => setPartData({ ...partData, selling_price: parseFloat(e.target.value) })}
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Description</Label>
          <Textarea
            value={partData.description}
            onChange={(e) => setPartData({ ...partData, description: e.target.value })}
            rows={2}
          />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Button onClick={() => onSubmit(partData)} className="bg-blue-600 hover:bg-blue-700" size="sm">
          Create Part
        </Button>
        <Button onClick={onCancel} variant="outline" size="sm">
          Cancel
        </Button>
      </div>
    </div>
  );
}