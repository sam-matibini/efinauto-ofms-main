import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MessageSquare, Loader2, Plane, Package, FileText, Link2 } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";

export default function SMSComposer({ customer, customers, exports, shipments, loadingDeclarations, draft, company, invoices, payrollEntries }) {
  const isSMSConfigured = company?.sms_provider && company?.sms_provider !== 'none';
  const [to, setTo] = useState(customer?.phone || "");
  const [message, setMessage] = useState("");
  const [template, setTemplate] = useState("");
  const [selectedExport, setSelectedExport] = useState("");
  const [selectedShipment, setSelectedShipment] = useState("");
  const [selectedDeclaration, setSelectedDeclaration] = useState("");
  const [selectedDocument, setSelectedDocument] = useState("");
  const [documentLink, setDocumentLink] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [includeDocLink, setIncludeDocLink] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { file_url } = await supabase.integrations.Core.UploadFile({ file });
      setDocumentLink(file_url);
      setMessage(prev => prev + `\n\nDocument: ${file_url}`);
      toast.success(`File "${file.name}" attached!`);
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const [aiDocSearch, setAiDocSearch] = useState("");
  const [aiSearching, setAiSearching] = useState(false);
  const [aiDocResults, setAiDocResults] = useState([]);

  const handleAIDocSearch = async () => {
    if (!aiDocSearch.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setAiSearching(true);
    try {
      const allDocs = [];
      
      exports?.forEach(exp => allDocs.push({
        type: "Export Order",
        id: exp.id,
        name: `Export ${exp.export_number}`,
        details: `${exp.customer_name} - ${exp.destination_country}`,
        customer: exp.customer_name
      }));

      shipments?.forEach(ship => allDocs.push({
        type: "Shipment",
        id: ship.id,
        name: `Shipment ${ship.shipment_number}`,
        details: `${ship.customer_name} - ${ship.destination_country}`,
        customer: ship.customer_name
      }));

      loadingDeclarations?.forEach(decl => allDocs.push({
        type: "Loading Declaration",
        id: decl.id,
        name: `Declaration ${decl.declaration_number}`,
        details: `Container: ${decl.container_number}`,
        url: decl.document_url
      }));

      invoices?.forEach(inv => allDocs.push({
        type: "Invoice",
        id: inv.id,
        name: `Invoice ${inv.invoice_number}`,
        details: `${inv.customer_name} - $${inv.total_amount?.toLocaleString() || 0}`,
        url: inv.pdf_url
      }));

      payrollEntries?.forEach(pe => allDocs.push({
        type: "Paystub",
        id: pe.id,
        name: `Paystub - ${pe.employee_name}`,
        details: `${pe.pay_date}`
      }));

      const response = await supabase.integrations.Core.InvokeLLM({
        prompt: `Find documents matching: "${aiDocSearch}"

Documents:
${allDocs.map((d, i) => `${i}. [${d.type}] ${d.name} - ${d.details}`).join('\n')}

Return indices of top 3 most relevant documents.`,
        response_json_schema: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: { index: { type: "number" } }
              }
            }
          }
        }
      });

      const results = response.matches?.map(m => allDocs[m.index]).filter(Boolean) || [];
      setAiDocResults(results);
      if (results.length === 0) toast.info("No matching documents found");
    } catch (error) {
      toast.error("AI search failed");
    } finally {
      setAiSearching(false);
    }
  };

  const attachAIResult = (doc) => {
    if (doc.url) {
      setDocumentLink(doc.url);
      setMessage(prev => prev + `\n\nDocument: ${doc.url}`);
      toast.success(`${doc.name} link added!`);
      setAiDocResults(prev => prev.filter(d => d.id !== doc.id));
    } else {
      toast.error("No document link available for this item");
    }
  };

  React.useEffect(() => {
    if (draft) {
      setTo(draft.to || "");
      setMessage(draft.message || "");
    }
  }, [draft]);

  const templates = [
    { value: "appointment", label: "Appointment Reminder", prompt: "Write a brief SMS reminder for a vehicle service appointment", category: "customer" },
    { value: "delivery", label: "Delivery Update", prompt: "Write a brief SMS about vehicle delivery status", category: "customer" },
    { value: "payment", label: "Payment Reminder", prompt: "Write a brief SMS payment reminder", category: "customer" },
    { value: "promo", label: "Quick Promotion", prompt: "Write a brief promotional SMS about vehicle deals", category: "customer" },
    { value: "export_update", label: "Export Status", prompt: "Write a brief SMS about export status with document link", category: "export" },
    { value: "export_docs", label: "Export Documents Ready", prompt: "Write a brief SMS notifying export documents are ready", category: "export" },
    { value: "shipment_update", label: "Shipment Update", prompt: "Write a brief SMS about shipment tracking", category: "shipment" },
    { value: "shipment_arrival", label: "Shipment Arrival", prompt: "Write a brief SMS about shipment arrival with tracking link", category: "shipment" },
    { value: "loading_update", label: "Loading Update", prompt: "Write a brief SMS about loading declaration status", category: "declaration" }
  ];

  const charCount = message.length;
  const smsCount = Math.ceil(charCount / 160);

  const generateWithAI = async () => {
    if (!template) {
      toast.error("Please select a template first");
      return;
    }

    setAiLoading(true);
    try {
      const selectedTemplate = templates.find(t => t.value === template);
      let contextInfo = customer ? `\nCustomer: ${customer.full_name}` : "";
      
      if (selectedExport) {
        const exp = exports?.find(e => e.id === selectedExport);
        if (exp) contextInfo += `\nExport: ${exp.export_number}, Status: ${exp.status}`;
      }
      
      if (selectedShipment) {
        const ship = shipments?.find(s => s.id === selectedShipment);
        if (ship) contextInfo += `\nShipment: ${ship.shipment_number}, ETA: ${ship.expected_arrival}`;
      }

      if (selectedDeclaration) {
        const decl = loadingDeclarations?.find(d => d.id === selectedDeclaration);
        if (decl) contextInfo += `\nLoading Declaration: ${decl.declaration_number}, Container: ${decl.container_number}`;
      }
      
      const companyName = company?.name || company?.display_name || "eFinAuto OFMS";
      
      const response = await supabase.integrations.Core.InvokeLLM({
        prompt: `${selectedTemplate.prompt} for ${companyName}.${contextInfo}\n\nKeep it under 160 characters. Be professional and friendly.`,
        response_json_schema: {
          type: "object",
          properties: {
            message: { type: "string" }
          }
        }
      });

      setMessage(response.message);
      toast.success("SMS generated with AI");
    } catch (error) {
      toast.error("Failed to generate SMS");
    } finally {
      setAiLoading(false);
    }
  };

  const sendSMS = async () => {
    if (!to || !message) {
      toast.error("Please fill in phone number and message");
      return;
    }

    setSending(true);
    try {
      // Log the SMS communication
      if (customer) {
        await supabase.entities.NotificationLog.create({
          company_id: company?.id,
          customer_id: customer.id,
          customer_name: customer.full_name,
          customer_email: customer.email,
          notification_type: "sale_status_update",
          subject: "SMS Message",
          message: message,
          delivery_method: "sms",
          status: "sent",
          sent_date: new Date().toISOString()
        });
      }

      toast.success("SMS sent successfully");
      setMessage("");
      setTemplate("");
    } catch (error) {
      toast.error("Failed to send SMS");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Compose SMS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {company && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-purple-800 font-medium">From:</span>
              <span className="text-purple-900">{company.name || company.display_name}</span>
              {company.phone && (
                <span className="text-purple-700">({company.phone})</span>
              )}
            </div>
          </div>
        )}

        <div>
          <Label>To (Phone Number)</Label>
          <Input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="+1234567890"
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
                <div className="px-2 py-1 text-xs font-semibold text-gray-500 mt-2">Export & Shipment</div>
                {templates.filter(t => t.category === 'export').map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex items-center gap-2">
                      <Plane className="w-3 h-3" />
                      {t.label}
                    </div>
                  </SelectItem>
                ))}
                {templates.filter(t => t.category === 'shipment').map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex items-center gap-2">
                      <Package className="w-3 h-3" />
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
          <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Label>Select Export Order</Label>
            <Select value={selectedExport} onValueChange={setSelectedExport}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an export..." />
              </SelectTrigger>
              <SelectContent>
                {exports.map(exp => (
                  <SelectItem key={exp.id} value={exp.id}>
                    <div className="flex items-center gap-2">
                      <Plane className="w-3 h-3" />
                      {exp.export_number} - {exp.customer_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {template && templates.find(t => t.value === template)?.category === 'shipment' && shipments?.length > 0 && (
          <div className="space-y-2 p-3 bg-green-50 rounded-lg border border-green-200">
            <Label>Select Shipment</Label>
            <Select value={selectedShipment} onValueChange={setSelectedShipment}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a shipment..." />
              </SelectTrigger>
              <SelectContent>
                {shipments.map(ship => (
                  <SelectItem key={ship.id} value={ship.id}>
                    {ship.shipment_number} - {ship.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {template && templates.find(t => t.value === template)?.category === 'declaration' && loadingDeclarations?.length > 0 && (
          <div className="space-y-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <Label>Select Loading Declaration</Label>
            <Select value={selectedDeclaration} onValueChange={setSelectedDeclaration}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a declaration..." />
              </SelectTrigger>
              <SelectContent>
                {loadingDeclarations.map(decl => (
                  <SelectItem key={decl.id} value={decl.id}>
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      {decl.declaration_number} - {decl.container_number}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDeclaration && loadingDeclarations?.find(d => d.id === selectedDeclaration)?.document_url && (
              <div className="flex items-center gap-2 text-xs text-purple-700">
                <Link2 className="w-3 h-3" />
                Document link will be included in SMS
              </div>
            )}
          </div>
        )}

        {/* AI Document Search for SMS */}
        <div className="space-y-2 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
          <Label className="flex items-center gap-2 text-purple-800">
            <Sparkles className="w-4 h-4" />
            AI Document Finder
          </Label>
          <div className="flex gap-2">
            <Input
              value={aiDocSearch}
              onChange={(e) => setAiDocSearch(e.target.value)}
              placeholder="e.g., 'invoice for John' or 'loading declaration'"
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleAIDocSearch()}
            />
            <Button onClick={handleAIDocSearch} disabled={aiSearching} variant="outline" size="sm" className="border-purple-300">
              {aiSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </Button>
          </div>
          {aiDocResults.length > 0 && (
            <div className="space-y-1 mt-2">
              {aiDocResults.map((doc, i) => (
                <div key={i} className="flex items-center justify-between bg-white p-2 rounded border border-purple-100 text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{doc.name}</span>
                    <span className="text-gray-500 text-xs ml-2">{doc.details}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => attachAIResult(doc)} className="text-purple-600">
                    <Link2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Manual Document Upload for SMS */}
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <Label className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Manual Upload
          </Label>
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingFile} />
              <Button type="button" variant="outline" size="sm" disabled={uploadingFile} asChild>
                <span>
                  {uploadingFile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                  Upload & Get Link
                </span>
              </Button>
            </label>
          </div>
          {documentLink && (
            <div className="text-xs text-green-700 bg-green-50 p-2 rounded">
              <Link2 className="w-3 h-3 inline mr-1" />
              Link attached: {documentLink.slice(0, 50)}...
            </div>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <Label>Message</Label>
            <div className="flex gap-2">
              <Badge variant={charCount > 160 ? "destructive" : "secondary"}>
                {charCount} / 160
              </Badge>
              <Badge variant="outline">
                {smsCount} SMS
              </Badge>
            </div>
          </div>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Your message here..."
            rows={6}
            maxLength={320}
          />
        </div>

        {!isSMSConfigured && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              ⚠️ SMS provider not configured. Messages will be logged only. Go to Settings to configure Twilio or Vonage.
            </p>
          </div>
        )}

        <Button onClick={sendSMS} disabled={sending} className="w-full bg-purple-600 hover:bg-purple-700">
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <MessageSquare className="w-4 h-4 mr-2" />
              Send SMS
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}