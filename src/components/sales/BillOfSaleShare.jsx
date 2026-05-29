import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MessageCircle, Loader2, Send, CheckCircle, Download, Link as LinkIcon, Copy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format } from "date-fns";
import AIDocumentSummary from "@/components/shared/AIDocumentSummary";
import { generateDocumentPDF } from "./DocumentPDFService";

export default function BillOfSaleShare({ sale, company, onClose }) {
  const [activeTab, setActiveTab] = useState("email");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [emailData, setEmailData] = useState({
    to: sale?.customer_email || "",
    subject: `Bill of Sale - ${sale?.vehicle_details || "Vehicle"} - ${sale?.sale_number || ""}`,
    customMessage: ""
  });

  const handleSendEmail = async () => {
    if (!emailData.to) {
      toast.error("Please enter an email address");
      return;
    }

    setSending(true);
    try {
      let url = pdfUrl;
      if (!url) {
        url = await generateAndUploadPDF();
        if (!url) { setSending(false); return; }
      }

      const companyAddress = [company?.address, company?.city, company?.province, company?.postal_code].filter(Boolean).join(', ');
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          ${company?.logo_url ? `<div style="text-align:center;margin-bottom:16px;"><img src="${company.logo_url}" alt="${company.name}" style="max-height:60px;"/></div>` : ''}
          <h2 style="color:#1e3a8a; text-align:center;">Bill of Sale</h2>
          ${emailData.customMessage ? `<p style="color:#555;">${emailData.customMessage}</p><hr/>` : ''}
          <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #1e3a8a;">
            <p style="margin:4px 0;"><strong>BOS Number:</strong> ${sale?.bos_number || 'N/A'}</p>
            <p style="margin:4px 0;"><strong>Vehicle:</strong> ${sale?.vehicle_details || 'N/A'}</p>
            <p style="margin:4px 0;"><strong>VIN:</strong> ${sale?.vehicle_vin || 'N/A'}</p>
            <p style="margin:4px 0;"><strong>Customer:</strong> ${sale?.customer_name || 'N/A'}</p>
            <p style="margin:4px 0;"><strong>Sale Date:</strong> ${sale?.sale_date || 'N/A'}</p>
            <p style="margin:4px 0; color:#059669;"><strong>Total:</strong> $${(sale?.grand_total || 0).toLocaleString()}</p>
          </div>
          <div style="text-align:center;margin:24px 0;">
            <a href="${url}" style="background:#1e3a8a;color:white;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;">
              📄 Download Bill of Sale PDF
            </a>
          </div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
          <div style="color:#666;font-size:12px;text-align:center;">
            <p><strong>${company?.name || ''}</strong></p>
            <p>${companyAddress}</p>
            <p>${company?.phone ? `Tel: ${company.phone}` : ''} ${company?.email ? `| Email: ${company.email}` : ''}</p>
          </div>
        </div>
      `;

      await base44.integrations.Core.SendEmail({
        to: emailData.to,
        subject: emailData.subject,
        body: emailBody,
        from_name: company?.name || "Auto Dealership"
      });

      setSent(true);
      toast.success("Bill of Sale sent successfully!");
    } catch (error) {
      console.error("Email error:", error);
      toast.error("Failed to send email: " + error.message);
    }
    setSending(false);
  };

  const generateAndUploadPDF = async () => {
    if (!sale?.id) {
      toast.error("Cannot generate PDF - missing sale data");
      return null;
    }
    setGeneratingPDF(true);
    try {
      const result = await generateDocumentPDF(sale.id, "BOS");
      const filename = `BOS_${sale.bos_number || sale.sale_number || Date.now()}.pdf`;
      const file = new File([result.pdf_blob], filename, { type: 'application/pdf' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      URL.revokeObjectURL(result.pdf_url);
      setPdfUrl(file_url);
      toast.success("PDF saved to cloud!");
      return file_url;
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF: " + error.message);
      return null;
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!sale?.id) return;
    setGeneratingPDF(true);
    try {
      const result = await generateDocumentPDF(sale.id, "BOS");
      const a = document.createElement('a');
      a.href = result.pdf_url;
      a.download = `BOS_${sale.bos_number || sale.sale_number || 'doc'}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(result.pdf_url), 100);
      toast.success("PDF downloaded");
    } catch (error) {
      toast.error("Failed to download PDF: " + error.message);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleCopyLink = () => {
    if (pdfUrl) {
      navigator.clipboard.writeText(pdfUrl);
      toast.success("PDF link copied to clipboard!");
    }
  };

  const handleShareWhatsApp = async () => {
    const isExport = sale?.sale_type === 'export';
    let url = pdfUrl;
    if (!url) {
      url = await generateAndUploadPDF();
      if (!url) return;
    }

    const message = `
*📄 BILL OF SALE*
${company?.name || 'Company'}

*BOS #:* ${sale?.bos_number || sale?.sale_number || ''}
*Date:* ${sale?.sale_date ? (() => { try { return format(new Date(sale.sale_date), 'MMMM d, yyyy'); } catch(e) { return ''; } })() : ''}
*Type:* ${isExport ? 'Export Sale (Zero-Rated)' : 'Domestic Sale'}

*Customer:* ${sale?.customer_name || ''}
*Vehicle:* ${sale?.vehicle_details || ''}
*VIN:* ${sale?.vehicle_vin || ''}

*Sale Price:* $${sale?.sale_price?.toLocaleString() || '0'}
*Tax:* $${sale?.tax_total?.toFixed(2) || '0.00'}
*Grand Total:* $${sale?.grand_total?.toLocaleString() || '0'}
*Balance Due:* $${sale?.balance_due?.toLocaleString() || '0'}

📎 *Download PDF:* ${url}

${company?.phone ? `Tel: ${company.phone}` : ''}
${company?.email ? `Email: ${company.email}` : ''}
    `.trim();

    const phoneNumber = sale?.customer_phone?.replace(/\D/g, '') || '';
    const whatsappUrl = phoneNumber
      ? `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
    toast.success("Opening WhatsApp...");
  };

  if (sent) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Email Sent Successfully!</h3>
        <p className="text-gray-600 mb-4">Bill of Sale has been sent to {emailData.to}</p>
        <Button onClick={onClose}>Close</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AIDocumentSummary
        documentType="bill_of_sale"
        documentData={sale}
        company={company}
      />

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("email")}
          className={`px-4 py-2 font-medium ${activeTab === "email" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}
        >
          <Mail className="w-4 h-4 inline mr-2" />
          Email
        </button>
        <button
          onClick={() => setActiveTab("whatsapp")}
          className={`px-4 py-2 font-medium ${activeTab === "whatsapp" ? "border-b-2 border-green-600 text-green-600" : "text-gray-500"}`}
        >
          <MessageCircle className="w-4 h-4 inline mr-2" />
          WhatsApp
        </button>
      </div>

      {activeTab === "email" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Recipient Email *</Label>
            <Input
              type="email"
              value={emailData.to}
              onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
              placeholder="customer@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              value={emailData.subject}
              onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Custom Message (Optional)</Label>
            <Textarea
              value={emailData.customMessage}
              onChange={(e) => setEmailData({ ...emailData, customMessage: e.target.value })}
              placeholder="Add a personal message to include with the Bill of Sale..."
              rows={3}
            />
          </div>
          <Button
            onClick={handleSendEmail}
            disabled={sending || !emailData.to}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {sending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" />Send Bill of Sale</>
            )}
          </Button>
        </div>
      )}

      {activeTab === "whatsapp" && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={generatingPDF}>
              {generatingPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Download PDF
            </Button>
            <Button variant="outline" size="sm" onClick={generateAndUploadPDF} disabled={generatingPDF}>
              {generatingPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-2" />}
              Save to Cloud
            </Button>
            {pdfUrl && (
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                <Copy className="w-4 h-4 mr-2" />Copy Link
              </Button>
            )}
          </div>

          {pdfUrl && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800 font-medium mb-2">✓ PDF Ready to Share</p>
              <Input value={pdfUrl} readOnly className="text-xs bg-white" />
            </div>
          )}

          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-800 mb-1"><strong>WhatsApp Share</strong></p>
            <p className="text-sm text-green-700">
              Generates a PDF, uploads to cloud, and opens WhatsApp with the download link.
              {sale?.customer_phone && <span className="block mt-1">Customer phone: <strong>{sale.customer_phone}</strong></span>}
            </p>
          </div>
          <Button
            onClick={handleShareWhatsApp}
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={generatingPDF}
          >
            {generatingPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />}
            Share via WhatsApp with PDF
          </Button>
        </div>
      )}
    </div>
  );
}