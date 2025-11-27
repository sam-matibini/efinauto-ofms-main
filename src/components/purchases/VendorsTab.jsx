import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Mail, Phone, MapPin, Edit, Trash2, Sparkles, LayoutGrid, List } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AIAddressLookup from "../shared/AIAddressLookup";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function VendorsTab({ vendors, selectedCompanyId }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Vendor.create({ ...data, company_id: selectedCompanyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setDialogOpen(false);
      setEditingVendor(null);
      toast.success("Vendor saved!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vendor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setDialogOpen(false);
      setEditingVendor(null);
      toast.success("Vendor updated!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Vendor.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success("Vendor deleted!");
    },
  });

  const filteredVendors = vendors.filter(v =>
    v.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.phone?.includes(searchTerm)
  );

  const handleSave = (data) => {
    if (editingVendor) {
      updateMutation.mutate({ id: editingVendor.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Vendors</h2>
        <div className="flex gap-2">
          <div className="flex bg-white rounded-lg shadow-sm border">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              <LayoutGrid className="w-4 h-4 mr-1" />
              Grid
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              <List className="w-4 h-4 mr-1" />
              List
            </Button>
          </div>
          <Button onClick={() => { setEditingVendor(null); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Vendor
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {viewMode === "list" ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Payment Terms</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.map((vendor) => (
                <TableRow key={vendor.id} className="hover:bg-gray-50">
                  <TableCell className="font-semibold">{vendor.vendor_name}</TableCell>
                  <TableCell className="text-sm">{vendor.contact_person || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{vendor.vendor_type?.replace(/_/g, ' ')}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{vendor.email || "-"}</TableCell>
                  <TableCell className="text-sm">{vendor.phone || "-"}</TableCell>
                  <TableCell className="text-sm">
                    {vendor.city ? `${vendor.city}${vendor.province ? `, ${vendor.province}` : ""}${vendor.postal_code ? ` ${vendor.postal_code}` : ""}` : "-"}
                  </TableCell>
                  <TableCell className="text-sm">{vendor.payment_terms || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={vendor.status === 'active' ? 'default' : 'secondary'}>{vendor.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditingVendor(vendor); setDialogOpen(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => deleteMutation.mutate(vendor.id)}>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map((vendor) => (
            <Card key={vendor.id} className="hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg">{vendor.vendor_name}</h3>
                  <Badge variant={vendor.status === 'active' ? 'default' : 'secondary'}>{vendor.status}</Badge>
                </div>
                <div className="space-y-2">
                  {vendor.contact_person && <p className="text-sm text-gray-600">{vendor.contact_person}</p>}
                  {vendor.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{vendor.email}</span>
                    </div>
                  )}
                  {vendor.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{vendor.phone}</span>
                    </div>
                  )}
                  {vendor.city && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{vendor.city}, {vendor.country}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingVendor(vendor); setDialogOpen(true); }}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600" onClick={() => deleteMutation.mutate(vendor.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <VendorDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingVendor(null); }}
        vendor={editingVendor}
        onSave={handleSave}
      />
    </>
  );
}

function VendorDialog({ open, onClose, vendor, onSave }) {
  const [formData, setFormData] = useState(vendor || {
    vendor_name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    country: "",
    vendor_type: "supplier",
    payment_terms: "Net 30",
    tax_id: "",
    notes: "",
    status: "active"
  });

  React.useEffect(() => {
    setFormData(vendor || {
      vendor_name: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      province: "",
      postal_code: "",
      country: "",
      vendor_type: "supplier",
      payment_terms: "Net 30",
      tax_id: "",
      notes: "",
      status: "active"
    });
  }, [vendor, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{vendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Vendor Name *</Label>
              <Input value={formData.vendor_name} onChange={(e) => setFormData({...formData, vendor_name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input value={formData.contact_person} onChange={(e) => setFormData({...formData, contact_person: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Vendor Type</Label>
              <Select value={formData.vendor_type} onValueChange={(v) => setFormData({...formData, vendor_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplier">Supplier</SelectItem>
                  <SelectItem value="service_provider">Service Provider</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="space-y-2 col-span-2">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-2">
                <p className="text-xs text-purple-700 mb-2">🔍 AI Address Lookup</p>
                <AIAddressLookup 
                  onAddressSelected={(data) => {
                    setFormData({
                      ...formData,
                      address: data.address || formData.address,
                      city: data.city || formData.city,
                      province: data.province || formData.province,
                      postal_code: data.postal_code || formData.postal_code,
                      country: data.country || formData.country
                    });
                  }}
                />
              </div>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Address</Label>
              <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Street address" />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Province / State</Label>
              <Input value={formData.province} onChange={(e) => setFormData({...formData, province: e.target.value})} placeholder="Province or state" />
            </div>
            <div className="space-y-2">
              <Label>Postal Code / ZIP</Label>
              <Input value={formData.postal_code} onChange={(e) => setFormData({...formData, postal_code: e.target.value})} placeholder="e.g., A1B 2C3" />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Input value={formData.payment_terms} onChange={(e) => setFormData({...formData, payment_terms: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Tax ID</Label>
              <Input value={formData.tax_id} onChange={(e) => setFormData({...formData, tax_id: e.target.value})} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Notes</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formData)} className="bg-blue-600 hover:bg-blue-700">
            {vendor ? 'Update' : 'Add'} Vendor
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}