import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Building2, Edit, Mail, Phone, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Companies() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);

  const queryClient = useQueryClient();

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list('-created_date'),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Company.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setDialogOpen(false);
      setEditingCompany(null);
      toast.success("Company added successfully!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Company.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setDialogOpen(false);
      setEditingCompany(null);
      toast.success("Company updated successfully!");
    },
  });

  const filteredCompanies = companies.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = (formData) => {
    if (editingCompany) {
      updateMutation.mutate({ id: editingCompany.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Company Management</h1>
          <p className="text-gray-600">{filteredCompanies.length} companies</p>
        </div>
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
      </div>

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

                  <Button 
                    onClick={() => {
                      setEditingCompany(company);
                      setDialogOpen(true);
                    }}
                    className="w-full"
                    variant="outline"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
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
      />
    </div>
  );
}

function CompanyDialog({ open, onClose, company, onSave }) {
  const [formData, setFormData] = useState(company || {
    name: "",
    code: "",
    address: "",
    city: "",
    country: "",
    phone: "",
    email: "",
    tax_id: "",
    logo_url: "",
    status: "active"
  });

  React.useEffect(() => {
    if (company) setFormData(company);
  }, [company]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{company ? 'Edit Company' : 'Add New Company'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Company Code *</Label>
              <Input value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} />
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
              <Label>Address</Label>
              <Textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Tax ID</Label>
              <Input value={formData.tax_id} onChange={(e) => setFormData({...formData, tax_id: e.target.value})} />
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formData)} className="bg-blue-600 hover:bg-blue-700">
            {company ? 'Update' : 'Add'} Company
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}