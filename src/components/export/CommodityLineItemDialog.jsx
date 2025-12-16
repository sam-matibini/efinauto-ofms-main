import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export default function CommodityLineItemDialog({ open, onClose, onSave, item, currency }) {
  const [formData, setFormData] = useState({
    item_type: 'commodity',
    description: '',
    hs_code: '',
    hs_code_level: '6',
    hs_code_description: '',
    hs_verified: false,
    quantity: 1,
    unit_of_measure: 'units',
    unit_value: 0,
    total_value: 0,
    weight: 0,
    country_of_origin: 'CA',
    item_condition: 'new',
    packaging_type: 'pallet',
    export_control_flag: false,
    restricted_goods_warning: ''
  });

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else if (open) {
      setFormData({
        item_type: 'commodity',
        description: '',
        hs_code: '',
        hs_code_level: '6',
        hs_code_description: '',
        hs_verified: false,
        quantity: 1,
        unit_of_measure: 'units',
        unit_value: 0,
        total_value: 0,
        weight: 0,
        country_of_origin: 'CA',
        item_condition: 'new',
        packaging_type: 'pallet',
        export_control_flag: false,
        restricted_goods_warning: ''
      });
    }
  }, [item, open]);

  useEffect(() => {
    const total = (formData.quantity || 0) * (formData.unit_value || 0);
    setFormData(prev => ({ ...prev, total_value: total }));
  }, [formData.quantity, formData.unit_value]);

  const handleSave = () => {
    if (!formData.description || !formData.hs_code) {
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit' : 'Add'} Commodity Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Description *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Detailed description of the commodity"
              rows={2}
            />
          </div>

          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium text-sm">CBSA Compliance (Required)</h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label>HS / Tariff Code * (Min 6 digits)</Label>
                <Input
                  value={formData.hs_code}
                  onChange={(e) => {
                    const code = e.target.value.replace(/[^0-9.]/g, '');
                    setFormData({
                      ...formData, 
                      hs_code: code,
                      hs_code_level: code.length >= 10 ? '10' : code.length >= 8 ? '8' : '6'
                    });
                  }}
                  placeholder="e.g., 8703.23.10.00"
                  minLength={6}
                  className={formData.hs_code && formData.hs_code.replace(/\./g, '').length < 6 ? 'border-red-300' : ''}
                />
                <p className="text-xs text-gray-500 mt-1">CBSA requires min 6 digits, 8-10 recommended</p>
              </div>
              <div>
                <Label>HS Level</Label>
                <Select value={formData.hs_code_level} onValueChange={(v) => setFormData({...formData, hs_code_level: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6-digit (WCO)</SelectItem>
                    <SelectItem value="8">8-digit (CA)</SelectItem>
                    <SelectItem value="10">10-digit (Full)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>HS Code Description (Optional)</Label>
              <Input
                value={formData.hs_code_description}
                onChange={(e) => setFormData({...formData, hs_code_description: e.target.value})}
                placeholder="Official HS code description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Country of Origin *</Label>
                <Input
                  value={formData.country_of_origin}
                  onChange={(e) => setFormData({...formData, country_of_origin: e.target.value.toUpperCase()})}
                  maxLength={2}
                  placeholder="CA"
                />
              </div>
              <div>
                <Label>Item Condition *</Label>
                <Select value={formData.item_condition} onValueChange={(v) => setFormData({...formData, item_condition: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="used">Used</SelectItem>
                    <SelectItem value="salvage">Salvage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                  <SelectItem value="units">Units</SelectItem>
                  <SelectItem value="kg">Kilograms</SelectItem>
                  <SelectItem value="lbs">Pounds</SelectItem>
                  <SelectItem value="m3">Cubic Meters</SelectItem>
                  <SelectItem value="liters">Liters</SelectItem>
                  <SelectItem value="pieces">Pieces</SelectItem>
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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="export-control"
              checked={formData.export_control_flag}
              onCheckedChange={(checked) => setFormData({...formData, export_control_flag: checked})}
            />
            <label htmlFor="export-control" className="text-sm font-medium">
              Export Control Item (Requires License)
            </label>
          </div>

          {formData.export_control_flag && (
            <Alert className="border-amber-300 bg-amber-50">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-800">
                This item is flagged for export control. Additional licenses or permits may be required.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label>Restricted Goods Warning (if applicable)</Label>
            <Textarea
              value={formData.restricted_goods_warning}
              onChange={(e) => setFormData({...formData, restricted_goods_warning: e.target.value})}
              placeholder="Any warnings about restricted goods, hazardous materials, etc."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!formData.description || !formData.hs_code}>
            {item ? 'Update' : 'Add'} Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}