import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Car, AlertTriangle, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import HSCodeLookup from "./HSCodeLookup";

export default function VehicleLineItemDialog({ open, onClose, onSave, item, currency, companyId }) {
  const [formData, setFormData] = useState({
    item_type: 'vehicle',
    description: '',
    hs_code: '',
    hs_code_level: '6',
    hs_code_description: '',
    hs_verified: false,
    quantity: 1,
    unit_value: 0,
    total_value: 0,
    weight: 0,
    country_of_origin: 'CA',
    item_condition: 'used',
    vin: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    vehicle_type: 'passenger',
    odometer: 0,
    title_status: 'clean',
    export_eligible: true,
    roro_indicator: false,
    containerized: true,
    vehicle_condition_notes: '',
    inventory_id: ''
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', companyId],
    queryFn: () => supabase.entities.Vehicle.filter({ company_id: companyId }),
    enabled: !!companyId && open
  });

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else if (open) {
      setFormData({
        item_type: 'vehicle',
        description: '',
        hs_code: '',
        hs_code_level: '6',
        hs_code_description: '',
        hs_verified: false,
        quantity: 1,
        unit_value: 0,
        total_value: 0,
        weight: 0,
        country_of_origin: 'CA',
        item_condition: 'used',
        vin: '',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        vehicle_type: 'passenger',
        odometer: 0,
        title_status: 'clean',
        export_eligible: true,
        roro_indicator: false,
        containerized: true,
        vehicle_condition_notes: '',
        inventory_id: ''
      });
    }
  }, [item, open]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, total_value: prev.unit_value }));
  }, [formData.unit_value]);

  const handleVehicleSelect = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      setFormData(prev => ({
        ...prev,
        inventory_id: vehicle.id,
        vin: vehicle.vin,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        description: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        unit_value: vehicle.selling_price || 0,
        total_value: vehicle.selling_price || 0,
        weight: vehicle.weight || 0,
        odometer: vehicle.mileage || 0
      }));
    }
  };

  const handleSave = () => {
    if (!formData.vin || !formData.description) {
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            {item ? 'Edit' : 'Add'} Vehicle
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!item && vehicles.length > 0 && (
            <div>
              <Label>Select from Inventory (Optional)</Label>
              <Select onValueChange={handleVehicleSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose vehicle..." />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.year} {v.make} {v.model} - {v.vin}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>VIN (Vehicle Identification Number) *</Label>
            <Input
              value={formData.vin}
              onChange={(e) => setFormData({...formData, vin: e.target.value.toUpperCase()})}
              placeholder="17-character VIN"
              maxLength={17}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Make *</Label>
              <Input
                value={formData.make}
                onChange={(e) => {
                  const make = e.target.value;
                  setFormData({
                    ...formData,
                    make,
                    description: `${formData.year || ''} ${make} ${formData.model || ''}`.trim()
                  });
                }}
              />
            </div>
            <div>
              <Label>Model *</Label>
              <Input
                value={formData.model}
                onChange={(e) => {
                  const model = e.target.value;
                  setFormData({
                    ...formData,
                    model,
                    description: `${formData.year || ''} ${formData.make || ''} ${model}`.trim()
                  });
                }}
              />
            </div>
            <div>
              <Label>Year *</Label>
              <Input
                type="number"
                value={formData.year}
                onChange={(e) => {
                  const year = e.target.value;
                  setFormData({
                    ...formData,
                    year,
                    description: `${year} ${formData.make || ''} ${formData.model || ''}`.trim()
                  });
                }}
                min="1900"
                max={new Date().getFullYear() + 2}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Vehicle Type</Label>
              <Select value={formData.vehicle_type} onValueChange={(v) => setFormData({...formData, vehicle_type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passenger">Passenger Vehicle</SelectItem>
                  <SelectItem value="commercial">Commercial Vehicle</SelectItem>
                  <SelectItem value="salvage">Salvage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Odometer (km)</Label>
              <Input
                type="number"
                value={formData.odometer}
                onChange={(e) => setFormData({...formData, odometer: parseFloat(e.target.value) || 0})}
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Title Status</Label>
              <Select value={formData.title_status} onValueChange={(v) => setFormData({...formData, title_status: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clean">Clean Title</SelectItem>
                  <SelectItem value="salvage">Salvage Title</SelectItem>
                  <SelectItem value="rebuilt">Rebuilt</SelectItem>
                  <SelectItem value="lien">Lien</SelectItem>
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
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Value ({currency})</Label>
              <Input
                type="number"
                value={formData.unit_value}
                onChange={(e) => setFormData({...formData, unit_value: parseFloat(e.target.value) || 0})}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <Label>Weight (kg)</Label>
              <Input
                type="number"
                value={formData.weight}
                onChange={(e) => setFormData({...formData, weight: parseFloat(e.target.value) || 0})}
                min="0"
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium text-sm">CBSA Compliance (Required for Vehicles)</h4>
            <Alert className="border-blue-300 bg-blue-50">
              <AlertTriangle className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800">
                Vehicles require valid HS codes. Common: 8703 (passenger), 8704 (commercial), 8708 (parts).
              </AlertDescription>
            </Alert>

            <HSCodeLookup
              value={formData.hs_code}
              onChange={(data) => setFormData({...formData, ...data})}
              itemType="vehicle"
              level={formData.hs_code_level}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Country of Origin *</Label>
                <Input
                  value={formData.country_of_origin}
                  onChange={(e) => setFormData({...formData, country_of_origin: e.target.value.toUpperCase()})}
                  maxLength={2}
                  placeholder="CA, US, JP, etc."
                />
              </div>
              <div>
                <Label>Condition *</Label>
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

          <div className="space-y-3 border-t pt-4">
            <h4 className="font-medium text-sm">Shipping Method</h4>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.roro_indicator}
                  onCheckedChange={(checked) => setFormData({...formData, roro_indicator: checked, containerized: !checked})}
                />
                <span className="text-sm">RoRo (Roll-on/Roll-off)</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.containerized}
                  onCheckedChange={(checked) => setFormData({...formData, containerized: checked, roro_indicator: !checked})}
                />
                <span className="text-sm">Containerized</span>
              </label>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="export-eligible"
              checked={formData.export_eligible}
              onCheckedChange={(checked) => setFormData({...formData, export_eligible: checked})}
            />
            <label htmlFor="export-eligible" className="text-sm font-medium">
              Export Eligible (No restrictions)
            </label>
          </div>

          {!formData.export_eligible && (
            <Alert className="border-red-300 bg-red-50">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-sm text-red-800">
                This vehicle has export restrictions. Verify eligibility before proceeding.
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label>Condition Notes</Label>
            <Textarea
              value={formData.vehicle_condition_notes}
              onChange={(e) => setFormData({...formData, vehicle_condition_notes: e.target.value})}
              placeholder="Vehicle condition, damage, modifications, etc."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!formData.vin || !formData.description || !formData.hs_code || formData.hs_code.replace(/\./g, '').length < 6}>
            {item ? 'Update' : 'Add'} Vehicle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}