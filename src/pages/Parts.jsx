import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Settings, AlertTriangle, Edit, Loader2, Trash2, Package, TrendingDown, TrendingUp, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCompany } from "../components/shared/CompanyContext";
import PartDialog from "@/components/parts/PartDialog";
import StockAdjustmentDialog from "@/components/parts/StockAdjustmentDialog";
import PartCard from "@/components/parts/PartCard";
import AIPartsSearchCanada from "@/components/parts/AIPartsSearchCanada";
import AIPartsSearchUSA from "@/components/parts/AIPartsSearchUSA";
import AIPartsSearchLocal from "@/components/parts/AIPartsSearchLocal";

export default function Parts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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
      setStockDialogOpen(false);
      setEditingPart(null);
      toast.success("Part updated successfully!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Part.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      setDeleteDialogOpen(false);
      setSelectedPart(null);
      toast.success("Part deleted successfully!");
    },
  });

  const filteredParts = parts.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.part_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.compatible_makes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    
    let matchesStock = true;
    if (stockFilter === "low") {
      matchesStock = p.quantity <= p.reorder_level;
    } else if (stockFilter === "out") {
      matchesStock = p.quantity === 0;
    } else if (stockFilter === "available") {
      matchesStock = p.quantity > p.reorder_level;
    }
    
    return matchesSearch && matchesCategory && matchesStock;
  });

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
    setSelectedPart(part);
    setDeleteDialogOpen(true);
  };

  const handleStockAdjustment = (part) => {
    setSelectedPart(part);
    setStockDialogOpen(true);
  };

  const stats = {
    total: parts.length,
    lowStock: parts.filter(p => p.quantity <= p.reorder_level && p.quantity > 0).length,
    outOfStock: parts.filter(p => p.quantity === 0).length,
    totalValue: parts.reduce((sum, p) => sum + (p.quantity * (p.cost_price || 0)), 0),
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
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Parts Inventory</h1>
            <p className="text-sm text-gray-300 mt-1">Manage your parts stock and reorder points</p>
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
      </div>
      
      <div className="p-6 md:p-8 max-w-7xl mx-auto">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Parts</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats.total}</h3>
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
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
          </Card>
          </div>

          {/* AI Parts Search - Local Near Me */}
          <div className="mt-6">
          <AIPartsSearchLocal />
          </div>

          {/* AI Parts Search - Canada */}
          <div className="mt-6">
          <AIPartsSearchCanada />
          </div>

          {/* AI Parts Search - USA */}
          <div className="mt-6">
          <AIPartsSearchUSA />
          </div>

          {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search by name, part #, or make..."
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
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Parts Grid */}
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
          {filteredParts.map((part, index) => (
            <PartCard
              key={part.id}
              part={part}
              index={index}
              onEdit={(p) => {
                setEditingPart(p);
                setDialogOpen(true);
              }}
              onDelete={handleDelete}
              onAdjustStock={handleStockAdjustment}
            />
          ))}
        </div>
      )}

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
        onSave={(data) => {
          if (selectedPart) {
            updateMutation.mutate({ id: selectedPart.id, data });
          }
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Part</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedPart?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedPart(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedPart && deleteMutation.mutate(selectedPart.id)}
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