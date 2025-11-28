import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Mail, Loader2, Edit, Save, Printer, Download, Share2, X, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCompany } from "@/components/shared/CompanyContext";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function LoadingDeclarationDialog({ open, onClose, shipment, onSave, exports }) {
  const { selectedCompanyId } = useCompany();
  const [isSending, setIsSending] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [viewMode, setViewMode] = useState(false);
  const [savedData, setSavedData] = useState(null);

  const { data: selectedCompanyData } = useQuery({
    queryKey: ['company', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return null;
      const companies = await base44.entities.Company.filter({ id: selectedCompanyId });
      return companies[0] || null;
    },
    enabled: open && !!selectedCompanyId,
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
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  
  const [formData, setFormData] = useState({
    company_id: selectedCompanyId,
    export_id: "",
    export_ids: [],
    shipment_id: shipment?.id || "",
    booking_number: shipment?.tracking_number || "",
    container_number: shipment?.container_number || "",
    seal_number: shipment?.seal_number || "",
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

  const [selectedExportIds, setSelectedExportIds] = useState([]);
  const [existingDeclaration, setExistingDeclaration] = useState(null);

  // Check for existing declaration when shipment is selected
  React.useEffect(() => {
    const checkExistingDeclaration = async () => {
      if (open && shipment?.id) {
        try {
          const existing = await base44.entities.LoadingDeclaration.filter({ 
            shipment_id: shipment.id 
          });
          if (existing && existing.length > 0) {
            setExistingDeclaration(existing[0]);
            // Load existing declaration data
            const decl = existing[0];
            setFormData({
              ...decl,
              company_id: selectedCompanyId
            });
            setSelectedExportIds(decl.export_ids || (decl.export_id ? [decl.export_id] : []));
            setSavedData(decl);
            setViewMode(true);
            toast.info("Existing loading declaration found for this shipment");
            return;
          }
        } catch (error) {
          console.error("Error checking existing declaration:", error);
        }
        setExistingDeclaration(null);
      }
    };
    
    checkExistingDeclaration();
  }, [open, shipment?.id, selectedCompanyId]);

  React.useEffect(() => {
    if (open && shipment && !existingDeclaration) {
      setFormData({
        company_id: selectedCompanyId,
        export_id: shipment.export_id || "",
        export_ids: shipment.export_id ? [shipment.export_id] : [],
        shipment_id: shipment.id || "",
        shipment_number: shipment.shipment_number || "",
        booking_number: shipment.tracking_number || "",
        container_number: shipment.container_number || "",
        seal_number: shipment.seal_number || "",
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
      // Auto-add export if shipment has one
      if (shipment.export_id) {
        setSelectedExportIds([shipment.export_id]);
        // Auto-populate from linked export
        const linkedExport = exports?.find(e => e.id === shipment.export_id);
        if (linkedExport) {
          setTimeout(() => handleAddExportOrder(shipment.export_id), 100);
        }
      } else {
        setSelectedExportIds([]);
      }
      setViewMode(false);
      setSavedData(null);
    }
  }, [open, shipment, selectedCompanyId, existingDeclaration]);

  // Auto-populate exporter from selected company
  React.useEffect(() => {
    if (open && selectedCompanyData) {
      setFormData(prev => ({
        ...prev,
        exporter: {
          name: selectedCompanyData.name || "",
          tax_id: selectedCompanyData.tax_id || selectedCompanyData.gst_number || "",
          address_postal: selectedCompanyData.address || "",
          city_province: `${selectedCompanyData.city || ""}, ${selectedCompanyData.province || ""}, ${selectedCompanyData.country || ""}`.replace(/^, |, $/g, ''),
          telephone: selectedCompanyData.phone || "",
          email: selectedCompanyData.email || ""
        }
      }));
    }
  }, [open, selectedCompanyData]);

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    setSelectedCustomer(customer);
    if (customer) {
      const cityCountry = [customer.city, customer.postal_code, customer.country].filter(Boolean).join(", ");
      setFormData({
        ...formData,
        consignee: {
          name: customer.full_name || "",
          address_street: customer.address || "",
          postal_code: customer.postal_code || "",
          city_country: cityCountry,
          telephone: customer.phone || "",
          email: customer.email || "",
          tax_id_passport: customer.tax_id || ""
        }
      });
    }
  };

  const extractYearFromDescription = (description) => {
    if (!description) return "";
    const yearMatch = description.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? parseInt(yearMatch[0]) : "";
  };

  const lookupVinFromVehicles = (description, year) => {
    if (!description || !vehicles || vehicles.length === 0) return "";

    const descLower = description.toLowerCase();

    // Try to find a matching vehicle by year and make/model
    for (const vehicle of vehicles) {
      if (!vehicle.vin || vehicle.vin === "MISSING_VIN" || vehicle.vin === "") continue;

      const vehicleYear = vehicle.year;
      const vehicleMake = vehicle.make?.toLowerCase() || "";
      const vehicleModel = vehicle.model?.toLowerCase() || "";

      // Check if year matches and make/model are in the description
      if (year && vehicleYear && parseInt(year) === parseInt(vehicleYear)) {
        if (vehicleMake && descLower.includes(vehicleMake)) {
          if (vehicleModel && descLower.includes(vehicleModel.split(' ')[0])) {
            return vehicle.vin;
          }
        }
      }
    }
    return "";
  };

  const handleAddExportOrder = (exportId) => {
    if (!exportId || selectedExportIds.includes(exportId)) return;

    const exportOrder = exports?.find(e => e.id === exportId);
    if (exportOrder) {
      const newExportIds = [...selectedExportIds, exportId];
      setSelectedExportIds(newExportIds);

      const exportVehicles = (exportOrder.items || [])
        .filter(item => item.description && item.value)
        .map(item => {
          // Priority 1: Use item.vin if available
          let vin = item.vin || "";

          // Priority 2: Extract VIN from description (legacy format: "2013 NISSAN ROGUE (VIN: xxx)")
          if (!vin && item.description) {
            const vinMatch = item.description.match(/\(VIN:\s*([^)]+)\)/i);
            if (vinMatch) {
              vin = vinMatch[1].trim();
            }
          }

          const year = extractYearFromDescription(item.description);

          // Priority 3: Lookup VIN from Vehicle database by matching year/make/model
          if (!vin && item.description) {
            vin = lookupVinFromVehicles(item.description, year);
          }

          return {
            year: year || "",
            make_model: item.description?.replace(/\s*\(VIN:[^)]+\)/i, '') || "",
            vin: vin,
            weight: item.weight || 0,
            value: item.value || 0,
            saved: false,
            export_id: exportId
          };
        });

      const updatedVehicles = [...formData.vehicles, ...exportVehicles];
      const totalWeight = updatedVehicles.reduce((sum, v) => sum + (parseFloat(v.weight) || 0), 0);
      const totalValue = updatedVehicles.reduce((sum, v) => sum + (parseFloat(v.value) || 0), 0);

      // Use first export's consignee if not already set
      const shouldUpdateConsignee = !formData.consignee.name;

      setFormData({
        ...formData,
        export_id: newExportIds[0], // Keep first one for legacy
        export_ids: newExportIds,
        consignee: shouldUpdateConsignee ? {
          ...formData.consignee,
          name: exportOrder.customer_name || "",
          city_country: exportOrder.destination_country || "",
          telephone: exportOrder.customer_phone || "",
          email: exportOrder.customer_email || ""
        } : formData.consignee,
        commodity: [...new Set([formData.commodity, ...(exportOrder.items?.map(i => i.description) || [])].filter(Boolean))].join(', '),
        weight: totalWeight,
        value: totalValue,
        vehicles: updatedVehicles
      });
      toast.success(`Export order ${exportOrder.export_number} added!`);
    }
  };

  // Get export numbers for display
  const getExportNumbers = () => {
    return selectedExportIds
      .map(id => exports?.find(e => e.id === id)?.export_number)
      .filter(Boolean);
  };

  const handleRemoveExportOrder = (exportId) => {
    const newExportIds = selectedExportIds.filter(id => id !== exportId);
    setSelectedExportIds(newExportIds);

    const updatedVehicles = formData.vehicles.filter(v => v.export_id !== exportId);
    const totalWeight = updatedVehicles.reduce((sum, v) => sum + (parseFloat(v.weight) || 0), 0);
    const totalValue = updatedVehicles.reduce((sum, v) => sum + (parseFloat(v.value) || 0), 0);

    setFormData({
      ...formData,
      export_id: newExportIds[0] || "",
      export_ids: newExportIds,
      weight: totalWeight,
      value: totalValue,
      vehicles: updatedVehicles
    });
    toast.success("Export order removed");
  };

  const getSelectedExports = () => {
    return selectedExportIds.map(id => exports?.find(e => e.id === id)).filter(Boolean);
  };

  const handleAIAutoFill = async () => {
    if (formData.vehicles.length === 0) {
      toast.error("No vehicles to process");
      return;
    }

    setIsAIProcessing(true);
    try {
      const vehiclesToProcess = formData.vehicles.filter(v => !v.year || !v.vin);
      
      if (vehiclesToProcess.length === 0) {
        toast.info("All vehicles already have Year and VIN");
        setIsAIProcessing(false);
        return;
      }

      const prompt = `Extract vehicle information from these descriptions. For each vehicle:
1. Extract the Year of Manufacture (4-digit year like 2013, 2020, etc.)
2. Extract the VIN (Vehicle Identification Number) if present in the description - VINs are typically 17 characters alphanumeric

Vehicles to process:
${vehiclesToProcess.map((v, i) => `${i + 1}. Description: "${v.make_model}" | Current VIN: "${v.vin || 'not set'}"`).join('\n')}

Important: 
- If a VIN is already set or found in the description, include it
- If no VIN is found, return empty string for vin
- Extract year from descriptions like "2013 NISSAN ROGUE" = year 2013`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            vehicles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "number" },
                  year: { type: "number" },
                  vin: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (response?.vehicles) {
        const updatedVehicles = [...formData.vehicles];
        let originalIndex = 0;
        let updatedCount = 0;
        
        formData.vehicles.forEach((vehicle, idx) => {
          if (!vehicle.year || !vehicle.vin) {
            const aiData = response.vehicles.find(v => v.index === originalIndex);
            if (aiData) {
              let updated = false;
              if (!vehicle.year && aiData.year) {
                updatedVehicles[idx] = { ...updatedVehicles[idx], year: aiData.year };
                updated = true;
              }
              if (!vehicle.vin && aiData.vin) {
                updatedVehicles[idx] = { ...updatedVehicles[idx], vin: aiData.vin };
                updated = true;
              }
              if (updated) updatedCount++;
            }
            originalIndex++;
          }
        });

        setFormData({ ...formData, vehicles: updatedVehicles });
        toast.success(`AI extracted data for ${updatedCount} vehicle(s)!`);
      }
    } catch (error) {
      console.error("AI processing error:", error);
      toast.error("Failed to process with AI");
    } finally {
      setIsAIProcessing(false);
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

  React.useEffect(() => {
    const totalWeight = formData.vehicles.reduce((sum, v) => sum + (parseFloat(v.weight) || 0), 0);
    const totalValue = formData.vehicles.reduce((sum, v) => sum + (parseFloat(v.value) || 0), 0);
    
    setFormData(prev => ({
      ...prev,
      weight: totalWeight,
      value: totalValue
    }));
  }, [formData.vehicles]);

  const handleSaveDeclaration = () => {
    // Add export numbers for reference
    const dataToSave = {
      ...formData,
      export_numbers: getExportNumbers()
    };
    setSavedData(dataToSave);
    setViewMode(true);
    onSave(dataToSave);
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
      const emailBody = generateEmailBody(savedData || formData);

      await base44.integrations.Core.SendEmail({
        to: recipientEmail,
        subject: `Loading Declaration - ${(savedData || formData).booking_number}`,
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

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    window.print();
    toast.success("Use your browser's print dialog to save as PDF");
  };

  const generateEmailBody = (data) => {
    return `
Loading Declaration

Booking Number: ${data.booking_number}
Container Number: ${data.container_number || 'N/A'}
Seal Number: ${data.seal_number || 'N/A'}

EXPORTER INFORMATION:
Name: ${data.exporter.name}
Tax ID: ${data.exporter.tax_id}
Address: ${data.exporter.address_postal}
City/Province: ${data.exporter.city_province}
Telephone: ${data.exporter.telephone}
Email: ${data.exporter.email}

CONSIGNEE INFORMATION:
Name: ${data.consignee.name}
Address: ${data.consignee.address_street}
Postal Code: ${data.consignee.postal_code}
City/Country: ${data.consignee.city_country}
Telephone: ${data.consignee.telephone}
Email: ${data.consignee.email}
Tax ID/Passport: ${data.consignee.tax_id_passport}

COMMODITY INFORMATION:
Commodity: ${data.commodity}
Total Weight: ${data.weight} kg
Total Value: $${data.value}

${data.vehicles.length > 0 ? `
VEHICLE INFORMATION:
${data.vehicles.map((v, i) => `
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
  };

  if (viewMode && savedData) {
    const totalWeight = savedData.vehicles.reduce((sum, v) => sum + (parseFloat(v.weight) || 0), 0);
    const totalValue = savedData.vehicles.reduce((sum, v) => sum + (parseFloat(v.value) || 0), 0);

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <style>{`
          @media print {
            @page {
              size: A4;
              margin: 15mm;
            }
            
            /* Hide everything except the print content */
            body > *:not(#loading-declaration-print) {
              display: none !important;
            }
            
            /* Hide dialog overlay and backdrop */
            [role="dialog"],
            [data-radix-popper-content-wrapper],
            .fixed.inset-0 {
              all: unset !important;
              position: static !important;
              transform: none !important;
            }
            
            #loading-declaration-print {
              display: block !important;
              position: static !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }
            
            .no-print {
              display: none !important;
            }
            
            .print-title {
              text-align: center;
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 20px;
            }
            
            .print-section {
              margin-bottom: 15px;
              page-break-inside: avoid;
            }
            
            .print-header {
              background-color: #eff6ff !important;
              padding: 10px !important;
              border: 1px solid #ddd;
              margin-bottom: 15px;
            }
            
            .print-card {
              border: 1px solid #ddd;
              padding: 10px !important;
              margin-bottom: 10px;
              background: white;
            }
            
            .print-grid-2 {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
            }
            
            .print-grid-3 {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 10px;
            }
            
            .print-label {
              font-size: 10px !important;
              color: #666 !important;
              margin-bottom: 3px;
            }
            
            .print-value {
              font-size: 12px !important;
              font-weight: 500;
            }
            
            .print-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px !important;
              margin-top: 10px;
            }
            
            .print-table th,
            .print-table td {
              border: 1px solid #999;
              padding: 6px 8px !important;
            }
            
            .print-table th {
              background-color: #f3f4f6 !important;
              font-weight: 600;
            }
            
            h3 {
              font-size: 14px !important;
              margin-bottom: 8px !important;
            }
          }
        `}</style>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="no-print">
            <DialogTitle className="flex items-center justify-between">
              <span>Loading Declaration - Saved</span>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share / Print
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handlePrint}>
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadPDF}>
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  onClick={() => setViewMode(false)}
                  variant="outline"
                  size="sm"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4" id="loading-declaration-print">
            <h1 className="print-title">Loading Declaration</h1>
            
            {/* Header Section */}
            <Card className="bg-blue-50 border-blue-200 print-header print-section">
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4 print-grid-3">
                  <div>
                    <Label className="text-xs text-gray-600 print-label">Booking Number</Label>
                    <p className="font-semibold print-value">{savedData.booking_number}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 print-label">Container Number</Label>
                    <p className="font-semibold print-value">{savedData.container_number || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 print-label">Seal Number</Label>
                    <p className="font-semibold print-value">{savedData.seal_number || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Exporter & Consignee */}
            <div className="grid md:grid-cols-2 gap-6 print-grid-2 print-section">
              <Card className="print-card">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Exporter</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <Label className="text-xs text-gray-600 print-label">Name</Label>
                      <p className="font-medium print-value">{savedData.exporter.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 print-label">Tax ID</Label>
                      <p className="font-medium print-value">{savedData.exporter.tax_id}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 print-label">Address</Label>
                      <p className="font-medium print-value">{savedData.exporter.address_postal}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 print-label">City & Province</Label>
                      <p className="font-medium print-value">{savedData.exporter.city_province}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 print-label">Contact</Label>
                      <p className="font-medium print-value">{savedData.exporter.telephone}</p>
                      <p className="font-medium print-value">{savedData.exporter.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="print-card">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Consignee</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <Label className="text-xs text-gray-600 print-label">Name</Label>
                      <p className="font-medium print-value">{savedData.consignee.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 print-label">Address</Label>
                      <p className="font-medium print-value">{savedData.consignee.address_street}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 print-label">Postal Code</Label>
                      <p className="font-medium print-value">{savedData.consignee.postal_code}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 print-label">City & Country</Label>
                      <p className="font-medium print-value">{savedData.consignee.city_country}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 print-label">Contact</Label>
                      <p className="font-medium print-value">{savedData.consignee.telephone}</p>
                      <p className="font-medium print-value">{savedData.consignee.email}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 print-label">Tax ID / Passport</Label>
                      <p className="font-medium print-value">{savedData.consignee.tax_id_passport}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Commodity Information - Table Format */}
            <Card className="print-card print-section">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 text-lg">Commodity Information</h3>
                
                {savedData.vehicles.length > 0 && (
                  <div className="mb-4">
                    <table className="w-full border-collapse border border-gray-300 print-table">
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

                <div className="grid grid-cols-3 gap-4 mt-4 print-grid-3">
                  <div>
                    <Label className="text-xs text-gray-600 print-label">Commodity</Label>
                    <p className="font-medium print-value">{savedData.commodity || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 print-label">Total Weight</Label>
                    <p className="font-medium print-value">{savedData.weight || totalWeight} kg</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600 print-label">Total Value</Label>
                    <p className="font-medium print-value">${savedData.value || totalValue?.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Section */}
            <Card className="border-blue-200 bg-blue-50/50 no-print">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email PDF to Shipping Company
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

          <div className="flex justify-end no-print">
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
                {formData.shipment_number && (
                  <div className="col-span-3 bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                    <p className="text-sm text-blue-700">
                      <strong>Shipment:</strong> {formData.shipment_number}
                      {formData.shipment_id && <span className="text-blue-500 ml-2">(Linked)</span>}
                    </p>
                  </div>
                )}

                <div className="space-y-2 col-span-3">
                    <Label>Link to Export Orders (Multiple)</Label>
                    <Select onValueChange={handleAddExportOrder} value="">
                      <SelectTrigger>
                        <SelectValue placeholder="Add export order..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(exports || [])
                          .filter(exp => !selectedExportIds.includes(exp.id))
                          .map(exp => (
                            <SelectItem key={exp.id} value={exp.id}>
                              {exp.export_number} - {exp.customer_name} → {exp.destination_country}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  
                  {selectedExportIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {getSelectedExports().map(exp => (
                        <Badge 
                          key={exp.id} 
                          variant="secondary"
                          className="flex items-center gap-1 py-1 px-2"
                        >
                          <span>{exp.export_number} - {exp.customer_name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveExportOrder(exp.id)}
                            className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
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

          {/* Exporter & Consignee */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Exporter */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Exporter</h3>
                <div className="space-y-3">
                  {selectedCompanyData && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <p className="text-sm text-blue-700 font-medium">{selectedCompanyData.name}</p>
                      <p className="text-xs text-blue-600">Selected Company (Auto-populated)</p>
                    </div>
                  )}
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

          {/* Commodity Information */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4">Commodity Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Commodity</Label>
                  <Textarea
                    value={formData.commodity}
                    onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Weight (kg)</Label>
                  <Input
                    type="number"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Value ($)</Label>
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
                <div className="flex gap-2">
                  {formData.vehicles.length > 0 && (
                    <Button 
                      onClick={handleAIAutoFill} 
                      size="sm" 
                      variant="outline"
                      disabled={isAIProcessing}
                      className="border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      {isAIProcessing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      AI Auto-Fill
                    </Button>
                  )}
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