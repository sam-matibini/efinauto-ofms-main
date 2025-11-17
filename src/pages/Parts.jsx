import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Settings, AlertTriangle, Edit, Loader2, Trash2, Package, DollarSign, TrendingDown, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useCompany } from "../components/shared/CompanyContext";
import PartDialog from "@/components/parts/PartDialog";
import StockAdjustmentDialog from "@/components/parts/StockAdjustmentDialog";

export default function Parts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all"); // all, low, out
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);
  const { selectedCompanyId } = useCompany();

  const queryClient = useQueryClient();

  const { data: parts = [], isLoading } = useQuery({
    queryKey: ['parts', selectedCompanyId],
    queryFn: () => base44.entities.Part.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Part.create({ ...data, company_id: selectedCompanyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      setDialogOpen(false);
      setEditingPart(null);
      toast.success("Part added successfully!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Part.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      setDialogOpen(false);
      setEditingPart(null);
      toast.success("Part updated successfully!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Part.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      toast.success("Part deleted successfully!");
    },
  });

  const filteredParts = parts.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.part_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.compatible_makes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.compatible_models?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    
    let matchesStock = true;
    if (stockFilter === "low") matchesStock = p.quantity <= p.reorder_level && p.quantity > 0;
    if (stockFilter === "out") matchesStock = p.quantity === 0;
    
    return matchesSearch && matchesCategory && matchesStock;
  });

  const stats = {
    totalParts: parts.length,
    lowStock: parts.filter(p => p.quantity <= p.reorder_level && p.quantity > 0).length,
    outOfStock: parts.filter(p => p.quantity === 0).length,
    totalValue: parts.reduce((sum, p) => sum + (p.quantity * (p.cost_price || 0)), 0),
  };

  const handleSave = (formData) => {
    if (!selectedCompanyId) {
      toast.error("Please select a company first");
      return;
    }

    if (editingPart) {
      updateMutation.mutate({ id: editingPart.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (part) => {
    if (window.confirm(`Are you sure you want to delete "${part.name}"?`)) {
      deleteMutation.mutate(part.id);
    }
  };

  const handleStockAdjustment = (part) => {
    setSelectedPart(part);
    setStockDialogOpen(true);
  };

  if (!selectedCompanyId) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="text-center py-16">
          <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Company Selected</h3>
          <p className="text-gray-500">Please select a company from the sidebar to view parts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Parts Inventory Management</h1>
          <p className="text-gray-500 mt-1">Track, manage, and optimize your parts inventory</p>
        </div>
        <Button 
          onClick={() => {
            setEditingPart(null);
            setDialogOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Part
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Parts</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats.totalParts}</h3>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock</p>
                <h3 className="text-2xl font-bold text-orange-600">{stats.lowStock}</h3>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Out of Stock</p>
                <h3 className="text-2xl font-bold text-red-600">{stats.outOfStock}</h3>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inventory Value</p>
                <h3 className="text-2xl font-bold text-green-600">${stats.totalValue.toLocaleString()}</h3>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search parts, makes, or models..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="engine">Engine</SelectItem>
                <SelectItem value="transmission">Transmission</SelectItem>
                <SelectItem value="brakes">Brakes</SelectItem>
                <SelectItem value="suspension">Suspension</SelectItem>
                <SelectItem value="electrical">Electrical</SelectItem>
                <SelectItem value="body_parts">Body Parts</SelectItem>
                <SelectItem value="interior">Interior</SelectItem>
                <SelectItem value="exhaust">Exhaust</SelectItem>
                <SelectItem value="cooling">Cooling</SelectItem>
                <SelectItem value="fuel_system">Fuel System</SelectItem>
                <SelectItem value="filters">Filters</SelectItem>
                <SelectItem value="lights">Lights</SelectItem>
                <SelectItem value="tires_wheels">Tires & Wheels</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock Levels</SelectItem>
                <SelectItem value="low">Low Stock Only</SelectItem>
                <SelectItem value="out">Out of Stock Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Parts Grid */}
      <Tabs defaultValue="grid" className="space-y-4">
        <TabsList>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>

        <TabsContent value="grid">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            </div>
          ) : filteredParts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No parts found</h3>
                <p className="text-gray-500 mb-6">Add your first part to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredParts.map((part, index) => {
                const isLowStock = part.quantity <= part.reorder_level && part.quantity > 0;
                const isOutOfStock = part.quantity === 0;
                
                return (
                  <motion.div
                    key={part.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="hover:shadow-lg transition-all">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            {isOutOfStock && (
                              <Badge className="bg-red-500 text-white mb-2">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Out of Stock
                              </Badge>
                            )}
                            {!isOutOfStock && isLowStock && (
                              <Badge className="bg-orange-500 text-white mb-2">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Low Stock
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">{part.name}</h3>
                          <p className="text-sm text-gray-500">#{part.part_number}</p>
                        </div>

                        <Badge variant="outline">{part.category?.replace(/_/g, ' ')}</Badge>

                        {(part.compatible_makes || part.compatible_models) && (
                          <div className="text-xs text-gray-600">
                            {part.compatible_makes && <p>Makes: {part.compatible_makes}</p>}
                            {part.compatible_models && <p>Models: {part.compatible_models}</p>}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                          <div>
                            <p className="text-xs text-gray-500">In Stock</p>
                            <p className="text-xl font-bold">{part.quantity}</p>
                            <p className="text-xs text-gray-400">Reorder: {part.reorder_level}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Sell Price</p>
                            <p className="text-xl font-bold text-blue-600">
                              ${part.selling_price?.toFixed(2)}
                            </p>
                            {part.cost_price && (
                              <p className="text-xs text-gray-400">Cost: ${part.cost_price.toFixed(2)}</p>
                            )}
                          </div>
                        </div>

                        {part.supplier && (
                          <div className="text-xs text-gray-600">
                            <strong>Supplier:</strong> {part.supplier}
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button 
                            onClick={() => handleStockAdjustment(part)}
                            size="sm"
                            variant="outline"
                            className="flex-1"
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            Adjust
                          </Button>
                          <Button 
                            onClick={() => {
                              setEditingPart(part);
                              setDialogOpen(true);
                            }}
                            size="sm"
                            variant="outline"
                            className="flex-1"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            onClick={() => handleDelete(part)}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="table">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-3 text-left text-sm font-semibold">Part #</th>
                      <th className="p-3 text-left text-sm font-semibold">Name</th>
                      <th className="p-3 text-left text-sm font-semibold">Category</th>
                      <th className="p-3 text-center text-sm font-semibold">Stock</th>
                      <th className="p-3 text-center text-sm font-semibold">Reorder</th>
                      <th className="p-3 text-right text-sm font-semibold">Cost</th>
                      <th className="p-3 text-right text-sm font-semibold">Price</th>
                      <th className="p-3 text-left text-sm font-semibold">Compatible</th>
                      <th className="p-3 text-right text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParts.map((part) => (
                      <tr key={part.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-sm font-mono">{part.part_number}</td>
                        <td className="p-3 text-sm font-medium">{part.name}</td>
                        <td className="p-3 text-sm">
                          <Badge variant="outline">{part.category?.replace(/_/g, ' ')}</Badge>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-semibold">{part.quantity}</span>
                            {part.quantity === 0 && (
                              <Badge className="bg-red-500 text-white text-xs">OUT</Badge>
                            )}
                            {part.quantity > 0 && part.quantity <= part.reorder_level && (
                              <Badge className="bg-orange-500 text-white text-xs">LOW</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center text-sm">{part.reorder_level}</td>
                        <td className="p-3 text-right text-sm">${part.cost_price?.toFixed(2) || '0.00'}</td>
                        <td className="p-3 text-right text-sm font-semibold text-blue-600">
                          ${part.selling_price?.toFixed(2) || '0.00'}
                        </td>
                        <td className="p-3 text-sm text-gray-600 max-w-[200px] truncate">
                          {part.compatible_makes || part.compatible_models || '-'}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              onClick={() => handleStockAdjustment(part)}
                              size="sm"
                              variant="ghost"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button 
                              onClick={() => {
                                setEditingPart(part);
                                setDialogOpen(true);
                              }}
                              size="sm"
                              variant="ghost"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              onClick={() => handleDelete(part)}
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PartDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingPart(null);
        }}
        part={editingPart}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <StockAdjustmentDialog
        open={stockDialogOpen}
        onClose={() => {
          setStockDialogOpen(false);
          setSelectedPart(null);
        }}
        part={selectedPart}
      />
    </div>
  );
}