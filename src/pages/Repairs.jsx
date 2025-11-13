import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Wrench } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Repairs() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRepair, setEditingRepair] = useState(null);
  const queryClient = useQueryClient();

  const { data: repairs = [] } = useQuery({
    queryKey: ['repairs'],
    queryFn: () => base44.entities.RepairOrder.list('-created_date'),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RepairOrder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repairs'] });
      setDialogOpen(false);
      setEditingRepair(null);
      toast.success("Repair order created!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RepairOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repairs'] });
      setDialogOpen(false);
      setEditingRepair(null);
      toast.success("Repair order updated!");
    },
  });

  const handleSave = (formData) => {
    if (editingRepair) {
      updateMutation.mutate({ id: editingRepair.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    waiting_parts: "bg-purple-100 text-purple-800",
    completed: "bg-green-100 text-green-800",
    picked_up: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800"
  };

  const priorityColors = {
    low: "bg-gray-100 text-gray-800",
    medium: "bg-blue-100 text-blue-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800"
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Auto Repair Orders</h1>
          <p className="text-gray-600">{repairs.length} total orders</p>
        </div>
        <Button onClick={() => {
          setEditingRepair(null);
          setDialogOpen(true);
        }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Repair Order
        </Button>
      </div>

      <div className="grid gap-4">
        {repairs.map((repair, index) => (
          <motion.div
            key={repair.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card 
              className="border-none shadow-md hover:shadow-lg transition-all cursor-pointer"
              onClick={() => {
                setEditingRepair(repair);
                setDialogOpen(true);
              }}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-bold text-lg">
                        {repair.vehicle_make} {repair.vehicle_model} {repair.vehicle_year}
                      </h3>
                      <Badge className={statusColors[repair.status]}>
                        {repair.status?.replace(/_/g, ' ')}
                      </Badge>
                      <Badge className={priorityColors[repair.priority]}>
                        {repair.priority} priority
                      </Badge>
                    </div>
                    <p className="text-gray-600">
                      <strong>Customer:</strong> {repair.customer_name} | {repair.customer_phone}
                    </p>
                    <p className="text-sm text-gray-500">
                      <strong>Service:</strong> {repair.service_type?.replace(/_/g, ' ')}
                    </p>
                    {repair.description && (
                      <p className="text-sm text-gray-600">{repair.description}</p>
                    )}
                    {repair.assigned_technician && (
                      <p className="text-sm text-gray-500">
                        <strong>Technician:</strong> {repair.assigned_technician}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold text-blue-600">
                      ${repair.total_cost?.toLocaleString() || '0'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {repair.payment_status === 'paid' ? '✓ Paid' : 'Pending'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <RepairDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingRepair(null);
        }}
        repair={editingRepair}
        onSave={handleSave}
      />
    </div>
  );
}

function RepairDialog({ open, onClose, repair, onSave }) {
  const [formData, setFormData] = useState(repair || {
    order_number: `RO-${Date.now()}`,
    customer_name: "",
    customer_phone: "",
    vehicle_make: "",
    vehicle_model: "",
    vehicle_year: new Date().getFullYear(),
    vehicle_plate: "",
    mileage: 0,
    service_type: "routine_maintenance",
    description: "",
    diagnosis: "",
    status: "pending",
    priority: "medium",
    assigned_technician: "",
    labor_cost: 0,
    parts_cost: 0,
    total_cost: 0,
    payment_status: "pending",
    start_date: new Date().toISOString().split('T')[0],
    notes: ""
  });

  React.useEffect(() => {
    if (repair) setFormData(repair);
  }, [repair]);

  React.useEffect(() => {
    const total = (formData.labor_cost || 0) + (formData.parts_cost || 0);
    setFormData(prev => ({ ...prev, total_cost: total }));
  }, [formData.labor_cost, formData.parts_cost]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{repair ? 'Edit Repair Order' : 'New Repair Order'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input value={formData.customer_name} onChange={(e) => setFormData({...formData, customer_name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input value={formData.customer_phone} onChange={(e) => setFormData({...formData, customer_phone: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Vehicle Make *</Label>
              <Input value={formData.vehicle_make} onChange={(e) => setFormData({...formData, vehicle_make: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Vehicle Model *</Label>
              <Input value={formData.vehicle_model} onChange={(e) => setFormData({...formData, vehicle_model: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input type="number" value={formData.vehicle_year} onChange={(e) => setFormData({...formData, vehicle_year: parseInt(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>License Plate</Label>
              <Input value={formData.vehicle_plate} onChange={(e) => setFormData({...formData, vehicle_plate: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Service Type</Label>
              <Select value={formData.service_type} onValueChange={(v) => setFormData({...formData, service_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine_maintenance">Routine Maintenance</SelectItem>
                  <SelectItem value="oil_change">Oil Change</SelectItem>
                  <SelectItem value="brake_service">Brake Service</SelectItem>
                  <SelectItem value="engine_repair">Engine Repair</SelectItem>
                  <SelectItem value="transmission_repair">Transmission Repair</SelectItem>
                  <SelectItem value="electrical_repair">Electrical Repair</SelectItem>
                  <SelectItem value="body_work">Body Work</SelectItem>
                  <SelectItem value="tire_service">Tire Service</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="waiting_parts">Waiting Parts</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="picked_up">Picked Up</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assigned Technician</Label>
              <Input value={formData.assigned_technician} onChange={(e) => setFormData({...formData, assigned_technician: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Labor Cost ($)</Label>
              <Input type="number" value={formData.labor_cost} onChange={(e) => setFormData({...formData, labor_cost: parseFloat(e.target.value) || 0})} />
            </div>
            <div className="space-y-2">
              <Label>Parts Cost ($)</Label>
              <Input type="number" value={formData.parts_cost} onChange={(e) => setFormData({...formData, parts_cost: parseFloat(e.target.value) || 0})} />
            </div>
            <div className="space-y-2">
              <Label>Total Cost ($)</Label>
              <Input type="number" value={formData.total_cost} disabled className="bg-gray-50" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Problem Description</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Diagnosis</Label>
            <Textarea value={formData.diagnosis} onChange={(e) => setFormData({...formData, diagnosis: e.target.value})} rows={2} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formData)} className="bg-blue-600 hover:bg-blue-700">
            {repair ? 'Update' : 'Create'} Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}