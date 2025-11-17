
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, User, Edit, Trash2, Phone, Mail, MapPin, Loader2, Upload, Map, List, CheckCircle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCompany } from "../components/shared/CompanyContext";
import CustomerMap from "../components/customers/CustomerMap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const { selectedCompanyId } = useCompany();

  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', selectedCompanyId],
    queryFn: () => base44.entities.Customer.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      console.log("Creating customer with data:", data);
      return await base44.entities.Customer.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDialogOpen(false);
      setEditingCustomer(null);
      toast.success("Customer added successfully!");
    },
    onError: (error) => {
      console.error("Create error:", error);
      toast.error("Failed to add customer: " + (error.message || "Unknown error"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      console.log("Updating customer with data:", data);
      return await base44.entities.Customer.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDialogOpen(false);
      setEditingCustomer(null);
      toast.success("Customer updated successfully!");
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast.error("Failed to update customer: " + (error.message || "Unknown error"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.Customer.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDeletingCustomer(null);
      toast.success("Customer deleted successfully!");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Failed to delete customer");
    },
  });

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || c.customer_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleSave = (formData) => {
    console.log("handleSave called with:", formData);
    
    if (!selectedCompanyId) {
      toast.error("Please select a company first");
      return;
    }

    if (!formData.full_name?.trim() || !formData.phone?.trim()) {
      toast.error("Please fill in all required fields (Name and Phone)");
      return;
    }

    const cleanData = {
      company_id: selectedCompanyId,
      full_name: formData.full_name.trim(),
      phone: formData.phone.trim(),
      customer_type: formData.customer_type || "individual"
    };

    if (formData.email && formData.email.trim()) cleanData.email = formData.email.trim();
    if (formData.address && formData.address.trim()) cleanData.address = formData.address.trim();
    if (formData.city && formData.city.trim()) cleanData.city = formData.city.trim();
    if (formData.country && formData.country.trim()) cleanData.country = formData.country.trim();
    if (formData.latitude !== "" && !isNaN(formData.latitude)) cleanData.latitude = Number(formData.latitude);
    if (formData.longitude !== "" && !isNaN(formData.longitude)) cleanData.longitude = Number(formData.longitude);
    if (formData.profile_picture_url && formData.profile_picture_url.trim()) cleanData.profile_picture_url = formData.profile_picture_url.trim();
    if (formData.company_name && formData.company_name.trim()) cleanData.company_name = formData.company_name.trim();
    if (formData.tax_id && formData.tax_id.trim()) cleanData.tax_id = formData.tax_id.trim();
    if (formData.notes && formData.notes.trim()) cleanData.notes = formData.notes.trim();

    console.log("Saving customer data:", cleanData);

    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: cleanData });
    } else {
      createMutation.mutate(cleanData);
    }
  };

  const typeColors = {
    individual: "bg-blue-100 text-blue-800",
    business: "bg-purple-100 text-purple-800",
    government: "bg-green-100 text-green-800"
  };

  if (!selectedCompanyId) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="text-center py-16">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Company Selected</h3>
          <p className="text-gray-500">Please select a company from the sidebar to view customers</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Customer Management</h1>
          <p className="text-gray-600">{filteredCustomers.length} customers</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-white rounded-lg shadow-sm border">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              <List className="w-4 h-4 mr-2" />
              List
            </Button>
            <Button
              variant={viewMode === "map" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("map")}
              className={viewMode === "map" ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              <Map className="w-4 h-4 mr-2" />
              Map
            </Button>
          </div>
          <Button 
            onClick={() => {
              setEditingCustomer(null);
              setDialogOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customer Types</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="government">Government</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {viewMode === "map" ? (
        <CustomerMap customers={filteredCustomers} />
      ) : (
        <>
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-16">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No customers found</h3>
              <p className="text-gray-500 mb-6">Add your first customer to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCustomers.map((customer, index) => (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-300 border-none shadow-md bg-white">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          {customer.profile_picture_url ? (
                            <img
                              src={customer.profile_picture_url}
                              alt={customer.full_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                              <span className="text-white font-bold text-lg">
                                {customer.full_name?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold text-lg text-gray-900">{customer.full_name}</h3>
                            <Badge className={typeColors[customer.customer_type]}>
                              {customer.customer_type}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {customer.company_name && (
                        <div className="text-sm text-gray-600">
                          <strong>Company:</strong> {customer.company_name}
                        </div>
                      )}

                      <div className="space-y-2">
                        {customer.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {customer.city && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span>{customer.city}, {customer.country}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2 border-t">
                        <Button 
                          onClick={() => {
                            setEditingCustomer(customer);
                            setDialogOpen(true);
                          }}
                          className="flex-1"
                          variant="outline"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button 
                          onClick={() => setDeletingCustomer(customer)}
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      <CustomerDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingCustomer(null);
        }}
        customer={editingCustomer}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={!!deletingCustomer} onOpenChange={() => setDeletingCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingCustomer?.full_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deletingCustomer.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CustomerDialog({ open, onClose, customer, onSave, isSaving }) {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    latitude: "",
    longitude: "",
    profile_picture_url: "",
    customer_type: "individual",
    company_name: "",
    tax_id: "",
    notes: ""
  });

  const [uploading, setUploading] = useState(false);
  const [emailValid, setEmailValid] = useState(null);

  React.useEffect(() => {
    if (open) {
      if (customer) {
        setFormData({
          full_name: customer.full_name || "",
          email: customer.email || "",
          phone: customer.phone || "",
          address: customer.address || "",
          city: customer.city || "",
          country: customer.country || "",
          latitude: customer.latitude !== undefined ? customer.latitude : "",
          longitude: customer.longitude !== undefined ? customer.longitude : "",
          profile_picture_url: customer.profile_picture_url || "",
          customer_type: customer.customer_type || "individual",
          company_name: customer.company_name || "",
          tax_id: customer.tax_id || "",
          notes: customer.notes || ""
        });
        if (customer.email) {
          validateEmail(customer.email);
        } else {
          setEmailValid(null);
        }
      } else {
        setFormData({
          full_name: "",
          email: "",
          phone: "",
          address: "",
          city: "",
          country: "",
          latitude: "",
          longitude: "",
          profile_picture_url: "",
          customer_type: "individual",
          company_name: "",
          tax_id: "",
          notes: ""
        });
        setEmailValid(null);
      }
    }
  }, [customer, open]);

  const validateEmail = (email) => {
    if (!email || email.trim() === "") {
      setEmailValid(null);
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    setEmailValid(isValid);
  };

  const handleEmailChange = (e) => {
    const email = e.target.value;
    setFormData({...formData, email});
    validateEmail(email);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, profile_picture_url: file_url });
      toast.success("Profile picture uploaded!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    }
    setUploading(false);
  };

  const hasRequiredFields = formData.full_name.trim().length > 0 && formData.phone.trim().length > 0;
  const emailIsValid = !formData.email.trim() || emailValid !== false;
  const canSave = hasRequiredFields && emailIsValid;

  console.log("Customer form validation:", { hasRequiredFields, emailIsValid, canSave, formData });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="location">Location & Map</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3">
                {formData.profile_picture_url ? (
                  <img
                    src={formData.profile_picture_url}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                    <User className="w-12 h-12 text-white" />
                  </div>
                )}
                <div className="flex gap-2">
                  <Label htmlFor="profile-picture" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors">
                      <Upload className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-600 font-medium">
                        {uploading ? "Uploading..." : "Upload Photo"}
                      </span>
                    </div>
                  </Label>
                  <input
                    id="profile-picture"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  {formData.profile_picture_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, profile_picture_url: "" })}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input 
                    value={formData.full_name} 
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})} 
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input 
                    value={formData.phone} 
                    onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="flex items-center gap-2">
                    Email
                    {emailValid === true && (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                    {emailValid === false && (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                  </Label>
                  <Input 
                    type="email" 
                    value={formData.email} 
                    onChange={handleEmailChange}
                    placeholder="Enter email"
                    className={emailValid === false ? "border-red-300" : ""}
                  />
                  {emailValid === false && formData.email.trim() !== "" && (
                    <p className="text-xs text-red-600">Please enter a valid email address</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Customer Type</Label>
                  <Select value={formData.customer_type} onValueChange={(v) => setFormData({...formData, customer_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="government">Government</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.customer_type === 'business' && (
                  <>
                    <div className="space-y-2">
                      <Label>Company Name</Label>
                      <Input 
                        value={formData.company_name} 
                        onChange={(e) => setFormData({...formData, company_name: e.target.value})} 
                        placeholder="Enter company name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tax ID</Label>
                      <Input 
                        value={formData.tax_id} 
                        onChange={(e) => setFormData({...formData, tax_id: e.target.value})} 
                        placeholder="Enter tax ID"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2 col-span-2">
                  <Label>Notes</Label>
                  <Textarea 
                    value={formData.notes} 
                    onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                    rows={3} 
                    placeholder="Enter any additional notes"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="location" className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Address</Label>
                <Textarea 
                  value={formData.address} 
                  onChange={(e) => setFormData({...formData, address: e.target.value})} 
                  rows={2} 
                  placeholder="Enter address"
                />
              </div>

              <div className="space-y-2">
                <Label>City</Label>
                <Input 
                  value={formData.city} 
                  onChange={(e) => setFormData({...formData, city: e.target.value})} 
                  placeholder="Enter city"
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input 
                  value={formData.country} 
                  onChange={(e) => setFormData({...formData, country: e.target.value})} 
                  placeholder="Enter country"
                />
              </div>

              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input 
                  type="number"
                  step="any"
                  value={formData.latitude} 
                  onChange={(e) => setFormData({...formData, latitude: e.target.value})} 
                  placeholder="e.g., 45.4215"
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input 
                  type="number"
                  step="any"
                  value={formData.longitude} 
                  onChange={(e) => setFormData({...formData, longitude: e.target.value})} 
                  placeholder="e.g., -75.6972"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-medium mb-2">📍 Location Coordinates</p>
              <p className="text-xs text-blue-700">
                Add latitude and longitude coordinates to display this customer on the map view. 
                You can use Google Maps to find coordinates by right-clicking on a location.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button 
            onClick={() => onSave(formData)} 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isSaving || !canSave}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>{customer ? 'Update' : 'Save'} Customer</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
