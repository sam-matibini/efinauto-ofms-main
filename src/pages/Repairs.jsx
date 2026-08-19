import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Search, 
  Wrench, 
  Calendar,
  Clock,
  DollarSign,
  Users,
  CheckCircle,
  AlertCircle,
  Filter,
  CalendarDays,
  Sparkles
} from "lucide-react";
import { useCompany } from "@/components/shared/CompanyContext";
import { toast } from "sonner";
import RepairOrderDialog from "@/components/repairs/RepairOrderDialog";
import AppointmentDialog from "@/components/repairs/AppointmentDialog";
import ServicePackagesDialog from "@/components/repairs/ServicePackagesDialog";
import RepairOrderCard from "@/components/repairs/RepairOrderCard";
import InvoiceGenerator from "@/components/repairs/InvoiceGenerator";
import TechnicianScheduler from "@/components/technicians/TechnicianScheduler";
import WorkloadDashboard from "@/components/technicians/WorkloadDashboard";
import AIAppointmentOptimizer from "@/components/repairs/AIAppointmentOptimizer";
import AIFaultSearch from "@/components/repairs/AIFaultSearch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RepairsPage() {
  const { selectedCompanyId } = useCompany();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [packagesDialogOpen, setPackagesDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [schedulerDialogOpen, setSchedulerDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  const queryClient = useQueryClient();

  const { data: repairOrders = [], isLoading } = useQuery({
    queryKey: ['repairs', selectedCompanyId],
    queryFn: () => supabase.entities.RepairOrder.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', selectedCompanyId],
    queryFn: () => supabase.entities.Customer.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians', selectedCompanyId],
    queryFn: () => supabase.entities.Technician.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const repairOrder = await supabase.entities.RepairOrder.create(data);
      
      // Create accounting transaction for service revenue
      if (repairOrder.total_cost > 0) {
        await supabase.entities.Transaction.create({
          company_id: selectedCompanyId,
          transaction_number: repairOrder.order_number || `RO-${repairOrder.id.slice(0, 8)}`,
          transaction_type: 'service_revenue',
          category: 'revenue',
          amount: repairOrder.total_cost || 0,
          reference_type: 'RepairOrder',
          reference_id: repairOrder.id,
          reference_number: repairOrder.order_number,
          customer_name: repairOrder.customer_name,
          description: `Auto repair: ${repairOrder.vehicle_year} ${repairOrder.vehicle_make} ${repairOrder.vehicle_model}`,
          transaction_date: repairOrder.completion_date || new Date().toISOString().split('T')[0],
          payment_method: repairOrder.payment_method || 'other',
          status: repairOrder.payment_status === 'paid' ? 'completed' : 'pending',
          tax_amount: repairOrder.tax_amount || 0
        });
      }
      
      return repairOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repairs'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success("Repair order created successfully");
      setDialogOpen(false);
      setEditingOrder(null);
      setSelectedPackage(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const oldOrder = repairOrders.find(r => r.id === id);
      const updated = await supabase.entities.RepairOrder.update(id, data);
      
      // If status changed to completed and has costs, record revenue
      if (data.status === 'completed' && oldOrder?.status !== 'completed') {
        // Record labor revenue
        if (data.labor_cost > 0) {
          await supabase.entities.Transaction.create({
            company_id: selectedCompanyId,
            transaction_number: `SRV-${id.slice(0, 8)}`,
            transaction_type: 'service_revenue',
            category: 'revenue',
            amount: data.labor_cost,
            account_code: '4200',
            account_name: 'Service Revenue',
            account_type: 'revenue',
            reference_type: 'RepairOrder',
            reference_id: id,
            reference_number: data.order_number,
            customer_name: data.customer_name,
            description: `Labor for repair: ${data.vehicle_make} ${data.vehicle_model}`,
            transaction_date: data.completion_date || new Date().toISOString().split('T')[0],
            status: data.payment_status === 'paid' ? 'completed' : 'pending'
          });
        }
        
        // Record parts COGS if parts were used
        if (data.parts_used?.length > 0) {
          const partsCost = data.parts_used.reduce((sum, p) => sum + (p.total_cost || 0), 0);
          if (partsCost > 0) {
            await supabase.entities.Transaction.create({
              company_id: selectedCompanyId,
              transaction_number: `COGS-${id.slice(0, 8)}`,
              transaction_type: 'other_expense',
              category: 'expense',
              amount: partsCost,
              account_code: '5100',
              account_name: 'Cost of Parts Sold',
              account_type: 'expense',
              reference_type: 'RepairOrder',
              reference_id: id,
              reference_number: data.order_number,
              customer_name: data.customer_name,
              description: `Parts COGS: ${data.parts_used.map(p => p.part_name).join(', ')}`,
              transaction_date: data.completion_date || new Date().toISOString().split('T')[0],
              status: 'completed'
            });
            
            // Update parts inventory quantities
            for (const part of data.parts_used) {
              if (part.part_id) {
                try {
                  const existingParts = await supabase.entities.Part.filter({ id: part.part_id });
                  if (existingParts.length > 0) {
                    const currentPart = existingParts[0];
                    const newQty = Math.max(0, (currentPart.quantity || 0) - (part.quantity || 1));
                    await supabase.entities.Part.update(part.part_id, { quantity: newQty });
                  }
                } catch (e) {
                  console.error('Failed to update part inventory', e);
                }
              }
            }
          }
        }
      }
      
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repairs'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      toast.success("Repair order updated successfully");
      setDialogOpen(false);
      setEditingOrder(null);
      setSelectedPackage(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supabase.entities.RepairOrder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repairs'] });
      toast.success("Repair order deleted");
    },
  });

  const handleSave = (data) => {
    if (editingOrder) {
      updateMutation.mutate({ id: editingOrder.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setDialogOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this repair order?")) {
      deleteMutation.mutate(id);
    }
  };

  const handlePackageSelect = (pkg) => {
    setSelectedPackage(pkg);
    setDialogOpen(true);
  };

  const handleGenerateInvoice = (order) => {
    setInvoiceOrder(order);
    setInvoiceDialogOpen(true);
  };

  const filteredOrders = repairOrders.filter(order => {
    const matchesSearch = 
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.vehicle_vin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.vehicle_plate?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || order.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const ordersByStatus = {
    pending: filteredOrders.filter(o => o.status === 'pending'),
    in_progress: filteredOrders.filter(o => o.status === 'in_progress'),
    waiting_parts: filteredOrders.filter(o => o.status === 'waiting_parts'),
    completed: filteredOrders.filter(o => o.status === 'completed'),
  };

  const stats = {
    total: repairOrders.length,
    active: repairOrders.filter(o => ['pending', 'in_progress', 'waiting_parts'].includes(o.status)).length,
    completed: repairOrders.filter(o => o.status === 'completed').length,
    revenue: repairOrders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + (o.total_cost || 0), 0),
  };

  if (!selectedCompanyId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please select a company to view repair orders.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 md:px-6 py-3 md:py-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Auto Repair Center</h1>
            <p className="text-xs md:text-sm text-gray-300 mt-1">Comprehensive repair order management</p>
          </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setSchedulerDialogOpen(true)} variant="outline" size="sm">
            <CalendarDays className="w-3 h-3 md:w-4 md:h-4 mr-2" />
            <span className="hidden sm:inline">Scheduler</span>
            <span className="sm:hidden">Schedule</span>
          </Button>
          <Button onClick={() => setPackagesDialogOpen(true)} variant="outline" size="sm">
            <Wrench className="w-3 h-3 md:w-4 md:h-4 mr-2" />
            <span className="hidden sm:inline">Service Packages</span>
            <span className="sm:hidden">Packages</span>
          </Button>
          <Button onClick={() => setAppointmentDialogOpen(true)} variant="outline" size="sm">
            <Calendar className="w-3 h-3 md:w-4 md:h-4 mr-2" />
            <span className="hidden sm:inline">Schedule</span>
            <span className="sm:hidden">Book</span>
          </Button>
          <Button onClick={() => {
            setSelectedPackage(null);
            setDialogOpen(true);
          }} className="bg-blue-600 hover:bg-blue-700" size="sm">
            <Plus className="w-3 h-3 md:w-4 md:h-4 mr-2" />
            <span className="hidden sm:inline">New Repair Order</span>
            <span className="sm:hidden">New</span>
          </Button>
          </div>
          </div>
          </div>

          <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-600">Total</p>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900">{stats.total}</h3>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Wrench className="w-4 h-4 md:w-6 md:h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-600">Active</p>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900">{stats.active}</h3>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 md:w-6 md:h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-600">Done</p>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900">{stats.completed}</h3>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 md:w-6 md:h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-gray-600">Revenue</p>
                <h3 className="text-lg md:text-2xl font-bold text-gray-900">${(stats.revenue / 1000).toFixed(1)}K</h3>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-4 h-4 md:w-6 md:h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by order #, customer, VIN, or plate..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 focus-visible:ring-0"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="waiting_parts">Waiting Parts</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="kanban" className="space-y-4">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="kanban" className="text-xs md:text-sm">
            <span className="hidden sm:inline">Kanban Board</span>
            <span className="sm:hidden">Kanban</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="text-xs md:text-sm">
            <span className="hidden sm:inline">List View</span>
            <span className="sm:hidden">List</span>
          </TabsTrigger>
          <TabsTrigger value="fault-search" className="text-xs md:text-sm">
            <Sparkles className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">Fault Search</span>
            <span className="sm:hidden">Faults</span>
          </TabsTrigger>
          <TabsTrigger value="workload" className="text-xs md:text-sm">Workload</TabsTrigger>
          <TabsTrigger value="ai-optimizer" className="text-xs md:text-sm">
            <span className="hidden sm:inline">AI Optimizer</span>
            <span className="sm:hidden">AI</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="bg-gray-100 rounded-t-lg p-3 border-b-2 border-gray-400">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Pending ({ordersByStatus.pending.length})
                </h3>
              </div>
              <div className="space-y-3 p-3 bg-gray-50 rounded-b-lg min-h-[200px]">
                {ordersByStatus.pending.map(order => (
                  <RepairOrderCard 
                    key={order.id} 
                    order={order} 
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onGenerateInvoice={handleGenerateInvoice}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="bg-blue-100 rounded-t-lg p-3 border-b-2 border-blue-400">
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  In Progress ({ordersByStatus.in_progress.length})
                </h3>
              </div>
              <div className="space-y-3 p-3 bg-blue-50 rounded-b-lg min-h-[200px]">
                {ordersByStatus.in_progress.map(order => (
                  <RepairOrderCard 
                    key={order.id} 
                    order={order} 
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onGenerateInvoice={handleGenerateInvoice}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="bg-yellow-100 rounded-t-lg p-3 border-b-2 border-yellow-400">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Waiting Parts ({ordersByStatus.waiting_parts.length})
                </h3>
              </div>
              <div className="space-y-3 p-3 bg-yellow-50 rounded-b-lg min-h-[200px]">
                {ordersByStatus.waiting_parts.map(order => (
                  <RepairOrderCard 
                    key={order.id} 
                    order={order} 
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onGenerateInvoice={handleGenerateInvoice}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="bg-green-100 rounded-t-lg p-3 border-b-2 border-green-400">
                <h3 className="font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Completed ({ordersByStatus.completed.length})
                </h3>
              </div>
              <div className="space-y-3 p-3 bg-green-50 rounded-b-lg min-h-[200px]">
                {ordersByStatus.completed.map(order => (
                  <RepairOrderCard 
                    key={order.id} 
                    order={order} 
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onGenerateInvoice={handleGenerateInvoice}
                  />
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="list" className="space-y-3">
          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Loading...</p>
          ) : filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No repair orders found</p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map(order => (
              <RepairOrderCard 
                key={order.id} 
                order={order} 
                onEdit={handleEdit}
                onDelete={handleDelete}
                onGenerateInvoice={handleGenerateInvoice}
                fullWidth
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="fault-search" className="space-y-4">
          <AIFaultSearch />
        </TabsContent>

        <TabsContent value="workload" className="space-y-4">
          <WorkloadDashboard />
        </TabsContent>

        <TabsContent value="ai-optimizer" className="space-y-4">
          <AIAppointmentOptimizer 
            repairs={repairOrders} 
            technicians={technicians}
          />
        </TabsContent>
      </Tabs>

      <RepairOrderDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingOrder(null);
          setSelectedPackage(null);
        }}
        order={editingOrder}
        selectedPackage={selectedPackage}
        onSave={handleSave}
        customers={customers}
      />

      <AppointmentDialog
        open={appointmentDialogOpen}
        onClose={() => setAppointmentDialogOpen(false)}
      />

      <ServicePackagesDialog
        open={packagesDialogOpen}
        onClose={() => setPackagesDialogOpen(false)}
        onSelectPackage={handlePackageSelect}
      />

      <InvoiceGenerator
        open={invoiceDialogOpen}
        onClose={() => {
          setInvoiceDialogOpen(false);
          setInvoiceOrder(null);
        }}
        repairOrder={invoiceOrder}
      />

      <TechnicianScheduler
        open={schedulerDialogOpen}
        onClose={() => setSchedulerDialogOpen(false)}
      />
      </div>
    </div>
  );
}