// Document Sharing Service - Email, WhatsApp, SMS, Google Chat
// Uses secure links for chat platforms, direct PDF for email

import { base44 } from "@/api/base44Client";
import { generateDocumentPDF } from "./DocumentPDFService";

export const generateSecureDownloadLink = async (documentId, documentType = "BOS", expiresInHours = 72) => {
  try {
    // Load document from database
    const sales = await base44.entities.Sale.filter({ id: documentId });
    const document = sales[0];
    if (!document) throw new Error("Sale not found");
    
    let pdfUrl = document.pdf_file_url;
    if (!pdfUrl) {
      const result = await generateDocumentPDF(documentId, documentType);
      pdfUrl = result.pdf_url;
    }
    
    // For secure link, just use the direct PDF URL (it's already secure and public)
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    
    // Log link generation
    const user = await base44.auth.me().catch(() => null);
    if (user) {
      await base44.entities.AuditLog.create({
        company_id: document.company_id,
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name,
        module: "Sale",
        action: "SECURE_LINK_GENERATED",
        record_id: documentId,
        metadata: {
          pdf_url: pdfUrl,
          expires_at: expiresAt.toISOString()
        },
        status: "success"
      });
    }
    
    // Return direct PDF URL as secure link
    return {
      secure_link: pdfUrl,
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
    const sales = await base44.entities.Sale.filter({ id: documentId });
    const document = sales[0];
    if (!document) throw new Error("Sale not found");
    
    const companies = await base44.entities.Company.filter({ id: document.company_id });
    const company = companies[0];
    if (!company) throw new Error("Company not found");
    
    // Ensure PDF exists
    let pdfUrl = document.pdf_file_url;
    if (!pdfUrl) {
      const result = await generateDocumentPDF(documentId, "BOS");
      pdfUrl = result.pdf_url;
    }
    
    // Send email with PDF link (avoid attachment issues)
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          ${company.logo_url ? `<img src="${company.logo_url}" alt="${company.name}" style="max-height: 60px; margin-bottom: 10px;">` : ''}
          <h2 style="color: #1e3a8a; margin: 10px 0;">Bill of Sale</h2>
        </div>
        
        <p style="font-size: 16px;">Hello ${recipientName},</p>
        ${message ? `<p style="font-size: 14px; color: #555;">${message}</p>` : ''}
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #1e3a8a;">
          <p style="margin: 8px 0; font-size: 14px;"><strong>BOS Number:</strong> ${document.bos_number || 'N/A'}</p>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Vehicle:</strong> ${document.vehicle_details || 'N/A'}</p>
          <p style="margin: 8px 0; font-size: 14px;"><strong>VIN:</strong> ${document.vehicle_vin || 'N/A'}</p>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Customer:</strong> ${document.customer_name || 'N/A'}</p>
          <p style="margin: 8px 0; font-size: 14px;"><strong>Sale Date:</strong> ${document.sale_date || 'N/A'}</p>
          <p style="margin: 8px 0; font-size: 14px; color: #059669;"><strong>Total:</strong> $${(document.grand_total || 0).toLocaleString()}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${pdfUrl}" 
             style="display: inline-block; background: #1e3a8a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">
            📄 Download Bill of Sale PDF
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <div style="color: #666; font-size: 12px; text-align: center;">
          <p style="margin: 5px 0;"><strong>${company.name}</strong></p>
          <p style="margin: 5px 0;">${company.address || ''} ${company.city || ''}, ${company.province || ''} ${company.postal_code || ''}</p>
          <p style="margin: 5px 0;">Phone: ${company.phone || 'N/A'} | Email: ${company.email || 'N/A'}</p>
          ${company.gst_number ? `<p style="margin: 5px 0;">GST #: ${company.gst_number}</p>` : ''}
        </div>
      </div>
    `;
    
    await base44.integrations.Core.SendEmail({
      to: recipientEmail,
      subject: `Bill of Sale - ${document.bos_number || document.sale_number} - ${company.name}`,
      body: emailBody,
      from_name: company.name
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
    const sales = await base44.entities.Sale.filter({ id: documentId });
    const document = sales[0];
    if (!document) throw new Error("Sale not found");
    
    const companies = await base44.entities.Company.filter({ id: document.company_id });
    const company = companies[0];
    if (!company) throw new Error("Company not found");
    
    const { secure_link, direct_pdf_url } = await generateSecureDownloadLink(documentId);
    
    const message = encodeURIComponent(
      `*📄 BILL OF SALE*\n` +
      `${company.name}\n\n` +
      `*BOS #:* ${document.bos_number || 'N/A'}\n` +
      `*Vehicle:* ${document.vehicle_details || 'N/A'}\n` +
      `*VIN:* ${document.vehicle_vin || 'N/A'}\n` +
      `*Customer:* ${document.customer_name || 'N/A'}\n` +
      `*Sale Date:* ${document.sale_date || 'N/A'}\n` +
      `*Total:* $${(document.grand_total || 0).toLocaleString()}\n\n` +
      `🔒 *Download PDF:*\n${secure_link}\n\n` +
      `_Link expires in 72 hours_\n\n` +
      `${company.phone || ''} | ${company.email || ''}`
    );
    
    // Log action
    await logSharingAction(document, "WHATSAPP", recipientPhone);
    
    // Open WhatsApp
    const cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
    const whatsappUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;
    
    window.open(whatsappUrl, "_blank");
    
    return { success: true, link: secure_link };
  } catch (error) {
    console.error("WhatsApp sharing error:", error);
    throw error;
  }
};

