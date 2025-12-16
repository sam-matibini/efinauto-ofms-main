// Document Sharing Service - Email, WhatsApp, SMS, Google Chat
// Uses secure links for chat platforms, direct PDF for email

import { base44 } from "@/api/base44Client";
import { generateDocumentPDF } from "./DocumentPDFService";

export const generateSecureDownloadLink = async (documentId, documentType = "BOS", expiresInHours = 72) => {
  try {
    // Generate PDF if not exists
    const document = await base44.entities.Sale.get(documentId);
    
    let pdfUrl = document.pdf_file_url;
    if (!pdfUrl) {
      const result = await generateDocumentPDF(documentId, documentType);
      pdfUrl = result.pdf_url;
    }
    
    // Create tokenized secure link
    const token = btoa(`${documentId}_${Date.now()}_${Math.random()}`);
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    
    // Store link metadata
    await base44.entities.AuditLog.create({
      company_id: document.company_id,
      module: "Sale",
      action: "SECURE_LINK_GENERATED",
      record_id: documentId,
      metadata: {
        token,
        expires_at: expiresAt.toISOString(),
        pdf_url: pdfUrl
      }
    });
    
    // Return secure download URL
    const baseUrl = window.location.origin;
    return {
      secure_link: `${baseUrl}/download/${token}`,
      direct_pdf_url: pdfUrl,
      expires_at: expiresAt
    };
  } catch (error) {
    console.error("Secure link generation error:", error);
    throw error;
  }
};

export const shareViaEmail = async (documentId, recipientEmail, recipientName, message = "") => {
  try {
    const document = await base44.entities.Sale.get(documentId);
    const company = await base44.entities.Company.get(document.company_id);
    
    // Ensure PDF exists
    let pdfUrl = document.pdf_file_url;
    if (!pdfUrl) {
      const result = await generateDocumentPDF(documentId, "BOS");
      pdfUrl = result.pdf_url;
    }
    
    // Fetch PDF as blob
    const response = await fetch(pdfUrl);
    const blob = await response.blob();
    const file = new File([blob], `BOS_${document.bos_number}.pdf`, { type: "application/pdf" });
    
    // Upload for email attachment
    const { file_url: attachmentUrl } = await base44.integrations.Core.UploadFile({ file });
    
    // Send email with PDF attachment
    await base44.integrations.Core.SendEmail({
      to: recipientEmail,
      subject: `Bill of Sale - ${document.bos_number || document.sale_number}`,
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e3a8a;">Bill of Sale</h2>
          <p>Hello ${recipientName},</p>
          ${message ? `<p>${message}</p>` : ''}
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>BOS Number:</strong> ${document.bos_number || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Vehicle:</strong> ${document.vehicle_details || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Customer:</strong> ${document.customer_name || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Total:</strong> $${(document.grand_total || 0).toLocaleString()}</p>
          </div>

          <p>Please find the Bill of Sale PDF attached to this email.</p>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Best regards,<br>
            ${company.name}<br>
            ${company.email} | ${company.phone}
          </p>
        </div>
      `,
      attachments: [attachmentUrl]
    });
    
    // Log action
    await logSharingAction(document, "EMAIL", recipientEmail);
    
    return { success: true };
  } catch (error) {
    console.error("Email sharing error:", error);
    throw error;
  }
};

export const shareViaWhatsApp = async (documentId, recipientPhone) => {
  try {
    const document = await base44.entities.Sale.get(documentId);
    const { secure_link } = await generateSecureDownloadLink(documentId);
    
    const message = encodeURIComponent(
      `📄 Bill of Sale - ${document.bos_number}\n\n` +
      `Vehicle: ${document.vehicle_details}\n` +
      `Customer: ${document.customer_name}\n` +
      `Total: $${(document.grand_total || 0).toLocaleString()}\n\n` +
      `🔒 Secure Download Link:\n${secure_link}\n\n` +
      `Link expires in 72 hours.`
    );
    
    // Log action
    await logSharingAction(document, "WHATSAPP", recipientPhone);
    
    // Open WhatsApp
    const whatsappUrl = `https://wa.me/${recipientPhone.replace(/[^0-9]/g, '')}?text=${message}`;
    window.open(whatsappUrl, "_blank");
    
    return { success: true, link: secure_link };
  } catch (error) {
    console.error("WhatsApp sharing error:", error);
    throw error;
  }
};

export const shareViaSMS = async (documentId, recipientPhone) => {
  try {
    const document = await base44.entities.Sale.get(documentId);
    const { secure_link } = await generateSecureDownloadLink(documentId);
    
    const message = `Bill of Sale ${document.bos_number} - ${document.vehicle_details}. Download: ${secure_link}`;
    
    // Note: SMS sending requires SMS provider configuration in company settings
    const company = await base44.entities.Company.get(document.company_id);
    
    if (company.sms_provider === "twilio" && company.sms_settings?.twilio_account_sid) {
      // Use Twilio via integration
      // This would need a custom integration or use of SendEmail as fallback
      console.log("SMS via Twilio not yet implemented");
    }
    
    // Log action
    await logSharingAction(document, "SMS", recipientPhone);
    
    // Fallback: Open SMS app on mobile
    const smsUrl = `sms:${recipientPhone}?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, "_blank");
    
    return { success: true, link: secure_link };
  } catch (error) {
    console.error("SMS sharing error:", error);
    throw error;
  }
};

export const shareViaGoogleChat = async (documentId, webhookUrl) => {
  try {
    const document = await base44.entities.Sale.get(documentId);
    const company = await base44.entities.Company.get(document.company_id);
    const { secure_link } = await generateSecureDownloadLink(documentId);
    
    // Google Chat webhook message format
    const chatMessage = {
      text: `📄 *Bill of Sale Generated*`,
      cards: [{
        header: {
          title: `BOS #${document.bos_number}`,
          subtitle: company.name
        },
        sections: [{
          widgets: [
            { keyValue: { topLabel: "Vehicle", content: document.vehicle_details } },
            { keyValue: { topLabel: "Customer", content: document.customer_name } },
            { keyValue: { topLabel: "Total", content: `$${(document.grand_total || 0).toLocaleString()}` } },
            { 
              buttons: [{
                textButton: {
                  text: "🔒 DOWNLOAD PDF",
                  onClick: { openLink: { url: secure_link } }
                }
              }]
            }
          ]
        }]
      }]
    };
    
    // Send to Google Chat webhook
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chatMessage)
    });
    
    // Log action
    await logSharingAction(document, "GOOGLE_CHAT", webhookUrl);
    
    return { success: true, link: secure_link };
  } catch (error) {
    console.error("Google Chat sharing error:", error);
    throw error;
  }
};

