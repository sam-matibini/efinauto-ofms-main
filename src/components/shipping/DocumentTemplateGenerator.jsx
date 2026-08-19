import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, Download, Printer, Send, Loader2, Sparkles,
  Ship, Package, Car, User, MapPin, Calendar, DollarSign
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import VehicleSelector from "./VehicleSelector";

const templateTypes = [
  { id: 'export_order', name: 'Export Order', icon: '📤' },
  { id: 'loading_declaration', name: 'Loading Declaration', icon: '📦' },
  { id: 'bill_of_lading', name: 'Bill of Lading (B/L)', icon: '📜' },
  { id: 'packing_list', name: 'Packing List', icon: '📝' }
];

export default function DocumentTemplateGenerator({ 
  open, 
  onClose, 
  onSave,
  shipments = [], 
  containers = [], 
  vehicles = [],
  customers = [],
  exports = [],
  company
}) {
  const [templateType, setTemplateType] = useState('export_order');
  const [formData, setFormData] = useState({});
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const printRef = useRef();

  const initializeForm = (type) => {
    const baseData = {
      document_number: generateDocumentNumber(type),
      date: new Date().toISOString().split('T')[0],
      shipment_id: '',
      container_id: '',
      status: 'draft'
    };

    switch (type) {
      case 'loading_declaration':
        return {
          ...baseData,
          booking_number: '',
          container_number: '',
          seal_number: '',
          exporter: {
            name: company?.name || '',
            tax_id: company?.tax_id || '',
            address: company?.address || '',
            city: company?.city || '',
            phone: company?.phone || '',
            email: company?.email || ''
          },
          consignee: {
            name: '',
            address: '',
            city: '',
            country: '',
            phone: '',
            email: '',
            tax_id: ''
          },
          commodity: 'Used Motor Vehicles',
          total_weight: 0,
          total_value: 0
        };
      
      case 'bill_of_lading':
        return {
          ...baseData,
          bl_number: '',
          shipper: {
            name: company?.name || '',
            address: company?.address || '',
            city: company?.city || ''
          },
          consignee: {
            name: '',
            address: '',
            city: '',
            country: ''
          },
          notify_party: {
            name: '',
            address: ''
          },
          vessel_name: '',
          voyage_number: '',
          port_of_loading: '',
          port_of_discharge: '',
          place_of_delivery: '',
          freight_terms: 'prepaid',
          container_number: '',
          seal_number: '',
          gross_weight: 0,
          measurement: '',
          freight_charges: 0
        };
      
      case 'packing_list':
        return {
          ...baseData,
          shipper: {
            name: company?.name || '',
            address: company?.address || ''
          },
          consignee: {
            name: '',
            address: '',
            country: ''
          },
          container_number: '',
          seal_number: '',
          total_packages: 0,
          total_gross_weight: 0,
          total_net_weight: 0,
          total_volume: ''
        };
      
      case 'export_order':
        return {
          ...baseData,
          export_number: generateDocumentNumber('EXP'),
          customer_name: '',
          customer_phone: '',
          customer_email: '',
          destination_country: '',
          destination_port: '',
          payment_terms: 'advance',
          total_value: 0,
          freight_cost: 0,
          insurance_cost: 0,
          notes: ''
        };
      
      default:
        return baseData;
    }
  };

  const generateDocumentNumber = (type) => {
    const prefixes = {
      loading_declaration: 'LD',
      bill_of_lading: 'BL',
      packing_list: 'PL',
      export_order: 'EXP'
    };
    const prefix = prefixes[type] || 'DOC';
    const year = new Date().getFullYear().toString().slice(-2);
    const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
    return `${prefix}${year}-${random}`;
  };

  React.useEffect(() => {
    if (open) {
      setFormData(initializeForm(templateType));
      setSelectedVehicles([]);
      setPreviewMode(false);
    }
  }, [open, templateType]);

  const handleShipmentSelect = (shipmentId) => {
    const shipment = shipments.find(s => s.id === shipmentId);
    if (shipment) {
      setFormData(prev => ({
        ...prev,
        shipment_id: shipmentId,
        container_number: shipment.container_number || prev.container_number,
        consignee: {
          ...prev.consignee,
          name: shipment.customer_name || '',
          country: shipment.destination_country || ''
        },
        destination_country: shipment.destination_country,
        port_of_discharge: shipment.destination_location,
        vessel_name: shipment.carrier_name
      }));
    }
  };

  const handleContainerSelect = (containerId) => {
    const container = containers.find(c => c.id === containerId);
    if (container) {
      setFormData(prev => ({
        ...prev,
        container_id: containerId,
        container_number: container.container_number,
        seal_number: container.seal_number || '',
        vessel_name: container.vessel_name || prev.vessel_name,
        bl_number: container.bl_number || ''
      }));
      if (container.vehicle_ids?.length) {
        setSelectedVehicles(container.vehicle_ids);
      }
    }
  };

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        consignee: {
          name: customer.full_name || customer.company_name || '',
          address: customer.address || '',
          city: customer.city || '',
          country: customer.country || '',
          phone: customer.phone || '',
          email: customer.email || '',
          tax_id: customer.tax_id || ''
        },
        customer_name: customer.full_name || customer.company_name || '',
        customer_phone: customer.phone || '',
        customer_email: customer.email || ''
      }));
    }
  };

  const calculateTotals = () => {
    const selectedVehicleData = vehicles.filter(v => selectedVehicles.includes(v.id));
    const totalWeight = selectedVehicleData.reduce((sum, v) => sum + (v.weight || 1500), 0);
    const totalValue = selectedVehicleData.reduce((sum, v) => sum + (v.selling_price || v.purchase_price || 0), 0);
    
    setFormData(prev => ({
      ...prev,
      total_weight: totalWeight,
      total_value: totalValue,
      gross_weight: totalWeight,
      total_gross_weight: totalWeight,
      total_packages: selectedVehicles.length
    }));
  };

  React.useEffect(() => {
    if (selectedVehicles.length > 0) {
      calculateTotals();
    }
  }, [selectedVehicles]);

  const generateWithAI = async () => {
    setGenerating(true);
    try {
      const selectedVehicleData = vehicles.filter(v => selectedVehicles.includes(v.id));
      
      const response = await supabase.integrations.Core.InvokeLLM({
        prompt: `Generate professional shipping document content for a ${templateTypes.find(t => t.id === templateType)?.name}.

Company: ${company?.name || 'N/A'}
Consignee: ${formData.consignee?.name || 'N/A'}
Destination: ${formData.consignee?.country || formData.destination_country || 'N/A'}
Container: ${formData.container_number || 'N/A'}
Vehicles: ${selectedVehicleData.map(v => `${v.year} ${v.make} ${v.model} (VIN: ${v.vin})`).join(', ') || 'N/A'}
Total Weight: ${formData.total_weight || 0} kg
Total Value: $${formData.total_value || 0}

Generate appropriate descriptions, terms, and conditions for this document type. Include standard shipping clauses.`,
        response_json_schema: {
          type: "object",
          properties: {
            description_of_goods: { type: "string" },
            marks_and_numbers: { type: "string" },
            terms_and_conditions: { type: "array", items: { type: "string" } },
            special_instructions: { type: "string" },
            commodity_description: { type: "string" }
          }
        }
      });

      setFormData(prev => ({
        ...prev,
        description_of_goods: response.description_of_goods,
        marks_and_numbers: response.marks_and_numbers,
        terms_and_conditions: response.terms_and_conditions,
        special_instructions: response.special_instructions,
        commodity: response.commodity_description || prev.commodity
      }));

      toast.success("AI content generated!");
    } catch (error) {
      toast.error("Failed to generate content");
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (printContent) {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>${templateTypes.find(t => t.id === templateType)?.name}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin: 10px 0; }
              th, td { border: 1px solid #000; padding: 8px; text-align: left; }
              th { background-color: #f0f0f0; }
              .header { text-align: center; margin-bottom: 20px; }
              .section { margin: 15px 0; }
              .label { font-weight: bold; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>${printContent.innerHTML}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleSave = async () => {
    const selectedVehicleData = vehicles.filter(v => selectedVehicles.includes(v.id));
    
    const documentData = {
      document_type: templateType,
      document_number: formData.document_number,
      title: `${templateTypes.find(t => t.id === templateType)?.name} - ${formData.document_number}`,
      ...formData,
      vehicles: selectedVehicleData.map(v => ({
        id: v.id,
        year: v.year,
        make: v.make,
        model: v.model,
        vin: v.vin,
        weight: v.weight || 1500,
        value: v.selling_price || v.purchase_price || 0
      })),
      vehicle_count: selectedVehicles.length
    };

    onSave(documentData);
  };

  const selectedVehicleData = vehicles.filter(v => selectedVehicles.includes(v.id));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Generate Shipping Document
          </DialogTitle>
        </DialogHeader>

        <Tabs value={templateType} onValueChange={setTemplateType} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-4 mb-4">
            {templateTypes.map(t => (
              <TabsTrigger key={t.id} value={t.id} className="text-xs">
                <span className="mr-1">{t.icon}</span>
                {t.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-[60vh]">
              {!previewMode ? (
                <div className="space-y-6 pr-4">
                  {/* Common Fields */}
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Document Info
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Document #</Label>
                          <Input value={formData.document_number || ''} onChange={(e) => setFormData({...formData, document_number: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Date</Label>
                          <Input type="date" value={formData.date || ''} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select value={formData.status || 'draft'} onValueChange={(v) => setFormData({...formData, status: v})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Link to Existing Records */}
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Package className="w-4 h-4" /> Link to Records
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Shipment</Label>
                          <Select value={formData.shipment_id || ''} onValueChange={handleShipmentSelect}>
                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                              {shipments.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.shipment_number} - {s.customer_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Container</Label>
                          <Select value={formData.container_id || ''} onValueChange={handleContainerSelect}>
                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                              {containers.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.container_number}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Customer</Label>
                          <Select onValueChange={handleCustomerSelect}>
                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                              {customers.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.full_name || c.company_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Shipper/Exporter */}
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <User className="w-4 h-4" /> Shipper / Exporter
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Company Name</Label>
                          <Input value={formData.exporter?.name || formData.shipper?.name || ''} 
                            onChange={(e) => setFormData({...formData, 
                              exporter: {...formData.exporter, name: e.target.value},
                              shipper: {...formData.shipper, name: e.target.value}
                            })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Tax ID / Registration</Label>
                          <Input value={formData.exporter?.tax_id || ''} 
                            onChange={(e) => setFormData({...formData, exporter: {...formData.exporter, tax_id: e.target.value}})} />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label>Address</Label>
                          <Input value={formData.exporter?.address || formData.shipper?.address || ''} 
                            onChange={(e) => setFormData({...formData, 
                              exporter: {...formData.exporter, address: e.target.value},
                              shipper: {...formData.shipper, address: e.target.value}
                            })} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Consignee */}
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Consignee
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input value={formData.consignee?.name || ''} 
                            onChange={(e) => setFormData({...formData, consignee: {...formData.consignee, name: e.target.value}})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Country</Label>
                          <Input value={formData.consignee?.country || ''} 
                            onChange={(e) => setFormData({...formData, consignee: {...formData.consignee, country: e.target.value}})} />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label>Address</Label>
                          <Input value={formData.consignee?.address || ''} 
                            onChange={(e) => setFormData({...formData, consignee: {...formData.consignee, address: e.target.value}})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input value={formData.consignee?.phone || ''} 
                            onChange={(e) => setFormData({...formData, consignee: {...formData.consignee, phone: e.target.value}})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input value={formData.consignee?.email || ''} 
                            onChange={(e) => setFormData({...formData, consignee: {...formData.consignee, email: e.target.value}})} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Shipping Details */}
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Ship className="w-4 h-4" /> Shipping Details
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Container #</Label>
                          <Input value={formData.container_number || ''} 
                            onChange={(e) => setFormData({...formData, container_number: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Seal #</Label>
                          <Input value={formData.seal_number || ''} 
                            onChange={(e) => setFormData({...formData, seal_number: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Vessel Name</Label>
                          <Input value={formData.vessel_name || ''} 
                            onChange={(e) => setFormData({...formData, vessel_name: e.target.value})} />
                        </div>
                        {templateType === 'bill_of_lading' && (
                          <>
                            <div className="space-y-2">
                              <Label>Port of Loading</Label>
                              <Input value={formData.port_of_loading || ''} 
                                onChange={(e) => setFormData({...formData, port_of_loading: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                              <Label>Port of Discharge</Label>
                              <Input value={formData.port_of_discharge || ''} 
                                onChange={(e) => setFormData({...formData, port_of_discharge: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                              <Label>Freight Terms</Label>
                              <Select value={formData.freight_terms || 'prepaid'} onValueChange={(v) => setFormData({...formData, freight_terms: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="prepaid">Prepaid</SelectItem>
                                  <SelectItem value="collect">Collect</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Vehicles */}
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Car className="w-4 h-4" /> Vehicles / Cargo
                      </h3>
                      <VehicleSelector
                        vehicles={vehicles}
                        selectedVehicles={selectedVehicles}
                        onSelectionChange={setSelectedVehicles}
                        multiple={true}
                        placeholder="Search and select vehicles..."
                        showFilters={true}
                      />
                      
                      {selectedVehicleData.length > 0 && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Total Vehicles</p>
                              <p className="font-bold text-lg">{selectedVehicleData.length}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Total Weight</p>
                              <p className="font-bold text-lg">{formData.total_weight?.toLocaleString()} kg</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Total Value</p>
                              <p className="font-bold text-lg">${formData.total_value?.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* AI Generate Button */}
                  <div className="flex justify-center">
                    <Button variant="outline" onClick={generateWithAI} disabled={generating} className="border-purple-300">
                      {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                      Generate Content with AI
                    </Button>
                  </div>

                  {/* Additional Notes */}
                  {formData.description_of_goods && (
                    <Card>
                      <CardContent className="p-4 space-y-4">
                        <h3 className="font-semibold">AI Generated Content</h3>
                        <div className="space-y-2">
                          <Label>Description of Goods</Label>
                          <Textarea value={formData.description_of_goods || ''} 
                            onChange={(e) => setFormData({...formData, description_of_goods: e.target.value})} rows={3} />
                        </div>
                        {formData.special_instructions && (
                          <div className="space-y-2">
                            <Label>Special Instructions</Label>
                            <Textarea value={formData.special_instructions || ''} 
                              onChange={(e) => setFormData({...formData, special_instructions: e.target.value})} rows={2} />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                /* Preview Mode */
                <div ref={printRef} className="bg-white p-6 border rounded-lg">
                  <DocumentPreview 
                    templateType={templateType}
                    formData={formData}
                    vehicles={selectedVehicleData}
                    company={company}
                  />
                </div>
              )}
            </ScrollArea>
          </div>
        </Tabs>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
              {previewMode ? 'Edit' : 'Preview'}
            </Button>
            {previewMode && (
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <FileText className="w-4 h-4 mr-2" />
              Save Document
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DocumentPreview({ templateType, formData, vehicles, company }) {
  const formatDate = (date) => date ? format(new Date(date), 'MMMM d, yyyy') : 'N/A';

  return (
    <div className="space-y-6 text-sm">
      {/* Header */}
      <div className="text-center border-b pb-4">
        <h1 className="text-2xl font-bold uppercase">
          {templateTypes.find(t => t.id === templateType)?.name}
        </h1>
        <p className="text-gray-500">Document #: {formData.document_number}</p>
        <p className="text-gray-500">Date: {formatDate(formData.date)}</p>
      </div>

      {/* Shipper / Consignee Grid */}
      <div className="grid grid-cols-2 gap-6">
        <div className="border p-4 rounded">
          <h3 className="font-bold border-b pb-2 mb-2">SHIPPER / EXPORTER</h3>
          <p className="font-semibold">{formData.exporter?.name || formData.shipper?.name}</p>
          <p>{formData.exporter?.address || formData.shipper?.address}</p>
          {formData.exporter?.tax_id && <p>Tax ID: {formData.exporter.tax_id}</p>}
          {formData.exporter?.phone && <p>Tel: {formData.exporter.phone}</p>}
        </div>
        <div className="border p-4 rounded">
          <h3 className="font-bold border-b pb-2 mb-2">CONSIGNEE</h3>
          <p className="font-semibold">{formData.consignee?.name}</p>
          <p>{formData.consignee?.address}</p>
          <p>{formData.consignee?.city}, {formData.consignee?.country}</p>
          {formData.consignee?.phone && <p>Tel: {formData.consignee.phone}</p>}
        </div>
      </div>

      {/* Shipping Details */}
      <div className="border p-4 rounded">
        <h3 className="font-bold border-b pb-2 mb-2">SHIPPING DETAILS</h3>
        <div className="grid grid-cols-3 gap-4">
          <div><strong>Container #:</strong> {formData.container_number || 'N/A'}</div>
          <div><strong>Seal #:</strong> {formData.seal_number || 'N/A'}</div>
          <div><strong>Vessel:</strong> {formData.vessel_name || 'N/A'}</div>
          {formData.port_of_loading && <div><strong>Port of Loading:</strong> {formData.port_of_loading}</div>}
          {formData.port_of_discharge && <div><strong>Port of Discharge:</strong> {formData.port_of_discharge}</div>}
        </div>
      </div>

      {/* Vehicle List */}
      {vehicles.length > 0 && (
        <div className="border p-4 rounded">
          <h3 className="font-bold border-b pb-2 mb-2">VEHICLE / CARGO DETAILS</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">#</th>
                <th className="text-left py-2">Description</th>
                <th className="text-left py-2">VIN</th>
                <th className="text-right py-2">Weight (kg)</th>
                <th className="text-right py-2">Value (USD)</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v, i) => (
                <tr key={v.id} className="border-b">
                  <td className="py-2">{i + 1}</td>
                  <td className="py-2">{v.year} {v.make} {v.model}</td>
                  <td className="py-2 font-mono text-xs">{v.vin}</td>
                  <td className="py-2 text-right">{(v.weight || 1500).toLocaleString()}</td>
                  <td className="py-2 text-right">${(v.value || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td colSpan={3} className="py-2">TOTAL ({vehicles.length} units)</td>
                <td className="py-2 text-right">{formData.total_weight?.toLocaleString()}</td>
                <td className="py-2 text-right">${formData.total_value?.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Description */}
      {formData.description_of_goods && (
        <div className="border p-4 rounded">
          <h3 className="font-bold border-b pb-2 mb-2">DESCRIPTION OF GOODS</h3>
          <p>{formData.description_of_goods}</p>
        </div>
      )}

      {/* Signature Area */}
      <div className="grid grid-cols-2 gap-6 mt-8">
        <div className="border-t pt-4">
          <p className="text-center">_______________________</p>
          <p className="text-center text-gray-500">Shipper's Signature</p>
        </div>
        <div className="border-t pt-4">
          <p className="text-center">_______________________</p>
          <p className="text-center text-gray-500">Date</p>
        </div>
      </div>
    </div>
  );
}