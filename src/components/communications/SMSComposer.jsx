import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MessageSquare, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function SMSComposer({ customer, customers }) {
  const [to, setTo] = useState(customer?.phone || "");
  const [message, setMessage] = useState("");
  const [template, setTemplate] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const templates = [
    { value: "appointment", label: "Appointment Reminder", prompt: "Write a brief SMS reminder for a vehicle service appointment" },
    { value: "delivery", label: "Delivery Update", prompt: "Write a brief SMS about vehicle delivery status" },
    { value: "payment", label: "Payment Reminder", prompt: "Write a brief SMS payment reminder" },
    { value: "promo", label: "Quick Promotion", prompt: "Write a brief promotional SMS about vehicle deals" }
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
      const customerInfo = customer ? `\nCustomer Name: ${customer.full_name}` : "";
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `${selectedTemplate.prompt} for eFinAuto Center.${customerInfo}\n\nKeep it under 160 characters. Be professional and friendly.`,
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

        <div className="flex gap-4">
          <div className="flex-1">
            <Label>AI Template</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={generateWithAI} disabled={aiLoading || !template} variant="outline">
              {aiLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Generate
            </Button>
          </div>
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