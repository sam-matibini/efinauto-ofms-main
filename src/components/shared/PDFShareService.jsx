import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Printer, 
  Download, 
  Mail, 
  MessageCircle, 
  Share2, 
  Copy,
  Loader2,
  CheckCircle,
  FileText,
  Link as LinkIcon
} from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Utility functions
export const formatCurrency = (amount, currency = "CAD") => {
  const symbols = { CAD: "CA$", USD: "$", NGN: "₦" };
  return `${symbols[currency] || "$"}${(amount || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-CA');
};

export const formatPhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `${cleaned.slice(1, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
};

// PDF Generation Service
export async function generatePDFFromElement(elementRef, filename = "document.pdf") {
  if (!elementRef?.current) return null;
  
  try {
    const canvas = await html2canvas(elementRef.current, { 
      scale: 2, 
      useCORS: true, 
      backgroundColor: '#ffffff',
      logging: false
    });
    
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "letter");
    const imgWidth = 216;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= 279;
    
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= 279;
    }
    
    return { pdf, filename };
  } catch (error) {
    console.error("PDF generation error:", error);
    throw error;
  }
}

export async function uploadPDFToCloud(pdf, filename) {
  try {
    const pdfBlob = pdf.output('blob');
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    return file_url;
  } catch (error) {
    console.error("PDF upload error:", error);
    throw error;
  }
}

export async function generateAndUploadPDF(elementRef, filename) {
  const result = await generatePDFFromElement(elementRef, filename);
  if (!result) return null;
  return await uploadPDFToCloud(result.pdf, result.filename);
}

