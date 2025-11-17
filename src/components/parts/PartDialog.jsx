import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompany } from "@/components/shared/CompanyContext";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const CATEGORIES = [
  "engine", "transmission", "brakes", "suspension", "electrical",
  "body_parts", "interior", "exhaust", "cooling", "fuel_system",
  "filters", "lights", "tires_wheels", "other"
];

export default function PartDialog({ open, onClose, part, onSave }) {
  const { selectedCompanyId } = useCompany();
  const [formData, setFormData] = useState({
    company_id: selectedCompanyId,
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
    image_url: "",
  });

  const [compatibleMakesList, setCompatibleMakesList] = useState([]);
  const [compatibleModelsList, setCompatibleModelsList] = useState([]);

  useEffect(() => {
    if (part) {
      setFormData(part);
      setCompatibleMakesList(part.compatible_makes ? part.compatible_makes.split(',').map(m => m.trim()) : []);
      setCompatibleModelsList(part.compatible_models ? part.compatible_models.split(',').map(m => m.trim()) : []);
    } else {
      setFormData({
        company_id: selectedCompanyId,
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
        image_url: "",
      });
      setCompatibleMakesList([]);
      setCompatibleModelsList([]);
    }
  }, [part, open, selectedCompanyId]);

  const addCompatibleMake = (make) => {
    if (make && !compatibleMakesList.includes(make)) {
      const newList = [...compatibleMakesList, make];
      setCompatibleMakesList(newList);
      setFormData({ ...formData, compatible_makes: newList.join(', ') });
    }
  };

  const removeCompatibleMake = (make) => {
    const newList = compatibleMakesList.filter(m => m !== make);
    setCompatibleMakesList(newList);
    setFormData({ ...formData, compatible_makes: newList.join(', ') });
  };

  const addCompatibleModel = (model) => {
    if (model && !compatibleModelsList.includes(model)) {
      const newList = [...compatibleModelsList, model];
      setCompatibleModelsList(newList);
      setFormData({ ...formData, compatible_models: newList.join(', ') });
    }
  };

  const removeCompatibleModel = (model) => {
    const newList = compatibleModelsList.filter(m => m !== model);
    setCompatibleModelsList(newList);
    setFormData({ ...formData, compatible_models: newList.join(', ') });
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{part ? 'Edit' : 'Add'} Part</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Part Number *</Label>
              <Input
                value={formData.part_number}
                onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                placeholder="e.g., BR-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Part Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Brake Pads"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.replace(/_/g, ' ').toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Quantity in Stock</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Reorder Level</Label>
              <Input
                type="number"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Shelf A-12"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cost Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Selling Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Supplier</Label>
            <Input
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              placeholder="Supplier name"
            />
          </div>

          <div className="space-y-2">
            <Label>Compatible Vehicle Makes</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add make (e.g., Toyota)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addCompatibleMake(e.target.value);
                    e.target.value = '';
                  }
                }}
              />
            </div>
            {compatibleMakesList.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {compatibleMakesList.map(make => (
                  <Badge key={make} variant="secondary" className="flex items-center gap-1">
                    {make}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeCompatibleMake(make)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Compatible Vehicle Models</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add model (e.g., Camry)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addCompatibleModel(e.target.value);
                    e.target.value = '';
                  }
                }}
              />
            </div>
            {compatibleModelsList.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {compatibleModelsList.map(model => (
                  <Badge key={model} variant="secondary" className="flex items-center gap-1">
                    {model}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeCompatibleModel(model)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Image URL (Optional)</Label>
            <Input
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!formData.part_number || !formData.name}>
            {part ? 'Update' : 'Add'} Part
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}