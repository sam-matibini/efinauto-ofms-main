import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Settings, AlertTriangle, Edit } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Parts() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState(null);

  const queryClient = useQueryClient();

  const { data: parts = [], isLoading } = useQuery({
    queryKey: ['parts'],
    queryFn: () => base44.entities.Part.list('-updated_date'),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Part.create(data),
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

  const filteredParts = parts.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.part_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleSave = (formData) => {
    if (editingPart) {
      updateMutation.mutate({ id: editingPart.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Parts Inventory</h1>
          <p className="text-gray-600">{filteredParts.length} parts in stock</p>
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

      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search by name or part number..."
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
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredParts.map((part, index) => {
          const isLowStock = part.quantity <= part.reorder_level;
          
          return (
            <motion.div
              key={part.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-lg transition-all border-none shadow-md">
                <CardContent className="p-5 space-y-3">
                  {isLowStock && (
                    <Badge className="bg-orange-500 text-white">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Low Stock
                    </Badge>
                  )}
                  
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{part.name}</h3>
                    <p className="text-sm text-gray-500">{part.part_number}</p>
                  </div>

                  <Badge variant="outline">{part.category?.replace(/_/g, ' ')}</Badge>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                    <div>
                      <p className="text-xs text-gray-500">In Stock</p>
                      <p className="text-xl font-bold">{part.quantity}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Price</p>
                      <p className="text-xl font-bold text-blue-600">
                        ${part.selling_price?.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <Button 
                    onClick={() => {
                      setEditingPart(part);
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
          );
        })}
      </div>

      <PartDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingPart(null);
        }}
        part={editingPart}
        onSave={handleSave}
      />
    </div>
  );
}

function PartDialog({ open, onClose, part, onSave }) {
  const [formData, setFormData] = useState(part || {
    part_number: "", name: "", description: "", category: "other",
    compatible_makes: "", compatible_models: "", quantity: 0,
    reorder_level: 5, cost_price: 0, selling_price: 0,
    supplier: "", location: "", image_url: ""
  });

  React.useEffect(() => {
    if (part) setFormData(part);
  }, [part]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{part ? 'Edit Part' : 'Add New Part'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Part Number *</Label>
              <Input value={formData.part_number} onChange={(e) => setFormData({...formData, part_number: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
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
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Reorder Level</Label>
              <Input type="number" value={formData.reorder_level} onChange={(e) => setFormData({...formData, reorder_level: parseInt(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Selling Price ($)</Label>
              <Input type="number" step="0.01" value={formData.selling_price} onChange={(e) => setFormData({...formData, selling_price: parseFloat(e.target.value)})} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formData)} className="bg-blue-600 hover:bg-blue-700">
            {part ? 'Update' : 'Add'} Part
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}