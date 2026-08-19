import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Search, LayoutGrid, List, Eye, Trash2, Edit, Car } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import { useCompany } from "@/components/shared/CompanyContext";
import VehicleSelector from "./VehicleSelector";

const formatCurrency = (amount) => `$${(amount || 0).toLocaleString()}`;

export default function ContainersTab({ containers = [], shipments = [], vehicles = [], showCreateDialog = false, onDialogClose }) {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Handle external dialog trigger
  React.useEffect(() => {
    if (showCreateDialog) {
      setDialogOpen(true);
      setEditingContainer(null);
    }
  }, [showCreateDialog]);

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingContainer(null);
    if (onDialogClose) onDialogClose();
  };
  const [editingContainer, setEditingContainer] = useState(null);
  const [viewContainer, setViewContainer] = useState(null);

  const statusColors = {
    empty: "bg-gray-100 text-gray-800",
    loading: "bg-yellow-100 text-yellow-800",
    loaded: "bg-blue-100 text-blue-800",
    in_transit: "bg-purple-100 text-purple-800",
    at_port: "bg-cyan-100 text-cyan-800",
    customs: "bg-orange-100 text-orange-800",
    cleared: "bg-green-100 text-green-800",
    delivered: "bg-green-200 text-green-900"
  };

  const createMutation = useMutation({
    mutationFn: (data) => supabase.entities.Container.create({ ...data, company_id: selectedCompanyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] });
      handleDialogClose();
      toast.success("Container created!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => supabase.entities.Container.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] });
      handleDialogClose();
      toast.success("Container updated!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supabase.entities.Container.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] });
      toast.success("Container deleted!");
    },
  });

  const handleSave = (formData) => {
    if (editingContainer) {
      updateMutation.mutate({ id: editingContainer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredContainers = containers.filter(c =>
    !searchTerm ||
    c.container_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.seal_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.vessel_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative flex-1 w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by container #, seal #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 border rounded-lg p-1 bg-white">
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("list")}>
              <List className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === "cards" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("cards")}>
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
          <Button onClick={() => { setEditingContainer(null); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Container
          </Button>
        </div>
      </div>

      {/* List View */}
      {viewMode === "list" ? (
        <Card className="border-none shadow-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Container #</TableHead>
                <TableHead>Seal #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead># Vehicles</TableHead>
                <TableHead>Vessel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContainers.map((container) => (
                <TableRow key={container.id}>
                  <TableCell className="font-medium">{container.container_number}</TableCell>
                  <TableCell>{container.seal_number || '-'}</TableCell>
                  <TableCell>{container.container_type || '40ft'}</TableCell>
                  <TableCell>{container.vehicle_count || 0}</TableCell>
                  <TableCell>{container.vessel_name || '-'}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[container.status]}>{container.status?.replace(/_/g, ' ')}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setViewContainer(container)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setEditingContainer(container); setDialogOpen(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-red-600" onClick={() => deleteMutation.mutate(container.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredContainers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">No containers found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContainers.map((container, index) => (
            <motion.div key={container.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <Card className="border-none shadow-md hover:shadow-lg transition-all cursor-pointer" onClick={() => setViewContainer(container)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-600" />
                      <span className="font-bold">{container.container_number}</span>
                    </div>
                    <Badge className={statusColors[container.status]}>{container.status?.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Seal:</strong> {container.seal_number || 'N/A'}</p>
                    <p><strong>Type:</strong> {container.container_type || '40ft'}</p>
                    <p><strong>Vehicles:</strong> {container.vehicle_count || 0}</p>
                    {container.eta && <p><strong>ETA:</strong> {format(new Date(container.eta), 'MMM d, yyyy')}</p>}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* View Container Dialog */}
      <Dialog open={!!viewContainer} onOpenChange={() => setViewContainer(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Container Details - {viewContainer?.container_number}</DialogTitle>
          </DialogHeader>
          {viewContainer && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div><p className="text-xs text-gray-500">Container #</p><p className="font-semibold">{viewContainer.container_number}</p></div>
                <div><p className="text-xs text-gray-500">Seal #</p><p className="font-semibold">{viewContainer.seal_number || '-'}</p></div>
                <div><p className="text-xs text-gray-500">Type</p><p className="font-semibold">{viewContainer.container_type || '40ft'}</p></div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Shipment Info</h3>
                  <p className="text-sm text-gray-600">Vessel: {viewContainer.vessel_name || 'N/A'}</p>
                  <p className="text-sm text-gray-600">BL #: {viewContainer.bl_number || 'N/A'}</p>
                  <p className="text-sm text-gray-600">Booking #: {viewContainer.booking_number || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Route</h3>
                  <p className="text-sm text-gray-600">Origin: {viewContainer.origin_port || 'N/A'}</p>
                  <p className="text-sm text-gray-600">Destination: {viewContainer.destination_port || 'N/A'}</p>
                  <p className="text-sm text-gray-600">ETA: {viewContainer.eta ? format(new Date(viewContainer.eta), 'MMM d, yyyy') : 'N/A'}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2"><Car className="w-4 h-4" /> Vehicles ({viewContainer.vehicle_count || 0})</h3>
                {viewContainer.vehicle_ids?.length > 0 ? (
                  <div className="text-sm text-gray-600">{viewContainer.vehicle_ids.length} vehicles assigned</div>
                ) : (
                  <p className="text-sm text-gray-500">No vehicles assigned</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={() => { setDialogOpen(false); setEditingContainer(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingContainer ? 'Edit Container' : 'Add Container'}</DialogTitle>
          </DialogHeader>
          <ContainerForm 
            container={editingContainer} 
            shipments={shipments}
            vehicles={vehicles}
            onSave={handleSave} 
            onClose={() => { setDialogOpen(false); setEditingContainer(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContainerForm({ container, shipments, vehicles, onSave, onClose }) {
  const [formData, setFormData] = useState({
    container_number: "",
    seal_number: "",
    container_type: "40ft",
    shipment_id: "",
    vessel_name: "",
    bl_number: "",
    origin_port: "",
    destination_port: "",
    eta: "",
    status: "empty",
    vehicle_count: 0,
    vehicle_ids: []
  });

  React.useEffect(() => {
    if (container) {
      setFormData({ ...container, vehicle_ids: container.vehicle_ids || [] });
    }
  }, [container]);

  const handleVehicleSelection = (selectedIds) => {
    setFormData({
      ...formData,
      vehicle_ids: selectedIds,
      vehicle_count: selectedIds.length
    });
  };

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Container # *</Label>
          <Input value={formData.container_number} onChange={(e) => setFormData({...formData, container_number: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Seal #</Label>
          <Input value={formData.seal_number} onChange={(e) => setFormData({...formData, seal_number: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={formData.container_type} onValueChange={(v) => setFormData({...formData, container_type: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="20ft">20ft Standard</SelectItem>
              <SelectItem value="40ft">40ft Standard</SelectItem>
              <SelectItem value="40ft_hc">40ft High Cube</SelectItem>
              <SelectItem value="45ft">45ft</SelectItem>
              <SelectItem value="reefer">Reefer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Link to Shipment</Label>
          <Select value={formData.shipment_id || ''} onValueChange={(v) => setFormData({...formData, shipment_id: v})}>
            <SelectTrigger><SelectValue placeholder="Select shipment..." /></SelectTrigger>
            <SelectContent>
              {shipments.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.shipment_number} - {s.customer_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Vessel Name</Label>
          <Input value={formData.vessel_name} onChange={(e) => setFormData({...formData, vessel_name: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>BL Number</Label>
          <Input value={formData.bl_number} onChange={(e) => setFormData({...formData, bl_number: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>ETA</Label>
          <Input type="date" value={formData.eta || ''} onChange={(e) => setFormData({...formData, eta: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="empty">Empty</SelectItem>
              <SelectItem value="loading">Loading</SelectItem>
              <SelectItem value="loaded">Loaded</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="at_port">At Port</SelectItem>
              <SelectItem value="customs">Customs</SelectItem>
              <SelectItem value="cleared">Cleared</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Vehicle Selection */}
      <div className="space-y-2">
        <Label>Vehicles in Container</Label>
        <VehicleSelector
          vehicles={vehicles}
          selectedVehicles={formData.vehicle_ids}
          onSelectionChange={handleVehicleSelection}
          multiple={true}
          placeholder="Search and select vehicles..."
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(formData)} className="bg-blue-600 hover:bg-blue-700" disabled={!formData.container_number}>
          {container ? 'Update' : 'Create'} Container
        </Button>
      </div>
    </div>
  );
}