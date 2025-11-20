import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Send, Loader2, Plane, Package, FileText } from "lucide-react";
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
    { value: "export_docs", label: "Export Documentation", prompt: "Write an email about required export documentation", category: "export" },
    { value: "shipment_tracking", label: "Shipment Tracking", prompt: "Write an email with shipment tracking information", category: "shipment" },
    { value: "shipment_arrival", label: "Shipment Arrival Notice", prompt: "Write an email notifying about shipment arrival", category: "shipment" },
    { value: "loading_confirmation", label: "Loading Confirmation", prompt: "Write an email confirming vehicle loading details", category: "declaration" }
  ];

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
      
      const companyName = company?.name || company?.display_name || "eFinAuto Center";
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

      setSubject(response.subject);
      setBody(response.body);
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
      const fromName = company?.name || company?.display_name || "eFinAuto Center";
      
      await base44.integrations.Core.SendEmail({
        from_name: fromName,
        to,
        subject,
        body
      });
      toast.success("Email sent successfully");
      setSubject("");
      setBody("");
      setTemplate("");
    } catch (error) {
      toast.error("Failed to send email");
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
          <div>
            <Label>Select Export</Label>
            <Select value={selectedExport} onValueChange={setSelectedExport}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an export..." />
              </SelectTrigger>
              <SelectContent>
                {exports.map(exp => (
                  <SelectItem key={exp.id} value={exp.id}>
                    {exp.export_number} - {exp.vehicle_details} ({exp.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {template && templates.find(t => t.value === template)?.category === 'shipment' && shipments?.length > 0 && (
          <div>
            <Label>Select Shipment</Label>
            <Select value={selectedShipment} onValueChange={setSelectedShipment}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a shipment..." />
              </SelectTrigger>
              <SelectContent>
                {shipments.map(ship => (
                  <SelectItem key={ship.id} value={ship.id}>
                    {ship.shipment_number} - {ship.origin_port} → {ship.destination_port}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {template && templates.find(t => t.value === template)?.category === 'declaration' && loadingDeclarations?.length > 0 && (
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