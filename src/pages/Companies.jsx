import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Building2, Edit, Mail, Phone, MapPin, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Companies() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState(null);

  const queryClient = useQueryClient();

  const [currentUser, setCurrentUser] = useState(null);

  // Fetch current user
  useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      return user;
    },
  });

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const result = await base44.entities.Company.list('-created_date');
      console.log('Fetched companies:', result);
      return result;
    },
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      console.log('Creating company with data:', data);
      const result = await base44.entities.Company.create(data);
      console.log('Company created:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Create success:', data);
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setDialogOpen(false);
      setEditingCompany(null);
      toast.success("Company added successfully!");
    },
    onError: (error) => {
      console.error('Create error:', error);
      toast.error(error?.message || "Failed to add company. Please check console for details.");
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      console.log('Updating company:', id, data);
      const result = await base44.entities.Company.update(id, data);
      console.log('Company updated:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setDialogOpen(false);
      setEditingCompany(null);
      toast.success("Company updated successfully!");
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast.error(error?.message || "Failed to update company");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Company.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setDeleteDialogOpen(false);
      setCompanyToDelete(null);
      toast.success("Company deleted successfully!");
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error(error?.message || "Failed to delete company");
    }
  });

  // Filter by user's company if not admin
  const filteredCompanies = companies
    .filter(c => {
      // Admin can see all companies
      if (currentUser?.role === 'admin') return true;
      // Non-admin users only see their own company
      return c.id === currentUser?.data?.company_id;
    })
    .filter(c =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleSave = async (formData) => {
    console.log('HandleSave called with:', formData);
    
    if (!formData.name || !formData.code) {
      toast.error("Company name and code are required");
      return;
    }

    const cleanData = {
      name: formData.name.trim(),
      display_name: formData.display_name?.trim() || "",
      code: formData.code.trim(),
      dealer_permit_number: formData.dealer_permit_number?.trim() || "",
      gst_number: formData.gst_number?.trim() || "",
      pst_number: formData.pst_number?.trim() || "",
      address: formData.address?.trim() || "",
      city: formData.city?.trim() || "",
      province: formData.province?.trim() || "",
      postal_code: formData.postal_code?.trim() || "",
      country: formData.country?.trim() || "",
      phone: formData.phone?.trim() || "",
      email: formData.email?.trim() || "",
      tax_id: formData.tax_id?.trim() || "",
      logo_url: formData.logo_url?.trim() || "",
      status: formData.status || "active"
    };

    console.log('Clean data to save:', cleanData);

    if (editingCompany) {
      updateMutation.mutate({ id: editingCompany.id, data: cleanData });
    } else {
      createMutation.mutate(cleanData);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Company Management</h1>
            <p className="text-sm text-gray-300 mt-1">{filteredCompanies.length} companies</p>
          </div>
        {currentUser?.role === 'admin' && (
          <Button 
            onClick={() => {
              setEditingCompany(null);
              setDialogOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Company
          </Button>
        )}
        </div>
        </div>

        <div className="p-6 md:p-8 max-w-7xl mx-auto">

      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredCompanies.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No companies found</h3>
          <p className="text-gray-500 mb-6">Add your first company to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company, index) => (
            <motion.div
              key={company.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-lg transition-all duration-300 border-none shadow-md bg-white">
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{company.name}</h3>
                        <p className="text-sm text-gray-500">Code: {company.code}</p>
                      </div>
                    </div>
                    <Badge className={company.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {company.status}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {company.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{company.email}</span>
                      </div>
                    )}
                    {company.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{company.phone}</span>
                      </div>
                    )}
                    {company.city && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{company.city}, {company.country}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={() => {
                        setEditingCompany(company);
                        setDialogOpen(true);
                      }}
                      className="flex-1"
                      variant="outline"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    {currentUser?.role === 'admin' && (
                      <Button 
                        onClick={() => {
                          setCompanyToDelete(company);
                          setDeleteDialogOpen(true);
                        }}
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <CompanyDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingCompany(null);
        }}
        company={editingCompany}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{companyToDelete?.name}"? This action cannot be undone and will affect all related records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCompanyToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => companyToDelete && deleteMutation.mutate(companyToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </div>
        </div>
        );
        }

function CompanyDialog({ open, onClose, company, onSave, isLoading }) {
  const [formData, setFormData] = useState(company || {
    name: "",
    display_name: "",
    code: "",
    dealer_permit_number: "",
    gst_number: "",
    pst_number: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    country: "",
    phone: "",
    email: "",
    tax_id: "",
    logo_url: "",
    status: "active"
  });

  React.useEffect(() => {
    if (company) {
      setFormData(company);
    } else {
      setFormData({
        name: "",
        display_name: "",
        code: "",
        dealer_permit_number: "",
        gst_number: "",
        pst_number: "",
        address: "",
        city: "",
        province: "",
        postal_code: "",
        country: "",
        phone: "",
        email: "",
        tax_id: "",
        logo_url: "",
        status: "active"
      });
    }
  }, [company, open]);

  const canSave = (formData.name && formData.name.trim().length > 0) && 
                   (formData.code && formData.code.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{company ? 'Edit Company' : 'Add New Company'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <p className="text-sm text-gray-600">Required fields are marked with *</p>
            </div>
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Oluspe Auto Sales and Parts Inc."
              />
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input 
                value={formData.display_name || ""} 
                onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                placeholder="e.g., Oluspe Auto"
              />
            </div>
            <div className="space-y-2">
              <Label>Company Code *</Label>
              <Input 
                value={formData.code} 
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                placeholder="e.g., 1001"
              />
            </div>
            <div className="space-y-2">
              <Label>Dealer Permit Number</Label>
              <Input 
                value={formData.dealer_permit_number || ""} 
                onChange={(e) => setFormData({...formData, dealer_permit_number: e.target.value})}
                placeholder="e.g., DPN-12345"
              />
            </div>
            <div className="space-y-2">
              <Label>GST Number</Label>
              <Input 
                value={formData.gst_number || ""} 
                onChange={(e) => setFormData({...formData, gst_number: e.target.value})}
                placeholder="Enter GST number"
              />
            </div>
            <div className="space-y-2">
              <Label>PST Number</Label>
              <Input 
                value={formData.pst_number || ""} 
                onChange={(e) => setFormData({...formData, pst_number: e.target.value})}
                placeholder="Enter PST number"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email" 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="e.g., cars@oluspeautos.ca"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input 
                value={formData.phone} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="e.g., 2045908387"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Address</Label>
              <Textarea 
                value={formData.address} 
                onChange={(e) => setFormData({...formData, address: e.target.value})} 
                rows={2}
                placeholder="e.g., 3-122 Kildare Ave East"
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input 
                value={formData.city} 
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                placeholder="e.g., Winnipeg, MB"
              />
            </div>
            <div className="space-y-2">
              <Label>Province/State</Label>
              <Input 
                value={formData.province} 
                onChange={(e) => setFormData({...formData, province: e.target.value})}
                placeholder="e.g., Manitoba"
              />
            </div>
            <div className="space-y-2">
              <Label>Postal Code/ZIP</Label>
              <Input 
                value={formData.postal_code} 
                onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                placeholder="e.g., R2C 5G1"
              />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input 
                value={formData.country} 
                onChange={(e) => setFormData({...formData, country: e.target.value})}
                placeholder="e.g., Canada"
              />
            </div>
            <div className="space-y-2">
              <Label>Tax ID</Label>
              <Input 
                value={formData.tax_id} 
                onChange={(e) => setFormData({...formData, tax_id: e.target.value})}
                placeholder="e.g., 155027-6"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button 
            onClick={() => onSave(formData)} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!canSave || isLoading}
          >
            {isLoading ? "Saving..." : company ? 'Update Company' : 'Add Company'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}