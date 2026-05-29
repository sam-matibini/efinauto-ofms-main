import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Mail, MessageCircle, MessageSquare, Send, 
  Download, Printer, Loader2, CheckCircle, Link as LinkIcon
} from "lucide-react";
import { toast } from "sonner";
import {
  shareViaEmail,
  shareViaWhatsApp,
  shareViaSMS,
  shareViaGoogleChat,
  printDocument,
  downloadDocument,
  generateSecureDownloadLink
} from "./DocumentSharingService";
import { generateDocumentPDF } from "./DocumentPDFService";

export default function DocumentShareDialog({ open, onClose, sale }) {
  const [loading, setLoading] = useState(false);
  const [emailData, setEmailData] = useState({
    to: sale?.customer_email || "",
    message: ""
  });
  const [phoneNumber, setPhoneNumber] = useState(sale?.customer_phone || "");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [secureLink, setSecureLink] = useState(null);

  const handleGeneratePDF = async () => {
    if (!sale?.id) {
      toast.error("No sale selected");
      return;
    }
    setLoading(true);
    try {
      const result = await generateDocumentPDF(sale.id, "BOS");
      
      // Download the PDF
      const a = window.document.createElement("a");
      a.href = result.pdf_url;
      a.download = `BOS_${sale.bos_number || sale.id}.pdf`;
      a.click();
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(result.pdf_url), 100);
      
      toast.success("PDF generated and downloaded");
    } catch (error) {
      toast.error("Failed to generate PDF: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    setLoading(true);
    try {
      await printDocument(sale.id);
      toast.success("Document sent to printer");
    } catch (error) {
      toast.error("Print failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      await downloadDocument(sale.id);
      toast.success("Download started");
    } catch (error) {
      toast.error("Download failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailShare = async () => {
    if (!emailData.to) {
      toast.error("Please enter recipient email");
      return;
    }
    if (!sale?.id) {
      toast.error("No sale selected");
      return;
    }
    setLoading(true);
    try {
      await shareViaEmail(sale.id, emailData.to, sale?.customer_name || emailData.to, emailData.message);
      toast.success(`Email sent to ${emailData.to}`);
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      toast.error("Email failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppShare = async () => {
    if (!phoneNumber) {
      toast.error("Please enter phone number");
      return;
    }
    if (!sale?.id) {
      toast.error("No sale selected");
      return;
    }
    setLoading(true);
    try {
      // Generate and download PDF for manual sharing
      const result = await generateDocumentPDF(sale.id, "BOS");
      
      const a = window.document.createElement("a");
      a.href = result.pdf_url;
      a.download = `BOS_${sale.bos_number || sale.id}.pdf`;
      a.click();
      
      setTimeout(() => URL.revokeObjectURL(result.pdf_url), 100);
      
      toast.info("PDF downloaded. Please share manually via WhatsApp.");
    } catch (error) {
      toast.error("PDF generation failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSMSShare = async () => {
    if (!phoneNumber) {
      toast.error("Please enter phone number");
      return;
    }
    if (!sale?.id) {
      toast.error("No sale selected");
      return;
    }
    setLoading(true);
    try {
      // Generate and download PDF for manual sharing
      const result = await generateDocumentPDF(sale.id, "BOS");
      
      const a = window.document.createElement("a");
      a.href = result.pdf_url;
      a.download = `BOS_${sale.bos_number || sale.id}.pdf`;
      a.click();
      
      setTimeout(() => URL.revokeObjectURL(result.pdf_url), 100);
      
      toast.info("PDF downloaded. Please share manually via SMS.");
    } catch (error) {
      toast.error("PDF generation failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleChatShare = async () => {
    if (!webhookUrl) {
      toast.error("Please enter Google Chat webhook URL");
      return;
    }
    if (!sale?.id) {
      toast.error("No sale selected");
      return;
    }
    setLoading(true);
    try {
      await shareViaGoogleChat(sale.id, webhookUrl);
      toast.success("✅ Message posted to Google Chat");
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      toast.error("Google Chat failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!sale?.id) {
      toast.error("No sale selected");
      return;
    }
    setLoading(true);
    try {
      const result = await generateSecureDownloadLink(sale.id);
      setSecureLink(result.secure_link);
      toast.success("🔗 Secure PDF link generated");
    } catch (error) {
      toast.error("Link generation failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Bill of Sale - {sale?.bos_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-3">
            <Button onClick={handlePrint} disabled={loading} variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleDownload} disabled={loading} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button onClick={handleGeneratePDF} disabled={loading} variant="outline">
              <CheckCircle className="w-4 h-4 mr-2" />
              {sale?.pdf_file_url ? "Regenerate PDF" : "Generate PDF"}
            </Button>
          </div>

          {/* Sharing Tabs */}
          <Tabs defaultValue="email">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="email">
                <Mail className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="whatsapp">
                <MessageCircle className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="sms">
                <MessageSquare className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="gchat">
                <Send className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="link">
                <LinkIcon className="w-4 h-4" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4">
              <div>
                <Label>Recipient Email</Label>
                <Input
                  type="email"
                  value={emailData.to}
                  onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                  placeholder="customer@example.com"
                />
              </div>
              <div>
                <Label>Custom Message (Optional)</Label>
                <Textarea
                  value={emailData.message}
                  onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                  rows={3}
                  placeholder="Add a personal message..."
                />
              </div>
              <Button onClick={handleEmailShare} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                Send Email with PDF
              </Button>
            </TabsContent>

            <TabsContent value="whatsapp" className="space-y-4">
              <div>
                <Label>Phone Number (with country code)</Label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                />
              </div>
              <Button onClick={handleWhatsAppShare} disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />}
                Share via WhatsApp
              </Button>
              <p className="text-xs text-gray-500">Opens WhatsApp with secure download link</p>
            </TabsContent>

            <TabsContent value="sms" className="space-y-4">
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1234567890"
                />
              </div>
              <Button onClick={handleSMSShare} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-2" />}
                Send SMS
              </Button>
              <p className="text-xs text-gray-500">Opens SMS app with secure link</p>
            </TabsContent>

            <TabsContent value="gchat" className="space-y-4">
              <div>
                <Label>Google Chat Webhook URL</Label>
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://chat.googleapis.com/v1/spaces/..."
                />
              </div>
              <Button onClick={handleGoogleChatShare} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Post to Google Chat
              </Button>
            </TabsContent>

            <TabsContent value="link" className="space-y-4">
              <Button onClick={handleGenerateLink} disabled={loading} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                Generate Secure Link
              </Button>
              {secureLink && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Label className="text-xs text-blue-800">Secure Download Link (expires in 72 hours)</Label>
                  <div className="flex gap-2 mt-2">
                    <Input value={secureLink} readOnly className="text-xs" />
                    <Button size="sm" onClick={() => { navigator.clipboard.writeText(secureLink); toast.success("Link copied"); }}>
                      Copy
                    </Button>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500">Generate a secure link to share via any channel</p>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}