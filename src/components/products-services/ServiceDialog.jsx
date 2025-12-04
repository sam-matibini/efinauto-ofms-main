import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function ServiceDialog({ open, onClose, service, onSave, isLoading }) {
  const [formData, setFormData] = useState({
    service_code: "",
    name: "",
    description: "",
    category: "maintenance",
    currency: "CAD",
    price: 0,
    cost: 0,
    margin_percentage: 0,
    duration_minutes: 60,
    taxable: true,
    active: true,
  });

  const currencySymbols = {
    CAD: "CA$",
    USD: "$",
    NGN: "₦"
  };

  useEffect(() => {
    if (service) {
      setFormData(service);
    } else {
      setFormData({
        service_code: "",
        name: "",
        description: "",
        category: "maintenance",
        currency: "CAD",
        price: 0,
        cost: 0,
        margin_percentage: 0,
        duration_minutes: 60,
        taxable: true,
        active: true,
      });
    }
  }, [service, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{service ? "Edit Service" : "Add New Service"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Service Name *</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Service Code *</Label>
              <Input
                required
                value={formData.service_code}
                onChange={(e) => setFormData({ ...formData, service_code: e.target.value })}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="diagnostic">Diagnostic</SelectItem>
                  <SelectItem value="installation">Installation</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="detailing">Detailing</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
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

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Cost ({currencySymbols[formData.currency]})</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => {
                  const cost = parseFloat(e.target.value) || 0;
                  const margin = formData.margin_percentage || 0;
                  const price = cost * (1 + margin / 100);
                  setFormData({ ...formData, cost: cost, price: price });
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Margin (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.margin_percentage}
                onChange={(e) => {
                  const margin = parseFloat(e.target.value) || 0;
                  const cost = formData.cost || 0;
                  const price = cost * (1 + margin / 100);
                  setFormData({ ...formData, margin_percentage: margin, price: price });
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Price ({currencySymbols[formData.currency]}) *</Label>
              <Input
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) => {
                  const price = parseFloat(e.target.value) || 0;
                  const cost = formData.cost || 0;
                  const margin = cost > 0 ? ((price - cost) / cost) * 100 : 0;
                  setFormData({ ...formData, price: price, margin_percentage: margin });
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Duration (min)</Label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          
          {formData.cost > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Profit:</span> {currencySymbols[formData.currency]}{((formData.price || 0) - (formData.cost || 0)).toFixed(2)} 
                {formData.margin_percentage > 0 && ` (${formData.margin_percentage.toFixed(2)}% margin)`}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between border rounded-lg p-4">
            <div>
              <Label>Taxable</Label>
              <p className="text-sm text-gray-500">Apply taxes to this service</p>
            </div>
            <Switch
              checked={formData.taxable}
              onCheckedChange={(checked) => setFormData({ ...formData, taxable: checked })}
            />
          </div>

          <div className="flex items-center justify-between border rounded-lg p-4">
            <div>
              <Label>Active</Label>
              <p className="text-sm text-gray-500">Service is available for selection</p>
            </div>
            <Switch
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Service"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}