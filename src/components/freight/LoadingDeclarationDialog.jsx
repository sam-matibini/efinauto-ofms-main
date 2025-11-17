import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Mail, Loader2, Edit, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useCompany } from "@/components/shared/CompanyContext";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LoadingDeclarationDialog({ open, onClose, shipment, onSave, exports }) {
  const { selectedCompanyId } = useCompany();
  const [isSending, setIsSending] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [viewMode, setViewMode] = useState(false);
  const [savedData, setSavedData] = useState(null);

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
    enabled: open,
    initialData: [],
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', selectedCompanyId],
    queryFn: () => base44.entities.Customer.list(),
    enabled: open && !!selectedCompanyId,
    initialData: [],
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', selectedCompanyId],
    queryFn: () => base44.entities.Vehicle.list(),
    enabled: open && !!selectedCompanyId,
    initialData: [],
  });

  const inStockVehicles = vehicles.filter(v => v.status === 'in_stock');
  
  const [formData, setFormData] = useState({
    company_id: selectedCompanyId,
    export_id: "",
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

  React.useEffect(() => {
    if (open && shipment) {
      setFormData({
        company_id: selectedCompanyId,
        export_id: shipment.export_id || "",
        shipment_id: shipment.id || "",
        booking_number: shipment.tracking_number || "",
        container_number: shipment.container_number || "",
        seal_number: "",
        exporter: formData.exporter,
        consignee: {
          name: shipment.customer_name || "",
          address_street: shipment.destination_location || "",
          postal_code: "",
          city_country: shipment.destination_country || "",
          telephone: shipment.customer_phone || "",
          email: "",
          tax_id_passport: ""
        },
        commodity: shipment.cargo_description || "",
        weight: shipment.total_weight || 0,
        value: shipment.cargo_value || 0,
        vehicles: [],
        status: "draft"
      });
      setViewMode(false);
      setSavedData(null);
    }
  }, [open, shipment, selectedCompanyId]);

  const handleCompanySelect = (companyId) => {
    const company = companies.find(c => c.id === companyId);
    setSelectedCompany(company);
    if (company) {
      setFormData({
        ...formData,
        exporter: {
          name: company.name || "",
          tax_id: company.tax_id || "",
          address_postal: company.address || "",
          city_province: `${company.city || ""}, ${company.province || ""}, ${company.country || ""}`,
          telephone: company.phone || "",
          email: company.email || ""
        }
      });
    }
  };

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    setSelectedCustomer(customer);
    if (customer) {
      setFormData({
        ...formData,
        consignee: {
          name: customer.full_name || "",
          address_street: customer.address || "",
          postal_code: "",
          city_country: `${customer.city || ""}, ${customer.country || ""}`,
          telephone: customer.phone || "",
          email: customer.email || "",
          tax_id_passport: customer.tax_id || ""
        }
      });
    }
  };

  const handleExportSelect = (exportId) => {
    const exportOrder = exports?.find(e => e.id === exportId);
    if (exportOrder) {
      const exportVehicles = (exportOrder.items || [])
        .filter(item => item.description && item.value)
        .map(item => ({
          year: "",
          make_model: item.description || "",
          vin: "",
          weight: 0,
          value: item.value || 0,
          saved: false
        }));

      setFormData({
        ...formData,
        export_id: exportId,
        consignee: {
          ...formData.consignee,
          name: exportOrder.customer_name || "",
          city_country: exportOrder.destination_country || "",
          telephone: exportOrder.customer_phone || "",
          email: exportOrder.customer_email || ""
        },
        commodity: exportOrder.items?.map(i => i.description).join(', ') || "",
        value: exportOrder.total_value || 0,
        vehicles: exportVehicles
      });
      toast.success("Export order data loaded!");
    }
  };

  const handleVehicleSelect = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      const newVehicle = {
        year: vehicle.year || "",
        make_model: `${vehicle.make} ${vehicle.model}`,
        vin: vehicle.vin || "",
        weight: vehicle.weight || 0,
        value: vehicle.selling_price || 0,
        saved: false
      };
      setFormData({
        ...formData,
        vehicles: [...formData.vehicles, newVehicle]
      });
    }
  };

  const addVehicle = () => {
    setFormData({
      ...formData,
      vehicles: [...formData.vehicles, { year: "", make_model: "", vin: "", weight: 0, value: 0, saved: false }]
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
    updated[index] = { ...updated[index], [field]: value, saved: false };
    setFormData({ ...formData, vehicles: updated });
  };

  const saveVehicle = (index) => {
    const vehicle = formData.vehicles[index];
    if (!vehicle.year || !vehicle.make_model || !vehicle.vin) {
      toast.error("Please fill in Year, Make & Model, and VIN Number");
      return;
    }
    
    const updated = [...formData.vehicles];
    updated[index] = { ...updated[index], saved: true };
    setFormData({ ...formData, vehicles: updated });
    toast.success("Vehicle information saved!");
  };

  const handleSaveDeclaration = () => {
    setSavedData(formData);
    setViewMode(true);
    onSave(formData);
    toast.success("Loading declaration saved successfully!");
  };

  const handleEmailDeclaration = async () => {
    if (!recipientEmail) {
      toast.error("Please enter recipient email address");
      return;
    }

    if (!formData.booking_number) {
      toast.error("Booking number is required");
      return;
    }

    setIsSending(true);
    
    try {
      const emailBody = `
Loading Declaration

Booking Number: ${formData.booking_number}
Container Number: ${formData.container_number || 'N/A'}
Seal Number: ${formData.seal_number || 'N/A'}

EXPORTER INFORMATION:
Name: ${formData.exporter.name}
Tax ID: ${formData.exporter.tax_id}
Address: ${formData.exporter.address_postal}
City/Province: ${formData.exporter.city_province}
Telephone: ${formData.exporter.telephone}
Email: ${formData.exporter.email}

CONSIGNEE INFORMATION:
Name: ${formData.consignee.name}
Address: ${formData.consignee.address_street}
Postal Code: ${formData.consignee.postal_code}
City/Country: ${formData.consignee.city_country}
Telephone: ${formData.consignee.telephone}
Email: ${formData.consignee.email}
Tax ID/Passport: ${formData.consignee.tax_id_passport}

COMMODITY INFORMATION:
Commodity: ${formData.commodity}
Total Weight: ${formData.weight} kg
Total Value: $${formData.value}

${formData.vehicles.length > 0 ? `
VEHICLE INFORMATION:
${formData.vehicles.map((v, i) => `
Vehicle ${i + 1}:
  Year: ${v.year}
  Make/Model: ${v.make_model}
  VIN: ${v.vin}
  Weight: ${v.weight} kg
  Value: $${v.value}
`).join('\n')}
` : ''}

---
This is an automated message from eFinAuto Center Freight Management System.
      `;

      await base44.integrations.Core.SendEmail({
        to: recipientEmail,
        subject: `Loading Declaration - ${formData.booking_number}`,
        body: emailBody
      });

      toast.success("Loading declaration sent successfully!");
      setRecipientEmail("");
    } catch (error) {
      console.error('Email error:', error);
      toast.error("Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  if (viewMode && savedData) {
    // Calculate totals from vehicles
    const totalWeight = savedData.vehicles.reduce((sum, v) => sum + (parseFloat(v.weight) || 0), 0);
    const totalValue = savedData.vehicles.reduce((sum, v) => sum + (parseFloat(v.value) || 0), 0);

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Loading Declaration - Saved</span>
              <Button
                onClick={() => setViewMode(false)}
                variant="outline"
                size="sm"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Header Section */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600">Booking Number</Label>
                    <p className="font-semibold">{savedData.booking_number}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Container Number</Label>
                    <p className="font-semibold">{savedData.container_number || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Seal Number</Label>
                    <p className="font-semibold">{savedData.seal_number || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Exporter & Consignee */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Exporter</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <Label className="text-xs text-gray-600">Name</Label>
                      <p className="font-medium">{savedData.exporter.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Tax ID</Label>
                      <p className="font-medium">{savedData.exporter.tax_id}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Address</Label>
                      <p className="font-medium">{savedData.exporter.address_postal}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">City & Province</Label>
                      <p className="font-medium">{savedData.exporter.city_province}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Contact</Label>
                      <p className="font-medium">{savedData.exporter.telephone}</p>
                      <p className="font-medium text-blue-600">{savedData.exporter.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Consignee</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <Label className="text-xs text-gray-600">Name</Label>
                      <p className="font-medium">{savedData.consignee.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Address</Label>
                      <p className="font-medium">{savedData.consignee.address_street}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Postal Code</Label>
                      <p className="font-medium">{savedData.consignee.postal_code}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">City & Country</Label>
                      <p className="font-medium">{savedData.consignee.city_country}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Contact</Label>
                      <p className="font-medium">{savedData.consignee.telephone}</p>
                      <p className="font-medium text-blue-600">{savedData.consignee.email}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Tax ID / Passport</Label>
                      <p className="font-medium">{savedData.consignee.tax_id_passport}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Commodity Information - Table Format */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 text-lg">Commodity Information</h3>
                
                {savedData.vehicles.length > 0 && (
                  <div className="mb-4">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">YR</th>
                          <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">MAKE & MODEL</th>
                          <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">VIN NUMBER</th>
                          <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">WEIGHT</th>
                          <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">VALUE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {savedData.vehicles.map((vehicle, index) => (
                          <tr key={index}>
                            <td className="border border-gray-300 px-3 py-2">{vehicle.year}</td>
                            <td className="border border-gray-300 px-3 py-2">{vehicle.make_model}</td>
                            <td className="border border-gray-300 px-3 py-2">{vehicle.vin}</td>
                            <td className="border border-gray-300 px-3 py-2 text-right">{vehicle.weight}</td>
                            <td className="border border-gray-300 px-3 py-2 text-right">${vehicle.value?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <Label className="text-xs text-gray-600">Commodity</Label>
                    <p className="font-medium">{savedData.commodity || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Total Weight</Label>
                    <p className="font-medium">{totalWeight} kg</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Total Value</Label>
                    <p className="font-medium text-green-600">${totalValue?.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Section */}
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email to Shipping Company
                </h3>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      type="email"
                      placeholder="Enter shipping company email address"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleEmailDeclaration}
                    disabled={isSending || !recipientEmail}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Email
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
                <div className="space-y-2 col-span-3">
                  <Label>Link to Export Order (Optional)</Label>
                  <Select value={formData.export_id} onValueChange={handleExportSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select export order..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(exports || []).map(exp => (
                        <SelectItem key={exp.id} value={exp.id}>
                          {exp.export_number} - {exp.customer_name} → {exp.destination_country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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

          {/* Exporter & Consignee - Moved Above Commodity */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Exporter */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Exporter</h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Select Company</Label>
                    <Select onValueChange={handleCompanySelect} value={selectedCompany?.id}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose company..." />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map(company => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                    <Label>Select Customer</Label>
                    <Select onValueChange={handleCustomerSelect} value={selectedCustomer?.id}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose customer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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

          {/* Commodity Information - Now Below Exporter/Consignee */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4">Commodity Information</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Commodity</Label>
                  <Textarea
                    value={formData.commodity}
                    onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                    rows={2}
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
                <div className="flex gap-2">
                  <Select onValueChange={handleVehicleSelect}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select from in-stock vehicles" />
                    </SelectTrigger>
                    <SelectContent>
                      {inStockVehicles.map(vehicle => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.year} {vehicle.make} {vehicle.model} - {vehicle.vin}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={addVehicle} size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Vehicle
                  </Button>
                </div>
              </div>

              {formData.vehicles.length > 0 && (
                <div className="space-y-3">
                  {formData.vehicles.map((vehicle, index) => (
                    <div key={index} className="space-y-3">
                      <div className="flex gap-3 items-start border rounded-lg p-3 bg-gray-50">
                        <div className="grid grid-cols-5 gap-3 flex-1">
                          <div className="space-y-1">
                            <Label className="text-xs">Year</Label>
                            <Input
                              type="number"
                              value={vehicle.year}
                              onChange={(e) => updateVehicle(index, 'year', parseInt(e.target.value) || "")}
                              placeholder="2020"
                              disabled={vehicle.saved}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Make & Model</Label>
                            <Input
                              value={vehicle.make_model}
                              onChange={(e) => updateVehicle(index, 'make_model', e.target.value)}
                              placeholder="Toyota Camry"
                              disabled={vehicle.saved}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">VIN Number</Label>
                            <Input
                              value={vehicle.vin}
                              onChange={(e) => updateVehicle(index, 'vin', e.target.value)}
                              placeholder="VIN"
                              disabled={vehicle.saved}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Weight (kg)</Label>
                            <Input
                              type="number"
                              value={vehicle.weight}
                              onChange={(e) => updateVehicle(index, 'weight', parseFloat(e.target.value) || 0)}
                              disabled={vehicle.saved}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Value ($)</Label>
                            <Input
                              type="number"
                              value={vehicle.value}
                              onChange={(e) => updateVehicle(index, 'value', parseFloat(e.target.value) || 0)}
                              disabled={vehicle.saved}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-5">
                          {!vehicle.saved ? (
                            <Button
                              type="button"
                              size="icon"
                              onClick={() => saveVehicle(index)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                const updated = [...formData.vehicles];
                                updated[index] = { ...updated[index], saved: false };
                                setFormData({ ...formData, vehicles: updated });
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeVehicle(index)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                      
                      {index === formData.vehicles.length -1 && vehicle.saved && (
                        <div className="flex justify-end">
                            <Button 
                              onClick={addVehicle} 
                              size="sm" 
                              variant="outline"
                              className="text-blue-600 border-blue-600 hover:bg-blue-50"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Vehicle
                            </Button>
                        </div>
                      )}
                      
                    </div>
                  ))}
                </div>
              )}
              {formData.vehicles.length === 0 && (
                <div className="flex justify-end">
                  <Button 
                    onClick={addVehicle} 
                    size="sm" 
                    variant="outline"
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Vehicle
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Section */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email to Shipping Company
              </h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="Enter shipping company email address"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleEmailDeclaration}
                  disabled={isSending || !recipientEmail}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Email
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSaveDeclaration} className="bg-blue-600 hover:bg-blue-700">
            Save Loading Declaration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}