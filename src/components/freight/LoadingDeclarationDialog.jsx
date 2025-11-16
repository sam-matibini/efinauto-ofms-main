import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useCompany } from "@/components/shared/CompanyContext";

export default function LoadingDeclarationDialog({ open, onClose, shipment, onSave }) {
  const { selectedCompanyId } = useCompany();
  
  const [formData, setFormData] = useState({
    company_id: selectedCompanyId,
    shipment_id: shipment?.id || "",
    booking_number: shipment?.tracking_number || "",
    container_number: shipment?.container_number || "",
    seal_number: "",
    exporter: {
      name: "",
      tax_id: "",
      address_postal: "",
      city_province: "",
      telephone: "",
      email: ""
    },
    consignee: {
      name: shipment?.customer_name || "",
      address_street: shipment?.destination_location || "",
      postal_code: "",
      city_country: shipment?.destination_country || "",
      telephone: shipment?.customer_phone || "",
      email: "",
      tax_id_passport: ""
    },
    commodity: shipment?.cargo_description || "",
    weight: shipment?.total_weight || 0,
    value: shipment?.cargo_value || 0,
    vehicles: [],
    status: "draft"
  });

  const addVehicle = () => {
    setFormData({
      ...formData,
      vehicles: [...formData.vehicles, { year: "", make_model: "", vin: "", weight: 0, value: 0 }]
    });
  };

  const removeVehicle = (index) => {
    setFormData({
      ...formData,
      vehicles: formData.vehicles.filter((_, i) => i !== index)
    });
  };

  const updateVehicle = (index, field, value) => {
    const updated = [...formData.vehicles];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, vehicles: updated });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Loading Declaration</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Header Section */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Booking Number *</Label>
                  <Input
                    value={formData.booking_number}
                    onChange={(e) => setFormData({ ...formData, booking_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Container Number</Label>
                  <Input
                    value={formData.container_number}
                    onChange={(e) => setFormData({ ...formData, container_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Seal Number</Label>
                  <Input
                    value={formData.seal_number}
                    onChange={(e) => setFormData({ ...formData, seal_number: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credentials Section */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Exporter */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Exporter</h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Exporter Name</Label>
                    <Input
                      value={formData.exporter.name}
                      onChange={(e) => setFormData({ ...formData, exporter: { ...formData.exporter, name: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax ID</Label>
                    <Input
                      value={formData.exporter.tax_id}
                      onChange={(e) => setFormData({ ...formData, exporter: { ...formData.exporter, tax_id: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Address & Postal Code</Label>
                    <Input
                      value={formData.exporter.address_postal}
                      onChange={(e) => setFormData({ ...formData, exporter: { ...formData.exporter, address_postal: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City & Province</Label>
                    <Input
                      value={formData.exporter.city_province}
                      onChange={(e) => setFormData({ ...formData, exporter: { ...formData.exporter, city_province: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telephone Number</Label>
                    <Input
                      value={formData.exporter.telephone}
                      onChange={(e) => setFormData({ ...formData, exporter: { ...formData.exporter, telephone: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.exporter.email}
                      onChange={(e) => setFormData({ ...formData, exporter: { ...formData.exporter, email: e.target.value } })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Consignee */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Consignee</h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Consignee Name</Label>
                    <Input
                      value={formData.consignee.name}
                      onChange={(e) => setFormData({ ...formData, consignee: { ...formData.consignee, name: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Door No. / Street Name</Label>
                    <Input
                      value={formData.consignee.address_street}
                      onChange={(e) => setFormData({ ...formData, consignee: { ...formData.consignee, address_street: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Postal Code / PO Box</Label>
                    <Input
                      value={formData.consignee.postal_code}
                      onChange={(e) => setFormData({ ...formData, consignee: { ...formData.consignee, postal_code: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City & Country</Label>
                    <Input
                      value={formData.consignee.city_country}
                      onChange={(e) => setFormData({ ...formData, consignee: { ...formData.consignee, city_country: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tel No</Label>
                    <Input
                      value={formData.consignee.telephone}
                      onChange={(e) => setFormData({ ...formData, consignee: { ...formData.consignee, telephone: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.consignee.email}
                      onChange={(e) => setFormData({ ...formData, consignee: { ...formData.consignee, email: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax ID / Passport No</Label>
                    <Input
                      value={formData.consignee.tax_id_passport}
                      onChange={(e) => setFormData({ ...formData, consignee: { ...formData.consignee, tax_id_passport: e.target.value } })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Commodity, Weight, Value */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Commodity</Label>
                  <Textarea
                    value={formData.commodity}
                    onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Value ($)</Label>
                  <Input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Information */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Vehicle Information (if loaded)</h3>
                <Button onClick={addVehicle} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Vehicle
                </Button>
              </div>

              {formData.vehicles.length > 0 && (
                <div className="space-y-3">
                  {formData.vehicles.map((vehicle, index) => (
                    <div key={index} className="flex gap-3 items-start border-b pb-3">
                      <div className="grid grid-cols-5 gap-3 flex-1">
                        <div className="space-y-1">
                          <Label className="text-xs">Year</Label>
                          <Input
                            type="number"
                            value={vehicle.year}
                            onChange={(e) => updateVehicle(index, 'year', parseInt(e.target.value) || "")}
                            placeholder="2020"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Make & Model</Label>
                          <Input
                            value={vehicle.make_model}
                            onChange={(e) => updateVehicle(index, 'make_model', e.target.value)}
                            placeholder="Toyota Camry"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">VIN Number</Label>
                          <Input
                            value={vehicle.vin}
                            onChange={(e) => updateVehicle(index, 'vin', e.target.value)}
                            placeholder="VIN"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Weight (kg)</Label>
                          <Input
                            type="number"
                            value={vehicle.weight}
                            onChange={(e) => updateVehicle(index, 'weight', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Value ($)</Label>
                          <Input
                            type="number"
                            value={vehicle.value}
                            onChange={(e) => updateVehicle(index, 'value', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeVehicle(index)}
                        className="mt-5"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formData)} className="bg-blue-600 hover:bg-blue-700">
            Save Loading Declaration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}