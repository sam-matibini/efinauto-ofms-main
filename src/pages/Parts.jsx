import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  TrendingDown,
  Edit,
  Trash2,
  Settings as SettingsIcon,
  Filter
} from "lucide-react";
import { useCompany } from "@/components/shared/CompanyContext";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PartDialog from "@/components/parts/PartDialog";
import StockAdjustmentDialog from "@/components/parts/StockAdjustmentDialog";

export default function PartsPage() {
  const { selectedCompanyId } = useCompany();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [adjustingPart, setAdjustingPart] = useState(null);

  const queryClient = useQueryClient();

  const { data: parts = [], isLoading } = useQuery({
    queryKey: ['parts', selectedCompanyId],
    queryFn: () => base44.entities.Part.filter({ company_id: selectedCompanyId }, '-updated_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Part.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      toast.success("Part added successfully");
      setDialogOpen(false);
      setEditingPart(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Part.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      toast.success("Part updated successfully");
      setDialogOpen(false);
      setAdjustmentDialogOpen(false);
      setEditingPart(null);
      setAdjustingPart(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Part.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      toast.success("Part deleted");
    },
  });

  const handleSave = (data) => {
    if (editingPart) {
      updateMutation.mutate({ id: editingPart.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleAdjust = (data, reason) => {
    updateMutation.mutate({ 
      id: data.id, 
      data: {
        ...data,
        notes: `Stock adjusted: ${reason}`
      }
    });
  };

  const handleEdit = (part) => {
    setEditingPart(part);
    setDialogOpen(true);
  };

  const handleStockAdjustment = (part) => {
    setAdjustingPart(part);
    setAdjustmentDialogOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this part?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredParts = parts.filter(part => {
    const matchesSearch = 
      part.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.part_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || part.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const lowStockParts = parts.filter(p => p.quantity <= p.reorder_level);
  const outOfStockParts = parts.filter(p => p.quantity === 0);
  const totalValue = parts.reduce((sum, p) => sum + (p.quantity * p.cost_price), 0);

  const categories = [...new Set(parts.map(p => p.category))].filter(Boolean);

  if (!selectedCompanyId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please select a company to view parts inventory.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Parts Inventory</h1>
          <p className="text-gray-500 mt-1">Manage your parts stock and suppliers</p>
        </div>
        <Button onClick={() => {
          setEditingPart(null);
          setDialogOpen(true);
        }} className="bg-blue-600 hover:bg-blue-700">
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
                <h3 className="text-2xl font-bold text-gray-900">{parts.length}</h3>
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
                <h3 className="text-2xl font-bold text-orange-600">{lowStockParts.length}</h3>
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
                <h3 className="text-2xl font-bold text-red-600">{outOfStockParts.length}</h3>
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
                <h3 className="text-2xl font-bold text-green-600">${totalValue.toLocaleString()}</h3>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search by name, part number, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 focus-visible:ring-0"
              />
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.replace(/_/g, ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Parts ({filteredParts.length})</TabsTrigger>
          <TabsTrigger value="low">Low Stock ({lowStockParts.length})</TabsTrigger>
          <TabsTrigger value="out">Out of Stock ({outOfStockParts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <PartsList 
            parts={filteredParts}
            onEdit={handleEdit}
            onAdjust={handleStockAdjustment}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="low" className="space-y-4">
          <PartsList 
            parts={lowStockParts}
            onEdit={handleEdit}
            onAdjust={handleStockAdjustment}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="out" className="space-y-4">
          <PartsList 
            parts={outOfStockParts}
            onEdit={handleEdit}
            onAdjust={handleStockAdjustment}
            onDelete={handleDelete}
            isLoading={isLoading}
          />
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
      />

      <StockAdjustmentDialog
        open={adjustmentDialogOpen}
        onClose={() => {
          setAdjustmentDialogOpen(false);
          setAdjustingPart(null);
        }}
        part={adjustingPart}
        onAdjust={handleAdjust}
      />
    </div>
  );
}

function PartsList({ parts, onEdit, onAdjust, onDelete, isLoading }) {
  if (isLoading) {
    return <p className="text-center text-gray-500 py-8">Loading...</p>;
  }

  if (parts.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No parts found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {parts.map(part => (
        <Card key={part.id} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h4 className="font-semibold text-lg">{part.name}</h4>
                <p className="text-sm text-gray-600">#{part.part_number}</p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => onEdit(part)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onAdjust(part)}>
                  <SettingsIcon className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onDelete(part.id)} className="text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {part.image_url && (
              <img src={part.image_url} alt={part.name} className="w-full h-32 object-cover rounded-lg mb-3" />
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Stock:</span>
                <Badge className={
                  part.quantity === 0 ? "bg-red-100 text-red-700" :
                  part.quantity <= part.reorder_level ? "bg-orange-100 text-orange-700" :
                  "bg-green-100 text-green-700"
                }>
                  {part.quantity} units
                </Badge>
              </div>
              
              {part.quantity <= part.reorder_level && (
                <div className="flex items-center gap-1 text-xs text-orange-600">
                  <AlertTriangle className="w-3 h-3" />
                  Reorder at: {part.reorder_level}
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Cost:</span>
                <span className="font-semibold">${part.cost_price?.toFixed(2) || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Selling:</span>
                <span className="font-semibold text-green-600">${part.selling_price?.toFixed(2) || 0}</span>
              </div>

              {part.location && (
                <div className="text-xs text-gray-500">
                  Location: {part.location}
                </div>
              )}

              {part.compatible_makes && (
                <div className="text-xs text-blue-600 truncate">
                  Fits: {part.compatible_makes}
                </div>
              )}

              <Badge variant="outline" className="text-xs">
                {part.category?.replace(/_/g, ' ')}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}