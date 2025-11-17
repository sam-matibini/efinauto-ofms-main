import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save } from "lucide-react";

export default function PartDialog({ open, onClose, part, onSave, isSaving }) {
  const [formData, setFormData] = useState({
    part_number: "", 
    name: "", 
    description: "", 
    category: "other",
    compatible_makes: "", 
    compatible_models: "", 
    quantity: 0,
    reorder_level: 5, 
    cost_price: 0, 
    selling_price: 0,
    supplier: "", 
    location: "", 
    image_url: ""
  });

  React.useEffect(() => {
    if (open) {
      if (part) {
        setFormData(part);
      } else {
        setFormData({
          part_number: "", 
          name: "", 
          description: "", 
          category: "other",
          compatible_makes: "", 
          compatible_models: "", 
          quantity: 0,
          reorder_level: 5, 
          cost_price: 0, 
          selling_price: 0,
          supplier: "", 
          location: "", 
          image_url: ""
        });
      }
    }
  }, [part, open]);

  const canSave = formData.part_number?.trim().length > 0 && formData.name?.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{part ? 'Edit Part' : 'Add New Part'}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="compatibility">Compatibility</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Part Number *</Label>
                <Input 
                  value={formData.part_number || ""} 
                  onChange={(e) => setFormData({...formData, part_number: e.target.value})} 
                  placeholder="e.g., BRK-123-45"
                />
              </div>
              <div className="space-y-2">
                <Label>Part Name *</Label>
                <Input 
                  value={formData.name || ""} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g., Brake Pad Set"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={formData.description || ""} 
                onChange={(e) => setFormData({...formData, description: e.target.value})} 
                rows={3}
                placeholder="Detailed description of the part..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <Label>Supplier</Label>
                <Input 
                  value={formData.supplier || ""} 
                  onChange={(e) => setFormData({...formData, supplier: e.target.value})} 
                  placeholder="Supplier name"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Quantity</Label>
                <Input 
                  type="number" 
                  value={formData.quantity || 0} 
                  onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Reorder Level</Label>
                <Input 
                  type="number" 
                  value={formData.reorder_level || 5} 
                  onChange={(e) => setFormData({...formData, reorder_level: parseInt(e.target.value) || 5})} 
                />
                <p className="text-xs text-gray-500">Alert when stock falls below this level</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost Price ($)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={formData.cost_price || 0} 
                  onChange={(e) => setFormData({...formData, cost_price: parseFloat(e.target.value) || 0})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Selling Price ($)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={formData.selling_price || 0} 
                  onChange={(e) => setFormData({...formData, selling_price: parseFloat(e.target.value) || 0})} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Storage Location</Label>
              <Input 
                value={formData.location || ""} 
                onChange={(e) => setFormData({...formData, location: e.target.value})} 
                placeholder="e.g., Warehouse A, Shelf 3"
              />
            </div>

            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input 
                value={formData.image_url || ""} 
                onChange={(e) => setFormData({...formData, image_url: e.target.value})} 
                placeholder="https://..."
              />
            </div>
          </TabsContent>

          <TabsContent value="compatibility" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Compatible Makes</Label>
              <Input 
                value={formData.compatible_makes || ""} 
                onChange={(e) => setFormData({...formData, compatible_makes: e.target.value})} 
                placeholder="e.g., Toyota, Honda, Ford (comma-separated)"
              />
              <p className="text-xs text-gray-500">Comma-separated list of vehicle manufacturers</p>
            </div>

            <div className="space-y-2">
              <Label>Compatible Models</Label>
              <Textarea 
                value={formData.compatible_models || ""} 
                onChange={(e) => setFormData({...formData, compatible_models: e.target.value})} 
                rows={4}
                placeholder="e.g., Camry 2015-2020, Accord 2016-2021"
              />
              <p className="text-xs text-gray-500">List specific models and years this part fits</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button 
            onClick={() => onSave(formData)} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isSaving || !canSave}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {part ? 'Update' : 'Add'} Part
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}