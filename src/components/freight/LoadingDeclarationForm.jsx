import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";

export default function LoadingDeclarationForm({ declaration, onChange }) {
  const [formData, setFormData] = useState(declaration || {
    booking_number: "",
    seal_number: "",
    exporter: {
      name: "",
      tax_id: "",
      address: "",
      city_province: "",
      telephone: "",
      email: ""
    },
    consignee: {
      name: "",
      address: "",
      postal_code: "",
      city_country: "",
      telephone: "",
      email: "",
      tax_id_passport: ""
    },
    commodity: "",
    weight: 0,
    value: 0,
    vehicles: []
  });

  React.useEffect(() => {
    if (declaration) {
      setFormData({
        ...declaration,
        exporter: declaration.exporter || {
          name: "",
          tax_id: "",
          address: "",
          city_province: "",
          telephone: "",
          email: ""
        },
        consignee: declaration.consignee || {
          name: "",
          address: "",
          postal_code: "",
          city_country: "",
          telephone: "",
          email: "",
          tax_id_passport: ""
        },
        vehicles: declaration.vehicles || []
      });
    }
  }, [declaration]);

  React.useEffect(() => {
    onChange(formData);
  }, [formData]);

  const addVehicle = () => {
    const newVehicle = {
      year: new Date().getFullYear(),
      make_model: "",
      vin: "",
      weight: 0,
      value: 0
    };
    setFormData({
      ...formData,
      vehicles: [...formData.vehicles, newVehicle]
    });
  };

  const removeVehicle = (index) => {
    const updatedVehicles = formData.vehicles.filter((_, i) => i !== index);
    setFormData({ ...formData, vehicles: updatedVehicles });
    toast.success("Vehicle removed");
  };

  const updateVehicle = (index, field, value) => {
    const updatedVehicles = [...formData.vehicles];
    updatedVehicles[index] = { ...updatedVehicles[index], [field]: value };
    setFormData({ ...formData, vehicles: updatedVehicles });
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <FileText className="w-5 h-5" />
            Loading Declaration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Header Section */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2">
              <Label>Booking Number</Label>
              <Input
                value={formData.booking_number}
                onChange={(e) => setFormData({ ...formData, booking_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Container Number</Label>
              <Input
                value={formData.container_number || ""}
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

          {/* Exporter Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Exporter Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Exporter Name</Label>
                <Input
                  value={formData.exporter.name}
                  onChange={(e) => setFormData({
                    ...formData,
                    exporter: { ...formData.exporter, name: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tax ID</Label>
                <Input
                  value={formData.exporter.tax_id}
                  onChange={(e) => setFormData({
                    ...formData,
                    exporter: { ...formData.exporter, tax_id: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Address & Postal Code</Label>
                <Textarea
                  value={formData.exporter.address}
                  onChange={(e) => setFormData({
                    ...formData,
                    exporter: { ...formData.exporter, address: e.target.value }
                  })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>City & Province</Label>
                <Input
                  value={formData.exporter.city_province}
                  onChange={(e) => setFormData({
                    ...formData,
                    exporter: { ...formData.exporter, city_province: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telephone Number</Label>
                <Input
                  value={formData.exporter.telephone}
                  onChange={(e) => setFormData({
                    ...formData,
                    exporter: { ...formData.exporter, telephone: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.exporter.email}
                  onChange={(e) => setFormData({
                    ...formData,
                    exporter: { ...formData.exporter, email: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>

          {/* Consignee Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Consignee Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Consignee Name</Label>
                <Input
                  value={formData.consignee.name}
                  onChange={(e) => setFormData({
                    ...formData,
                    consignee: { ...formData.consignee, name: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telephone</Label>
                <Input
                  value={formData.consignee.telephone}
                  onChange={(e) => setFormData({
                    ...formData,
                    consignee: { ...formData.consignee, telephone: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Consignee Address (Door No. / Street Name)</Label>
                <Textarea
                  value={formData.consignee.address}
                  onChange={(e) => setFormData({
                    ...formData,
                    consignee: { ...formData.consignee, address: e.target.value }
                  })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Postal Code / PO Box</Label>
                <Input
                  value={formData.consignee.postal_code}
                  onChange={(e) => setFormData({
                    ...formData,
                    consignee: { ...formData.consignee, postal_code: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>City & Country</Label>
                <Input
                  value={formData.consignee.city_country}
                  onChange={(e) => setFormData({
                    ...formData,
                    consignee: { ...formData.consignee, city_country: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.consignee.email}
                  onChange={(e) => setFormData({
                    ...formData,
                    consignee: { ...formData.consignee, email: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tax ID / Passport No</Label>
                <Input
                  value={formData.consignee.tax_id_passport}
                  onChange={(e) => setFormData({
                    ...formData,
                    consignee: { ...formData.consignee, tax_id_passport: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>

          {/* Commodity, Weight, Value */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">Cargo Details</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Commodity</Label>
                <Input
                  value={formData.commodity}
                  onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                  placeholder="e.g., Used Vehicles"
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
          </div>

          {/* Vehicle Information */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-semibold text-lg text-gray-900">Vehicle Information (if loaded)</h3>
              <Button onClick={addVehicle} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Vehicle
              </Button>
            </div>

            {formData.vehicles.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No vehicles added yet</p>
            ) : (
              <div className="space-y-3">
                {formData.vehicles.map((vehicle, index) => (
                  <Card key={index} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-semibold text-sm">Vehicle {index + 1}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVehicle(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-5 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Year</Label>
                          <Input
                            type="number"
                            value={vehicle.year}
                            onChange={(e) => updateVehicle(index, 'year', parseInt(e.target.value))}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Make & Model</Label>
                          <Input
                            value={vehicle.make_model}
                            onChange={(e) => updateVehicle(index, 'make_model', e.target.value)}
                            placeholder="e.g., Toyota Camry"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">VIN Number</Label>
                          <Input
                            value={vehicle.vin}
                            onChange={(e) => updateVehicle(index, 'vin', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Weight (kg)</Label>
                          <Input
                            type="number"
                            value={vehicle.weight}
                            onChange={(e) => updateVehicle(index, 'weight', parseFloat(e.target.value) || 0)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Value ($)</Label>
                          <Input
                            type="number"
                            value={vehicle.value}
                            onChange={(e) => updateVehicle(index, 'value', parseFloat(e.target.value) || 0)}
                            className="h-9"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}