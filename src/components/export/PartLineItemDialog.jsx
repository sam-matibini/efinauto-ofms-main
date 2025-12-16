import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function PartLineItemDialog({ open, onClose, onSave, item, currency, companyId }) {
  const [formData, setFormData] = useState({
    item_type: 'part',
    description: '',
    hs_code: '',
    quantity: 1,
    unit_of_measure: 'pieces',
    unit_value: 0,
    total_value: 0,
    weight: 0,
    country_of_origin: 'CA',
    part_number: '',
    sku: '',
    inventory_id: '',
    packaging_type: 'pallet',
    dimensions: {
      length: 0,
      width: 0,
      height: 0,
      unit: 'cm'
    }
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['parts', companyId],
    queryFn: () => base44.entities.Part.filter({ company_id: companyId }),
    enabled: !!companyId && open
  });

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else if (open) {
      setFormData({
        item_type: 'part',
        description: '',
        hs_code: '',
        quantity: 1,
        unit_of_measure: 'pieces',
        unit_value: 0,
        total_value: 0,
        weight: 0,
        country_of_origin: 'CA',
        part_number: '',
        sku: '',
        inventory_id: '',
        packaging_type: 'pallet',
        dimensions: {
          length: 0,
          width: 0,
          height: 0,
          unit: 'cm'
        }
      });
    }
  }, [item, open]);

  useEffect(() => {
    const total = (formData.quantity || 0) * (formData.unit_value || 0);
    setFormData(prev => ({ ...prev, total_value: total }));
  }, [formData.quantity, formData.unit_value]);

  const handlePartSelect = (partId) => {
    const part = parts.find(p => p.id === partId);
    if (part) {
      setFormData(prev => ({
        ...prev,
        inventory_id: part.id,
        part_number: part.part_number,
        sku: part.sku || '',
        description: part.name,
        unit_value: part.selling_price || 0,
        hs_code: part.hs_code || '',
        weight: part.weight || 0
      }));
    }
  };

  const handleSave = () => {
    if (!formData.description || !formData.part_number) {
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {item ? 'Edit' : 'Add'} Part
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!item && parts.length > 0 && (
            <div>
              <Label>Select from Inventory (Optional)</Label>
              <Select onValueChange={handlePartSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose part..." />
                </SelectTrigger>
                <SelectContent>
                  {parts.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.part_number} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Part Number *</Label>
              <Input
                value={formData.part_number}
                onChange={(e) => setFormData({...formData, part_number: e.target.value})}
                placeholder="e.g., 12345-ABC"
              />
            </div>
            <div>
              <Label>SKU</Label>
              <Input
                value={formData.sku}
                onChange={(e) => setFormData({...formData, sku: e.target.value})}
                placeholder="Stock keeping unit"
              />
            </div>
          </div>

          <div>
            <Label>Description *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Part description"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>HS Code</Label>
              <Input
                value={formData.hs_code}
                onChange={(e) => setFormData({...formData, hs_code: e.target.value})}
                placeholder="e.g., 8708.29"
              />
            </div>
            <div>
              <Label>Country of Origin</Label>
              <Input
                value={formData.country_of_origin}
                onChange={(e) => setFormData({...formData, country_of_origin: e.target.value.toUpperCase()})}
                maxLength={2}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Quantity *</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})}
                min="0"
              />
            </div>
            <div>
              <Label>Unit of Measure</Label>
              <Select value={formData.unit_of_measure} onValueChange={(v) => setFormData({...formData, unit_of_measure: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pieces">Pieces</SelectItem>
                  <SelectItem value="kg">Kilograms</SelectItem>
                  <SelectItem value="lbs">Pounds</SelectItem>
                  <SelectItem value="sets">Sets</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Weight (kg)</Label>
              <Input
                type="number"
                value={formData.weight}
                onChange={(e) => setFormData({...formData, weight: parseFloat(e.target.value) || 0})}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Unit Value ({currency})</Label>
              <Input
                type="number"
                value={formData.unit_value}
                onChange={(e) => setFormData({...formData, unit_value: parseFloat(e.target.value) || 0})}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <Label>Total Value ({currency})</Label>
              <Input
                type="number"
                value={formData.total_value}
                readOnly
                className="bg-gray-50"
              />
            </div>
          </div>

          <div>
            <Label>Packaging Type</Label>
            <Select value={formData.packaging_type} onValueChange={(v) => setFormData({...formData, packaging_type: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pallet">Pallet</SelectItem>
                <SelectItem value="crate">Crate</SelectItem>
                <SelectItem value="loose">Loose</SelectItem>
                <SelectItem value="container">Container</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4">
            <Label>Dimensions (Optional)</Label>
            <div className="grid grid-cols-4 gap-3 mt-2">
              <div>
                <Input
                  type="number"
                  placeholder="Length"
                  value={formData.dimensions?.length || 0}
                  onChange={(e) => setFormData({
                    ...formData,
                    dimensions: { ...formData.dimensions, length: parseFloat(e.target.value) || 0 }
                  })}
                  step="0.1"
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="Width"
                  value={formData.dimensions?.width || 0}
                  onChange={(e) => setFormData({
                    ...formData,
                    dimensions: { ...formData.dimensions, width: parseFloat(e.target.value) || 0 }
                  })}
                  step="0.1"
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="Height"
                  value={formData.dimensions?.height || 0}
                  onChange={(e) => setFormData({
                    ...formData,
                    dimensions: { ...formData.dimensions, height: parseFloat(e.target.value) || 0 }
                  })}
                  step="0.1"
                />
              </div>
              <div>
                <Select 
                  value={formData.dimensions?.unit || 'cm'} 
                  onValueChange={(v) => setFormData({
                    ...formData,
                    dimensions: { ...formData.dimensions, unit: v }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cm">cm</SelectItem>
                    <SelectItem value="in">in</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!formData.description || !formData.part_number}>
            {item ? 'Update' : 'Add'} Part
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}