import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Package, FileText, Trash2, LayoutGrid, List, Eye, Ship } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import LoadingDeclarationDialog from "../components/freight/LoadingDeclarationDialog";
import DocumentGenerationDialog from "../components/freight/DocumentGenerationDialog";
import { useCompany } from "../components/shared/CompanyContext";
import CustomerSelector from "../components/shared/CustomerSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function Freight() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState(null);
  const [loadingDeclOpen, setLoadingDeclOpen] = useState(false);
  const [docGenOpen, setDocGenOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [activeTab, setActiveTab] = useState("shipments");
  const [shipmentsViewMode, setShipmentsViewMode] = useState("cards");
  const [declarationsViewMode, setDeclarationsViewMode] = useState("cards");
  const [viewDeclaration, setViewDeclaration] = useState(null);
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments', selectedCompanyId],
    queryFn: () => base44.entities.FreightShipment.filter({ company_id: selectedCompanyId }, '-created_date'),
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

  const { data: exports = [] } = useQuery({
    queryKey: ['exports', selectedCompanyId],
    queryFn: () => base44.entities.Export.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: loadingDeclarations = [] } = useQuery({
    queryKey: ['loading-declarations', selectedCompanyId],
    queryFn: () => base44.entities.LoadingDeclaration.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  // Generate next declaration number
  const generateDeclarationNumber = () => {
    const prefix = "LD";
    const year = new Date().getFullYear().toString().slice(-2);
    const existingNumbers = loadingDeclarations
      .map(d => d.declaration_number)
      .filter(n => n && n.startsWith(`${prefix}${year}`))
      .map(n => parseInt(n.replace(`${prefix}${year}-`, '')) || 0);
    const nextNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    return `${prefix}${year}-${String(nextNum).padStart(5, '0')}`;
  };

  // Generate next shipment number
  const generateShipmentNumber = () => {
    const prefix = "SHP";
    const year = new Date().getFullYear().toString().slice(-2);
    const existingNumbers = shipments
      .map(s => s.shipment_number)
      .filter(n => n && n.startsWith(`${prefix}${year}`))
      .map(n => parseInt(n.replace(`${prefix}${year}-`, '')) || 0);
    const nextNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    return `${prefix}${year}-${String(nextNum).padStart(5, '0')}`;
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const shipment = await base44.entities.FreightShipment.create({...data, company_id: selectedCompanyId});
      
      // Create revenue transaction for total freight service
      await base44.entities.Transaction.create({
        company_id: selectedCompanyId,
        transaction_number: shipment.shipment_number || `FRT-${shipment.id.slice(0, 8)}`,
        transaction_type: 'service_revenue',
        category: 'revenue',
        amount: shipment.total_cost || 0,
        reference_type: 'FreightShipment',
        reference_id: shipment.id,
        reference_number: shipment.shipment_number,
        customer_name: shipment.customer_name,
        description: `Freight service revenue: ${shipment.origin_country} → ${shipment.destination_country}`,
        transaction_date: new Date().toISOString().split('T')[0],
        payment_method: 'other',
        status: shipment.payment_status === 'paid' ? 'completed' : 'pending',
        tax_amount: 0
      });
      
      // Create expense transactions for freight costs
      if (shipment.freight_cost > 0) {
        await base44.entities.Transaction.create({
          company_id: selectedCompanyId,
          transaction_number: `${shipment.shipment_number}-FREIGHT`,
          transaction_type: 'overhead_expense',
          category: 'expense',
          amount: shipment.freight_cost,
          reference_type: 'FreightShipment',
          reference_id: shipment.id,
          reference_number: shipment.shipment_number,
          customer_name: shipment.carrier_name || shipment.customer_name,
          description: `Freight carrier cost: ${shipment.carrier_name || 'Carrier'}`,
          transaction_date: new Date().toISOString().split('T')[0],
          payment_method: 'other',
          status: 'completed'
        });
      }
      
      if (shipment.insurance_cost > 0) {
        await base44.entities.Transaction.create({
          company_id: selectedCompanyId,
          transaction_number: `${shipment.shipment_number}-INSURANCE`,
          transaction_type: 'overhead_expense',
          category: 'expense',
          amount: shipment.insurance_cost,
          reference_type: 'FreightShipment',
          reference_id: shipment.id,
          reference_number: shipment.shipment_number,
          customer_name: shipment.customer_name,
          description: `Freight insurance cost`,
          transaction_date: new Date().toISOString().split('T')[0],
          payment_method: 'other',
          status: 'completed'
        });
      }
      
      if (shipment.handling_fees > 0) {
        await base44.entities.Transaction.create({
          company_id: selectedCompanyId,
          transaction_number: `${shipment.shipment_number}-HANDLING`,
          transaction_type: 'overhead_expense',
          category: 'expense',
          amount: shipment.handling_fees,
          reference_type: 'FreightShipment',
          reference_id: shipment.id,
          reference_number: shipment.shipment_number,
          customer_name: shipment.customer_name,
          description: `Freight handling fees`,
          transaction_date: new Date().toISOString().split('T')[0],
          payment_method: 'other',
          status: 'completed'
        });
      }
      
      if (shipment.customs_fees > 0) {
        await base44.entities.Transaction.create({
          company_id: selectedCompanyId,
          transaction_number: `${shipment.shipment_number}-CUSTOMS`,
          transaction_type: 'overhead_expense',
          category: 'expense',
          amount: shipment.customs_fees,
          reference_type: 'FreightShipment',
          reference_id: shipment.id,
          reference_number: shipment.shipment_number,
          customer_name: shipment.customer_name,
          description: `Customs clearance fees`,
          transaction_date: new Date().toISOString().split('T')[0],
          payment_method: 'other',
          status: 'completed'
        });
      }
      
      return shipment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setDialogOpen(false);
      setEditingShipment(null);
      toast.success("Freight shipment created!");
    },
    onError: (error) => {
      toast.error(`Failed to create shipment: ${error.message || 'Unknown error'}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FreightShipment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      setDialogOpen(false);
      setEditingShipment(null);
      toast.success("Shipment updated!");
    },
    onError: (error) => {
      toast.error(`Failed to update shipment: ${error.message || 'Unknown error'}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FreightShipment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success("Shipment deleted!");
    },
    onError: (error) => {
      toast.error(`Failed to delete shipment: ${error.message || 'Unknown error'}`);
    }
  });

  const createLoadingDeclarationMutation = useMutation({
    mutationFn: (data) => base44.entities.LoadingDeclaration.create({
      ...data, 
      company_id: selectedCompanyId,
      declaration_number: data.declaration_number || generateDeclarationNumber()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loading-declarations'] });
      setLoadingDeclOpen(false);
      setSelectedShipment(null);
      toast.success("Loading declaration created!");
    },
  });

  const deleteDeclarationMutation = useMutation({
    mutationFn: (id) => base44.entities.LoadingDeclaration.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loading-declarations'] });
      toast.success("Loading declaration deleted!");
    },
  });

  const handleSave = (formData) => {
    if (!formData.customer_name || !formData.origin_country || !formData.destination_country) {
      toast.error("Customer name, origin and destination countries are required");
      return;
    }

    if (editingShipment) {
      updateMutation.mutate({ id: editingShipment.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (shipmentId, e) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this shipment?")) {
      deleteMutation.mutate(shipmentId);
    }
  };

  const handleLoadingDeclSave = (formData) => {
    createLoadingDeclarationMutation.mutate({
      ...formData,
      declaration_number: formData.declaration_number || generateDeclarationNumber()
    });
  };

  const handleDeleteDeclaration = (id, e) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this loading declaration?")) {
      deleteDeclarationMutation.mutate(id);
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
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="text-center py-16">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Company Selected</h3>
          <p className="text-gray-500">Please select a company to manage freight</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Freight & Cargo Management</h1>
            <p className="text-sm text-gray-300 mt-1">{shipments.length} shipments • {loadingDeclarations.length} declarations</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => {
              setSelectedShipment(null);
              setLoadingDeclOpen(true);
            }} variant="outline" className="bg-white">
              <FileText className="w-4 h-4 mr-2" />
              New Declaration
            </Button>
            <Button onClick={() => {
              setEditingShipment(null);
              setDialogOpen(true);
            }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Shipment
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 max-w-7xl mx-auto">

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="shipments" className="flex items-center gap-2">
            <Ship className="w-4 h-4" />
            Shipments ({shipments.length})
          </TabsTrigger>
          <TabsTrigger value="declarations" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Loading Declarations ({loadingDeclarations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shipments">
          <div className="flex justify-end mb-4">
            <div className="flex gap-1 border rounded-lg p-1 bg-white">
              <Button
                variant={shipmentsViewMode === "cards" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setShipmentsViewMode("cards")}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={shipmentsViewMode === "list" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setShipmentsViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {shipmentsViewMode === "list" ? (
            <Card className="border-none shadow-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shipment #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map((shipment) => (
                    <TableRow key={shipment.id} className="cursor-pointer hover:bg-gray-50" onClick={() => { setEditingShipment(shipment); setDialogOpen(true); }}>
                      <TableCell className="font-medium">{shipment.shipment_number || '-'}</TableCell>
                      <TableCell>{shipment.customer_name}</TableCell>
                      <TableCell>{shipment.origin_country} → {shipment.destination_country}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{shipment.shipment_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[shipment.status]}>{shipment.status?.replace(/_/g, ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-600">${shipment.total_cost?.toLocaleString() || '0'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedShipment(shipment); setLoadingDeclOpen(true); }}>
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-red-600" onClick={(e) => handleDelete(shipment.id, e)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div className="grid gap-4">
              {shipments.map((shipment, index) => (
                <motion.div
                  key={shipment.id}
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
                            setEditingShipment(shipment);
                            setDialogOpen(true);
                          }}
                        >
                          <div className="flex items-center gap-3 flex-wrap">
                            <Package className="w-5 h-5 text-blue-600" />
                            <h3 className="font-bold text-lg">{shipment.shipment_number || 'Shipment'}</h3>
                            <Badge className={statusColors[shipment.status]}>
                              {shipment.status?.replace(/_/g, ' ')}
                            </Badge>
                            <Badge variant="outline">{shipment.shipment_type}</Badge>
                            <Badge variant="outline">{shipment.cargo_type}</Badge>
                            {shipment.export_id && <Badge className="bg-purple-100 text-purple-800">Linked to Export</Badge>}
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
                        <div className="text-right ml-4 space-y-2">
                          <p className="text-2xl font-bold text-blue-600">
                            ${shipment.total_cost?.toLocaleString() || '0'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {shipment.payment_status === 'paid' ? '✓ Paid' : 'Pending'}
                          </p>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              const linkedExport = exports.find(exp => exp.id === shipment.export_id);
                              setSelectedShipment({ ...shipment, linkedExport });
                              setDocGenOpen(true);
                            }}
                            size="sm"
                            variant="outline"
                            className="w-full text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Generate Docs
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedShipment(shipment);
                              setLoadingDeclOpen(true);
                            }}
                            size="sm"
                            variant="outline"
                            className="w-full"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Loading Declaration
                          </Button>
                          <Button
                            onClick={(e) => handleDelete(shipment.id, e)}
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
          )}
        </TabsContent>

        <TabsContent value="declarations">
          <div className="flex justify-end mb-4">
            <div className="flex gap-1 border rounded-lg p-1 bg-white">
              <Button
                variant={declarationsViewMode === "cards" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setDeclarationsViewMode("cards")}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={declarationsViewMode === "list" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setDeclarationsViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {declarationsViewMode === "list" ? (
            <Card className="border-none shadow-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Declaration #</TableHead>
                    <TableHead>Booking #</TableHead>
                    <TableHead>Consignee</TableHead>
                    <TableHead>Container</TableHead>
                    <TableHead>Vehicles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingDeclarations.map((decl) => (
                    <TableRow key={decl.id} className="cursor-pointer hover:bg-gray-50">
                      <TableCell className="font-medium">{decl.declaration_number || '-'}</TableCell>
                      <TableCell>{decl.booking_number || '-'}</TableCell>
                      <TableCell>{decl.consignee?.name || '-'}</TableCell>
                      <TableCell>{decl.container_number || '-'}</TableCell>
                      <TableCell>{decl.vehicles?.length || 0}</TableCell>
                      <TableCell>
                        <Badge className={decl.status === 'approved' ? 'bg-green-100 text-green-800' : decl.status === 'submitted' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                          {decl.status || 'draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-600">${decl.value?.toLocaleString() || '0'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setViewDeclaration(decl)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-red-600" onClick={(e) => handleDeleteDeclaration(decl.id, e)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div className="grid gap-4">
              {loadingDeclarations.map((decl, index) => (
                <motion.div
                  key={decl.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-none shadow-md hover:shadow-lg transition-all">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <FileText className="w-5 h-5 text-green-600" />
                            <h3 className="font-bold text-lg">{decl.declaration_number || 'Loading Declaration'}</h3>
                            <Badge className={decl.status === 'approved' ? 'bg-green-100 text-green-800' : decl.status === 'submitted' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                              {decl.status || 'draft'}
                            </Badge>
                          </div>
                          <p className="text-gray-600">
                            <strong>Consignee:</strong> {decl.consignee?.name || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-500">
                            <strong>Booking:</strong> {decl.booking_number || 'N/A'} | <strong>Container:</strong> {decl.container_number || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-500">
                            <strong>Vehicles:</strong> {decl.vehicles?.length || 0} | <strong>Weight:</strong> {decl.weight || 0} kg
                          </p>
                          {decl.commodity && (
                            <p className="text-xs text-gray-400 truncate max-w-xl">
                              {decl.commodity}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4 space-y-2">
                          <p className="text-2xl font-bold text-green-600">
                            ${decl.value?.toLocaleString() || '0'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {decl.created_date ? format(new Date(decl.created_date), 'MMM d, yyyy') : ''}
                          </p>
                          <Button
                            onClick={() => setViewDeclaration(decl)}
                            size="sm"
                            variant="outline"
                            className="w-full"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                          <Button
                            onClick={(e) => handleDeleteDeclaration(decl.id, e)}
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
          )}
        </TabsContent>
      </Tabs>

      <FreightDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingShipment(null);
        }}
        shipment={editingShipment}
        onSave={handleSave}
        customers={customers}
        vehicles={vehicles}
        parts={parts}
        exports={exports}
      />

      <LoadingDeclarationDialog
        open={loadingDeclOpen}
        onClose={() => {
          setLoadingDeclOpen(false);
          setSelectedShipment(null);
        }}
        shipment={selectedShipment}
        onSave={handleLoadingDeclSave}
        exports={exports}
      />

      <DocumentGenerationDialog
        open={docGenOpen}
        onClose={() => {
          setDocGenOpen(false);
          setSelectedShipment(null);
        }}
        shipment={selectedShipment}
        exportOrder={selectedShipment?.linkedExport}
      />

      {/* View Declaration Dialog */}
      <Dialog open={!!viewDeclaration} onOpenChange={() => setViewDeclaration(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading Declaration - {viewDeclaration?.declaration_number || viewDeclaration?.booking_number}</DialogTitle>
          </DialogHeader>
          {viewDeclaration && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-bold border-b pb-2">Exporter</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Name:</strong> {viewDeclaration.exporter?.name}</p>
                    <p><strong>Address:</strong> {viewDeclaration.exporter?.address_postal}</p>
                    <p><strong>City:</strong> {viewDeclaration.exporter?.city_province}</p>
                    <p><strong>Tax ID:</strong> {viewDeclaration.exporter?.tax_id}</p>
                    <p><strong>Phone:</strong> {viewDeclaration.exporter?.telephone}</p>
                    <p><strong>Email:</strong> {viewDeclaration.exporter?.email}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-bold border-b pb-2">Consignee</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Name:</strong> {viewDeclaration.consignee?.name}</p>
                    <p><strong>Address:</strong> {viewDeclaration.consignee?.address_street}</p>
                    <p><strong>City:</strong> {viewDeclaration.consignee?.city_country}</p>
                    <p><strong>Postal:</strong> {viewDeclaration.consignee?.postal_code}</p>
                    <p><strong>Phone:</strong> {viewDeclaration.consignee?.telephone}</p>
                    <p><strong>Email:</strong> {viewDeclaration.consignee?.email}</p>
                    <p><strong>Tax/Passport:</strong> {viewDeclaration.consignee?.tax_id_passport}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div><strong>Booking #:</strong> {viewDeclaration.booking_number || '-'}</div>
                <div><strong>Container #:</strong> {viewDeclaration.container_number || '-'}</div>
                <div><strong>Seal #:</strong> {viewDeclaration.seal_number || '-'}</div>
              </div>

              {viewDeclaration.vehicles?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold border-b pb-2">Vehicles ({viewDeclaration.vehicles.length})</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Year</TableHead>
                        <TableHead>Make/Model</TableHead>
                        <TableHead>VIN</TableHead>
                        <TableHead className="text-right">Weight</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewDeclaration.vehicles.map((v, i) => (
                        <TableRow key={i}>
                          <TableCell>{v.year || '-'}</TableCell>
                          <TableCell>{v.make_model}</TableCell>
                          <TableCell className="font-mono text-xs">{v.vin || '-'}</TableCell>
                          <TableCell className="text-right">{v.weight || 0} kg</TableCell>
                          <TableCell className="text-right">${v.value?.toLocaleString() || '0'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Total Weight: <strong>{viewDeclaration.weight || 0} kg</strong></p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">${viewDeclaration.value?.toLocaleString() || '0'}</p>
                  <p className="text-xs text-gray-500">Total Value</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

function FreightDialog({ open, onClose, shipment, onSave, customers, vehicles, parts, exports, generateShipmentNumber }) {
  const [formData, setFormData] = useState({
    shipment_number: "",
    deal_number: "",
    seal_number: "", // Added seal_number
    export_id: "",
    customer_name: "",
    customer_phone: "",
    shipment_type: "sea",
    cargo_type: "vehicle",
    origin_location: "",
    origin_country: "",
    destination_location: "",
    destination_country: "",
    cargo_description: "",
    cargo_items: [],
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
    notes: ""
  });

  const [selectedCustomer, setSelectedCustomer] = useState(null);

  React.useEffect(() => {
    if (open) {
      if (shipment) {
        setFormData({
          ...shipment,
          cargo_items: shipment.cargo_items || [],
          deal_number: shipment.deal_number || "",
          seal_number: shipment.seal_number || "" // Added seal_number
        });
        const customer = customers.find(c => c.full_name === shipment.customer_name);
        setSelectedCustomer(customer || null);
      } else {
        setFormData({
          shipment_number: generateShipmentNumber ? generateShipmentNumber() : `SHP${Date.now()}`,
          deal_number: "",
          seal_number: "",
          export_id: "",
          customer_name: "",
          customer_phone: "",
          shipment_type: "sea",
          cargo_type: "vehicle",
          origin_location: "",
          origin_country: "",
          destination_location: "",
          destination_country: "",
          cargo_description: "",
          cargo_items: [],
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
          notes: ""
        });
        setSelectedCustomer(null);
      }
    }
  }, [open, shipment, customers]);

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setFormData({
      ...formData,
      customer_name: customer.full_name,
      customer_phone: customer.phone || ""
    });
  };

  const handleExportSelect = (exportId) => {
    const exportOrder = exports.find(e => e.id === exportId);
    if (exportOrder) {
      setFormData({
        ...formData,
        export_id: exportId,
        customer_name: exportOrder.customer_name || "",
        customer_phone: exportOrder.customer_phone || "",
        destination_country: exportOrder.destination_country || "",
        destination_location: exportOrder.destination_port || "",
        cargo_description: exportOrder.items?.map(i => i.description).join(', ') || "",
        cargo_value: exportOrder.total_value || 0,
        cargo_items: exportOrder.items || [],
        number_of_items: exportOrder.items?.length || 0
      });
      toast.success("Export order data loaded!");
    }
  };

  const addCargoItem = (type, id) => {
    let item = null;
    if (type === 'vehicle') {
      const vehicle = vehicles.find(v => v.id === id);
      if (vehicle) {
        item = {
          type: 'vehicle',
          description: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          vin: vehicle.vin,
          value: vehicle.selling_price || 0,
          vehicle_id: id
        };
      }
    } else if (type === 'part') {
      const part = parts.find(p => p.id === id);
      if (part) {
        item = {
          type: 'part',
          description: `${part.name} (${part.part_number})`,
          quantity: 1,
          value: part.selling_price || 0,
          part_id: id
        };
      }
    }
    
    if (item) {
      setFormData({
        ...formData,
        cargo_items: [...(formData.cargo_items || []), item]
      });
    }
  };

  const removeCargoItem = (index) => {
    setFormData({
      ...formData,
      cargo_items: formData.cargo_items.filter((_, i) => i !== index)
    });
  };

  React.useEffect(() => {
    const total = (formData.freight_cost || 0) + (formData.insurance_cost || 0) + 
                  (formData.handling_fees || 0) + (formData.customs_fees || 0);
    setFormData(prev => ({ ...prev, total_cost: total }));
  }, [formData.freight_cost, formData.insurance_cost, formData.handling_fees, formData.customs_fees]);

  React.useEffect(() => {
    const value = (formData.cargo_items || []).reduce((sum, item) => 
      sum + (item.value * (item.quantity || 1)), 0
    );
    setFormData(prev => ({ ...prev, cargo_value: value, number_of_items: (prev.cargo_items || []).length }));
  }, [formData.cargo_items]);

  const canSave = formData.customer_name?.trim().length > 0 && 
                  formData.origin_country?.trim().length > 0 &&
                  formData.destination_country?.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{shipment ? 'Edit Freight Shipment' : 'New Freight Shipment'}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="cargo">Cargo Items</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Link to Export Order (Optional)</Label>
                <Select value={formData.export_id} onValueChange={handleExportSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select export order..." />
                  </SelectTrigger>
                  <SelectContent>
                    {exports.map(exp => (
                      <SelectItem key={exp.id} value={exp.id}>
                        {exp.export_number} - {exp.customer_name} → {exp.destination_country}
                      </SelectItem>
                    ))}
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
                <Label>Customer Name *</Label>
                <Input value={formData.customer_name} onChange={(e) => setFormData({...formData, customer_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Customer Phone</Label>
                <Input value={formData.customer_phone} onChange={(e) => setFormData({...formData, customer_phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Deal Number</Label>
                <Input value={formData.deal_number} onChange={(e) => setFormData({...formData, deal_number: e.target.value})} />
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
                <Input type="number" value={formData.number_of_items} disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Total Weight (kg)</Label>
                <Input type="number" value={formData.total_weight} onChange={(e) => setFormData({...formData, total_weight: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Cargo Value ($)</Label>
                <Input type="number" value={formData.cargo_value} disabled className="bg-gray-50" />
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
              <div className="space-y-2">
                <Label>Seal Number</Label>
                <Input value={formData.seal_number} onChange={(e) => setFormData({...formData, seal_number: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cargo Description</Label>
              <Textarea value={formData.cargo_description} onChange={(e) => setFormData({...formData, cargo_description: e.target.value})} rows={2} />
            </div>
          </TabsContent>

          <TabsContent value="cargo" className="space-y-4 py-4">
            <div className="flex gap-2 mb-4">
              <Select onValueChange={(v) => addCargoItem('vehicle', v)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add Vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map(vehicle => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.year} {vehicle.make} {vehicle.model} - ${vehicle.selling_price?.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select onValueChange={(v) => addCargoItem('part', v)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add Part" />
                </SelectTrigger>
                <SelectContent>
                  {parts.map(part => (
                    <SelectItem key={part.id} value={part.id}>
                      {part.name} ({part.part_number}) - ${part.selling_price?.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {(formData.cargo_items || []).map((item, index) => (
                <Card key={index} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <Badge variant="outline" className="mb-2">{item.type}</Badge>
                      <p className="font-medium">{item.description}</p>
                      {item.vin && <p className="text-sm text-gray-500">VIN: {item.vin}</p>}
                      {item.quantity && <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>}
                      <p className="text-sm font-bold text-blue-600 mt-1">
                        ${(item.value * (item.quantity || 1)).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCargoItem(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {(formData.cargo_items || []).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No cargo items added. Use the dropdowns above to add vehicles or parts.
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
            {shipment ? 'Update' : 'Create'} Shipment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}