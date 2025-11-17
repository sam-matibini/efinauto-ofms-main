
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Plane } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Exports() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExport, setEditingExport] = useState(null);
  const queryClient = useQueryClient();

  const { data: exports = [] } = useQuery({
    queryKey: ['exports'],
    queryFn: () => base44.entities.Export.list('-created_date'),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Export.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exports'] });
      setDialogOpen(false);
      setEditingExport(null);
      toast.success("Export order created!");
    },
    onError: (error) => {
      toast.error(`Failed to create export order: ${error.message || 'Unknown error'}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Export.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exports'] });
      setDialogOpen(false);
      setEditingExport(null);
      toast.success("Export order updated!");
    },
    onError: (error) => {
      toast.error(`Failed to update export order: ${error.message || 'Unknown error'}`);
    }
  });

  const handleSave = (formData) => {
    if (!formData.customer_name || !formData.destination_country) {
      toast.error("Customer name and destination country are required");
      return;
    }

    if (editingExport) {
      updateMutation.mutate({ id: editingExport.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    documents_prepared: "bg-blue-100 text-blue-800",
    customs_cleared: "bg-purple-100 text-purple-800",
    shipped: "bg-indigo-100 text-indigo-800",
    in_transit: "bg-cyan-100 text-cyan-800",
    delivered: "bg-green-100 text-green-800"
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Export Management</h1>
          <p className="text-gray-600">{exports.length} export orders</p>
        </div>
        <Button onClick={() => {
          setEditingExport(null);
          setDialogOpen(true);
        }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Export Order
        </Button>
      </div>

      <div className="grid gap-4">
        {exports.map((exportOrder, index) => (
          <motion.div
            key={exportOrder.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card 
              className="border-none shadow-md hover:shadow-lg transition-all cursor-pointer"
              onClick={() => {
                setEditingExport(exportOrder);
                setDialogOpen(true);
              }}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <Plane className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-lg">{exportOrder.export_number || 'Export Order'}</h3>
                      <Badge className={statusColors[exportOrder.status]}>
                        {exportOrder.status?.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant="outline">{exportOrder.export_type}</Badge>
                    </div>
                    <p className="text-gray-600">
                      <strong>Customer:</strong> {exportOrder.customer_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      <strong>Destination:</strong> {exportOrder.destination_country} - {exportOrder.destination_port || 'N/A'}
                    </p>
                    {exportOrder.tracking_number && (
                      <p className="text-sm text-gray-500">
                        <strong>Tracking:</strong> {exportOrder.tracking_number}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold text-blue-600">
                      ${exportOrder.total_value?.toLocaleString() || '0'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {exportOrder.payment_status === 'paid' ? '✓ Paid' : 'Pending Payment'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <ExportDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingExport(null);
        }}
        exportOrder={editingExport}
        onSave={handleSave}
      />
    </div>
  );
}

function ExportDialog({ open, onClose, exportOrder, onSave }) {
  const [formData, setFormData] = useState(exportOrder || {
    export_number: `EXP-${Date.now()}`,
    export_type: "vehicle",
    customer_name: "",
    customer_country: "",
    customer_email: "",
    customer_phone: "",
    destination_country: "",
    destination_port: "",
    destination_address: "",
    total_value: 0,
    freight_cost: 0,
    customs_value: 0,
    insurance_cost: 0,
    status: "pending",
    payment_terms: "advance",
    payment_status: "pending",
    tracking_number: "",
    notes: ""
  });

  React.useEffect(() => {
    // Reset form data when the dialog opens or exportOrder changes
    if (open) {
      setFormData(exportOrder || {
        export_number: `EXP-${Date.now()}`,
        export_type: "vehicle",
        customer_name: "",
        customer_country: "",
        customer_email: "",
        customer_phone: "",
        destination_country: "",
        destination_port: "",
        destination_address: "",
        total_value: 0,
        freight_cost: 0,
        customs_value: 0,
        insurance_cost: 0,
        status: "pending",
        payment_terms: "advance",
        payment_status: "pending",
        tracking_number: "",
        notes: ""
      });
    }
  }, [open, exportOrder]);

  const canSave = formData.customer_name?.trim().length > 0 && 
                  formData.destination_country?.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{exportOrder ? 'Edit Export Order' : 'New Export Order'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Export Type</Label>
              <Select value={formData.export_type} onValueChange={(v) => setFormData({...formData, export_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                  <SelectItem value="parts">Parts</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input value={formData.customer_name} onChange={(e) => setFormData({...formData, customer_name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Customer Country</Label>
              <Input value={formData.customer_country} onChange={(e) => setFormData({...formData, customer_country: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Customer Phone</Label>
              <Input value={formData.customer_phone} onChange={(e) => setFormData({...formData, customer_phone: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Destination Country *</Label>
              <Input value={formData.destination_country} onChange={(e) => setFormData({...formData, destination_country: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Destination Port</Label>
              <Input value={formData.destination_port} onChange={(e) => setFormData({...formData, destination_port: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Total Value ($)</Label>
              <Input type="number" value={formData.total_value} onChange={(e) => setFormData({...formData, total_value: parseFloat(e.target.value) || 0})} />
            </div>
            <div className="space-y-2">
              <Label>Freight Cost ($)</Label>
              <Input type="number" value={formData.freight_cost} onChange={(e) => setFormData({...formData, freight_cost: parseFloat(e.target.value) || 0})} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="documents_prepared">Documents Prepared</SelectItem>
                  <SelectItem value="customs_cleared">Customs Cleared</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tracking Number</Label>
              <Input value={formData.tracking_number} onChange={(e) => setFormData({...formData, tracking_number: e.target.value})} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Destination Address</Label>
            <Textarea value={formData.destination_address} onChange={(e) => setFormData({...formData, destination_address: e.target.value})} rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={2} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={() => onSave(formData)} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!canSave}
          >
            {exportOrder ? 'Update' : 'Create'} Export Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
