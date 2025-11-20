import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Plus, Check, X, Edit } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function TimesheetManagement({ company, employees, timeEntries, queryClient }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editingEntry, setEditingEntry] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: "",
    date: new Date().toISOString().split('T')[0],
    clock_in: "09:00",
    clock_out: "17:00",
    regular_hours: 8,
    overtime_hours: 0,
    break_hours: 0,
    entry_type: "regular",
    notes: ""
  });

  const createTimeEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.TimeEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      toast.success("Time entry added successfully");
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("Failed to add time entry")
  });

  const updateTimeEntryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimeEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      toast.success("Time entry updated successfully");
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("Failed to update time entry")
  });

  const approveTimeEntryMutation = useMutation({
    mutationFn: ({ id, approved }) => base44.entities.TimeEntry.update(id, { 
      approved,
      approved_date: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      toast.success("Time entry status updated");
    },
    onError: () => toast.error("Failed to update time entry")
  });

  const resetForm = () => {
    setFormData({
      employee_id: "",
      date: new Date().toISOString().split('T')[0],
      clock_in: "09:00",
      clock_out: "17:00",
      regular_hours: 8,
      overtime_hours: 0,
      break_hours: 0,
      entry_type: "regular",
      notes: ""
    });
    setEditingEntry(null);
  };

  const handleSave = () => {
    if (!formData.employee_id || !formData.date) {
      toast.error("Please fill in all required fields");
      return;
    }

    const employee = employees.find(e => e.id === formData.employee_id);
    const data = {
      ...formData,
      company_id: company.id,
      employee_name: employee ? `${employee.first_name} ${employee.last_name}` : "",
      regular_hours: parseFloat(formData.regular_hours) || 0,
      overtime_hours: parseFloat(formData.overtime_hours) || 0,
      break_hours: parseFloat(formData.break_hours) || 0,
      approved: false
    };

    if (editingEntry) {
      updateTimeEntryMutation.mutate({ id: editingEntry.id, data });
    } else {
      createTimeEntryMutation.mutate(data);
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setFormData({
      employee_id: entry.employee_id,
      date: entry.date,
      clock_in: entry.clock_in || "09:00",
      clock_out: entry.clock_out || "17:00",
      regular_hours: entry.regular_hours || 0,
      overtime_hours: entry.overtime_hours || 0,
      break_hours: entry.break_hours || 0,
      entry_type: entry.entry_type || "regular",
      notes: entry.notes || ""
    });
    setDialogOpen(true);
  };

  const filteredEntries = timeEntries.filter(entry => {
    const matchesEmployee = !selectedEmployee || entry.employee_id === selectedEmployee;
    const matchesStartDate = !startDate || entry.date >= startDate;
    const matchesEndDate = !endDate || entry.date <= endDate;
    return matchesEmployee && matchesStartDate && matchesEndDate;
  });

  const getEntryTypeColor = (type) => {
    switch (type) {
      case 'regular': return 'bg-blue-100 text-blue-800';
      case 'overtime': return 'bg-purple-100 text-purple-800';
      case 'vacation': return 'bg-green-100 text-green-800';
      case 'sick': return 'bg-red-100 text-red-800';
      case 'holiday': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Timesheet Management</CardTitle>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Time Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <Label>Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Employees</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Time Entries List */}
          <div className="space-y-3">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No time entries found</p>
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <Card key={entry.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{entry.employee_name}</h3>
                              <Badge className={getEntryTypeColor(entry.entry_type)}>
                                {entry.entry_type}
                              </Badge>
                              {entry.approved ? (
                                <Badge className="bg-green-100 text-green-800">Approved</Badge>
                              ) : (
                                <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {new Date(entry.date).toLocaleDateString('en-CA')} • 
                              {entry.clock_in && entry.clock_out && ` ${entry.clock_in} - ${entry.clock_out} • `}
                              Regular: {entry.regular_hours}h
                              {entry.overtime_hours > 0 && ` • Overtime: ${entry.overtime_hours}h`}
                            </p>
                            {entry.notes && (
                              <p className="text-xs text-gray-500 mt-1">{entry.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!entry.approved && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => approveTimeEntryMutation.mutate({ id: entry.id, approved: true })}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEdit(entry)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          </>
                        )}
                        {entry.approved && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => approveTimeEntryMutation.mutate({ id: entry.id, approved: false })}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Unapprove
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Time Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Time Entry' : 'Add Time Entry'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee *</Label>
              <Select 
                value={formData.employee_id} 
                onValueChange={(value) => setFormData({...formData, employee_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.employment_status === 'active').map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div>
                <Label>Entry Type</Label>
                <Select 
                  value={formData.entry_type} 
                  onValueChange={(value) => setFormData({...formData, entry_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="overtime">Overtime</SelectItem>
                    <SelectItem value="vacation">Vacation</SelectItem>
                    <SelectItem value="sick">Sick</SelectItem>
                    <SelectItem value="holiday">Holiday</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Clock In</Label>
                <Input
                  type="time"
                  value={formData.clock_in}
                  onChange={(e) => setFormData({...formData, clock_in: e.target.value})}
                />
              </div>
              <div>
                <Label>Clock Out</Label>
                <Input
                  type="time"
                  value={formData.clock_out}
                  onChange={(e) => setFormData({...formData, clock_out: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Regular Hours</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={formData.regular_hours}
                  onChange={(e) => setFormData({...formData, regular_hours: e.target.value})}
                />
              </div>
              <div>
                <Label>Overtime Hours</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={formData.overtime_hours}
                  onChange={(e) => setFormData({...formData, overtime_hours: e.target.value})}
                />
              </div>
              <div>
                <Label>Break Hours</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={formData.break_hours}
                  onChange={(e) => setFormData({...formData, break_hours: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Optional notes..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={createTimeEntryMutation.isPending || updateTimeEntryMutation.isPending}>
                {editingEntry ? 'Update' : 'Add'} Entry
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}