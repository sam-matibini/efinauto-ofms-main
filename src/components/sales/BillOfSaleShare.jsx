import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, MessageCircle, Loader2, Send, CheckCircle, Download, Printer, Link as LinkIcon, Copy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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

  const generateBillOfSaleHTML = () => {
    const isExport = sale?.sale_type === 'export';
    const companyAddress = [
      company?.address,
      company?.city,
      company?.province,
      company?.postal_code,
      company?.country
    ].filter(Boolean).join(', ');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
          .logo { max-height: 80px; margin-bottom: 10px; }
          .company-name { font-size: 20px; font-weight: bold; }
          .company-info { font-size: 12px; color: #666; margin: 5px 0; }
          .tax-info { font-size: 12px; font-weight: bold; color: #333; }
          .title { text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; }
          .sale-type { display: inline-block; padding: 5px 15px; border-radius: 5px; font-size: 12px; font-weight: bold; }
          .export { background: #dcfce7; color: #166534; }
          .domestic { background: #dbeafe; color: #1e40af; }
          .section { margin: 15px 0; }
          .row { display: flex; border-bottom: 1px solid #ccc; padding: 8px 0; }
          .label { font-weight: bold; width: 150px; font-size: 13px; }
          .value { flex: 1; font-size: 13px; }
          .vehicle-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .vehicle-table td, .vehicle-table th { border: 1px solid #333; padding: 8px; font-size: 12px; }
          .vehicle-table th { background: #f3f4f6; font-weight: bold; }
          .totals-table { width: 50%; border-collapse: collapse; margin: 15px 0; }
          .totals-table td { border: 1px solid #333; padding: 8px; font-size: 13px; }
          .totals-label { font-weight: bold; }
          .disclaimer { font-size: 11px; text-align: center; font-weight: bold; background: #f3f4f6; padding: 10px; margin: 15px 0; }
          .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
          .signature-block { width: 45%; }
          .signature-line { border-bottom: 1px solid #333; height: 40px; margin-top: 10px; }
          .terms { font-size: 10px; margin: 15px 0; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="header">
          ${company?.logo_url ? `<img src="${company.logo_url}" class="logo" alt="${company?.name}"/>` : ''}
          <div class="company-name">${company?.name || 'Company Name'}</div>
          ${companyAddress ? `<div class="company-info">${companyAddress}</div>` : ''}
          <div class="company-info">
            ${company?.phone ? `Tel: ${company.phone}` : ''} 
            ${company?.email ? ` | Email: ${company.email}` : ''}
          </div>
          <div class="tax-info">
            ${company?.gst_number ? `GST #: ${company.gst_number}` : ''} 
            ${company?.pst_number ? ` | PST #: ${company.pst_number}` : ''} 
            ${company?.dealer_permit_number ? ` | Dealer Permit #: ${company.dealer_permit_number}` : ''}
          </div>
        </div>

        <div class="title">BILL OF SALE</div>
        <div style="text-align: center; margin-bottom: 20px;">
          <span class="sale-type ${isExport ? 'export' : 'domestic'}">
            ${isExport ? '☑ EXPORT SALE - Zero-Rated' : '☑ DOMESTIC SALE'}
          </span>
        </div>

        <div class="section">
          <div class="row"><span class="label">Purchaser's Name:</span><span class="value">${sale?.customer_name || ''}</span></div>
          <div class="row"><span class="label">Address:</span><span class="value">${sale?.customer_address || ''}</span></div>
          <div class="row"><span class="label">City/Province:</span><span class="value">${sale?.customer_city || ''}, ${sale?.province || ''} ${sale?.customer_postal_code || ''}</span></div>
          <div class="row"><span class="label">Phone:</span><span class="value">${sale?.customer_phone || ''}</span></div>
          <div class="row"><span class="label">Sale Date:</span><span class="value">${sale?.sale_date ? format(new Date(sale.sale_date), 'MMMM d, yyyy') : ''}</span></div>
        </div>

        <table class="vehicle-table">
          <tr><th>Vehicle</th><th>Year</th><th>VIN</th><th>Mileage</th><th>Color</th></tr>
          <tr>
            <td>${sale?.vehicle_details || ''}</td>
            <td>${sale?.vehicle_year || ''}</td>
            <td>${sale?.vehicle_vin || ''}</td>
            <td>${sale?.vehicle_mileage || ''}</td>
            <td>${sale?.vehicle_color || ''}</td>
          </tr>
        </table>

        <table class="totals-table">
          <tr><td class="totals-label">Total Price</td><td>$${sale?.sale_price?.toLocaleString() || '0'}</td></tr>
          <tr><td class="totals-label">Less Trade</td><td>$${sale?.trade_in?.net_trade_value?.toLocaleString() || '0'}</td></tr>
          <tr><td class="totals-label">P.S.T</td><td>$${sale?.tax_pst?.toFixed(2) || '0.00'}</td></tr>
          <tr><td class="totals-label">G.S.T / H.S.T</td><td>$${(sale?.tax_gst || sale?.tax_hst)?.toFixed(2) || '0.00'}</td></tr>
          <tr><td class="totals-label"><strong>Grand Total</strong></td><td><strong>$${sale?.grand_total?.toLocaleString() || '0'}</strong></td></tr>
          <tr><td class="totals-label">Less Deposit</td><td>$${sale?.deposit_amount?.toLocaleString() || '0'}</td></tr>
          <tr><td class="totals-label"><strong>Balance Due</strong></td><td><strong>$${sale?.balance_due?.toLocaleString() || '0'}</strong></td></tr>
        </table>

        <div class="disclaimer">
          ALL VEHICLES ARE SOLD WITHOUT ANY WARRANTIES OR GUARANTEES UNLESS STIPULATED IN WRITING
        </div>

        <div class="terms">
          The purchaser understands and agrees that the provisions listed above are hereby incorporated and
          constitute part of this offer and acknowledges that this offer will not be considered as binding until
          signed by the Purchaser and accepted in writing by the Management.
        </div>

        <div class="signatures">
          <div class="signature-block">
            <div>Purchaser's Signature:</div>
            <div class="signature-line"></div>
          </div>
          <div class="signature-block">
            <div>Salesman Signature:</div>
            <div class="signature-line"></div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handleSendEmail = async () => {
    if (!emailData.to) {
      toast.error("Please enter an email address");
      return;
    }

    setSending(true);
    try {
      const billHTML = generateBillOfSaleHTML();
      const emailBody = `
        ${emailData.customMessage ? `<p>${emailData.customMessage}</p><hr/>` : ''}
        ${billHTML}
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
    setGeneratingPDF(true);
    try {
      // Create a temporary element to render the HTML content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = generateBillOfSaleHTML();
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.style.background = '#ffffff';
      document.body.appendChild(tempDiv);
      
      const canvas = await html2canvas(tempDiv, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        logging: false
      });
      
      document.body.removeChild(tempDiv);
      
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
      
      // Convert to blob and upload to cloud
      const pdfBlob = pdf.output('blob');
      const filename = `Bill_of_Sale-${sale?.sale_number || Date.now()}.pdf`;
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPdfUrl(file_url);
      setGeneratingPDF(false);
      toast.success("PDF saved to cloud!");
      return file_url;
    } catch (error) {
      console.error("PDF generation error:", error);
      setGeneratingPDF(false);
      toast.error("Failed to generate PDF");
      return null;
    }
  };

  const handleDownloadPDF = async () => {
    setGeneratingPDF(true);
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = generateBillOfSaleHTML();
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.style.background = '#ffffff';
      document.body.appendChild(tempDiv);
      
      const canvas = await html2canvas(tempDiv, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      document.body.removeChild(tempDiv);
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "letter");
      const imgWidth = 216;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`Bill_of_Sale-${sale?.sale_number || 'doc'}.pdf`);
      
      toast.success("PDF downloaded");
    } catch (error) {
      toast.error("Failed to download PDF");
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
    
    // Generate PDF first if not already done
    let url = pdfUrl;
    if (!url) {
      toast.loading("Generating PDF for sharing...");
      url = await generateAndUploadPDF();
      toast.dismiss();
      if (!url) return;
    }

    const message = `
*📄 BILL OF SALE*
${company?.name || 'Company'}

*Sale #:* ${sale?.sale_number || ''}
*Date:* ${sale?.sale_date ? format(new Date(sale.sale_date), 'MMMM d, yyyy') : ''}
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

_Generated by eFinAuto OFMS_
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
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            <p className="font-medium mb-2">Email will include:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Complete Bill of Sale with company details</li>
              <li>Vehicle information and pricing</li>
              <li>Tax breakdown and totals</li>
              <li>Terms and conditions</li>
            </ul>
          </div>
          <Button
            onClick={handleSendEmail}
            disabled={sending || !emailData.to}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Bill of Sale
              </>
            )}
          </Button>
        </div>
      )}

      {activeTab === "whatsapp" && (
        <div className="space-y-4">
          {/* PDF Actions */}
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
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
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
            <p className="text-sm text-green-800 mb-2">
              <strong>WhatsApp Share</strong>
            </p>
            <p className="text-sm text-green-700">
              This will generate a PDF, upload it to cloud, and open WhatsApp with the download link.
              {sale?.customer_phone && (
                <span className="block mt-1">
                  Customer phone: <strong>{sale.customer_phone}</strong>
                </span>
              )}
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