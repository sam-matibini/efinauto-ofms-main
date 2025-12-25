import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";

export default function VendorCreditDialog({ open, onClose, credit, onSave, isSaving }) {
  const [formData, setFormData] = useState({
    credit_number: "",
    vendor_name: "",
    related_bill_number: "",
    line_items: [{ description: "", quantity: 1, unit_price: 0, total: 0 }],
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    credit_date: new Date().toISOString().split('T')[0],
    reason: "return",
    status: "draft",
    notes: ""
  });

  useEffect(() => {
    if (credit) {
      setFormData(credit);
    } else {
      setFormData({
        credit_number: "",
        vendor_name: "",
        related_bill_number: "",
        line_items: [{ description: "", quantity: 1, unit_price: 0, total: 0 }],
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        credit_date: new Date().toISOString().split('T')[0],
        reason: "return",
        status: "draft",
        notes: ""
      });
    }
  }, [credit, open]);

  useEffect(() => {
    const subtotal = formData.line_items.reduce((sum, item) => sum + (item.total || 0), 0);
    const total = subtotal + (parseFloat(formData.tax_amount) || 0);
    setFormData(prev => ({ ...prev, subtotal, total_amount: total }));
  }, [formData.line_items, formData.tax_amount]);

  const updateLineItem = (index, field, value) => {
    const updated = [...formData.line_items];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].total = (updated[index].quantity || 0) * (updated[index].unit_price || 0);
    }
    setFormData({ ...formData, line_items: updated });
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      line_items: [...formData.line_items, { description: "", quantity: 1, unit_price: 0, total: 0 }]
    });
  };

  const removeLineItem = (index) => {
    if (formData.line_items.length > 1) {
      setFormData({
        ...formData,
        line_items: formData.line_items.filter((_, i) => i !== index)
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{credit ? "Edit Vendor Credit" : "New Vendor Credit"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Credit Number</Label>
              <Input
                value={formData.credit_number}
                onChange={(e) => setFormData({ ...formData, credit_number: e.target.value })}
                placeholder="Auto-generated if empty"
              />
            </div>
            <div>
              <Label>Vendor Name *</Label>
              <Input
                value={formData.vendor_name}
                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                placeholder="Enter vendor name"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Credit Date *</Label>
              <Input
                type="date"
                value={formData.credit_date}
                onChange={(e) => setFormData({ ...formData, credit_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Select value={formData.reason} onValueChange={(value) => setFormData({ ...formData, reason: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="return">Return</SelectItem>
                  <SelectItem value="discount">Discount</SelectItem>
                  <SelectItem value="error">Error/Overcharge</SelectItem>
                  <SelectItem value="goodwill">Goodwill</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Related Bill Number</Label>
            <Input
              value={formData.related_bill_number}
              onChange={(e) => setFormData({ ...formData, related_bill_number: e.target.value })}
              placeholder="Optional bill reference"
            />
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Line Items</Label>
              <Button type="button" size="sm" variant="outline" onClick={addLineItem}>
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {formData.line_items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      placeholder="Item description"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Unit Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Total</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.total}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLineItem(index)}
                      disabled={formData.line_items.length === 1}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Subtotal</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.subtotal}
                readOnly
                className="bg-gray-50 font-semibold"
              />
            </div>
            <div>
              <Label>Tax Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.tax_amount}
                onChange={(e) => setFormData({ ...formData, tax_amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Total Credit Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.total_amount}
                readOnly
                className="bg-gray-50 font-bold"
              />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : credit ? "Update Credit" : "Create Credit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}