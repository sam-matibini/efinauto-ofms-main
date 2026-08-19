import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, User, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { useCompany } from "@/components/shared/CompanyContext";
import { toast } from "sonner";

export default function TechnicianScheduler({ open, onClose }) {
  const { selectedCompanyId } = useCompany();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("day"); // day, week
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const queryClient = useQueryClient();

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians', selectedCompanyId],
    queryFn: () => supabase.entities.Technician.filter({ 
      company_id: selectedCompanyId,
      status: 'active'
    }),
    enabled: !!selectedCompanyId && open,
    initialData: [],
  });

  const { data: repairOrders = [] } = useQuery({
    queryKey: ['repairs', selectedCompanyId],
    queryFn: () => supabase.entities.RepairOrder.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId && open,
    initialData: [],
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets-schedule', selectedCompanyId],
    queryFn: () => supabase.entities.Timesheet.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId && open,
    initialData: [],
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => supabase.entities.RepairOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repairs'] });
      toast.success("Technician assigned successfully");
      setAssignDialogOpen(false);
    },
  });

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  const getDateRange = () => {
    if (viewMode === "day") {
      return [selectedDate];
    } else {
      const week = [];
      const start = new Date(selectedDate);
      start.setDate(start.getDate() - start.getDay() + 1); // Start from Monday
      for (let i = 0; i < 5; i++) { // Monday to Friday
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        week.push(date);
      }
      return week;
    }
  };

  const dateRange = getDateRange();

  const getAssignmentsForSlot = (techId, date, time) => {
    const dateStr = date.toISOString().split('T')[0];
    
    // Check repair orders assigned to this tech
    const orders = repairOrders.filter(order => {
      if (order.assigned_technician !== getTechName(techId)) return false;
      if (order.status === 'completed' || order.status === 'cancelled') return false;
      
      const orderDate = order.estimated_completion || order.start_date;
      if (!orderDate) return false;
      
      return orderDate.startsWith(dateStr);
    });

    // Check timesheets
    const sheets = timesheets.filter(ts => {
      if (ts.technician_id !== techId) return false;
      if (ts.date !== dateStr) return false;
      
      if (time && ts.clock_in) {
        const slotTime = parseInt(time.split(':')[0]);
        const clockInTime = parseInt(ts.clock_in.split(':')[0]);
        const clockOutTime = ts.clock_out ? parseInt(ts.clock_out.split(':')[0]) : 18;
        return slotTime >= clockInTime && slotTime < clockOutTime;
      }
      
      return true;
    });

    return { orders, sheets };
  };

  const getTechName = (techId) => {
    const tech = technicians.find(t => t.id === techId);
    return tech?.full_name || '';
  };

  const getWorkloadColor = (techId, date) => {
    const { orders, sheets } = getAssignmentsForSlot(techId, date);
    const totalHours = sheets.reduce((sum, s) => sum + (s.total_hours || 0), 0);
    
    if (totalHours >= 8 || orders.length >= 3) return "bg-red-100 border-red-300";
    if (totalHours >= 6 || orders.length >= 2) return "bg-yellow-100 border-yellow-300";
    if (totalHours >= 4 || orders.length >= 1) return "bg-green-100 border-green-300";
    return "bg-white border-gray-200";
  };

  const handleSlotClick = (techId, date, time) => {
    setSelectedSlot({ techId, date, time });
    setAssignDialogOpen(true);
  };

  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() + direction);
    } else {
      newDate.setDate(newDate.getDate() + (direction * 7));
    }
    setSelectedDate(newDate);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Technician Scheduler
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controls */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                variant={viewMode === "day" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("day")}
              >
                Day View
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("week")}
              >
                Week View
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateDate(-1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-semibold min-w-[200px] text-center">
                {viewMode === "day" 
                  ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                  : `Week of ${dateRange[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                }
              </span>
              <Button variant="outline" size="icon" onClick={() => navigateDate(1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
                Today
              </Button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded" />
              <span>Light Load</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded" />
              <span>Medium Load</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded" />
              <span>Heavy Load</span>
            </div>
          </div>

          {/* Schedule Grid */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold sticky left-0 bg-gray-100 z-10">
                      Technician
                    </th>
                    {dateRange.map(date => (
                      <th key={date.toISOString()} className="p-3 text-center text-sm font-semibold min-w-[150px]">
                        {date.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          weekday: 'short'
                        })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {technicians.map(tech => (
                    <tr key={tech.id} className="border-t">
                      <td className="p-3 sticky left-0 bg-white z-10 border-r">
                        <div>
                          <div className="font-semibold text-sm">{tech.full_name}</div>
                          <div className="text-xs text-gray-500">{tech.employee_id}</div>
                          {tech.specialization && tech.specialization.length > 0 && (
                            <div className="text-xs text-blue-600 mt-1">
                              {tech.specialization.slice(0, 2).join(', ')}
                            </div>
                          )}
                        </div>
                      </td>
                      {dateRange.map(date => {
                        const { orders, sheets } = getAssignmentsForSlot(tech.id, date);
                        const totalHours = sheets.reduce((sum, s) => sum + (s.total_hours || 0), 0);
                        
                        return (
                          <td 
                            key={date.toISOString()} 
                            className={`p-2 cursor-pointer hover:bg-gray-50 transition-colors ${getWorkloadColor(tech.id, date)}`}
                            onClick={() => handleSlotClick(tech.id, date)}
                          >
                            <div className="space-y-1">
                              {orders.map(order => (
                                <div 
                                  key={order.id}
                                  className="text-xs p-1 bg-blue-200 rounded border border-blue-300"
                                >
                                  <div className="font-semibold truncate">
                                    {order.order_number}
                                  </div>
                                  <div className="text-gray-700 truncate">
                                    {order.customer_name}
                                  </div>
                                </div>
                              ))}
                              {totalHours > 0 && (
                                <div className="text-xs text-gray-600 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {totalHours.toFixed(1)}h logged
                                </div>
                              )}
                              {orders.length === 0 && totalHours === 0 && (
                                <div className="text-xs text-gray-400 text-center py-2">
                                  Available
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <AssignmentDialog
          open={assignDialogOpen}
          onClose={() => setAssignDialogOpen(false)}
          slot={selectedSlot}
          technicians={technicians}
          repairOrders={repairOrders}
          onAssign={(orderId, techId) => {
            const tech = technicians.find(t => t.id === techId);
            updateOrderMutation.mutate({
              id: orderId,
              data: { 
                assigned_technician: tech?.full_name,
                estimated_completion: selectedSlot?.date?.toISOString().split('T')[0]
              }
            });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function AssignmentDialog({ open, onClose, slot, technicians, repairOrders, onAssign }) {
  const [selectedOrder, setSelectedOrder] = useState("");
  const [selectedTech, setSelectedTech] = useState("");

  React.useEffect(() => {
    if (slot) {
      setSelectedTech(slot.techId);
    }
  }, [slot]);

  const unassignedOrders = repairOrders.filter(o => 
    !o.assigned_technician && 
    ['pending', 'waiting_parts'].includes(o.status)
  );

  const handleAssign = () => {
    if (selectedOrder && selectedTech) {
      onAssign(selectedOrder, selectedTech);
      setSelectedOrder("");
      onClose();
    }
  };

  if (!slot) return null;

  const tech = technicians.find(t => t.id === slot.techId);
  const dateStr = slot.date?.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Repair Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm text-gray-600">
              <strong>Technician:</strong> {tech?.full_name}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Date:</strong> {dateStr}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Repair Order</Label>
            <Select value={selectedOrder} onValueChange={setSelectedOrder}>
              <SelectTrigger>
                <SelectValue placeholder="Select repair order" />
              </SelectTrigger>
              <SelectContent>
                {unassignedOrders.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No unassigned orders available
                  </div>
                ) : (
                  unassignedOrders.map(order => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.order_number} - {order.customer_name} ({order.vehicle_make} {order.vehicle_model})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reassign to Different Technician (Optional)</Label>
            <Select value={selectedTech} onValueChange={setSelectedTech}>
              <SelectTrigger>
                <SelectValue placeholder="Select technician" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.full_name} - {t.employee_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleAssign}
            disabled={!selectedOrder || !selectedTech}
          >
            Assign Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}