// Share Actions Bar Component
export default function PDFShareService({ 
  documentRef,
  documentTitle = "Document",
  documentNumber = "",
  customerName = "",
  customerPhone = "",
  customerEmail = "",
  totalAmount = 0,
  currency = "CAD",
  company,
  additionalInfo = "",
  onPrint,
  printHTML
}) {
  const [sendingEmail, setSendingEmail] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [shareSuccess, setShareSuccess] = useState(null);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailTo, setEmailTo] = useState(customerEmail || "");

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else if (printHTML) {
      const printWindow = window.open("", "_blank");
      printWindow.document.write(printHTML);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownloadPDF = async () => {
    if (!documentRef?.current) return;

    try {
      setGeneratingPDF(true);
      toast.loading("Generating PDF...");
      
      const result = await generatePDFFromElement(documentRef, `${documentTitle.replace(/\s/g, '_')}-${documentNumber || 'doc'}.pdf`);
      if (result) {
        result.pdf.save(result.filename);
        toast.dismiss();
        toast.success("PDF downloaded");
        setShareSuccess('pdf');
        setTimeout(() => setShareSuccess(null), 3000);
      }
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to generate PDF");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleSaveToCloud = async () => {
    if (!documentRef?.current) return null;

    setGeneratingPDF(true);
    try {
      toast.loading("Saving to cloud...");
      const url = await generateAndUploadPDF(
        documentRef, 
        `${documentTitle.replace(/\s/g, '_')}-${documentNumber || Date.now()}.pdf`
      );
      setPdfUrl(url);
      toast.dismiss();
      toast.success("PDF saved to cloud!");
      setShareSuccess('cloud');
      setTimeout(() => setShareSuccess(null), 3000);
      return url;
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to save PDF");
      return null;
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleEmailShare = async () => {
    const recipient = emailTo || customerEmail || prompt("Enter recipient email:");
    if (!recipient) return;

    setSendingEmail(true);
    try {
      // Generate and upload PDF first
      let url = pdfUrl;
      if (!url) {
        toast.loading("Generating PDF...");
        url = await handleSaveToCloud();
        toast.dismiss();
        if (!url) {
          setSendingEmail(false);
          return;
        }
      }

      const emailBody = `
Dear ${customerName || 'Customer'},

Please find your ${documentTitle} attached.

Document #: ${documentNumber}
Amount: ${formatCurrency(totalAmount, currency)}
${additionalInfo}

Download PDF: ${url}

Best regards,
${company?.name || 'Our Company'}
${company?.email || ''}
${company?.phone ? formatPhone(company.phone) : ''}
      `.trim();

      await base44.integrations.Core.SendEmail({
        to: recipient,
        subject: `${documentTitle} ${documentNumber} from ${company?.name || 'Our Company'}`,
        body: emailBody
      });

      toast.success(`Sent to ${recipient}`);
      setShareSuccess('email');
      setShowEmailInput(false);
      setTimeout(() => setShareSuccess(null), 3000);
    } catch (error) {
      toast.error("Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleWhatsAppShare = async () => {
    let url = pdfUrl;
    
    if (!url) {
      toast.loading("Generating PDF for sharing...");
      url = await handleSaveToCloud();
      toast.dismiss();
      if (!url) return;
    }

    const message = `*${documentTitle}*
${company?.name || 'Company'}

*#:* ${documentNumber}
*Customer:* ${customerName || 'N/A'}
*Date:* ${formatDate(new Date())}

*Total:* ${formatCurrency(totalAmount, currency)}
${additionalInfo}

📄 *Download PDF:* ${url}

_Generated by eFinAuto OFMS_`;

    const phone = customerPhone?.replace(/\D/g, '') || '';
    window.open(phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    setShareSuccess('whatsapp');
    setTimeout(() => setShareSuccess(null), 3000);
  };

  const handleGoogleChatShare = async () => {
    let url = pdfUrl;
    
    if (!url) {
      toast.loading("Generating PDF for sharing...");
      url = await handleSaveToCloud();
      toast.dismiss();
      if (!url) return;
    }

    const message = `📄 ${documentTitle} #${documentNumber}
Customer: ${customerName || 'N/A'}
Total: ${formatCurrency(totalAmount, currency)}
Download PDF: ${url}`;
    
    navigator.clipboard.writeText(message);
    toast.success("Copied for Google Chat with PDF link");
    setShareSuccess('gchat');
    setTimeout(() => setShareSuccess(null), 3000);
  };

  const handleCopyLink = () => {
    if (pdfUrl) {
      navigator.clipboard.writeText(pdfUrl);
      toast.success("PDF link copied to clipboard!");
      setShareSuccess('copy');
      setTimeout(() => setShareSuccess(null), 3000);
    }
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold flex items-center gap-2 text-sm">
            <Share2 className="w-4 h-4" />
            Print & Share
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={generatingPDF}>
              {generatingPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              PDF
              {shareSuccess === 'pdf' && <CheckCircle className="w-4 h-4 ml-1 text-green-600" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleSaveToCloud} disabled={generatingPDF}>
              {generatingPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-2" />}
              Save to Cloud
              {shareSuccess === 'cloud' && <CheckCircle className="w-4 h-4 ml-1 text-green-600" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowEmailInput(!showEmailInput)} disabled={sendingEmail}>
              {sendingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Email
              {shareSuccess === 'email' && <CheckCircle className="w-4 h-4 ml-1 text-green-600" />}
            </Button>
            <Button variant="outline" size="sm" className="bg-green-50 text-green-700" onClick={handleWhatsAppShare} disabled={generatingPDF}>
              {generatingPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />}
              WhatsApp
              {shareSuccess === 'whatsapp' && <CheckCircle className="w-4 h-4 ml-1 text-green-600" />}
            </Button>
            <Button variant="outline" size="sm" className="bg-blue-50 text-blue-700" onClick={handleGoogleChatShare} disabled={generatingPDF}>
              {generatingPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Copy className="w-4 h-4 mr-2" />}
              Google Chat
              {shareSuccess === 'gchat' && <CheckCircle className="w-4 h-4 ml-1 text-green-600" />}
            </Button>
          </div>
        </div>

        {/* Email Input Row */}
        {showEmailInput && (
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <Input
              type="email"
              placeholder="Enter recipient email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleEmailShare} disabled={sendingEmail || !emailTo}>
              {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
            </Button>
          </div>
        )}

        {/* Shareable Link */}
        {pdfUrl && (
          <div className="flex gap-2 mt-3 pt-3 border-t items-center">
            <FileText className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">PDF saved:</span>
            <Input value={pdfUrl} readOnly className="flex-1 text-xs bg-green-50" />
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}