import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Settings, AlertTriangle, Edit, Loader2, Trash2, Package, TrendingDown, TrendingUp, BarChart3, Upload, LayoutGrid, List, ArrowUpDown } from "lucide-react";
import ExportButton from "../components/shared/ExportButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import AIPartsSearchMarketplace from "@/components/parts/AIPartsSearchMarketplace";
import AIPartsShopSearch from "@/components/parts/AIPartsShopSearch";
import ImportPartsDialog from "@/components/parts/ImportPartsDialog";
import AIInventoryInsights from "@/components/shared/AIInventoryInsights";

export default function Parts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("created_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const { selectedCompanyId } = useCompany();

  const queryClient = useQueryClient();

  const { data: parts = [], isLoading } = useQuery({
    queryKey: ['parts', selectedCompanyId],
    queryFn: () => base44.entities.Part.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: repairs = [] } = useQuery({
    queryKey: ['repairs', selectedCompanyId],
    queryFn: () => base44.entities.RepairOrder.filter({ company_id: selectedCompanyId }),
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
  }).sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    if (typeof aVal === "string") aVal = aVal?.toLowerCase() || "";
    if (typeof bVal === "string") bVal = bVal?.toLowerCase() || "";
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const partExportColumns = [
    { label: "Part Number", accessor: (p) => p.part_number },
    { label: "Name", accessor: (p) => p.name },
    { label: "Category", accessor: (p) => p.category },
    { label: "Quantity", accessor: (p) => p.quantity },
    { label: "Reorder Level", accessor: (p) => p.reorder_level },
    { label: "Cost Price", accessor: (p) => p.cost_price },
    { label: "Selling Price", accessor: (p) => p.selling_price },
    { label: "Supplier", accessor: (p) => p.supplier },
    { label: "Location", accessor: (p) => p.location },
    { label: "Compatible Makes", accessor: (p) => p.compatible_makes },
  ];

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
          <div className="flex gap-2">
            <ExportButton 
              data={filteredParts} 
              columns={partExportColumns} 
              filename="parts" 
            />
            <Button 
              onClick={() => setImportDialogOpen(true)}
              variant="outline"
              className="bg-white hover:bg-gray-100"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
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

          {/* Search and Filters */}
          <Card className="mt-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <SelectItem value="quantity-asc">Quantity (Low-High)</SelectItem>
                <SelectItem value="quantity-desc">Quantity (High-Low)</SelectItem>
                <SelectItem value="selling_price-desc">Price (High-Low)</SelectItem>
                <SelectItem value="selling_price-asc">Price (Low-High)</SelectItem>
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
          </CardContent>
          </Card>

          {/* AI Parts Shop Search - Main Search Tool */}
          <div className="mt-6">
            <AIPartsShopSearch />
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

          {/* AI Parts Search - Marketplaces */}
          <div className="mt-6">
            <AIPartsSearchMarketplace />
          </div>

          {/* AI Inventory Insights */}
          <div className="mt-6">
            <AIInventoryInsights 
              companyId={selectedCompanyId}
              inventoryType="parts"
              parts={parts}
              repairs={repairs}
            />
          </div>

          {/* Parts Grid/List */}
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
      ) : viewMode === "list" ? (
        <Card className="mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("name"); setSortOrder(sortBy === "name" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Part {sortBy === "name" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("part_number"); setSortOrder(sortBy === "part_number" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Part # {sortBy === "part_number" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("category"); setSortOrder(sortBy === "category" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Category {sortBy === "category" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("quantity"); setSortOrder(sortBy === "quantity" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Quantity {sortBy === "quantity" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("reorder_level"); setSortOrder(sortBy === "reorder_level" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Reorder Level {sortBy === "reorder_level" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("cost_price"); setSortOrder(sortBy === "cost_price" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Cost {sortBy === "cost_price" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("selling_price"); setSortOrder(sortBy === "selling_price" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Selling Price {sortBy === "selling_price" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("supplier"); setSortOrder(sortBy === "supplier" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Supplier {sortBy === "supplier" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParts.map((part) => {
                const isLowStock = part.quantity <= part.reorder_level && part.quantity > 0;
                const isOutOfStock = part.quantity === 0;
                return (
                  <TableRow key={part.id} className="cursor-pointer hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                          {part.image_url ? (
                            <img src={part.image_url} alt="" className="w-full h-full object-cover rounded" />
                          ) : (
                            <Package className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{part.name}</p>
                          <p className="text-xs text-gray-500">{part.compatible_makes}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{part.part_number}</TableCell>
                    <TableCell className="capitalize">{part.category?.replace(/_/g, ' ')}</TableCell>
                    <TableCell>
                      <Badge className={isOutOfStock ? 'bg-red-100 text-red-800' : isLowStock ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}>
                        {part.quantity}
                      </Badge>
                    </TableCell>
                    <TableCell>{part.reorder_level}</TableCell>
                    <TableCell>${part.cost_price?.toLocaleString()}</TableCell>
                    <TableCell className="font-semibold text-blue-600">${part.selling_price?.toLocaleString()}</TableCell>
                    <TableCell>{part.supplier || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStockAdjustment(part)}
                        >
                          <TrendingUp className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingPart(part);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(part)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
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

      <ImportPartsDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        companyId={selectedCompanyId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['parts'] });
          setImportDialogOpen(false);
        }}
      />
      </div>
    </div>
  );
}