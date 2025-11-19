import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download, Loader2, Wand2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompany } from "@/components/shared/CompanyContext";
import { useQuery } from "@tanstack/react-query";

const defaultTemplates = {
  bill_of_lading: `Generate a professional Bill of Lading document with the following structure:

BILL OF LADING

Shipper Information:
- Include full company details, address, contact information

Consignee Information:
- Include full recipient details, address, contact information

Shipment Details:
- Container/Booking Number
- Seal Number
- Port of Loading
- Port of Discharge
- Vessel/Flight Number
- Departure Date
- Expected Arrival Date

Cargo Description:
- Detailed list of items with quantities, weights, and values
- Total weight and total value
- HS Codes if available

Terms and Conditions:
- Standard shipping terms
- Liability clauses
- Signature lines

Format as a formal shipping document.`,

  commercial_invoice: `Generate a detailed Commercial Invoice with:

COMMERCIAL INVOICE

Seller/Exporter Details:
- Complete company information

Buyer/Importer Details:
- Complete customer information

Invoice Details:
- Invoice Number
- Date
- Payment Terms
- Currency

Itemized List:
- Description of goods
- Quantity
- Unit price
- Total price per item
- HS Codes

Financial Summary:
- Subtotal
- Freight charges
- Insurance (if applicable)
- Total Invoice Value

Declaration statement and signatures.`,

  packing_list: `Generate a comprehensive Packing List including:

PACKING LIST

Shipper & Consignee Information

Container/Package Details:
- Container number(s)
- Seal number(s)
- Number of packages

Detailed Item List:
- Item description
- Quantity per package
- Weight per item
- Dimensions if applicable
- Total weight

Packing Summary:
- Total packages
- Total gross weight
- Total net weight
- Total volume

Marks and numbers on packages.`
};

