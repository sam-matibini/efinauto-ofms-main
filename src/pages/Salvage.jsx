import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "../components/shared/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Trash2, Edit, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function Salvage() {
  const { selectedCompanyId } = useCompany();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSalvage, setEditingSalvage] = useState(null);
  const queryClient = useQueryClient();

  const { data: salvageVehicles = [] } = useQuery({
    queryKey: ['salvage', selectedCompanyId],
    queryFn: () => base44.entities.SalvageVehicle.filter({ company_id: selectedCompanyId }, '-intake_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SalvageVehicle.create({ ...data, company_id: selectedCompanyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salvage'] });
      setDialogOpen(false);
      setEditingSalvage(null);
      toast.success("Salvage vehicle added!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SalvageVehicle.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salvage'] });
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Salvage & Dismantling</h1>
          <p className="text-gray-600">{filteredVehicles.length} vehicles</p>
        </div>
        <Button onClick={() => {
          setEditingSalvage(null);
          setDialogOpen(true);
        }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Salvage Vehicle
        </Button>
      </div>

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
        {filteredVehicles.map((vehicle, index) => (
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
        ))}
      </div>

      <SalvageDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingSalvage(null);
        }}
        salvage={editingSalvage}
        onSave={handleSave}
      />
    </div>
  );
}

function SalvageDialog({ open, onClose, salvage, onSave }) {
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
    notes: ""
  });

  React.useEffect(() => {
    if (salvage) {
      setFormData({
        ...salvage,
        compliance: salvage.compliance || {
          tires_removed: false,
          fluids_drained: false,
          battery_removed: false,
          airbags_deployed: false,
          catalytic_converter_removed: false,
          hazmat_handled: false
        },
        scrap_weights: salvage.scrap_weights || {
          ferrous_metal_kg: 0,
          non_ferrous_metal_kg: 0,
          aluminum_kg: 0,
          copper_kg: 0,
          total_weight_kg: 0,
          scrap_value: 0
        }
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{salvage ? 'Edit Salvage Vehicle' : 'Add Salvage Vehicle'}</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="scrap">Scrap Weights</TabsTrigger>
            <TabsTrigger value="dismantling">Dismantling</TabsTrigger>
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
            <p className="text-sm text-gray-500">Dismantling log feature coming soon - track parts extracted, operator, and timestamps</p>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formData)} className="bg-blue-600 hover:bg-blue-700">
            {salvage ? 'Update' : 'Add'} Vehicle
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}