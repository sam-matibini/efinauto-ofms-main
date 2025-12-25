import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import RouteMapEstimator from "./RouteMapEstimator";

export default function ShipmentDialog({ open, onClose, shipment, drivers, trucks }) {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    shipment_type: "LOCAL",
    origin_address: "",
    origin_city: "",
    origin_province: "",
    destination_address: "",
    destination_city: "",
    destination_province: "",
    driver_id: "",
    truck_id: "",
    trailer_id: "",
    commodities: [{ product_name: "", weight_kg: 0, hazmat: false }],
    customer_name: "",
    customer_phone: "",
    special_instructions: "",
    tracking_enabled: true
  });

  useEffect(() => {
    if (shipment) {
      setFormData({
        ...shipment,
        commodities: shipment.commodities || [{ product_name: "", weight_kg: 0, hazmat: false }]
      });
    } else {
      setFormData({
        shipment_type: "LOCAL",
        origin_address: "",
        origin_city: "",
        origin_province: "",
        destination_address: "",
        destination_city: "",
        destination_province: "",
        driver_id: "",
        truck_id: "",
        trailer_id: "",
        commodities: [{ product_name: "", weight_kg: 0, hazmat: false }],
        customer_name: "",
        customer_phone: "",
        special_instructions: "",
        tracking_enabled: true
      });
    }
  }, [shipment, open]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const shipmentData = {
        ...data,
        company_id: selectedCompanyId,
        status: data.status || "pending",
        shipment_number: data.shipment_number || `SHIP-${Date.now()}`,
        total_weight_kg: data.commodities.reduce((sum, c) => sum + (c.weight_kg || 0), 0),
        contains_hazmat: data.commodities.some(c => c.hazmat),
        tracking_token: Math.random().toString(36).substring(7)
      };

      if (shipment?.id) {
        return base44.entities.LocalShipment.update(shipment.id, shipmentData);
      } else {
        return base44.entities.LocalShipment.create(shipmentData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['localShipments'] });
      toast.success(shipment ? "Shipment updated" : "Shipment created");
      onClose();
    },
    onError: () => toast.error("Failed to save shipment")
  });

  const addCommodity = () => {
    setFormData({
      ...formData,
      commodities: [...formData.commodities, { product_name: "", weight_kg: 0, hazmat: false }]
    });
  };

  const removeCommodity = (index) => {
    setFormData({
      ...formData,
      commodities: formData.commodities.filter((_, i) => i !== index)
    });
  };

  const updateCommodity = (index, field, value) => {
    const updated = [...formData.commodities];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, commodities: updated });
  };

  const hasHazmat = formData.commodities.some(c => c.hazmat);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{shipment ? "Edit Shipment" : "Create New Shipment"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Shipment Type</Label>
              <Select value={formData.shipment_type} onValueChange={(value) => setFormData({ ...formData, shipment_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOCAL">Local</SelectItem>
                  <SelectItem value="LONG_HAUL">Long Haul</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Customer Name</Label>
              <Input value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} />
            </div>
          </div>

          {/* Origin */}
          <div className="space-y-3">
            <h3 className="font-semibold">Origin</h3>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="md:col-span-3">
                <Label>Address</Label>
                <Input value={formData.origin_address} onChange={(e) => setFormData({ ...formData, origin_address: e.target.value })} />
              </div>
              <div>
                <Label>City</Label>
                <Input value={formData.origin_city} onChange={(e) => setFormData({ ...formData, origin_city: e.target.value })} />
              </div>
              <div>
                <Label>Province/State</Label>
                <Input value={formData.origin_province} onChange={(e) => setFormData({ ...formData, origin_province: e.target.value })} />
              </div>
              <div>
                <Label>Postal Code</Label>
                <Input value={formData.origin_postal_code} onChange={(e) => setFormData({ ...formData, origin_postal_code: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-3">
            <h3 className="font-semibold">Destination</h3>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="md:col-span-3">
                <Label>Address</Label>
                <Input value={formData.destination_address} onChange={(e) => setFormData({ ...formData, destination_address: e.target.value })} />
              </div>
              <div>
                <Label>City</Label>
                <Input value={formData.destination_city} onChange={(e) => setFormData({ ...formData, destination_city: e.target.value })} />
              </div>
              <div>
                <Label>Province/State</Label>
                <Input value={formData.destination_province} onChange={(e) => setFormData({ ...formData, destination_province: e.target.value })} />
              </div>
              <div>
                <Label>Postal Code</Label>
                <Input value={formData.destination_postal_code} onChange={(e) => setFormData({ ...formData, destination_postal_code: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Route Map & Cost Estimator */}
          {(formData.origin_address || formData.origin_city) && (formData.destination_address || formData.destination_city) && (
            <RouteMapEstimator
              originAddress={`${formData.origin_address || ''} ${formData.origin_city || ''} ${formData.origin_province || ''}`.trim()}
              destinationAddress={`${formData.destination_address || ''} ${formData.destination_city || ''} ${formData.destination_province || ''}`.trim()}
              weight={formData.commodities?.reduce((sum, c) => sum + (c.weight_kg || 0), 0)}
              shipmentType={formData.shipment_type}
            />
          )}

          {/* Assignment */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Driver</Label>
              <Select value={formData.driver_id} onValueChange={(value) => setFormData({ ...formData, driver_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.filter(d => d.status !== 'inactive').map(driver => (
                    <SelectItem key={driver.id} value={driver.id}>{driver.driver_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Truck</Label>
              <Select value={formData.truck_id} onValueChange={(value) => setFormData({ ...formData, truck_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select truck" />
                </SelectTrigger>
                <SelectContent>
                  {trucks.filter(t => t.status === 'available').map(truck => (
                    <SelectItem key={truck.id} value={truck.id}>{truck.truck_number} ({truck.truck_plate})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={formData.tracking_enabled} onCheckedChange={(checked) => setFormData({ ...formData, tracking_enabled: checked })} />
              <Label>Enable GPS Tracking</Label>
            </div>
          </div>

          {/* Commodities */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Commodities</h3>
              <Button onClick={addCommodity} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>

            {formData.commodities.map((commodity, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex justify-between items-start">
                  <div className="grid md:grid-cols-3 gap-3 flex-1">
                    <div className="md:col-span-2">
                      <Label>Product Name</Label>
                      <Input value={commodity.product_name} onChange={(e) => updateCommodity(index, 'product_name', e.target.value)} />
                    </div>
                    <div>
                      <Label>Weight (kg)</Label>
                      <Input type="number" value={commodity.weight_kg} onChange={(e) => updateCommodity(index, 'weight_kg', parseFloat(e.target.value))} />
                    </div>
                    <div className="md:col-span-3 flex items-center gap-2">
                      <Switch checked={commodity.hazmat} onCheckedChange={(checked) => updateCommodity(index, 'hazmat', checked)} />
                      <Label>HAZMAT Material</Label>
                      {commodity.hazmat && <AlertTriangle className="w-4 h-4 text-red-500" />}
                    </div>
                    {commodity.hazmat && (
                      <div className="md:col-span-3">
                        <Label>HAZMAT Class</Label>
                        <Input placeholder="e.g., Class 3 - Flammable Liquids" value={commodity.hazmat_class || ""} onChange={(e) => updateCommodity(index, 'hazmat_class', e.target.value)} />
                      </div>
                    )}
                  </div>
                  {formData.commodities.length > 1 && (
                    <Button onClick={() => removeCommodity(index)} variant="ghost" size="sm">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {hasHazmat && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">HAZMAT Compliance Required</p>
                  <p className="text-sm text-red-700 mt-1">This shipment contains hazardous materials. Driver must be HAZMAT certified and compliance checklist must be completed before dispatch.</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label>Special Instructions</Label>
            <Textarea value={formData.special_instructions} onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })} rows={3} />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {saveMutation.isPending ? "Saving..." : shipment ? "Update Shipment" : "Create Shipment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}