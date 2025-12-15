import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Shield, Check } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { sendCompletionCertificateNotification } from "./SalesNotificationService";

export default function CompletionCertificate({ sale, company, signatureMetadata }) {
  const generateCertificate = async () => {
    if (!sale || !company) {
      toast.error("Required data is missing");
      return;
    }

    // Send notification
    try {
      await sendCompletionCertificateNotification(sale, company);
    } catch (error) {
      console.error("Failed to send notification:", error);
    }

    const certificateHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Certificate of Completion - ${sale.bos_number}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
          .header { text-align: center; border-bottom: 3px solid #1e3a8a; padding-bottom: 20px; margin-bottom: 30px; }
          .seal { width: 80px; height: 80px; margin: 0 auto 20px; }
          .title { font-size: 24px; font-weight: bold; color: #1e3a8a; margin-bottom: 10px; }
          .subtitle { color: #666; font-size: 14px; }
          .section { margin: 20px 0; padding: 15px; background: #f9fafb; border-left: 4px solid #1e3a8a; }
          .section-title { font-weight: bold; color: #1e3a8a; margin-bottom: 10px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px; }
          .field { margin-bottom: 8px; }
          .field-label { font-size: 12px; color: #666; }
          .field-value { font-weight: 500; color: #000; }
          .signature-box { border: 2px solid #e5e7eb; padding: 15px; margin: 10px 0; }
          .signature-status { display: flex; align-items: center; gap: 8px; color: #059669; font-weight: 600; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; font-size: 12px; color: #666; }
          .legal { font-size: 10px; color: #999; margin-top: 20px; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="seal">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="48" stroke="#1e3a8a" stroke-width="2"/>
              <path d="M50 20 L50 45 L65 45 L50 60 L35 45 L50 45 L50 20" fill="#1e3a8a"/>
              <circle cx="50" cy="70" r="5" fill="#1e3a8a"/>
            </svg>
          </div>
          <div class="title">Certificate of Completion</div>
          <div class="subtitle">Digital Signature Verification</div>
        </div>

        <div class="section">
          <div class="section-title">Document Information</div>
          <div class="grid">
            <div class="field">
              <div class="field-label">Document Type</div>
              <div class="field-value">Bill of Sale</div>
            </div>
            <div class="field">
              <div class="field-label">BOS Number</div>
              <div class="field-value">${sale.bos_number || sale.sale_number || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Issued Date</div>
              <div class="field-value">${sale.bos_issued_date ? format(new Date(sale.bos_issued_date), 'MMMM d, yyyy') : 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Completion Date</div>
              <div class="field-value">${format(new Date(), 'MMMM d, yyyy h:mm a')}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Vehicle Information</div>
          <div class="field">
            <div class="field-label">Vehicle</div>
            <div class="field-value">${sale.vehicle_details || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="field-label">VIN</div>
            <div class="field-value">${sale.vehicle_vin || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="field-label">Sale Price</div>
            <div class="field-value">$${(sale.sale_price || 0).toLocaleString()}</div>
          </div>
        </div>

        ${signatureMetadata?.buyer ? `
        <div class="section">
          <div class="section-title">Buyer Signature</div>
          <div class="signature-box">
            <div class="signature-status">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 0C4.486 0 0 4.486 0 10s4.486 10 10 10 10-4.486 10-10S15.514 0 10 0zm-2 14.414l-3.707-3.707 1.414-1.414L8 11.586l5.293-5.293 1.414 1.414L8 14.414z"/>
              </svg>
              Electronically Signed
            </div>
            <div class="grid">
              <div class="field">
                <div class="field-label">Name</div>
                <div class="field-value">${signatureMetadata.buyer.name || 'N/A'}</div>
              </div>
              <div class="field">
                <div class="field-label">Signed At</div>
                <div class="field-value">${signatureMetadata.buyer.signedAt ? format(new Date(signatureMetadata.buyer.signedAt), 'MMM d, yyyy h:mm:ss a') : 'N/A'}</div>
              </div>
              ${signatureMetadata.buyer.email ? `
              <div class="field">
                <div class="field-label">Email</div>
                <div class="field-value">${signatureMetadata.buyer.email}</div>
              </div>
              ` : ''}
              ${signatureMetadata.buyer.ipAddress ? `
              <div class="field">
                <div class="field-label">IP Address</div>
                <div class="field-value">${signatureMetadata.buyer.ipAddress}</div>
              </div>
              ` : ''}
            </div>
          </div>
        </div>
        ` : ''}

        ${signatureMetadata?.seller ? `
        <div class="section">
          <div class="section-title">Seller Signature</div>
          <div class="signature-box">
            <div class="signature-status">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 0C4.486 0 0 4.486 0 10s4.486 10 10 10 10-4.486 10-10S15.514 0 10 0zm-2 14.414l-3.707-3.707 1.414-1.414L8 11.586l5.293-5.293 1.414 1.414L8 14.414z"/>
              </svg>
              Electronically Signed
            </div>
            <div class="grid">
              <div class="field">
                <div class="field-label">Name</div>
                <div class="field-value">${signatureMetadata.seller.name || 'N/A'}</div>
              </div>
              <div class="field">
                <div class="field-label">Signed At</div>
                <div class="field-value">${signatureMetadata.seller.signedAt ? format(new Date(signatureMetadata.seller.signedAt), 'MMM d, yyyy h:mm:ss a') : 'N/A'}</div>
              </div>
              ${signatureMetadata.seller.email ? `
              <div class="field">
                <div class="field-label">Email</div>
                <div class="field-value">${signatureMetadata.seller.email}</div>
              </div>
              ` : ''}
              ${signatureMetadata.seller.ipAddress ? `
              <div class="field">
                <div class="field-label">IP Address</div>
                <div class="field-value">${signatureMetadata.seller.ipAddress}</div>
              </div>
              ` : ''}
            </div>
          </div>
        </div>
        ` : ''}

        <div class="footer">
          <div style="font-weight: 600; color: #000; margin-bottom: 10px;">
            ${company?.name || 'Company'}
          </div>
          <div>${company?.address || ''}</div>
          <div>${[company?.city, company?.province, company?.postal_code].filter(Boolean).join(', ')}</div>
          <div style="margin-top: 10px;">${company?.phone || ''} | ${company?.email || ''}</div>
          
          <div class="legal">
            This Certificate of Completion serves as proof that all required parties have electronically signed 
            the above-referenced Bill of Sale. The signatures were captured using secure electronic signature technology 
            and are legally binding under the Electronic Signatures in Global and National Commerce Act (ESIGN Act) 
            and the Uniform Electronic Transactions Act (UETA). This certificate includes tamper-evident seals and 
            audit trail data to ensure document integrity. All signature events were timestamped and include IP address 
            verification for authentication purposes.
          </div>
        </div>
      </body>
      </html>
    `;

    // Open in new window for printing/saving
    const printWindow = window.open('', '_blank');
    printWindow.document.write(certificateHtml);
    printWindow.document.close();
    
    toast.success("Certificate of Completion opened");
  };

  const isCompleted = signatureMetadata?.buyer && signatureMetadata?.seller;

  if (!isCompleted) return null;

  return (
    <div className="mt-4">
      <Button 
        onClick={generateCertificate}
        variant="outline"
        className="w-full border-green-300 text-green-700 hover:bg-green-50"
      >
        <Shield className="w-4 h-4 mr-2" />
        Download Certificate of Completion
        <Check className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}