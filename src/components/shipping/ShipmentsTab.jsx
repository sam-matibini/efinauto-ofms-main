import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Ship, Plus, Search, LayoutGrid, List, Eye, Trash2, Edit,
  MapPin, Clock, FileText, Anchor
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useCompany } from "@/components/shared/CompanyContext";
import LoadingDeclarationDialog from "@/components/freight/LoadingDeclarationDialog";
import VehicleSelector from "./VehicleSelector";

const formatCurrency = (amount) => `$${(amount || 0).toLocaleString()}`;

export default function ShipmentsTab({ shipments = [], exports = [], customers = [], vehicles = [], containers = [], loadingDeclarations = [], showCreateDialog = false, onDialogClose }) {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Handle external dialog trigger
  React.useEffect(() => {
    if (showCreateDialog) {
      setDialogOpen(true);
      setEditingShipment(null);
    }
  }, [showCreateDialog]);

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingShipment(null);
    if (onDialogClose) onDialogClose();
  };
  const [editingShipment, setEditingShipment] = useState(null);
  const [viewShipment, setViewShipment] = useState(null);
  const [loadingDeclOpen, setLoadingDeclOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);

  const statusColors = {
    booked: "bg-yellow-100 text-yellow-800",
    picked_up: "bg-blue-100 text-blue-800",
    in_transit: "bg-purple-100 text-purple-800",
    customs_clearance: "bg-orange-100 text-orange-800",
    out_for_delivery: "bg-cyan-100 text-cyan-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800"
  };

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
      const shipmentData = {
        ...data, 
        company_id: selectedCompanyId,
        shipment_number: data.shipment_number || generateShipmentNumber()
      };
      const shipment = await base44.entities.FreightShipment.create(shipmentData);
      
      // Create GL transactions for shipping fees
      if (data.freight_cost > 0) {
        await base44.entities.Transaction.create({
          company_id: selectedCompanyId,
          transaction_number: `FRT-${shipment.id.slice(0, 8)}`,
          transaction_type: 'other_expense',
          category: 'expense',
          amount: data.freight_cost,
          account_code: '5200',
          account_name: 'Shipping & Freight Expense',
          account_type: 'expense',
          reference_type: 'FreightShipment',
          reference_id: shipment.id,
          reference_number: shipment.shipment_number,
          customer_name: data.customer_name,
          description: `Freight charges: ${data.origin_country} → ${data.destination_country}`,
          transaction_date: data.departure_date || new Date().toISOString().split('T')[0],
          status: 'completed'
        });
      }
      
      if (data.customs_fees > 0) {
        await base44.entities.Transaction.create({
          company_id: selectedCompanyId,
          transaction_number: `CUST-${shipment.id.slice(0, 8)}`,
          transaction_type: 'other_expense',
          category: 'expense',
          amount: data.customs_fees,
          account_code: '5210',
          account_name: 'Customs & Duties Expense',
          account_type: 'expense',
          reference_type: 'FreightShipment',
          reference_id: shipment.id,
          reference_number: shipment.shipment_number,
          customer_name: data.customer_name,
          description: `Customs & duties: ${shipment.shipment_number}`,
          transaction_date: data.departure_date || new Date().toISOString().split('T')[0],
          status: 'completed'
        });
      }
      
      return shipment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      handleDialogClose();
      toast.success("Shipment created!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FreightShipment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      handleDialogClose();
      toast.success("Shipment updated!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FreightShipment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success("Shipment deleted!");
    },
  });

  const handleSave = (formData) => {
    if (editingShipment) {
      updateMutation.mutate({ id: editingShipment.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredShipments = shipments.filter(s => {
    const matchesSearch = !searchTerm || 
      s.shipment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.container_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-2 flex-1 w-full md:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by BL#, customer, tracking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="booked">Booked</SelectItem>
              <SelectItem value="picked_up">Picked Up</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="customs_clearance">Customs</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 border rounded-lg p-1 bg-white">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode("cards")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
          <Button onClick={() => { setEditingShipment(null); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            New Shipment
          </Button>
        </div>
      </div>

      {/* List View */}
      {viewMode === "list" ? (
        <Card className="border-none shadow-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipment #</TableHead>
                <TableHead>Vessel</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShipments.map((shipment) => (
                <TableRow key={shipment.id} className="cursor-pointer hover:bg-gray-50">
                  <TableCell className="font-medium">{shipment.shipment_number || '-'}</TableCell>
                  <TableCell>{shipment.carrier_name || '-'}</TableCell>
                  <TableCell className="text-sm">{shipment.origin_country} → {shipment.destination_country}</TableCell>
                  <TableCell className="text-sm">
                    {shipment.departure_date ? format(new Date(shipment.departure_date), 'MMM d') : '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {shipment.expected_arrival ? format(new Date(shipment.expected_arrival), 'MMM d') : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[shipment.status]}>{shipment.status?.replace(/_/g, ' ')}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-blue-600">{formatCurrency(shipment.cargo_value)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setViewShipment(shipment)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setEditingShipment(shipment); setDialogOpen(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setSelectedShipment(shipment); setLoadingDeclOpen(true); }}>
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-red-600" onClick={() => deleteMutation.mutate(shipment.id)}>
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
          {filteredShipments.map((shipment, index) => (
            <motion.div
              key={shipment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-none shadow-md hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Ship className="w-5 h-5 text-blue-600" />
                        <h3 className="font-bold text-lg">{shipment.shipment_number || 'Shipment'}</h3>
                        <Badge className={statusColors[shipment.status]}>{shipment.status?.replace(/_/g, ' ')}</Badge>
                        <Badge variant="outline">{shipment.shipment_type}</Badge>
                      </div>
                      <p className="text-gray-600"><strong>Customer:</strong> {shipment.customer_name}</p>
                      <p className="text-sm text-gray-500">
                        <strong>Route:</strong> {shipment.origin_country} → {shipment.destination_country}
                      </p>
                      <div className="flex gap-4 text-sm text-gray-500">
                        {shipment.tracking_number && <span><strong>Tracking:</strong> {shipment.tracking_number}</span>}
                        {shipment.container_number && <span><strong>Container:</strong> {shipment.container_number}</span>}
                      </div>
                    </div>
                    <div className="text-right ml-4 space-y-2">
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(shipment.cargo_value)}</p>
                      <p className="text-sm text-gray-500">
                        ETA: {shipment.expected_arrival ? format(new Date(shipment.expected_arrival), 'MMM d, yyyy') : 'N/A'}
                      </p>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => setViewShipment(shipment)}>
                          <Eye className="w-4 h-4 mr-1" /> View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setSelectedShipment(shipment); setLoadingDeclOpen(true); }}>
                          <FileText className="w-4 h-4 mr-1" /> Docs
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Shipment Details Dialog */}
      <Dialog open={!!viewShipment} onOpenChange={() => setViewShipment(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Shipment Details - {viewShipment?.shipment_number}</DialogTitle>
          </DialogHeader>
          {viewShipment && (
            <div className="space-y-6 py-4">
              {/* Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">BL Number</p>
                  <p className="font-semibold">{viewShipment.shipment_number || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <Badge className={statusColors[viewShipment.status]}>{viewShipment.status?.replace(/_/g, ' ')}</Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Vessel / Carrier</p>
                  <p className="font-semibold">{viewShipment.carrier_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Shipping Line</p>
                  <p className="font-semibold">{viewShipment.shipment_type}</p>
                </div>
              </div>

              {/* Route Timeline */}
              <div>
                <h3 className="font-semibold mb-3">Route Timeline</h3>
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                  {['Booked', 'Loaded', 'In Transit', 'Arrived', 'Cleared', 'Released'].map((step, i) => (
                    <div key={step} className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        i <= ['booked', 'picked_up', 'in_transit', 'customs_clearance', 'out_for_delivery', 'delivered'].indexOf(viewShipment.status)
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {i + 1}
                      </div>
                      <span className="text-xs mt-1">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold border-b pb-2">Shipment Info</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Customer:</strong> {viewShipment.customer_name}</p>
                    <p><strong>Origin:</strong> {viewShipment.origin_location}, {viewShipment.origin_country}</p>
                    <p><strong>Destination:</strong> {viewShipment.destination_location}, {viewShipment.destination_country}</p>
                    <p><strong>Container:</strong> {viewShipment.container_number || 'N/A'}</p>
                    <p><strong>Tracking:</strong> {viewShipment.tracking_number || 'N/A'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold border-b pb-2">Fee Estimates</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Freight Cost:</span><span>{formatCurrency(viewShipment.freight_cost)}</span></div>
                    <div className="flex justify-between"><span>Handling Fees:</span><span>{formatCurrency(viewShipment.handling_fees)}</span></div>
                    <div className="flex justify-between"><span>Customs Fees:</span><span>{formatCurrency(viewShipment.customs_fees)}</span></div>
                    <div className="flex justify-between"><span>Insurance:</span><span>{formatCurrency(viewShipment.insurance_cost)}</span></div>
                    <div className="flex justify-between font-bold border-t pt-2"><span>Total:</span><span>{formatCurrency(viewShipment.total_cost)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <ShipmentFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingShipment(null); }}
        shipment={editingShipment}
        onSave={handleSave}
        exports={exports}
        customers={customers}
        vehicles={vehicles}
        generateShipmentNumber={generateShipmentNumber}
      />

      {/* Loading Declaration Dialog */}
      <LoadingDeclarationDialog
        open={loadingDeclOpen}
        onClose={() => { setLoadingDeclOpen(false); setSelectedShipment(null); }}
        shipment={selectedShipment}
        onSave={(data) => {
          base44.entities.LoadingDeclaration.create({ ...data, company_id: selectedCompanyId });
          setLoadingDeclOpen(false);
          toast.success("Loading declaration created!");
        }}
        exports={exports}
      />
    </div>
  );
}

function ShipmentFormDialog({ open, onClose, shipment, onSave, exports, customers, vehicles, generateShipmentNumber }) {
  const [formData, setFormData] = useState({});

  React.useEffect(() => {
    if (open) {
      if (shipment) {
        setFormData({ ...shipment, vehicle_ids: shipment.vehicle_ids || [] });
      } else {
        setFormData({
          shipment_number: generateShipmentNumber(),
          customer_name: "",
          shipment_type: "sea",
          cargo_type: "vehicle",
          origin_country: "",
          destination_country: "",
          status: "booked",
          cargo_value: 0,
          freight_cost: 0,
          total_cost: 0,
          vehicle_ids: []
        });
      }
    }
  }, [open, shipment]);

  const handleVehicleSelection = (selectedIds) => {
    setFormData({ ...formData, vehicle_ids: selectedIds });
  };

  const handleExportSelect = (exportId) => {
    const exp = exports.find(e => e.id === exportId);
    if (exp) {
      setFormData({
        ...formData,
        export_id: exportId,
        customer_name: exp.customer_name,
        destination_country: exp.destination_country,
        cargo_value: exp.total_value
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{shipment ? 'Edit Shipment' : 'New Shipment'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Link to Export Order</Label>
              <Select value={formData.export_id} onValueChange={handleExportSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select export..." />
                </SelectTrigger>
                <SelectContent>
                  {exports.map(exp => (
                    <SelectItem key={exp.id} value={exp.id}>
                      {exp.export_number} - {exp.customer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input value={formData.customer_name || ''} onChange={(e) => setFormData({...formData, customer_name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Shipment Type</Label>
              <Select value={formData.shipment_type || 'sea'} onValueChange={(v) => setFormData({...formData, shipment_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="air">Air</SelectItem>
                  <SelectItem value="sea">Sea</SelectItem>
                  <SelectItem value="land">Land</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Origin Country *</Label>
              <Input value={formData.origin_country || ''} onChange={(e) => setFormData({...formData, origin_country: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Destination Country *</Label>
              <Input value={formData.destination_country || ''} onChange={(e) => setFormData({...formData, destination_country: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Vessel / Carrier</Label>
              <Input value={formData.carrier_name || ''} onChange={(e) => setFormData({...formData, carrier_name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Container Number</Label>
              <Input value={formData.container_number || ''} onChange={(e) => setFormData({...formData, container_number: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Departure Date</Label>
              <Input type="date" value={formData.departure_date || ''} onChange={(e) => setFormData({...formData, departure_date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Expected Arrival</Label>
              <Input type="date" value={formData.expected_arrival || ''} onChange={(e) => setFormData({...formData, expected_arrival: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status || 'booked'} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="picked_up">Picked Up</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="customs_clearance">Customs Clearance</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cargo Value ($)</Label>
              <Input type="number" value={formData.cargo_value || 0} onChange={(e) => setFormData({...formData, cargo_value: parseFloat(e.target.value) || 0})} />
            </div>
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Vehicles in Shipment</Label>
            <VehicleSelector
              vehicles={vehicles}
              selectedVehicles={formData.vehicle_ids || []}
              onSelectionChange={handleVehicleSelection}
              multiple={true}
              placeholder="Search and select vehicles..."
            />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Notes</Label>
            <Textarea value={formData.notes || ''} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={2} />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formData)} className="bg-blue-600 hover:bg-blue-700">
            {shipment ? 'Update' : 'Create'} Shipment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}