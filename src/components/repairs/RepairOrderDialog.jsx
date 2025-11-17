import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Clock, Save } from "lucide-react";
import { useCompany } from "@/components/shared/CompanyContext";
import CustomerSelector from "@/components/shared/CustomerSelector";
import PartsSelector from "@/components/repairs/PartsSelector";
import TimeTrackingTab from "@/components/repairs/TimeTrackingTab";

export default function RepairOrderDialog({ open, onClose, order, onSave, customers }) {
  const { selectedCompanyId } = useCompany();
  const [formData, setFormData] = useState({
    company_id: selectedCompanyId,
    order_number: `RO-${Date.now()}`,
    customer_id: "",
    customer_name: "",
    customer_phone: "",
    vehicle_make: "",
    vehicle_model: "",
    vehicle_year: new Date().getFullYear(),
    vehicle_vin: "",
    vehicle_plate: "",
    mileage: 0,
    service_type: "routine_maintenance",
    description: "",
    diagnosis: "",
    status: "pending",
    priority: "medium",
    assigned_technician: "",
    time_tracking: [],
    total_labor_hours: 0,
    hourly_rate: 100,
    parts_used: [],
    labor_cost: 0,
    parts_cost: 0,
    tax_amount: 0,
    total_cost: 0,
    payment_status: "pending",
    payment_method: "cash",
    start_date: new Date().toISOString().split('T')[0],
    estimated_completion: "",
    notes: ""
  });

  useEffect(() => {
    if (order) {
      setFormData({
        ...formData,
        ...order
      });
    }
  }, [order]);

  useEffect(() => {
    const laborCost = (formData.total_labor_hours || 0) * (formData.hourly_rate || 0);
    const partsCost = (formData.parts_used || []).reduce((sum, p) => sum + (p.total_cost || 0), 0);
    const taxAmount = (laborCost + partsCost) * 0.13; // 13% tax
    const totalCost = laborCost + partsCost + taxAmount;
    
    setFormData(prev => ({
      ...prev,
      labor_cost: laborCost,
      parts_cost: partsCost,
      tax_amount: taxAmount,
      total_cost: totalCost
    }));
  }, [formData.total_labor_hours, formData.hourly_rate, formData.parts_used]);

  const handleCustomerSelect = (customer) => {
    setFormData({
      ...formData,
      customer_id: customer.id,
      customer_name: customer.full_name,
      customer_phone: customer.phone
    });
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? 'Edit' : 'Create'} Repair Order</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="vehicle">Vehicle</TabsTrigger>
            <TabsTrigger value="service">Service</TabsTrigger>
            <TabsTrigger value="parts">Parts</TabsTrigger>
            <TabsTrigger value="time">Time & Cost</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Order Number</Label>
                <Input
                  value={formData.order_number}
                  onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Customer</Label>
              <CustomerSelector
                value={formData.customer_id}
                onSelect={handleCustomerSelect}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Phone</Label>
                <Input
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Assigned Technician</Label>
                <Input
                  value={formData.assigned_technician}
                  onChange={(e) => setFormData({ ...formData, assigned_technician: e.target.value })}
                  placeholder="Technician name"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="vehicle" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={formData.vehicle_year}
                  onChange={(e) => setFormData({ ...formData, vehicle_year: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Make</Label>
                <Input
                  value={formData.vehicle_make}
                  onChange={(e) => setFormData({ ...formData, vehicle_make: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={formData.vehicle_model}
                  onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>VIN Number</Label>
                <Input
                  value={formData.vehicle_vin}
                  onChange={(e) => setFormData({ ...formData, vehicle_vin: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>License Plate</Label>
                <Input
                  value={formData.vehicle_plate}
                  onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mileage (km)</Label>
              <Input
                type="number"
                value={formData.mileage}
                onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) || 0 })}
              />
            </div>
          </TabsContent>

          <TabsContent value="service" className="space-y-4">
            <div className="space-y-2">
              <Label>Service Type</Label>
              <Select value={formData.service_type} onValueChange={(value) => setFormData({ ...formData, service_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
              <Label>Problem Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                placeholder="Describe the issue or service needed..."
              />
            </div>

            <div className="space-y-2">
              <Label>Diagnosis</Label>
              <Textarea
                value={formData.diagnosis}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                rows={4}
                placeholder="Technical diagnosis and findings..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <Label>Estimated Completion</Label>
                <Input
                  type="date"
                  value={formData.estimated_completion}
                  onChange={(e) => setFormData({ ...formData, estimated_completion: e.target.value })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="parts" className="space-y-4">
            <PartsSelector
              parts={formData.parts_used || []}
              onChange={(parts) => setFormData({ ...formData, parts_used: parts })}
            />
          </TabsContent>

          <TabsContent value="time" className="space-y-4">
            <TimeTrackingTab
              timeTracking={formData.time_tracking || []}
              totalHours={formData.total_labor_hours}
              hourlyRate={formData.hourly_rate}
              onChange={(data) => setFormData({ ...formData, ...data })}
            />

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Cost Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Labor Cost:</span>
                    <span className="font-semibold">${formData.labor_cost?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Parts Cost:</span>
                    <span className="font-semibold">${formData.parts_cost?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (13%):</span>
                    <span className="font-semibold">${formData.tax_amount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-blue-300">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold text-lg">${formData.total_cost?.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label>Payment Status</Label>
                  <Select value={formData.payment_status} onValueChange={(value) => setFormData({ ...formData, payment_status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            Save Repair Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}