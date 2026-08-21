import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Building2, Edit, Mail, Phone, MapPin, Trash2, User, LayoutGrid, List, ArrowUpDown, CreditCard, Crown, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CompanyDialog from "@/components/shared/CompanyDialog";

export default function Companies() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("created_date");
  const [sortOrder, setSortOrder] = useState("desc");

  const queryClient = useQueryClient();

  const { user: currentUser } = useAuth();

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const result = await supabase.entities.Company.list('-created_date');
      console.log('Fetched companies:', result);
      return result;
    },
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      console.log('Creating company with data:', data);
      const result = await supabase.entities.Company.create(data);
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
      const result = await supabase.entities.Company.update(id, data);
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
    mutationFn: (id) => supabase.entities.Company.delete(id),
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
    )
    .sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (typeof aVal === "string") aVal = aVal?.toLowerCase() || "";
      if (typeof bVal === "string") bVal = bVal?.toLowerCase() || "";
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

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
      contact_person_name: formData.contact_person_name?.trim() || "",
      contact_person_title: formData.contact_person_title?.trim() || "",
      contact_person_email: formData.contact_person_email?.trim() || "",
      contact_person_phone: formData.contact_person_phone?.trim() || "",
      logo_url: formData.logo_url?.trim() || "",
      status: formData.status || "active",
      tax_rates: formData.tax_rates
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search by name or code..."
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
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="code-asc">Code (A-Z)</SelectItem>
              <SelectItem value="code-desc">Code (Z-A)</SelectItem>
              <SelectItem value="city-asc">City (A-Z)</SelectItem>
              <SelectItem value="city-desc">City (Z-A)</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1 justify-end">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {filteredCompanies.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No companies found</h3>
          <p className="text-gray-500 mb-6">Add your first company to get started</p>
        </div>
      ) : viewMode === "list" ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => { setSortBy("name"); setSortOrder(sortBy === "name" && sortOrder === "asc" ? "desc" : "asc"); }}>
                    <div className="flex items-center gap-1">Company {sortBy === "name" && <ArrowUpDown className="w-3 h-3" />}</div>
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => { setSortBy("code"); setSortOrder(sortBy === "code" && sortOrder === "asc" ? "desc" : "asc"); }}>
                    <div className="flex items-center gap-1">Code {sortBy === "code" && <ArrowUpDown className="w-3 h-3" />}</div>
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => { setSortBy("email"); setSortOrder(sortBy === "email" && sortOrder === "asc" ? "desc" : "asc"); }}>
                    <div className="flex items-center gap-1">Contact {sortBy === "email" && <ArrowUpDown className="w-3 h-3" />}</div>
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => { setSortBy("city"); setSortOrder(sortBy === "city" && sortOrder === "asc" ? "desc" : "asc"); }}>
                    <div className="flex items-center gap-1">Location {sortBy === "city" && <ArrowUpDown className="w-3 h-3" />}</div>
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => { setSortBy("status"); setSortOrder(sortBy === "status" && sortOrder === "asc" ? "desc" : "asc"); }}>
                    <div className="flex items-center gap-1">Status {sortBy === "status" && <ArrowUpDown className="w-3 h-3" />}</div>
                  </th>
                  <th className="text-left p-4 font-medium text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => { setSortBy("subscription_plan"); setSortOrder(sortBy === "subscription_plan" && sortOrder === "asc" ? "desc" : "asc"); }}>
                    <div className="flex items-center gap-1">Subscription {sortBy === "subscription_plan" && <ArrowUpDown className="w-3 h-3" />}</div>
                  </th>
                  <th className="text-right p-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((company) => (
                  <tr key={company.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-semibold">{company.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600">{company.code}</td>
                    <td className="p-4">
                      <div className="text-sm">
                        {company.email && <div className="text-gray-600">{company.email}</div>}
                        {company.phone && <div className="text-gray-500">{company.phone}</div>}
                      </div>
                    </td>
                    <td className="p-4 text-gray-600">
                      {company.city ? `${company.city}, ${company.country}` : "-"}
                    </td>
                    <td className="p-4">
                      <Badge className={company.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {company.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {company.subscription_plan && company.subscription_plan !== 'none' ? (
                        <Badge className={
                          company.subscription_plan === 'enterprise' ? 'bg-amber-100 text-amber-800' :
                          company.subscription_plan === 'professional' ? 'bg-purple-100 text-purple-800' :
                          company.subscription_plan === 'starter' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {company.subscription_plan === 'enterprise' && <Crown className="w-3 h-3 mr-1" />}
                          {company.subscription_plan === 'professional' && <Building2 className="w-3 h-3 mr-1" />}
                          {company.subscription_plan === 'starter' && <Zap className="w-3 h-3 mr-1" />}
                          {company.subscription_plan.charAt(0).toUpperCase() + company.subscription_plan.slice(1)}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">No subscription</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button 
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingCompany(company);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {currentUser?.role === 'admin' && (
                          <Button 
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setCompanyToDelete(company);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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
                    <div className="flex items-center gap-2">
                                          <Badge className={company.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                            {company.status}
                                          </Badge>
                                          {company.subscription_plan && company.subscription_plan !== 'none' && (
                                            <Badge className={
                                              company.subscription_plan === 'enterprise' ? 'bg-amber-100 text-amber-800' :
                                              company.subscription_plan === 'professional' ? 'bg-purple-100 text-purple-800' :
                                              company.subscription_plan === 'starter' ? 'bg-blue-100 text-blue-800' :
                                              'bg-gray-100 text-gray-800'
                                            }>
                                              {company.subscription_plan === 'enterprise' && <Crown className="w-3 h-3 mr-1" />}
                                              {company.subscription_plan === 'professional' && <Building2 className="w-3 h-3 mr-1" />}
                                              {company.subscription_plan === 'starter' && <Zap className="w-3 h-3 mr-1" />}
                                              {company.subscription_plan.charAt(0).toUpperCase() + company.subscription_plan.slice(1)}
                                            </Badge>
                                          )}
                                        </div>
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
