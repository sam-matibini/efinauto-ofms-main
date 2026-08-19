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
import { Package, Plus, Search, Eye, Trash2, Edit, Scale } from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import { useCompany } from "@/components/shared/CompanyContext";

const formatCurrency = (amount) => `$${(amount || 0).toLocaleString()}`;

export default function CargoTab({ cargo = [], shipments = [], containers = [], customers = [] }) {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCargo, setEditingCargo] = useState(null);
  const [viewCargo, setViewCargo] = useState(null);

  const statusColors = {
    pending: "bg-gray-100 text-gray-800",
    booked: "bg-yellow-100 text-yellow-800",
    loaded: "bg-blue-100 text-blue-800",
    in_transit: "bg-purple-100 text-purple-800",
    at_port: "bg-cyan-100 text-cyan-800",
    customs: "bg-orange-100 text-orange-800",
    cleared: "bg-green-100 text-green-800",
    delivered: "bg-green-200 text-green-900"
  };

  const createMutation = useMutation({
    mutationFn: (data) => supabase.entities.Cargo.create({ ...data, company_id: selectedCompanyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargo'] });
      setDialogOpen(false);
      setEditingCargo(null);
      toast.success("Cargo created!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => supabase.entities.Cargo.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargo'] });
      setDialogOpen(false);
      setEditingCargo(null);
      toast.success("Cargo updated!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supabase.entities.Cargo.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargo'] });
      toast.success("Cargo deleted!");
    },
  });

  const handleSave = (formData) => {
    if (editingCargo) {
      updateMutation.mutate({ id: editingCargo.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredCargo = cargo.filter(c =>
    !searchTerm ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cargo_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative flex-1 w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => { setEditingCargo(null); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Cargo
        </Button>
      </div>

      {/* List */}
      <Card className="border-none shadow-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cargo ID</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Weight / CBM</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Container #</TableHead>
              <TableHead>Shipment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCargo.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.cargo_id || '-'}</TableCell>
                <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                <TableCell>{item.weight || 0} kg / {item.volume_cbm || 0} CBM</TableCell>
                <TableCell>{item.customer_name || '-'}</TableCell>
                <TableCell>{item.container_number || '-'}</TableCell>
                <TableCell>{item.shipment_number || '-'}</TableCell>
                <TableCell>
                  <Badge className={statusColors[item.status]}>{item.status?.replace(/_/g, ' ')}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setViewCargo(item)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditingCargo(item); setDialogOpen(true); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-red-600" onClick={() => deleteMutation.mutate(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredCargo.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500 py-8">No cargo found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewCargo} onOpenChange={() => setViewCargo(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cargo Details - {viewCargo?.cargo_id || viewCargo?.description}</DialogTitle>
          </DialogHeader>
          {viewCargo && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500">Description</p><p className="font-semibold">{viewCargo.description}</p></div>
                <div><p className="text-xs text-gray-500">Category</p><p className="font-semibold">{viewCargo.category || 'General'}</p></div>
                <div><p className="text-xs text-gray-500">Weight</p><p className="font-semibold">{viewCargo.weight || 0} kg</p></div>
                <div><p className="text-xs text-gray-500">Volume</p><p className="font-semibold">{viewCargo.volume_cbm || 0} CBM</p></div>
                <div><p className="text-xs text-gray-500">Customer</p><p className="font-semibold">{viewCargo.customer_name || 'N/A'}</p></div>
                <div><p className="text-xs text-gray-500">Value</p><p className="font-semibold">{formatCurrency(viewCargo.declared_value)}</p></div>
              </div>
              {viewCargo.fees && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Fees</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Freight: {formatCurrency(viewCargo.fees.freight)}</div>
                    <div>Handling: {formatCurrency(viewCargo.fees.handling)}</div>
                    <div>Customs: {formatCurrency(viewCargo.fees.customs)}</div>
                    <div>Storage: {formatCurrency(viewCargo.fees.storage)}</div>
                    <div className="col-span-2 font-bold border-t pt-2">Total: {formatCurrency(viewCargo.fees.total)}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={() => { setDialogOpen(false); setEditingCargo(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCargo ? 'Edit Cargo' : 'Add Cargo'}</DialogTitle>
          </DialogHeader>
          <CargoForm 
            cargo={editingCargo} 
            shipments={shipments}
            containers={containers}
            customers={customers}
            onSave={handleSave} 
            onClose={() => { setDialogOpen(false); setEditingCargo(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CargoForm({ cargo, shipments, containers, customers, onSave, onClose }) {
  const [formData, setFormData] = useState({
    cargo_id: "",
    description: "",
    category: "general",
    customer_name: "",
    weight: 0,
    volume_cbm: 0,
    declared_value: 0,
    container_id: "",
    shipment_id: "",
    status: "pending"
  });

  React.useEffect(() => {
    if (cargo) {
      setFormData({ ...cargo });
    }
  }, [cargo]);

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2">
          <Label>Description *</Label>
          <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="machinery">Machinery</SelectItem>
              <SelectItem value="equipment">Equipment</SelectItem>
              <SelectItem value="electronics">Electronics</SelectItem>
              <SelectItem value="spare_parts">Spare Parts</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Customer</Label>
          <Select value={formData.customer_id || ''} onValueChange={(v) => {
            const cust = customers.find(c => c.id === v);
            setFormData({...formData, customer_id: v, customer_name: cust?.full_name || ''});
          }}>
            <SelectTrigger><SelectValue placeholder="Select customer..." /></SelectTrigger>
            <SelectContent>
              {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Weight (kg)</Label>
          <Input type="number" value={formData.weight} onChange={(e) => setFormData({...formData, weight: parseFloat(e.target.value) || 0})} />
        </div>
        <div className="space-y-2">
          <Label>Volume (CBM)</Label>
          <Input type="number" value={formData.volume_cbm} onChange={(e) => setFormData({...formData, volume_cbm: parseFloat(e.target.value) || 0})} />
        </div>
        <div className="space-y-2">
          <Label>Declared Value ($)</Label>
          <Input type="number" value={formData.declared_value} onChange={(e) => setFormData({...formData, declared_value: parseFloat(e.target.value) || 0})} />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="booked">Booked</SelectItem>
              <SelectItem value="loaded">Loaded</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(formData)} className="bg-blue-600 hover:bg-blue-700" disabled={!formData.description}>
          {cargo ? 'Update' : 'Create'} Cargo
        </Button>
      </div>
    </div>
  );
}