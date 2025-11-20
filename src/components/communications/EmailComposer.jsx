import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function EmailComposer({ customer, customers }) {
  const [to, setTo] = useState(customer?.email || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [template, setTemplate] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const templates = [
    { value: "welcome", label: "Welcome Email", prompt: "Write a warm welcome email to a new customer" },
    { value: "followup", label: "Sales Follow-up", prompt: "Write a follow-up email after a vehicle purchase" },
    { value: "service", label: "Service Reminder", prompt: "Write a reminder for vehicle service maintenance" },
    { value: "promotion", label: "Promotion", prompt: "Write a promotional email about current vehicle deals" },
    { value: "thankyou", label: "Thank You", prompt: "Write a thank you email after a purchase" }
  ];

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
        prompt: `${selectedTemplate.prompt} for eFinAuto Center car dealership.${customerInfo}\n\nProvide both a subject line and email body. Be professional, friendly, and concise.`,
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
      await base44.integrations.Core.SendEmail({
        from_name: "eFinAuto Center",
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