export default function DocumentGenerationDialog({ open, onClose, shipment, exportOrder }) {
  const { selectedCompanyId } = useCompany();
  const [documentType, setDocumentType] = useState("bill_of_lading");
  const [customTemplate, setCustomTemplate] = useState(defaultTemplates.bill_of_lading);
  const [generatedDocument, setGeneratedDocument] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: company } = useQuery({
    queryKey: ['company', selectedCompanyId],
    queryFn: () => base44.entities.Company.filter({ id: selectedCompanyId }).then(res => res[0]),
    enabled: !!selectedCompanyId && open,
  });

  React.useEffect(() => {
    if (open) {
      setCustomTemplate(defaultTemplates[documentType]);
      setGeneratedDocument("");
    }
  }, [open, documentType]);

  const prepareShipmentData = () => {
    const data = {
      company: {
        name: company?.name || "N/A",
        logo_url: company?.logo_url || "",
        address: company?.address || "",
        city: company?.city || "",
        province: company?.province || "",
        postal_code: company?.postal_code || "",
        phone: company?.phone || "",
        email: company?.email || "",
        gst_number: company?.gst_number || "",
        dealer_permit_number: company?.dealer_permit_number || ""
      },
      shipment: {
        shipment_number: shipment?.shipment_number || "N/A",
        booking_number: shipment?.tracking_number || "N/A",
        container_number: shipment?.container_number || "N/A",
        seal_number: shipment?.seal_number || "N/A",
        origin: `${shipment?.origin_location || ""}, ${shipment?.origin_country || ""}`,
        destination: `${shipment?.destination_location || ""}, ${shipment?.destination_country || ""}`,
        departure_date: shipment?.departure_date || "N/A",
        expected_arrival: shipment?.expected_arrival || "N/A",
        carrier: shipment?.carrier_name || "N/A",
        vessel_flight: shipment?.vessel_flight_number || "N/A",
        cargo_type: shipment?.cargo_type || "N/A",
        cargo_description: shipment?.cargo_description || "N/A",
        total_weight: shipment?.total_weight || 0,
        total_volume: shipment?.total_volume || 0,
        cargo_value: shipment?.cargo_value || 0,
        freight_cost: shipment?.freight_cost || 0,
        insurance_cost: shipment?.insurance_cost || 0,
        customer_name: shipment?.customer_name || "N/A",
        customer_phone: shipment?.customer_phone || "N/A"
      },
      export: exportOrder ? {
        export_number: exportOrder.export_number || "N/A",
        customer_name: exportOrder.customer_name || "N/A",
        customer_email: exportOrder.customer_email || "N/A",
        customer_phone: exportOrder.customer_phone || "N/A",
        customer_country: exportOrder.customer_country || "N/A",
        destination_country: exportOrder.destination_country || "N/A",
        destination_port: exportOrder.destination_port || "N/A",
        destination_address: exportOrder.destination_address || "N/A",
        items: exportOrder.items || [],
        total_value: exportOrder.total_value || 0,
        freight_cost: exportOrder.freight_cost || 0,
        payment_terms: exportOrder.payment_terms || "N/A",
        payment_status: exportOrder.payment_status || "N/A"
      } : null
    };
    return data;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const shipmentData = prepareShipmentData();
      
      const prompt = `${customTemplate}

Use the following data to generate the document:

${JSON.stringify(shipmentData, null, 2)}

IMPORTANT: If company logo_url is provided, include it at the top of the document with an [IMAGE: Company Logo] placeholder followed by the company name.

Generate a complete, professional document ready for use. Include all relevant details from the provided data. Format it clearly with proper sections and professional language.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      setGeneratedDocument(response);
      toast.success("Document generated successfully!");
    } catch (error) {
      console.error('Generation error:', error);
      toast.error("Failed to generate document");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generatedDocument], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentType}_${shipment?.shipment_number || Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Document downloaded!");
  };

  const documentTypeLabels = {
    bill_of_lading: "Bill of Lading",
    commercial_invoice: "Commercial Invoice",
    packing_list: "Packing List"
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Generate Shipping Document
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">Generate Document</TabsTrigger>
            <TabsTrigger value="template">Customize Template</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bill_of_lading">Bill of Lading</SelectItem>
                    <SelectItem value="commercial_invoice">Commercial Invoice</SelectItem>
                    <SelectItem value="packing_list">Packing List</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2">Shipment Information</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>Shipment #:</strong> {shipment?.shipment_number || 'N/A'}</div>
                    <div><strong>Customer:</strong> {shipment?.customer_name || 'N/A'}</div>
                    <div><strong>Origin:</strong> {shipment?.origin_country || 'N/A'}</div>
                    <div><strong>Destination:</strong> {shipment?.destination_country || 'N/A'}</div>
                    <div><strong>Weight:</strong> {shipment?.total_weight || 0} kg</div>
                    <div><strong>Value:</strong> ${shipment?.cargo_value?.toLocaleString() || 0}</div>
                  </div>
                </CardContent>
              </Card>

              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating with AI...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate {documentTypeLabels[documentType]}
                  </>
                )}
              </Button>

              {generatedDocument && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Generated Document</Label>
                    <Button onClick={handleDownload} size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <Card>
                    <CardContent className="p-4">
                      <pre className="whitespace-pre-wrap text-sm font-mono bg-white p-4 rounded border max-h-96 overflow-y-auto">
                        {generatedDocument}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="template" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bill_of_lading">Bill of Lading</SelectItem>
                    <SelectItem value="commercial_invoice">Commercial Invoice</SelectItem>
                    <SelectItem value="packing_list">Packing List</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Template Instructions</Label>
                <Textarea
                  value={customTemplate}
                  onChange={(e) => setCustomTemplate(e.target.value)}
                  rows={15}
                  className="font-mono text-sm"
                  placeholder="Customize the document template..."
                />
              </div>

              <Button 
                onClick={() => setCustomTemplate(defaultTemplates[documentType])}
                variant="outline"
                className="w-full"
              >
                Reset to Default Template
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}