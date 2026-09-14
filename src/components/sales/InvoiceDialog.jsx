import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Wrench, FileText } from "lucide-react";
import CustomerSelector from "../shared/CustomerSelector";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DocumentAutoscan from "@/components/shared/DocumentAutoscan";
import { mergeDocumentFields } from "@/lib/documentAutoscan";

export default function InvoiceDialog({ open, onClose, onSave, editingInvoice, customers, services }) {
  const [formData, setFormData] = useState({
    invoice_number: "",
    customer_id: null,
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_address: "",
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: "",
    currency: "CAD",
    line_items: [],
    subtotal: 0,
    tax_rate: 13,
    tax_amount: 0,
    total_amount: 0,
    amount_paid: 0,
    balance_due: 0,
    status: "draft",
    notes: "",
    terms: "Payment due upon receipt"
  });

  const currencySymbols = {
    CAD: "CA$",
    USD: "$",
    NGN: "₦"
  };

  useEffect(() => {
    if (open) {
      if (editingInvoice) {
        setFormData({
          invoice_number: editingInvoice.invoice_number || "",
          customer_id: editingInvoice.customer_id || null,
          customer_name: editingInvoice.customer_name || "",
          customer_email: editingInvoice.customer_email || "",
          customer_phone: editingInvoice.customer_phone || "",
          customer_address: editingInvoice.customer_address || "",
          invoice_date: editingInvoice.invoice_date || new Date().toISOString().split('T')[0],
          due_date: editingInvoice.due_date || "",
          currency: editingInvoice.currency || "CAD",
          line_items: editingInvoice.line_items || [],
          subtotal: editingInvoice.subtotal || 0,
          tax_rate: editingInvoice.tax_rate || 13,
          tax_amount: editingInvoice.tax_amount || 0,
          total_amount: editingInvoice.total_amount || 0,
          amount_paid: editingInvoice.amount_paid || 0,
          balance_due: editingInvoice.balance_due || 0,
          status: editingInvoice.status || "draft",
          notes: editingInvoice.notes || "",
          terms: editingInvoice.terms || "Payment due upon receipt"
        });
      } else {
        setFormData({
          invoice_number: `INV-${Date.now()}`,
          customer_id: null,
          customer_name: "",
          customer_email: "",
          customer_phone: "",
          customer_address: "",
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: "",
          currency: "CAD",
          line_items: [],
          subtotal: 0,
          tax_rate: 13,
          tax_amount: 0,
          total_amount: 0,
          amount_paid: 0,
          balance_due: 0,
          status: "draft",
          notes: "",
          terms: "Payment due upon receipt"
        });
      }
    }
  }, [open, editingInvoice]);

  const handleCustomerSelect = (customer) => {
    setFormData(prev => ({
      ...prev,
      customer_id: customer.id,
      customer_name: customer.full_name,
      customer_email: customer.email || "",
      customer_phone: customer.phone || "",
      customer_address: [customer.address, customer.city, customer.province, customer.postal_code].filter(Boolean).join(", ")
    }));
  };

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      line_items: [...prev.line_items, { description: "", quantity: 1, unit_price: 0, total: 0 }]
    }));
  };

  const updateLineItem = (index, field, value) => {
    const newItems = [...formData.line_items];
    newItems[index][field] = value;
    
    if (field === "quantity" || field === "unit_price") {
      newItems[index].total = (parseFloat(newItems[index].quantity) || 0) * (parseFloat(newItems[index].unit_price) || 0);
    }
    
    const subtotal = newItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const taxAmount = subtotal * (formData.tax_rate / 100);
    const totalAmount = subtotal + taxAmount;
    
    setFormData(prev => ({
      ...prev,
      line_items: newItems,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      balance_due: totalAmount - prev.amount_paid
    }));
  };

  const removeLineItem = (index) => {
    const newItems = formData.line_items.filter((_, i) => i !== index);
    const subtotal = newItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const taxAmount = subtotal * (formData.tax_rate / 100);
    const totalAmount = subtotal + taxAmount;
    
    setFormData(prev => ({
      ...prev,
      line_items: newItems,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      balance_due: totalAmount - prev.amount_paid
    }));
  };

  const handleTaxRateChange = (rate) => {
    const taxAmount = formData.subtotal * (rate / 100);
    const totalAmount = formData.subtotal + taxAmount;
    setFormData(prev => ({
      ...prev,
      tax_rate: rate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      balance_due: totalAmount - prev.amount_paid
    }));
  };

  const handleSubmit = () => {
    if (!formData.customer_name) {
      toast.error("Please select or enter a customer");
      return;
    }
    if (formData.line_items.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingInvoice ? "Edit Invoice" : "New Invoice"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <DocumentAutoscan
            profile="invoice"
            resetKey={open}
            onApply={(fields) => setFormData((prev) => {
              const merged = mergeDocumentFields(prev, fields);
              if (merged.line_items?.length) {
                const subtotal = merged.line_items.reduce((sum, item) => sum + (item.total || 0), 0);
                const taxAmount = subtotal * ((merged.tax_rate || 0) / 100);
                const totalAmount = subtotal + taxAmount;
                return {
                  ...merged,
                  subtotal,
                  tax_amount: taxAmount,
                  total_amount: totalAmount,
                  balance_due: totalAmount - (merged.amount_paid || 0),
                };
              }
              return merged;
            })}
          />
          {/* Customer Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Select Customer *</Label>
              <CustomerSelector
                value={formData.customer_id}
                onSelect={handleCustomerSelect}
              />
            </div>
            <div>
              <Label>Customer Name *</Label>
              <Input 
                value={formData.customer_name} 
                onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))} 
              />
            </div>
            <div>
              <Label>Customer Email</Label>
              <Input 
                type="email"
                value={formData.customer_email} 
                onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))} 
              />
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Label>Invoice Number</Label>
              <Input 
                value={formData.invoice_number} 
                onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))} 
              />
            </div>
            <div>
              <Label>Invoice Date</Label>
              <Input 
                type="date"
                value={formData.invoice_date} 
                onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))} 
              />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input 
                type="date"
                value={formData.due_date} 
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))} 
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Select 
                value={formData.currency} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="NGN">NGN - Nigerian Naira</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Line Items with Services Tab */}
          <Tabs defaultValue="items" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="items" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Line Items
              </TabsTrigger>
              <TabsTrigger value="services" className="flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                Services
              </TabsTrigger>
            </TabsList>

            <TabsContent value="items" className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <Label>Line Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="w-4 h-4 mr-1" /> Add Item
                </Button>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2 text-sm font-medium">Description</th>
                      <th className="text-center p-2 text-sm font-medium w-20">Qty</th>
                      <th className="text-center p-2 text-sm font-medium w-28">Rate ({currencySymbols[formData.currency]})</th>
                      <th className="text-right p-2 text-sm font-medium w-28">Amount</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.line_items.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">
                          <Input 
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => updateLineItem(index, "description", e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <Input 
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(index, "quantity", parseFloat(e.target.value) || 0)}
                            className="text-center"
                          />
                        </td>
                        <td className="p-2">
                          <Input 
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price || 0}
                            onChange={(e) => updateLineItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                            className="text-center"
                          />
                        </td>
                        <td className="p-2 text-right font-medium">
                          {currencySymbols[formData.currency]}{(item.total || 0).toFixed(2)}
                        </td>
                        <td className="p-2">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon"
                            className="text-red-600 h-8 w-8"
                            onClick={() => removeLineItem(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {formData.line_items.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-gray-500">
                          No items added. Click "Add Item" or select services from the Services tab.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="services" className="mt-4">
              <div className="mb-2">
                <Label>Select Services to Add</Label>
                <p className="text-sm text-gray-500">Click on a service to add it as a line item</p>
              </div>
              
              {services && services.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {services.map((service) => (
                    <Card 
                      key={service.id} 
                      className="cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                      onClick={() => {
                        const newItem = {
                          description: service.name,
                          quantity: 1,
                          unit_price: service.price || 0,
                          total: service.price || 0,
                          service_id: service.id
                        };
                        const newItems = [...formData.line_items, newItem];
                        const subtotal = newItems.reduce((sum, item) => sum + (item.total || 0), 0);
                        const taxAmount = subtotal * (formData.tax_rate / 100);
                        const totalAmount = subtotal + taxAmount;
                        setFormData(prev => ({
                          ...prev,
                          line_items: newItems,
                          subtotal,
                          tax_amount: taxAmount,
                          total_amount: totalAmount,
                          balance_due: totalAmount - prev.amount_paid
                        }));
                        toast.success(`Added "${service.name}" to invoice`);
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{service.name}</h4>
                            {service.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{service.description}</p>
                            )}
                          </div>
                          <Badge className="bg-green-100 text-green-800">
                            {currencySymbols[formData.currency]}{service.price?.toFixed(2)}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 border rounded-lg">
                  <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No services available</p>
                  <p className="text-sm">Add services in Products & Services page</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{currencySymbols[formData.currency]}{formData.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-gray-600">Tax Rate:</span>
                <Select 
                  value={String(formData.tax_rate)} 
                  onValueChange={(v) => handleTaxRateChange(parseFloat(v))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Zero Rated - 0% (Export)</SelectItem>
                    <SelectItem value="5">5% GST</SelectItem>
                    <SelectItem value="7.5">7.5% VAT</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="13">13% HST</SelectItem>
                    <SelectItem value="15">15% HST</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax:</span>
                <span className="font-medium">{currencySymbols[formData.currency]}{formData.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">Total:</span>
                <span className="font-bold text-lg text-blue-600">{currencySymbols[formData.currency]}{formData.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Terms</Label>
              <Input 
                value={formData.terms} 
                onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))} 
              />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea 
                value={formData.notes} 
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
              {editingInvoice ? "Update Invoice" : "Create Invoice"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}