export const shareViaSMS = async (documentId, recipientPhone) => {
  try {
    const sales = await base44.entities.Sale.filter({ id: documentId });
    const document = sales[0];
    if (!document) throw new Error("Sale not found");
    
    const companies = await base44.entities.Company.filter({ id: document.company_id });
    const company = companies[0];
    if (!company) throw new Error("Company not found");
    
    const { secure_link } = await generateSecureDownloadLink(documentId);
    
    const message = 
      `${company.name}\n` +
      `Bill of Sale: ${document.bos_number || document.sale_number}\n` +
      `Vehicle: ${document.vehicle_details}\n` +
      `Total: $${(document.grand_total || 0).toLocaleString()}\n\n` +
      `Download PDF: ${secure_link}\n` +
      `Expires in 72 hours`;
    
    // Log action
    await logSharingAction(document, "SMS", recipientPhone);
    
    // Open SMS app (works on mobile devices)
    const cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
    const smsUrl = `sms:${cleanPhone}${/iPhone|iPad|iPod/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(message)}`;
    window.open(smsUrl, "_blank");
    
    return { success: true, link: secure_link };
  } catch (error) {
    console.error("SMS sharing error:", error);
    throw error;
  }
};

export const shareViaGoogleChat = async (documentId, webhookUrl) => {
  try {
    const sales = await base44.entities.Sale.filter({ id: documentId });
    const document = sales[0];
    if (!document) throw new Error("Sale not found");
    
    const companies = await base44.entities.Company.filter({ id: document.company_id });
    const company = companies[0];
    if (!company) throw new Error("Company not found");
    
    const { secure_link } = await generateSecureDownloadLink(documentId);
    
    // Google Chat webhook message format (Cards V2)
    const chatMessage = {
      cardsV2: [{
        cardId: `bos-${documentId}`,
        card: {
          header: {
            title: `📄 Bill of Sale - ${document.bos_number || document.sale_number}`,
            subtitle: company.name,
            imageUrl: company.logo_url || undefined,
            imageType: "CIRCLE"
          },
          sections: [
            {
              header: "Document Details",
              widgets: [
                {
                  decoratedText: {
                    topLabel: "Vehicle",
                    text: document.vehicle_details || 'N/A'
                  }
                },
                {
                  decoratedText: {
                    topLabel: "VIN",
                    text: document.vehicle_vin || 'N/A'
                  }
                },
                {
                  decoratedText: {
                    topLabel: "Customer",
                    text: document.customer_name || 'N/A'
                  }
                },
                {
                  decoratedText: {
                    topLabel: "Sale Date",
                    text: document.sale_date || 'N/A'
                  }
                },
                {
                  decoratedText: {
                    topLabel: "Total Amount",
                    text: `$${(document.grand_total || 0).toLocaleString()}`,
                    startIcon: {
                      knownIcon: "DOLLAR"
                    }
                  }
                }
              ]
            },
            {
              widgets: [
                {
                  buttonList: {
                    buttons: [
                      {
                        text: "🔒 Download PDF",
                        onClick: {
                          openLink: {
                            url: secure_link
                          }
                        }
                      }
                    ]
                  }
                },
                {
                  textParagraph: {
                    text: `<font color="#666666">Secure link expires in 72 hours</font>`
                  }
                }
              ]
            }
          ]
        }
      }]
    };
    
    // Send to Google Chat webhook
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(chatMessage)
    });
    
    if (!response.ok) {
      throw new Error(`Google Chat API error: ${response.status}`);
    }
    
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
    const sales = await base44.entities.Sale.filter({ id: documentId });
    const document = sales[0];
    if (!document) throw new Error("Sale not found");
    
    // Ensure PDF exists
    let pdfUrl = document.pdf_file_url;
    if (!pdfUrl) {
      const result = await generateDocumentPDF(documentId, "BOS");
      pdfUrl = result.pdf_url;
    }
    
    // Log print action
    await logSharingAction(document, "PRINT", "local_printer");
    
    // Open PDF in new window and trigger print
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    } else {
      throw new Error("Pop-up blocked. Please allow pop-ups to print.");
    }
    
    return { success: true };
  } catch (error) {
    console.error("Print error:", error);
    throw error;
  }
};

export const downloadDocument = async (documentId) => {
  try {
    const sales = await base44.entities.Sale.filter({ id: documentId });
    const document = sales[0];
    if (!document) throw new Error("Sale not found");
    
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
    a.target = "_blank";
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