export const printDocument = async (documentId) => {
  try {
    const document = await base44.entities.Sale.get(documentId);
    
    // Ensure PDF exists
    let pdfUrl = document.pdf_file_url;
    if (!pdfUrl) {
      const result = await generateDocumentPDF(documentId, "BOS");
      pdfUrl = result.pdf_url;
    }
    
    // Log print action
    await logSharingAction(document, "PRINT", "local_printer");
    
    // Open PDF in new window for printing
    const printWindow = window.open(pdfUrl, "_blank");
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Print error:", error);
    throw error;
  }
};

export const downloadDocument = async (documentId) => {
  try {
    const document = await base44.entities.Sale.get(documentId);
    
    // Ensure PDF exists
    let pdfUrl = document.pdf_file_url;
    if (!pdfUrl) {
      const result = await generateDocumentPDF(documentId, "BOS");
      pdfUrl = result.pdf_url;
    }
    
    // Log download action
    await logSharingAction(document, "DOWNLOAD", "direct");
    
    // Trigger download
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `BOS_${document.bos_number || document.id}.pdf`;
    a.click();
    
    return { success: true };
  } catch (error) {
    console.error("Download error:", error);
    throw error;
  }
};

const logSharingAction = async (document, channel, recipient) => {
  try {
    const user = await base44.auth.me();
    await base44.entities.AuditLog.create({
      company_id: document.company_id,
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name,
      module: "Sale",
      action: `DOCUMENT_SHARED_${channel}`,
      record_id: document.id,
      record_identifier: document.bos_number || document.sale_number,
      metadata: {
        channel,
        recipient,
        timestamp: new Date().toISOString()
      },
      status: "success"
    });
  } catch (error) {
    console.error("Sharing log error:", error);
  }
};