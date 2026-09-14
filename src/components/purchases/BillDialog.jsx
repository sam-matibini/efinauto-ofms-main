import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import VendorSelector from "../shared/VendorSelector";
import DocumentAutoscan from "@/components/shared/DocumentAutoscan";
import { mergeDocumentFields } from "@/lib/documentAutoscan";

export default function BillDialog({ open, onClose, bill, onSave, isSaving }) {
  const [formData, setFormData] = useState({
    bill_number: "",
    vendor_id: null,
    vendor_name: "",
    line_items: [{ description: "", quantity: 1, unit_price: 0, total: 0 }],
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    amount_paid: 0,
    balance_due: 0,
    bill_date: new Date().toISOString().split('T')[0],
    due_date: "",
    status: "pending",
    payment_terms: "Net 30",
    notes: ""
  });

  useEffect(() => {
    if (bill) {
      setFormData(bill);
    } else {
      setFormData({
        bill_number: "",
        vendor_name: "",
        line_items: [{ description: "", quantity: 1, unit_price: 0, total: 0 }],
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        amount_paid: 0,
        balance_due: 0,
        bill_date: new Date().toISOString().split('T')[0],
        due_date: "",
        status: "pending",
        payment_terms: "Net 30",
        notes: ""
      });
    }
  }, [bill, open]);

  useEffect(() => {
    const subtotal = formData.line_items.reduce((sum, item) => sum + (item.total || 0), 0);
    const total = subtotal + (parseFloat(formData.tax_amount) || 0);
    const balance = total - (parseFloat(formData.amount_paid) || 0);
    
    setFormData(prev => ({
      ...prev,
      subtotal,
      total_amount: total,
      balance_due: balance
    }));
  }, [formData.line_items, formData.tax_amount, formData.amount_paid]);

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
          <DialogTitle>{bill ? "Edit Bill" : "New Bill"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <DocumentAutoscan
            profile="bill"
            resetKey={open}
            onApply={(fields) => setFormData((prev) => mergeDocumentFields(prev, fields))}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Bill Number</Label>
              <Input
                value={formData.bill_number}
                onChange={(e) => setFormData({ ...formData, bill_number: e.target.value })}
                placeholder="Auto-generated if empty"
              />
            </div>
            <div>
              <Label>Select Vendor *</Label>
              <VendorSelector
                value={formData.vendor_id}
                onSelect={(vendor) => setFormData({ ...formData, vendor_id: vendor.id, vendor_name: vendor.vendor_name })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Bill Date *</Label>
              <Input
                type="date"
                value={formData.bill_date}
                onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Payment Terms</Label>
              <Select value={formData.payment_terms} onValueChange={(value) => setFormData({ ...formData, payment_terms: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                  <SelectItem value="Net 15">Net 15</SelectItem>
                  <SelectItem value="Net 30">Net 30</SelectItem>
                  <SelectItem value="Net 60">Net 60</SelectItem>
                  <SelectItem value="Net 90">Net 90</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

          <div className="grid grid-cols-4 gap-4">
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
              <Label>Total Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.total_amount}
                readOnly
                className="bg-gray-50 font-bold"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Amount Paid</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount_paid}
                onChange={(e) => setFormData({ ...formData, amount_paid: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Balance Due</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.balance_due}
                readOnly
                className="bg-gray-50 font-semibold"
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
              {isSaving ? "Saving..." : bill ? "Update Bill" : "Create Bill"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}