import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Mail, Phone, MapPin, Edit, Trash2, Upload, LayoutGrid, List, ArrowUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import ImportCustomersDialog from "./ImportCustomersDialog";

export default function CustomersTab({ customers, selectedCompanyId }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("created_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create({ ...data, company_id: selectedCompanyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDialogOpen(false);
      setEditingCustomer(null);
      toast.success("Customer saved!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Customer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDialogOpen(false);
      setEditingCustomer(null);
      toast.success("Customer updated!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Customer.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success("Customer deleted!");
    },
  });

  const filteredCustomers = customers.filter(c =>
    c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  ).sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    if (typeof aVal === "string") aVal = aVal?.toLowerCase() || "";
    if (typeof bVal === "string") bVal = bVal?.toLowerCase() || "";
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const handleSave = (data) => {
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Customers</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => { setEditingCustomer(null); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(v) => { const [field, order] = v.split("-"); setSortBy(field); setSortOrder(order); }}>
              <SelectTrigger>
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_date-desc">Newest First</SelectItem>
                <SelectItem value="created_date-asc">Oldest First</SelectItem>
                <SelectItem value="full_name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="full_name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="email-asc">Email (A-Z)</SelectItem>
                <SelectItem value="city-asc">City (A-Z)</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1 justify-end">
              <Button variant={viewMode === "grid" ? "default" : "outline"} size="icon" onClick={() => setViewMode("grid")}>
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")}>
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {viewMode === "list" ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("full_name"); setSortOrder(sortBy === "full_name" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Name {sortBy === "full_name" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("email"); setSortOrder(sortBy === "email" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Email {sortBy === "email" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("city"); setSortOrder(sortBy === "city" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Location {sortBy === "city" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.full_name}</TableCell>
                  <TableCell><Badge variant="outline">{customer.customer_type}</Badge></TableCell>
                  <TableCell>{customer.email || "-"}</TableCell>
                  <TableCell>{customer.phone || "-"}</TableCell>
                  <TableCell>{customer.city ? `${customer.city}, ${customer.country}` : "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingCustomer(customer); setDialogOpen(true); }}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteMutation.mutate(customer.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg">{customer.full_name}</h3>
                  <Badge variant="outline">{customer.customer_type}</Badge>
                </div>
                <div className="space-y-2">
                  {customer.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.city && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{customer.city}, {customer.country}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditingCustomer(customer); setDialogOpen(true); }}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600" onClick={() => deleteMutation.mutate(customer.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CustomerDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingCustomer(null); }}
        customer={editingCustomer}
        onSave={handleSave}
      />

      <ImportCustomersDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        companyId={selectedCompanyId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['customers'] });
          setImportDialogOpen(false);
        }}
      />
    </>
  );
}

function CustomerDialog({ open, onClose, customer, onSave }) {
  const [formData, setFormData] = useState(customer || {
    full_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    country: "",
    customer_type: "individual",
    is_consignee: false,
    consignee_only: false,
    tax_id: ""
  });

  React.useEffect(() => {
    if (customer) {
      setFormData({
        ...customer,
        is_consignee: customer.is_consignee || false,
        consignee_only: customer.consignee_only || false,
        tax_id: customer.tax_id || ""
      });
    } else {
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        province: "",
        postal_code: "",
        country: "",
        customer_type: "individual",
        is_consignee: false,
        consignee_only: false,
        tax_id: ""
      });
    }
  }, [customer, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Province</Label>
              <Input value={formData.province} onChange={(e) => setFormData({...formData, province: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Postal Code</Label>
              <Input value={formData.postal_code} onChange={(e) => setFormData({...formData, postal_code: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tax ID / Passport No</Label>
            <Input value={formData.tax_id} onChange={(e) => setFormData({...formData, tax_id: e.target.value})} placeholder="Tax ID or Passport number" />
          </div>

          {/* Consignee Options */}
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-sm text-gray-700 mb-3">Consignee Options</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_consignee"
                  checked={formData.is_consignee || false}
                  onChange={(e) => setFormData({...formData, is_consignee: e.target.checked, consignee_only: e.target.checked ? formData.consignee_only : false})}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="is_consignee" className="cursor-pointer text-sm">This customer is also a consignee (for exports)</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="consignee_only"
                  checked={formData.consignee_only || false}
                  onChange={(e) => setFormData({...formData, consignee_only: e.target.checked, is_consignee: e.target.checked ? true : formData.is_consignee})}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="consignee_only" className="cursor-pointer text-sm">Consignee only (not a regular customer)</Label>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formData)} className="bg-blue-600 hover:bg-blue-700">
            {customer ? 'Update' : 'Add'} Customer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}