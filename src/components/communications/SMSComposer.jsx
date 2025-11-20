import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MessageSquare, Loader2, Plane, Package } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function SMSComposer({ customer, customers, exports, shipments, loadingDeclarations, draft, company }) {
  const [to, setTo] = useState(customer?.phone || "");
  const [message, setMessage] = useState("");
  const [template, setTemplate] = useState("");
  const [selectedExport, setSelectedExport] = useState("");
  const [selectedShipment, setSelectedShipment] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

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
    { value: "export_update", label: "Export Status", prompt: "Write a brief SMS about export status", category: "export" },
    { value: "shipment_update", label: "Shipment Update", prompt: "Write a brief SMS about shipment tracking", category: "shipment" }
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
        if (ship) contextInfo += `\nShipment: ${ship.shipment_number}, ETA: ${ship.estimated_arrival}`;
      }
      
      const companyName = company?.name || company?.display_name || "eFinAuto Center";
      
      const response = await base44.integrations.Core.InvokeLLM({
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

  const sendSMS = () => {
    toast.info("SMS sending feature requires SMS provider integration");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Compose SMS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <div>
            <Label>Select Export</Label>
            <Select value={selectedExport} onValueChange={setSelectedExport}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an export..." />
              </SelectTrigger>
              <SelectContent>
                {exports.map(exp => (
                  <SelectItem key={exp.id} value={exp.id}>
                    {exp.export_number} - {exp.status}
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
                    {ship.shipment_number} - {ship.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

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

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            📱 SMS provider integration required. Contact support to enable SMS messaging.
          </p>
        </div>

        <Button onClick={sendSMS} disabled className="w-full bg-purple-600 hover:bg-purple-700">
          <MessageSquare className="w-4 h-4 mr-2" />
          Send SMS
        </Button>
      </CardContent>
    </Card>
  );
}