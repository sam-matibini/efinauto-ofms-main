import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Clock, CheckCircle, Edit, Trash2 } from "lucide-react";
import { useCompany } from "@/components/shared/CompanyContext";
import { toast } from "sonner";

export default function TimesheetView({ technicians }) {
  const { selectedCompanyId } = useCompany();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const queryClient = useQueryClient();

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets', selectedCompanyId, dateFilter],
    queryFn: () => base44.entities.Timesheet.filter({ 
      company_id: selectedCompanyId,
      date: dateFilter 
    }, '-clock_in'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: repairOrders = [] } = useQuery({
    queryKey: ['repairs', selectedCompanyId],
    queryFn: () => base44.entities.RepairOrder.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Timesheet.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      toast.success("Timesheet entry added");
      setDialogOpen(false);
      setEditingEntry(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Timesheet.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      toast.success("Timesheet updated");
      setDialogOpen(false);
      setEditingEntry(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Timesheet.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      toast.success("Timesheet deleted");
    },
  });

  const handleSave = (data) => {
    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const totalHours = timesheets.reduce((sum, t) => sum + (t.total_hours || 0), 0);
  const billableHours = timesheets.filter(t => t.billable).reduce((sum, t) => sum + (t.total_hours || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="pt-6">
            <p className="text-sm text-gray-600">
              Total: <strong>{totalHours.toFixed(1)}h</strong> | 
              Billable: <strong>{billableHours.toFixed(1)}h</strong>
            </p>
          </div>
        </div>
        <Button onClick={() => {
          setEditingEntry(null);
          setDialogOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Clock In/Out
        </Button>
      </div>

      <div className="space-y-3">
        {timesheets.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No timesheet entries for this date</p>
            </CardContent>
          </Card>
        ) : (
          timesheets.map((entry) => (
            <Card key={entry.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{entry.technician_name}</h4>
                      {entry.billable ? (
                        <Badge className="bg-green-100 text-green-700">Billable</Badge>
                      ) : (
                        <Badge variant="outline">Non-billable</Badge>
                      )}
                      {entry.approved && (
                        <Badge className="bg-blue-100 text-blue-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approved
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>
                        <Clock className="w-3 h-3 inline mr-1" />
                        {entry.clock_in} - {entry.clock_out || 'Active'} 
                        <strong className="ml-2">{entry.total_hours?.toFixed(1)}h</strong>
                      </p>
                      {entry.repair_order_number && (
                        <p>Order: <strong>{entry.repair_order_number}</strong></p>
                      )}
                      {entry.task_description && (
                        <p className="text-gray-700">{entry.task_description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingEntry(entry);
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(entry.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <TimesheetDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingEntry(null);
        }}
        entry={editingEntry}
        technicians={technicians}
        repairOrders={repairOrders}
        onSave={handleSave}
        defaultDate={dateFilter}
      />
    </div>
  );
}

function TimesheetDialog({ open, onClose, entry, technicians, repairOrders, onSave, defaultDate }) {
  const { selectedCompanyId } = useCompany();
  const [formData, setFormData] = useState({
    company_id: selectedCompanyId,
    technician_id: "",
    technician_name: "",
    repair_order_id: "",
    repair_order_number: "",
    date: defaultDate,
    clock_in: "",
    clock_out: "",
    total_hours: 0,
    task_description: "",
    billable: true,
    approved: false,
    notes: ""
  });

  useEffect(() => {
    if (entry) {
      setFormData(entry);
    } else {
      setFormData({
        company_id: selectedCompanyId,
        technician_id: "",
        technician_name: "",
        repair_order_id: "",
        repair_order_number: "",
        date: defaultDate,
        clock_in: new Date().toTimeString().slice(0, 5),
        clock_out: "",
        total_hours: 0,
        task_description: "",
        billable: true,
        approved: false,
        notes: ""
      });
    }
  }, [entry, open, selectedCompanyId, defaultDate]);

  useEffect(() => {
    if (formData.clock_in && formData.clock_out) {
      const start = new Date(`2000-01-01T${formData.clock_in}`);
      const end = new Date(`2000-01-01T${formData.clock_out}`);
      const hours = (end - start) / (1000 * 60 * 60);
      setFormData(prev => ({ ...prev, total_hours: Math.max(0, hours) }));
    }
  }, [formData.clock_in, formData.clock_out]);

  const handleTechnicianSelect = (techId) => {
    const tech = technicians.find(t => t.id === techId);
    if (tech) {
      setFormData({
        ...formData,
        technician_id: techId,
        technician_name: tech.full_name
      });
    }
  };

  const handleOrderSelect = (orderId) => {
    const order = repairOrders.find(o => o.id === orderId);
    if (order) {
      setFormData({
        ...formData,
        repair_order_id: orderId,
        repair_order_number: order.order_number
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entry ? 'Edit' : 'Add'} Timesheet Entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Technician *</Label>
            <Select value={formData.technician_id} onValueChange={handleTechnicianSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select technician" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map(tech => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.full_name} - {tech.employee_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Repair Order (Optional)</Label>
            <Select value={formData.repair_order_id} onValueChange={handleOrderSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {repairOrders.map(order => (
                  <SelectItem key={order.id} value={order.id}>
                    {order.order_number} - {order.customer_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Clock In *</Label>
              <Input
                type="time"
                value={formData.clock_in}
                onChange={(e) => setFormData({ ...formData, clock_in: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Clock Out</Label>
              <Input
                type="time"
                value={formData.clock_out}
                onChange={(e) => setFormData({ ...formData, clock_out: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Total Hours</Label>
            <Input
              type="number"
              value={formData.total_hours}
              onChange={(e) => setFormData({ ...formData, total_hours: parseFloat(e.target.value) || 0 })}
              step="0.25"
            />
          </div>

          <div className="space-y-2">
            <Label>Task Description</Label>
            <Textarea
              value={formData.task_description}
              onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.billable}
                onChange={(e) => setFormData({ ...formData, billable: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Billable</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.approved}
                onChange={(e) => setFormData({ ...formData, approved: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Approved</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formData)}>
            {entry ? 'Update' : 'Save'} Entry
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}