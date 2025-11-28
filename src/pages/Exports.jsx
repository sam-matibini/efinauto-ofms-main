import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Plane, Trash2, Search } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCompany } from "../components/shared/CompanyContext";
import CustomerSelector from "../components/shared/CustomerSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Exports() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExport, setEditingExport] = useState(null);
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: exports = [] } = useQuery({
    queryKey: ['exports', selectedCompanyId],
    queryFn: () => base44.entities.Export.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', selectedCompanyId],
    queryFn: () => base44.entities.Customer.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', selectedCompanyId],
    queryFn: () => base44.entities.Vehicle.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['parts', selectedCompanyId],
    queryFn: () => base44.entities.Part.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales', selectedCompanyId],
    queryFn: () => base44.entities.Sale.filter({ company_id: selectedCompanyId, sale_type: 'export' }, '-created_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const exportOrder = await base44.entities.Export.create({...data, company_id: selectedCompanyId});
      
      const vehicleItems = (data.items || []).filter(item => item.vehicle_id);
      for (const item of vehicleItems) {
        if (item.vehicle_id) {
          await base44.entities.Vehicle.update(item.vehicle_id, { status: 'exported' });
        }
      }
      
      // Create revenue transaction for export sale
      await base44.entities.Transaction.create({
        company_id: selectedCompanyId,
        transaction_number: exportOrder.export_number || `EXP-${exportOrder.id.slice(0, 8)}`,
        transaction_type: 'sale_revenue',
        category: 'revenue',
        amount: exportOrder.total_value || 0,
        reference_type: 'Export',
        reference_id: exportOrder.id,
        reference_number: exportOrder.export_number,
        customer_name: exportOrder.customer_name,
        description: `Export sale revenue: ${exportOrder.export_type} to ${exportOrder.destination_country}`,
        transaction_date: new Date().toISOString().split('T')[0],
        payment_method: 'other',
        status: exportOrder.payment_status === 'paid' ? 'completed' : 'pending',
        tax_amount: 0
      });
      
      // Create expense transactions for export costs
      if (exportOrder.freight_cost > 0) {
        await base44.entities.Transaction.create({
          company_id: selectedCompanyId,
          transaction_number: `${exportOrder.export_number}-FREIGHT`,
          transaction_type: 'overhead_expense',
          category: 'expense',
          amount: exportOrder.freight_cost,
          reference_type: 'Export',
          reference_id: exportOrder.id,
          reference_number: exportOrder.export_number,
          customer_name: exportOrder.customer_name,
          description: `Export freight cost to ${exportOrder.destination_country}`,
          transaction_date: new Date().toISOString().split('T')[0],
          payment_method: 'other',
          status: 'completed'
        });
      }
      
      if (exportOrder.insurance_cost > 0) {
        await base44.entities.Transaction.create({
          company_id: selectedCompanyId,
          transaction_number: `${exportOrder.export_number}-INSURANCE`,
          transaction_type: 'overhead_expense',
          category: 'expense',
          amount: exportOrder.insurance_cost,
          reference_type: 'Export',
          reference_id: exportOrder.id,
          reference_number: exportOrder.export_number,
          customer_name: exportOrder.customer_name,
          description: `Export cargo insurance`,
          transaction_date: new Date().toISOString().split('T')[0],
          payment_method: 'other',
          status: 'completed'
        });
      }
      
      return exportOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exports'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setDialogOpen(false);
      setEditingExport(null);
      toast.success("Export order created and vehicle statuses updated!");
    },
    onError: (error) => {
      toast.error(`Failed to create export order: ${error.message || 'Unknown error'}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const result = await base44.entities.Export.update(id, data);
      
      if (data.status === 'delivered') {
        const vehicleItems = (data.items || []).filter(item => item.vehicle_id);
        for (const item of vehicleItems) {
          if (item.vehicle_id) {
            await base44.entities.Vehicle.update(item.vehicle_id, { status: 'exported' });
          }
        }
      }
      
      // Auto-update linked shipments
      const linkedShipments = await base44.entities.FreightShipment.filter({ export_id: id });
      for (const shipment of linkedShipments) {
        await base44.entities.FreightShipment.update(shipment.id, {
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          destination_country: data.destination_country,
          destination_location: data.destination_port || data.destination_address,
          cargo_value: data.total_value,
          cargo_description: (data.items || []).map(i => i.description).join(', ')
        });
      }
      
      // Auto-update linked loading declarations
      const linkedDeclarations = await base44.entities.LoadingDeclaration.filter({ export_id: id });
      for (const decl of linkedDeclarations) {
        const updatedVehicles = (data.items || []).filter(item => item.vin || item.vehicle_id).map(item => ({
          year: item.description?.match(/\b(19|20)\d{2}\b/)?.[0] || '',
          make_model: item.description?.replace(/\s*\(VIN:[^)]+\)/i, '') || '',
          vin: item.vin || '',
          weight: item.weight || 0,
          value: item.value || 0
        }));
        
        await base44.entities.LoadingDeclaration.update(decl.id, {
          consignee: {
            ...decl.consignee,
            name: data.customer_name
          },
          commodity: (data.items || []).map(i => i.description).join(', '),
          value: data.total_value,
          weight: (data.items || []).reduce((sum, i) => sum + (i.weight || 0), 0),
          vehicles: updatedVehicles
        });
      }
      
      // Also check for declarations with this export in export_ids array
      const allDeclarations = await base44.entities.LoadingDeclaration.filter({ company_id: selectedCompanyId });
      for (const decl of allDeclarations) {
        if (decl.export_ids?.includes(id)) {
          // Recalculate from all linked exports
          const allLinkedExports = await Promise.all(
            decl.export_ids.map(expId => 
              exports.find(e => e.id === expId) || base44.entities.Export.filter({ id: expId }).then(r => r[0])
            )
          );
          
          const allVehicles = allLinkedExports.filter(Boolean).flatMap(exp => 
            (exp.items || []).filter(item => item.vin || item.vehicle_id).map(item => ({
              year: item.description?.match(/\b(19|20)\d{2}\b/)?.[0] || '',
              make_model: item.description?.replace(/\s*\(VIN:[^)]+\)/i, '') || '',
              vin: item.vin || '',
              weight: item.weight || 0,
              value: item.value || 0,
              export_id: exp.id
            }))
          );
          
          const totalValue = allLinkedExports.filter(Boolean).reduce((sum, exp) => sum + (exp.total_value || 0), 0);
          const totalWeight = allVehicles.reduce((sum, v) => sum + (v.weight || 0), 0);
          
          await base44.entities.LoadingDeclaration.update(decl.id, {
            value: totalValue,
            weight: totalWeight,
            vehicles: allVehicles
          });
        }
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exports'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['loadingDeclarations'] });
      setDialogOpen(false);
      setEditingExport(null);
      toast.success("Export order and linked records updated!");
    },
    onError: (error) => {
      toast.error(`Failed to update export order: ${error.message || 'Unknown error'}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Export.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exports'] });
      toast.success("Export order deleted!");
    },
    onError: (error) => {
      toast.error(`Failed to delete export order: ${error.message || 'Unknown error'}`);
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

  const handleDelete = (exportId, e) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this export order?")) {
      deleteMutation.mutate(exportId);
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

  if (!selectedCompanyId) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="text-center py-16">
          <Plane className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Company Selected</h3>
          <p className="text-gray-500">Please select a company to manage exports</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Export Management</h1>
            <p className="text-sm text-gray-300 mt-1">{exports.length} export orders</p>
          </div>
          <Button onClick={() => {
            setEditingExport(null);
            setDialogOpen(true);
          }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Export Order
          </Button>
        </div>
      </div>
      
      <div className="p-6 md:p-8 max-w-7xl mx-auto">

      <div className="grid gap-4">
        {exports.map((exportOrder, index) => (
          <motion.div
            key={exportOrder.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="border-none shadow-md hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div 
                    className="space-y-2 flex-1 cursor-pointer"
                    onClick={() => {
                      setEditingExport(exportOrder);
                      setDialogOpen(true);
                    }}
                  >
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
                    {exportOrder.items?.length > 0 && (
                      <p className="text-sm text-gray-500">
                        <strong>Items:</strong> {exportOrder.items.length}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4 space-y-2">
                    <p className="text-2xl font-bold text-blue-600">
                      ${exportOrder.total_value?.toLocaleString() || '0'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {exportOrder.payment_status === 'paid' ? '✓ Paid' : 'Pending Payment'}
                    </p>
                    <Button
                      onClick={(e) => handleDelete(exportOrder.id, e)}
                      size="sm"
                      variant="outline"
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
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
        customers={customers}
        vehicles={vehicles}
        parts={parts}
        sales={sales}
      />
      </div>
    </div>
  );
}

function ExportDialog({ open, onClose, exportOrder, onSave, customers, vehicles, parts, sales }) {
  const [formData, setFormData] = useState({
    export_number: `EXP-${Date.now()}`,
    export_type: "vehicle",
    customer_name: "",
    customer_country: "",
    customer_email: "",
    customer_phone: "",
    destination_country: "",
    destination_port: "",
    destination_address: "",
    items: [],
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

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [vinSearch, setVinSearch] = useState("");
  const [partSearch, setPartSearch] = useState("");
  const [vehicleDropdownSearch, setVehicleDropdownSearch] = useState("");
  const [partDropdownSearch, setPartDropdownSearch] = useState("");
  const [saleSearch, setSaleSearch] = useState("");

  React.useEffect(() => {
    if (open) {
      if (exportOrder) {
        const updatedItems = exportOrder.items?.map(item => {
          // Extract VIN from description if not already set (legacy format: "2013 NISSAN ROGUE (VIN: xxx)")
          let vin = item.vin || "";
          if (!vin && item.description) {
            const vinMatch = item.description.match(/\(VIN:\s*([^)]+)\)/i);
            if (vinMatch) {
              vin = vinMatch[1].trim();
            }
          }
          return {
            ...item,
            vin: vin,
            weight: item.weight ?? 0
          };
        }) || [];

        setFormData({ ...exportOrder, items: updatedItems });
        const customer = customers.find(c => c.full_name === exportOrder.customer_name);
        setSelectedCustomer(customer || null);
      } else {
        setFormData({
          export_number: `EXP-${Date.now()}`,
          export_type: "vehicle",
          customer_name: "",
          customer_country: "",
          customer_email: "",
          customer_phone: "",
          destination_country: "",
          destination_port: "",
          destination_address: "",
          items: [],
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
        setSelectedCustomer(null);
        setVinSearch("");
        setPartSearch("");
        setVehicleDropdownSearch("");
        setPartDropdownSearch("");
        setSaleSearch("");
      }
    }
  }, [open, exportOrder, customers]);

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setFormData({
      ...formData,
      customer_name: customer.full_name,
      customer_email: customer.email || "",
      customer_phone: customer.phone || "",
      customer_country: customer.country || ""
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...(formData.items || []), { description: "", vin: "", quantity: 1, weight: 0, value: 0 }]
    });
  };

  const removeItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const addVehicleItem = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      const description = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
      setFormData({
        ...formData,
        items: [...(formData.items || []), { 
          description, 
          vin: vehicle.vin || "",
          quantity: 1, 
          weight: vehicle.weight || 0,
          value: vehicle.selling_price || 0,
          vehicle_id: vehicle.id
        }]
      });
    }
  };

  const addPartItem = (partId) => {
    const part = parts.find(p => p.id === partId);
    if (part) {
      setFormData({
        ...formData,
        items: [...(formData.items || []), { 
          description: `${part.name} (Part #: ${part.part_number})`, 
          quantity: 1, 
          weight: 0,
          value: part.selling_price || 0,
          part_id: part.id
        }]
      });
    }
  };

  const addSaleItem = (sale) => {
    // Add vehicle from sale
    const description = sale.vehicle_details || `${sale.vehicle_year || ''} ${sale.vehicle_make_model || ''}`.trim();
    const newItem = {
      description: description || 'Export Sale Item',
      vin: sale.vehicle_vin || "",
      quantity: 1,
      weight: 0,
      value: sale.sale_price || 0,
      sale_id: sale.id,
      vehicle_id: sale.vehicle_id
    };
    
    // Also populate customer info from sale if not already set
    const updatedFormData = {
      ...formData,
      items: [...(formData.items || []), newItem]
    };
    
    if (!formData.customer_name && sale.customer_name) {
      updatedFormData.customer_name = sale.customer_name;
      updatedFormData.customer_phone = sale.customer_phone || "";
      updatedFormData.customer_email = sale.customer_email || "";
      updatedFormData.customer_country = sale.customer_country || "";
      updatedFormData.destination_country = sale.customer_country || "";
    }
    
    setFormData(updatedFormData);
  };

  React.useEffect(() => {
    const total = (formData.items || []).reduce((sum, item) => sum + (item.quantity * item.value), 0);
    setFormData(prev => ({ ...prev, total_value: total }));
  }, [formData.items]);

  const canSave = formData.customer_name?.trim().length > 0 && 
                  formData.destination_country?.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{exportOrder ? 'Edit Export Order' : 'New Export Order'}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="items">Items</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 py-4">
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
                <Label>Customer *</Label>
                <CustomerSelector
                  customers={customers}
                  selectedCustomer={selectedCustomer}
                  onSelect={handleCustomerSelect}
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Phone</Label>
                <Input value={formData.customer_phone} onChange={(e) => setFormData({...formData, customer_phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Customer Email</Label>
                <Input value={formData.customer_email} onChange={(e) => setFormData({...formData, customer_email: e.target.value})} />
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
                <Input type="number" value={formData.total_value} disabled className="bg-gray-50" />
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
          </TabsContent>

          <TabsContent value="items" className="space-y-4 py-4">
            {/* Export Sales Search */}
            {sales && sales.length > 0 && (
              <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <Label className="text-sm font-medium text-purple-800 mb-2 block">Import from Export Sales</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-4 h-4" />
                  <Input
                    placeholder="Search export sales by customer, VIN, or sale #..."
                    value={saleSearch}
                    onChange={(e) => setSaleSearch(e.target.value)}
                    className="pl-9 border-purple-300 focus:border-purple-500"
                  />
                  {saleSearch && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-purple-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
                      {sales
                        .filter(s => {
                          const search = saleSearch.toLowerCase();
                          return s.customer_name?.toLowerCase().includes(search) ||
                                 s.vehicle_vin?.toLowerCase().includes(search) ||
                                 s.sale_number?.toLowerCase().includes(search) ||
                                 s.vehicle_details?.toLowerCase().includes(search);
                        })
                        .slice(0, 10)
                        .map(sale => (
                          <div
                            key={sale.id}
                            className="px-3 py-2 hover:bg-purple-50 cursor-pointer border-b last:border-b-0"
                            onClick={() => {
                              addSaleItem(sale);
                              setSaleSearch("");
                            }}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-medium text-purple-800">{sale.sale_number}</span>
                                <span className="text-gray-600 ml-2">{sale.customer_name}</span>
                              </div>
                              <span className="text-green-600 font-medium">${sale.sale_price?.toLocaleString()}</span>
                            </div>
                            <div className="text-sm text-gray-500">
                              {sale.vehicle_details || `${sale.vehicle_year || ''} ${sale.vehicle_make_model || ''}`}
                              {sale.vehicle_vin && <span className="ml-2 font-mono text-xs">VIN: {sale.vehicle_vin}</span>}
                            </div>
                          </div>
                        ))}
                      {sales.filter(s => {
                        const search = saleSearch.toLowerCase();
                        return s.customer_name?.toLowerCase().includes(search) ||
                               s.vehicle_vin?.toLowerCase().includes(search) ||
                               s.sale_number?.toLowerCase().includes(search) ||
                               s.vehicle_details?.toLowerCase().includes(search);
                      }).length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500">No export sales found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 mb-4 flex-wrap">
              {/* VIN Search */}
              <div className="relative flex-1 min-w-[150px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by VIN..."
                  value={vinSearch}
                  onChange={(e) => setVinSearch(e.target.value)}
                  className="pl-9"
                />
                {vinSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {vehicles
                      .filter(v => v.vin?.toLowerCase().includes(vinSearch.toLowerCase()))
                      .slice(0, 10)
                      .map(vehicle => (
                        <div
                          key={vehicle.id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() => {
                            addVehicleItem(vehicle.id);
                            setVinSearch("");
                          }}
                        >
                          <span className="font-medium">{vehicle.vin}</span>
                          <span className="text-gray-500 ml-2">
                            {vehicle.year} {vehicle.make} {vehicle.model} - ${vehicle.selling_price?.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    {vehicles.filter(v => v.vin?.toLowerCase().includes(vinSearch.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500">No vehicles found</div>
                    )}
                  </div>
                )}
              </div>

              {/* Part Number Search */}
              <div className="relative flex-1 min-w-[150px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by Part #..."
                  value={partSearch}
                  onChange={(e) => setPartSearch(e.target.value)}
                  className="pl-9"
                />
                {partSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {parts
                      .filter(p => p.part_number?.toLowerCase().includes(partSearch.toLowerCase()))
                      .slice(0, 10)
                      .map(part => (
                        <div
                          key={part.id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() => {
                            addPartItem(part.id);
                            setPartSearch("");
                          }}
                        >
                          <span className="font-medium">{part.part_number}</span>
                          <span className="text-gray-500 ml-2">
                            {part.name} - ${part.selling_price?.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    {parts.filter(p => p.part_number?.toLowerCase().includes(partSearch.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500">No parts found</div>
                    )}
                  </div>
                )}
              </div>

              {/* Add Vehicle Dropdown with Search */}
              <div className="relative flex-1 min-w-[180px]">
                <Select onValueChange={(v) => { addVehicleItem(v); setVehicleDropdownSearch(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add Vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 pb-2">
                      <Input
                        placeholder="Type to search..."
                        value={vehicleDropdownSearch}
                        onChange={(e) => setVehicleDropdownSearch(e.target.value)}
                        className="h-8"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    {vehicles
                      .filter(v => {
                        if (!vehicleDropdownSearch) return true;
                        const search = vehicleDropdownSearch.toLowerCase();
                        return v.vin?.toLowerCase().includes(search) ||
                               v.make?.toLowerCase().includes(search) ||
                               v.model?.toLowerCase().includes(search) ||
                               String(v.year).includes(search);
                      })
                      .map(vehicle => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.year} {vehicle.make} {vehicle.model} - ${vehicle.selling_price?.toLocaleString()}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add Part Dropdown with Search */}
              <div className="relative flex-1 min-w-[150px]">
                <Select onValueChange={(v) => { addPartItem(v); setPartDropdownSearch(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add Part" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 pb-2">
                      <Input
                        placeholder="Type to search..."
                        value={partDropdownSearch}
                        onChange={(e) => setPartDropdownSearch(e.target.value)}
                        className="h-8"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    {parts
                      .filter(p => {
                        if (!partDropdownSearch) return true;
                        const search = partDropdownSearch.toLowerCase();
                        return p.part_number?.toLowerCase().includes(search) ||
                               p.name?.toLowerCase().includes(search);
                      })
                      .map(part => (
                        <SelectItem key={part.id} value={part.id}>
                          {part.name} ({part.part_number}) - ${part.selling_price?.toFixed(2)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={addItem} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Custom Item
              </Button>
            </div>

            <div className="space-y-3">
              {(formData.items || []).map((item, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-3">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">VIN Number</Label>
                      <Input
                        value={item.vin || ""}
                        onChange={(e) => updateItem(index, 'vin', e.target.value)}
                        placeholder="VIN"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Weight (kg)</Label>
                      <Input
                        type="number"
                        value={item.weight || 0}
                        onChange={(e) => updateItem(index, 'weight', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Unit Value ($)</Label>
                      <Input
                        type="number"
                        value={item.value}
                        onChange={(e) => updateItem(index, 'value', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Total ($)</Label>
                      <Input
                        type="number"
                        value={item.quantity * item.value}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                    <div className="col-span-1 flex items-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {(formData.items || []).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No items added. Use the buttons above to add vehicles, parts, or custom items.
              </div>
            )}
          </TabsContent>
        </Tabs>

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