import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "../components/shared/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Package, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import LoadingDeclarationForm from "../components/freight/LoadingDeclarationForm";

export default function Freight() {
  const { selectedCompanyId } = useCompany();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState(null);
  const queryClient = useQueryClient();

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments', selectedCompanyId],
    queryFn: () => base44.entities.FreightShipment.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FreightShipment.create({ ...data, company_id: selectedCompanyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      setDialogOpen(false);
      setEditingShipment(null);
      toast.success("Freight shipment created!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FreightShipment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      setDialogOpen(false);
      setEditingShipment(null);
      toast.success("Shipment updated!");
    },
  });

  const handleSave = (formData) => {
    if (editingShipment) {
      updateMutation.mutate({ id: editingShipment.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const statusColors = {
    booked: "bg-yellow-100 text-yellow-800",
    picked_up: "bg-blue-100 text-blue-800",
    in_transit: "bg-purple-100 text-purple-800",
    customs_clearance: "bg-orange-100 text-orange-800",
    out_for_delivery: "bg-cyan-100 text-cyan-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800"
  };

  if (!selectedCompanyId) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Please select a company to view freight shipments</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Freight & Cargo Management</h1>
          <p className="text-gray-600">{shipments.length} shipments</p>
        </div>
        <Button onClick={() => {
          setEditingShipment(null);
          setDialogOpen(true);
        }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Shipment
        </Button>
      </div>

      <div className="grid gap-4">
        {shipments.map((shipment, index) => (
          <motion.div
            key={shipment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card 
              className="border-none shadow-md hover:shadow-lg transition-all cursor-pointer"
              onClick={() => {
                setEditingShipment(shipment);
                setDialogOpen(true);
              }}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Package className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-lg">{shipment.shipment_number || 'Shipment'}</h3>
                      <Badge className={statusColors[shipment.status]}>
                        {shipment.status?.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant="outline">{shipment.shipment_type}</Badge>
                      <Badge variant="outline">{shipment.cargo_type}</Badge>
                      {shipment.loading_declaration && (
                        <Badge className="bg-blue-100 text-blue-800">
                          <FileText className="w-3 h-3 mr-1" />
                          Declaration
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-600">
                      <strong>Customer:</strong> {shipment.customer_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      <strong>Route:</strong> {shipment.origin_country} → {shipment.destination_country}
                    </p>
                    {shipment.tracking_number && (
                      <p className="text-sm text-gray-500">
                        <strong>Tracking:</strong> {shipment.tracking_number}
                      </p>
                    )}
                    {shipment.carrier_name && (
                      <p className="text-sm text-gray-500">
                        <strong>Carrier:</strong> {shipment.carrier_name}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold text-blue-600">
                      ${shipment.total_cost?.toLocaleString() || '0'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {shipment.payment_status === 'paid' ? '✓ Paid' : 'Pending'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <FreightDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingShipment(null);
        }}
        shipment={editingShipment}
        onSave={handleSave}
      />
    </div>
  );
}

function FreightDialog({ open, onClose, shipment, onSave }) {
  const [activeTab, setActiveTab] = useState("basic");
  const [formData, setFormData] = useState(shipment || {
    shipment_number: `FRT-${Date.now()}`,
    customer_name: "",
    customer_phone: "",
    shipment_type: "sea",
    cargo_type: "vehicle",
    origin_location: "",
    origin_country: "",
    destination_location: "",
    destination_country: "",
    cargo_description: "",
    number_of_items: 1,
    total_weight: 0,
    total_volume: 0,
    cargo_value: 0,
    freight_cost: 0,
    insurance_cost: 0,
    handling_fees: 0,
    customs_fees: 0,
    total_cost: 0,
    status: "booked",
    carrier_name: "",
    tracking_number: "",
    container_number: "",
    payment_status: "pending",
    notes: "",
    loading_declaration: null
  });

  React.useEffect(() => {
    if (shipment) {
      setFormData({
        ...shipment,
        loading_declaration: shipment.loading_declaration || null
      });
    }
  }, [shipment]);

  React.useEffect(() => {
    const total = (formData.freight_cost || 0) + (formData.insurance_cost || 0) + 
                  (formData.handling_fees || 0) + (formData.customs_fees || 0);
    setFormData(prev => ({ ...prev, total_cost: total }));
  }, [formData.freight_cost, formData.insurance_cost, formData.handling_fees, formData.customs_fees]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{shipment ? 'Edit Freight Shipment' : 'New Freight Shipment'}</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="declaration">Loading Declaration</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input value={formData.customer_name} onChange={(e) => setFormData({...formData, customer_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Customer Phone</Label>
                <Input value={formData.customer_phone} onChange={(e) => setFormData({...formData, customer_phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Shipment Type</Label>
                <Select value={formData.shipment_type} onValueChange={(v) => setFormData({...formData, shipment_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="air">Air</SelectItem>
                    <SelectItem value="sea">Sea</SelectItem>
                    <SelectItem value="land">Land</SelectItem>
                    <SelectItem value="rail">Rail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cargo Type</Label>
                <Select value={formData.cargo_type} onValueChange={(v) => setFormData({...formData, cargo_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vehicle">Vehicle</SelectItem>
                    <SelectItem value="parts">Parts</SelectItem>
                    <SelectItem value="general_cargo">General Cargo</SelectItem>
                    <SelectItem value="hazardous">Hazardous</SelectItem>
                    <SelectItem value="refrigerated">Refrigerated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Origin Country *</Label>
                <Input value={formData.origin_country} onChange={(e) => setFormData({...formData, origin_country: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Destination Country *</Label>
                <Input value={formData.destination_country} onChange={(e) => setFormData({...formData, destination_country: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Number of Items</Label>
                <Input type="number" value={formData.number_of_items} onChange={(e) => setFormData({...formData, number_of_items: parseInt(e.target.value) || 1})} />
              </div>
              <div className="space-y-2">
                <Label>Total Weight (kg)</Label>
                <Input type="number" value={formData.total_weight} onChange={(e) => setFormData({...formData, total_weight: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Cargo Value ($)</Label>
                <Input type="number" value={formData.cargo_value} onChange={(e) => setFormData({...formData, cargo_value: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Freight Cost ($)</Label>
                <Input type="number" value={formData.freight_cost} onChange={(e) => setFormData({...formData, freight_cost: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Insurance Cost ($)</Label>
                <Input type="number" value={formData.insurance_cost} onChange={(e) => setFormData({...formData, insurance_cost: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Handling Fees ($)</Label>
                <Input type="number" value={formData.handling_fees} onChange={(e) => setFormData({...formData, handling_fees: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Total Cost ($)</Label>
                <Input type="number" value={formData.total_cost} disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="booked">Booked</SelectItem>
                    <SelectItem value="picked_up">Picked Up</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="customs_clearance">Customs Clearance</SelectItem>
                    <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Carrier Name</Label>
                <Input value={formData.carrier_name} onChange={(e) => setFormData({...formData, carrier_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Tracking Number</Label>
                <Input value={formData.tracking_number} onChange={(e) => setFormData({...formData, tracking_number: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Container Number</Label>
                <Input value={formData.container_number} onChange={(e) => setFormData({...formData, container_number: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cargo Description</Label>
              <Textarea value={formData.cargo_description} onChange={(e) => setFormData({...formData, cargo_description: e.target.value})} rows={2} />
            </div>
          </TabsContent>

          <TabsContent value="declaration" className="space-y-4">
            <LoadingDeclarationForm
              declaration={formData.loading_declaration}
              onChange={(declaration) => setFormData({ ...formData, loading_declaration: declaration })}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formData)} className="bg-blue-600 hover:bg-blue-700">
            {shipment ? 'Update' : 'Create'} Shipment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}