import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Send, Loader2, Plane, Package, FileText, Paperclip, Link2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function EmailComposer({ customer, customers, exports, shipments, loadingDeclarations, draft, company }) {
  const [to, setTo] = useState(customer?.email || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [template, setTemplate] = useState("");
  const [selectedExport, setSelectedExport] = useState("");
  const [selectedShipment, setSelectedShipment] = useState("");
  const [selectedDeclaration, setSelectedDeclaration] = useState("");
  const [attachExportDoc, setAttachExportDoc] = useState(false);
  const [attachShipmentDoc, setAttachShipmentDoc] = useState(false);
  const [attachDeclarationDoc, setAttachDeclarationDoc] = useState(false);
  const [generatingDocs, setGeneratingDocs] = useState(false);
  const [attachedLinks, setAttachedLinks] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [sending, setSending] = useState(false);

  React.useEffect(() => {
    if (draft) {
      setTo(draft.to || "");
      setSubject(draft.subject || "");
      setBody(draft.body || "");
    }
  }, [draft]);

  const templates = [
    { value: "welcome", label: "Welcome Email", prompt: "Write a warm welcome email to a new customer", category: "customer" },
    { value: "followup", label: "Sales Follow-up", prompt: "Write a follow-up email after a vehicle purchase", category: "customer" },
    { value: "service", label: "Service Reminder", prompt: "Write a reminder for vehicle service maintenance", category: "customer" },
    { value: "promotion", label: "Promotion", prompt: "Write a promotional email about current vehicle deals", category: "customer" },
    { value: "thankyou", label: "Thank You", prompt: "Write a thank you email after a purchase", category: "customer" },
    { value: "export_status", label: "Export Status Update", prompt: "Write an email updating customer about their vehicle export status", category: "export" },
    { value: "export_docs", label: "Export Documentation", prompt: "Write an email about required export documentation and attach documents", category: "export" },
    { value: "export_invoice", label: "Export Invoice & Summary", prompt: "Write an email with export order invoice and summary details", category: "export" },
    { value: "shipment_tracking", label: "Shipment Tracking", prompt: "Write an email with shipment tracking information", category: "shipment" },
    { value: "shipment_arrival", label: "Shipment Arrival Notice", prompt: "Write an email notifying about shipment arrival", category: "shipment" },
    { value: "shipment_docs", label: "Shipment Documents", prompt: "Write an email attaching shipment documents like bill of lading", category: "shipment" },
    { value: "loading_confirmation", label: "Loading Confirmation", prompt: "Write an email confirming vehicle loading details with declaration attached", category: "declaration" },
    { value: "loading_docs", label: "Loading Declaration Docs", prompt: "Write an email sending loading declaration documents for review", category: "declaration" }
  ];

  const generateDocumentLink = async (type, data) => {
    try {
      let htmlContent = "";
      let fileName = "";

      if (type === "export" && data) {
        fileName = `export-order-${data.export_number || data.id}.html`;
        htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Export Order - ${data.export_number}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 20px; margin-bottom: 30px; }
    h1 { color: #1e40af; }
    .section { margin-bottom: 20px; }
    .section h2 { color: #374151; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .field { margin-bottom: 8px; }
    .field label { font-size: 12px; color: #666; display: block; }
    .field p { margin: 2px 0; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f3f4f6; }
    .total { font-size: 18px; font-weight: bold; color: #166534; }
  </style>
</head>
<body>
  <div class="header">
    <h1>EXPORT ORDER</h1>
    <p>Order #: ${data.export_number || 'N/A'}</p>
    <p>Date: ${new Date().toLocaleDateString()}</p>
  </div>
  <div class="grid">
    <div class="section">
      <h2>Customer Information</h2>
      <div class="field"><label>Name</label><p>${data.customer_name || 'N/A'}</p></div>
      <div class="field"><label>Email</label><p>${data.customer_email || 'N/A'}</p></div>
      <div class="field"><label>Phone</label><p>${data.customer_phone || 'N/A'}</p></div>
      <div class="field"><label>Country</label><p>${data.customer_country || 'N/A'}</p></div>
    </div>
    <div class="section">
      <h2>Destination</h2>
      <div class="field"><label>Country</label><p>${data.destination_country || 'N/A'}</p></div>
      <div class="field"><label>Port</label><p>${data.destination_port || 'N/A'}</p></div>
      <div class="field"><label>Address</label><p>${data.destination_address || 'N/A'}</p></div>
      <div class="field"><label>Status</label><p>${data.status || 'N/A'}</p></div>
    </div>
  </div>
  <div class="section">
    <h2>Items</h2>
    <table>
      <thead><tr><th>Description</th><th>VIN</th><th>Qty</th><th>Value</th></tr></thead>
      <tbody>
        ${(data.items || []).map(item => `<tr><td>${item.description || ''}</td><td>${item.vin || ''}</td><td>${item.quantity || 1}</td><td>$${(item.value || 0).toLocaleString()}</td></tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div class="section">
    <p class="total">Total Value: $${(data.total_value || 0).toLocaleString()}</p>
  </div>
</body>
</html>`;
      } else if (type === "shipment" && data) {
        fileName = `shipment-${data.shipment_number || data.id}.html`;
        htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Shipment - ${data.shipment_number}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { text-align: center; border-bottom: 2px solid #059669; padding-bottom: 20px; margin-bottom: 30px; }
    h1 { color: #059669; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .section { margin-bottom: 20px; }
    .section h2 { font-size: 16px; color: #374151; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
    .field { margin-bottom: 8px; }
    .field label { font-size: 12px; color: #666; display: block; }
    .field p { margin: 2px 0; font-weight: 500; }
    .status { display: inline-block; padding: 4px 12px; background: #d1fae5; color: #065f46; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>SHIPMENT DETAILS</h1>
    <p>Shipment #: ${data.shipment_number || 'N/A'}</p>
    <p><span class="status">${data.status || 'N/A'}</span></p>
  </div>
  <div class="grid">
    <div class="section">
      <h2>Origin</h2>
      <div class="field"><label>Location</label><p>${data.origin_location || 'N/A'}</p></div>
      <div class="field"><label>Country</label><p>${data.origin_country || 'N/A'}</p></div>
      <div class="field"><label>Departure Date</label><p>${data.departure_date || 'N/A'}</p></div>
    </div>
    <div class="section">
      <h2>Destination</h2>
      <div class="field"><label>Location</label><p>${data.destination_location || 'N/A'}</p></div>
      <div class="field"><label>Country</label><p>${data.destination_country || 'N/A'}</p></div>
      <div class="field"><label>Expected Arrival</label><p>${data.expected_arrival || 'N/A'}</p></div>
    </div>
  </div>
  <div class="grid">
    <div class="section">
      <h2>Cargo Details</h2>
      <div class="field"><label>Description</label><p>${data.cargo_description || 'N/A'}</p></div>
      <div class="field"><label>Weight</label><p>${data.total_weight || 0} kg</p></div>
      <div class="field"><label>Value</label><p>$${(data.cargo_value || 0).toLocaleString()}</p></div>
    </div>
    <div class="section">
      <h2>Shipping Info</h2>
      <div class="field"><label>Carrier</label><p>${data.carrier_name || 'N/A'}</p></div>
      <div class="field"><label>Container #</label><p>${data.container_number || 'N/A'}</p></div>
      <div class="field"><label>Tracking #</label><p>${data.tracking_number || 'N/A'}</p></div>
    </div>
  </div>
</body>
</html>`;
      }

      if (htmlContent) {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const file = new File([blob], fileName, { type: 'text/html' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return { url: file_url, name: fileName, type };
      }
    } catch (error) {
      console.error("Error generating document:", error);
      return null;
    }
    return null;
  };

  const handleGenerateAndAttachDocs = async () => {
    setGeneratingDocs(true);
    const newLinks = [];

    try {
      if (attachExportDoc && selectedExport) {
        const exp = exports?.find(e => e.id === selectedExport);
        if (exp) {
          const link = await generateDocumentLink("export", exp);
          if (link) newLinks.push(link);
        }
      }

      if (attachShipmentDoc && selectedShipment) {
        const ship = shipments?.find(s => s.id === selectedShipment);
        if (ship) {
          const link = await generateDocumentLink("shipment", ship);
          if (link) newLinks.push(link);
        }
      }

      if (attachDeclarationDoc && selectedDeclaration) {
        const decl = loadingDeclarations?.find(d => d.id === selectedDeclaration);
        if (decl?.document_url) {
          newLinks.push({ url: decl.document_url, name: `Loading Declaration - ${decl.declaration_number}`, type: "declaration" });
        }
      }

      if (newLinks.length > 0) {
        setAttachedLinks(prev => [...prev, ...newLinks]);
        // Add links to email body
        const linksText = newLinks.map(l => `\n📎 ${l.name}: ${l.url}`).join('');
        setBody(prev => prev + "\n\n--- Attached Documents ---" + linksText);
        toast.success(`${newLinks.length} document(s) attached!`);
      }
    } catch (error) {
      toast.error("Failed to generate documents");
    } finally {
      setGeneratingDocs(false);
    }
  };

  const removeAttachedLink = (index) => {
    setAttachedLinks(prev => prev.filter((_, i) => i !== index));
  };

  const generateWithAI = async () => {
    if (!template) {
      toast.error("Please select a template first");
      return;
    }

    setAiLoading(true);
    try {
      const selectedTemplate = templates.find(t => t.value === template);
      let contextInfo = customer ? `\nCustomer Name: ${customer.full_name}` : "";
      
      // Add export context
      if (selectedExport) {
        const exp = exports?.find(e => e.id === selectedExport);
        if (exp) {
          contextInfo += `\n\nExport Details:
- Export Number: ${exp.export_number}
- Destination: ${exp.destination_country}
- Status: ${exp.status}
- Vehicle: ${exp.vehicle_details}`;
        }
      }
      
      // Add shipment context
      if (selectedShipment) {
        const ship = shipments?.find(s => s.id === selectedShipment);
        if (ship) {
          contextInfo += `\n\nShipment Details:
- Shipment Number: ${ship.shipment_number}
- Origin: ${ship.origin_port}
- Destination: ${ship.destination_port}
- Status: ${ship.status}
- ETD: ${ship.estimated_departure}
- ETA: ${ship.estimated_arrival}`;
        }
      }
      
      // Add loading declaration context
      if (selectedDeclaration) {
        const decl = loadingDeclarations?.find(d => d.id === selectedDeclaration);
        if (decl) {
          contextInfo += `\n\nLoading Declaration:
- Declaration Number: ${decl.declaration_number}
- Container Number: ${decl.container_number}
- Loading Date: ${decl.loading_date}`;
        }
      }
      
      const companyName = company?.name || company?.display_name || "eFinAuto OFMS";
      const companyInfo = company ? `\nCompany: ${companyName}` : "";
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `${selectedTemplate.prompt} for ${companyName} car dealership.${companyInfo}${contextInfo}\n\nProvide both a subject line and email body. Be professional, friendly, and concise.`,
        response_json_schema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            body: { type: "string" }
          }
        }
      });

      // Add company signature with contact person details
      let signature = `\n\n---`;
      if (company?.contact_person_name) {
        signature += `\n${company.contact_person_name}`;
        if (company?.contact_person_title) {
          signature += `, ${company.contact_person_title}`;
        }
      }
      signature += `\n${companyName}`;
      if (company?.contact_person_phone) {
        signature += `\nDirect: ${company.contact_person_phone}`;
      } else if (company?.phone) {
        signature += `\nPhone: ${company.phone}`;
      }
      if (company?.contact_person_email) {
        signature += `\nEmail: ${company.contact_person_email}`;
      } else if (company?.email) {
        signature += `\nEmail: ${company.email}`;
      }
      if (company?.address) {
        signature += `\n${company.address}`;
      }
      if (company?.city && company?.province) {
        signature += `\n${company.city}, ${company.province}`;
      }

      setSubject(response.subject);
      setBody(response.body + signature);
      toast.success("Email generated with AI");
    } catch (error) {
      toast.error("Failed to generate email");
    } finally {
      setAiLoading(false);
    }
  };

  const sendEmail = async () => {
    if (!to || !subject || !body) {
      toast.error("Please fill in all fields");
      return;
    }

    setSending(true);
    try {
      const fromName = company?.name || company?.display_name || "eFinAuto OFMS";
      
      await base44.integrations.Core.SendEmail({
        from_name: fromName,
        to: to,
        subject: subject,
        body: body
      });

      // Log communication
      if (customer && company?.id) {
        try {
          await base44.entities.NotificationLog.create({
            company_id: company.id,
            customer_id: customer.id,
            customer_name: customer.full_name,
            customer_email: to,
            notification_type: "sale_status_update",
            subject: subject,
            message: body,
            delivery_method: "email",
            status: "sent",
            sent_date: new Date().toISOString()
          });
        } catch (logError) {
          console.error("Failed to log communication:", logError);
        }
      }

      toast.success("Email sent successfully!");
      setSubject("");
      setBody("");
      setTemplate("");
      setSelectedExport("");
      setSelectedShipment("");
      setSelectedDeclaration("");
      setAttachedLinks([]);
      setAttachExportDoc(false);
      setAttachShipmentDoc(false);
      setAttachDeclarationDoc(false);
    } catch (error) {
      console.error("Email send error:", error);
      toast.error(`Failed to send email: ${error.message || "Unknown error"}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Compose Email
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {company && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-blue-800 font-medium">From:</span>
              <span className="text-blue-900">{company.name || company.display_name}</span>
              {company.email && (
                <span className="text-blue-700">&lt;{company.email}&gt;</span>
              )}
            </div>
          </div>
        )}

        <div>
          <Label>To</Label>
          <Input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="customer@example.com"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>AI Template</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1 text-xs font-semibold text-gray-500">Customer</div>
                {templates.filter(t => t.category === 'customer').map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
                <div className="px-2 py-1 text-xs font-semibold text-gray-500 mt-2">Export</div>
                {templates.filter(t => t.category === 'export').map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex items-center gap-2">
                      <Plane className="w-3 h-3" />
                      {t.label}
                    </div>
                  </SelectItem>
                ))}
                <div className="px-2 py-1 text-xs font-semibold text-gray-500 mt-2">Shipment</div>
                {templates.filter(t => t.category === 'shipment').map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex items-center gap-2">
                      <Package className="w-3 h-3" />
                      {t.label}
                    </div>
                  </SelectItem>
                ))}
                <div className="px-2 py-1 text-xs font-semibold text-gray-500 mt-2">Loading</div>
                {templates.filter(t => t.category === 'declaration').map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      {t.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={generateWithAI} disabled={aiLoading || !template} variant="outline" className="w-full">
              {aiLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Generate
            </Button>
          </div>
        </div>

        {template && templates.find(t => t.value === template)?.category === 'export' && exports?.length > 0 && (
          <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <Label>Select Export Order</Label>
              <Select value={selectedExport} onValueChange={setSelectedExport}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an export..." />
                </SelectTrigger>
                <SelectContent>
                  {exports.map(exp => (
                    <SelectItem key={exp.id} value={exp.id}>
                      {exp.export_number} - {exp.customer_name} ({exp.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedExport && (
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="attachExport" 
                  checked={attachExportDoc} 
                  onCheckedChange={setAttachExportDoc}
                />
                <label htmlFor="attachExport" className="text-sm text-blue-800 cursor-pointer">
                  <Paperclip className="w-3 h-3 inline mr-1" />
                  Attach Export Order Document
                </label>
              </div>
            )}
          </div>
        )}

        {template && templates.find(t => t.value === template)?.category === 'shipment' && shipments?.length > 0 && (
          <div className="space-y-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <div>
              <Label>Select Shipment</Label>
              <Select value={selectedShipment} onValueChange={setSelectedShipment}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a shipment..." />
                </SelectTrigger>
                <SelectContent>
                  {shipments.map(ship => (
                    <SelectItem key={ship.id} value={ship.id}>
                      {ship.shipment_number} - {ship.origin_country} → {ship.destination_country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedShipment && (
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="attachShipment" 
                  checked={attachShipmentDoc} 
                  onCheckedChange={setAttachShipmentDoc}
                />
                <label htmlFor="attachShipment" className="text-sm text-green-800 cursor-pointer">
                  <Paperclip className="w-3 h-3 inline mr-1" />
                  Attach Shipment Document
                </label>
              </div>
            )}
          </div>
        )}

        {template && templates.find(t => t.value === template)?.category === 'declaration' && loadingDeclarations?.length > 0 && (
          <div className="space-y-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div>
              <Label>Select Loading Declaration</Label>
              <Select value={selectedDeclaration} onValueChange={setSelectedDeclaration}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a declaration..." />
                </SelectTrigger>
                <SelectContent>
                  {loadingDeclarations.map(decl => (
                    <SelectItem key={decl.id} value={decl.id}>
                      {decl.declaration_number} - Container {decl.container_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedDeclaration && (
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="attachDeclaration" 
                  checked={attachDeclarationDoc} 
                  onCheckedChange={setAttachDeclarationDoc}
                />
                <label htmlFor="attachDeclaration" className="text-sm text-purple-800 cursor-pointer">
                  <Paperclip className="w-3 h-3 inline mr-1" />
                  Attach Loading Declaration PDF
                </label>
              </div>
            )}
          </div>
        )}

        {(attachExportDoc || attachShipmentDoc || attachDeclarationDoc) && (
          <Button 
            onClick={handleGenerateAndAttachDocs} 
            disabled={generatingDocs}
            variant="outline" 
            className="w-full border-dashed"
          >
            {generatingDocs ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Link2 className="w-4 h-4 mr-2" />
            )}
            Generate & Attach Selected Documents
          </Button>
        )}

        {attachedLinks.length > 0 && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              Attached Documents
            </Label>
            <div className="space-y-1">
              {attachedLinks.map((link, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate flex-1">
                    {link.name}
                  </a>
                  <Button variant="ghost" size="sm" onClick={() => removeAttachedLink(index)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <Label>Subject</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
          />
        </div>

        <div>
          <Label>Message</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Email body"
            rows={10}
            className="font-mono text-sm"
          />
        </div>

        <Button onClick={sendEmail} disabled={sending} className="w-full bg-blue-600 hover:bg-blue-700">
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Email
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}