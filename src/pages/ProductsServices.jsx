import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Package, Wrench, Edit, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import ProductDialog from "@/components/products-services/ProductDialog";
import ServiceDialog from "@/components/products-services/ServiceDialog";
import ImportDialog from "@/components/products-services/ImportDialog";
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

export default function ProductsServicesPage() {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: null, id: null });
  const [importDialog, setImportDialog] = useState({ open: false, type: null });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products', selectedCompanyId],
    queryFn: () => base44.entities.Product.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ['services', selectedCompanyId],
    queryFn: () => base44.entities.Service.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const createProductMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create({ ...data, company_id: selectedCompanyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setProductDialogOpen(false);
      setEditingProduct(null);
      toast.success("Product created successfully");
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setProductDialogOpen(false);
      setEditingProduct(null);
      toast.success("Product updated successfully");
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success("Product deleted successfully");
    },
  });

  const createServiceMutation = useMutation({
    mutationFn: (data) => base44.entities.Service.create({ ...data, company_id: selectedCompanyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setServiceDialogOpen(false);
      setEditingService(null);
      toast.success("Service created successfully");
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Service.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setServiceDialogOpen(false);
      setEditingService(null);
      toast.success("Service updated successfully");
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id) => base44.entities.Service.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success("Service deleted successfully");
    },
  });

  const handleSaveProduct = (data) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  const handleSaveService = (data) => {
    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, data });
    } else {
      createServiceMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (deleteDialog.type === 'product') {
      deleteProductMutation.mutate(deleteDialog.id);
    } else {
      deleteServiceMutation.mutate(deleteDialog.id);
    }
    setDeleteDialog({ open: false, type: null, id: null });
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredServices = services.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.service_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!selectedCompanyId) {
    return (
      <div className="p-6">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <p className="text-yellow-800">Please select a company to manage products and services.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Products & Services Catalog</h1>
            <p className="text-sm text-gray-300 mt-1">Manage your product and service offerings</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Products</p>
                  <h3 className="text-2xl font-bold text-blue-600">{products.length}</h3>
                </div>
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Services</p>
                  <h3 className="text-2xl font-bold text-green-600">{services.length}</h3>
                </div>
                <Wrench className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm text-gray-600">Active Products</p>
                <h3 className="text-2xl font-bold text-gray-900">
                  {products.filter(p => p.quantity > 0).length}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm text-gray-600">Active Services</p>
                <h3 className="text-2xl font-bold text-gray-900">
                  {services.filter(s => s.active).length}
                </h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search products and services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="products" className="space-y-4">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Products Catalog</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setImportDialog({ open: true, type: 'product' })}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
                <Button onClick={() => { setEditingProduct(null); setProductDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <Card key={product.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{product.name}</h3>
                        <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => { setEditingProduct(product); setProductDialogOpen(true); }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => setDeleteDialog({ open: true, type: 'product', id: product.id })}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{product.description}</p>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-500">Price</p>
                        <p className="text-lg font-bold text-green-600">${product.unit_price?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Stock</p>
                        <p className={`text-lg font-bold ${product.quantity < product.reorder_level ? 'text-red-600' : 'text-blue-600'}`}>
                          {product.quantity}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No products found</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Services Catalog</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setImportDialog({ open: true, type: 'service' })}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
                <Button onClick={() => { setEditingService(null); setServiceDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Service
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map((service) => (
                <Card key={service.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{service.name}</h3>
                        <p className="text-sm text-gray-600">Code: {service.service_code}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => { setEditingService(service); setServiceDialogOpen(true); }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => setDeleteDialog({ open: true, type: 'service', id: service.id })}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-500">Price</p>
                        <p className="text-lg font-bold text-green-600">${service.price?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Duration</p>
                        <p className="text-sm text-gray-700">{service.duration_minutes} min</p>
                      </div>
                      <div>
                        <span className={`px-2 py-1 rounded text-xs ${service.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {service.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredServices.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No services found</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ProductDialog
        open={productDialogOpen}
        onClose={() => { setProductDialogOpen(false); setEditingProduct(null); }}
        product={editingProduct}
        onSave={handleSaveProduct}
        isLoading={createProductMutation.isPending || updateProductMutation.isPending}
      />

      <ServiceDialog
        open={serviceDialogOpen}
        onClose={() => { setServiceDialogOpen(false); setEditingService(null); }}
        service={editingService}
        onSave={handleSaveService}
        isLoading={createServiceMutation.isPending || updateServiceMutation.isPending}
      />

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, type: null, id: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {deleteDialog.type}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportDialog
        open={importDialog.open}
        onClose={() => setImportDialog({ open: false, type: null })}
        type={importDialog.type}
        companyId={selectedCompanyId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['services'] });
          setImportDialog({ open: false, type: null });
        }}
      />
    </div>
  );
}