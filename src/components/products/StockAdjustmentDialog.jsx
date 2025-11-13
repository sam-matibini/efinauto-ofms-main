import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus, Package } from "lucide-react";

export default function StockAdjustmentDialog({ product, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState(product || {});
  const [adjustment, setAdjustment] = useState(0);

  const handleAdjustment = (amount) => {
    const newQuantity = Math.max(0, (formData.quantity || 0) + amount);
    setFormData({ ...formData, quantity: newQuantity });
    setAdjustment(amount);
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="w-6 h-6 text-blue-600" />
            Manage Product: {product?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quick Stock Adjustment */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <Label className="text-base font-semibold">Quick Stock Adjustment</Label>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => handleAdjustment(-10)}
                className="flex-1"
              >
                <Minus className="w-4 h-4 mr-2" />
                -10
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => handleAdjustment(-1)}
                className="flex-1"
              >
                <Minus className="w-4 h-4 mr-2" />
                -1
              </Button>
              <div className="text-center px-4">
                <div className="text-3xl font-bold text-gray-900">{formData.quantity || 0}</div>
                <div className="text-xs text-gray-500">units</div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => handleAdjustment(1)}
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                +1
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => handleAdjustment(10)}
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                +10
              </Button>
            </div>
          </div>

          {/* Product Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku || ''}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_price">Unit Price ($)</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                value={formData.unit_price || ''}
                onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorder_level">Reorder Level</Label>
              <Input
                id="reorder_level"
                type="number"
                value={formData.reorder_level || ''}
                onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Warehouse A, Shelf 3"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                value={formData.supplier || ''}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}