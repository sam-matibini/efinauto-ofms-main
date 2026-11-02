// Document Sharing Service - Email, WhatsApp, SMS, Google Chat
// Uses secure links for chat platforms, direct PDF for email

import { supabase } from "@/api/supabaseClient";
import { generateDocumentPDF } from "./DocumentPDFService";
import { getSaleDocumentPaymentLink, paymentLinkDocumentHtml } from "@/lib/paymentLinks";

/**
 * Upload a generated BOS PDF to Supabase Storage (default bucket) and return
 * a URL the recipient can open: a signed URL valid for `expiresInSec`, or
 * the public URL if signing isn't permitted. Each share gets its own file so
 * it reflects the current balance / payment link.
 */
const uploadSharedPDF = async (pdfBlob, document, expiresInSec) => {
  const safeName = String(document.bos_number || document.sale_number || document.id).replace(/[^\w.-]+/g, "_");
  const path = `bills-of-sale/${document.company_id}/${document.id}/BOS_${safeName}_${Date.now()}.pdf`;
  const { url: publicUrl } = await supabase.storage.uploadFile({
    path,
    file: pdfBlob,
    contentType: "application/pdf",
  });
  try {
    return await supabase.storage.createSignedUrl(path, expiresInSec);
  } catch (error) {
    console.warn("Could not sign BOS PDF URL; using its public URL:", error);
    if (!publicUrl) throw error;
    return publicUrl;
  }
};

/** Open `url` in a tab pre-opened by the caller (avoids popup blockers after async work), or a new one. */
const openInTab = (url, targetWindow) => {
  if (targetWindow && !targetWindow.closed) {
    targetWindow.location.href = url;
  } else {
    window.open(url, "_blank");
  }
};

export const generateSecureDownloadLink = async (documentId, documentType = "BOS", expiresInHours = 72) => {
  try {
    // Load document from database
    const sales = await supabase.entities.Sale.filter({ id: documentId });
    const document = sales[0];
    if (!document) throw new Error("Sale not found");
    
    // Generate the PDF, then upload it so the link works on the recipient's
    // device (the blob: URL from generateDocumentPDF only exists in this tab).
    const result = await generateDocumentPDF(documentId, documentType);
    URL.revokeObjectURL(result.pdf_url);
    const expiresInSec = Math.round(expiresInHours * 60 * 60);
    const pdfUrl = await uploadSharedPDF(result.pdf_blob, document, expiresInSec);

    // Log link generation
    const user = await supabase.auth.me().catch(() => null);
    if (user) {
      await supabase.entities.AuditLog.create({
        company_id: document.company_id,
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name,
        module: "Sale",
        action: "SECURE_LINK_GENERATED",
        record_id: documentId,
        metadata: {
          client_side: true
        },
        status: "success"
      });
    }
    
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    
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
    const sales = await supabase.entities.Sale.filter({ id: documentId });
    const document = sales[0];
    if (!document) throw new Error("Sale not found");
    
    const companies = await supabase.entities.Company.filter({ id: document.company_id });
    const company = companies[0];
    if (!company) throw new Error("Company not found");
    
    // Always build a fresh, uploaded PDF so the email carries the current
    // balance and payment link, and the download link works for the recipient.
    const { secure_link: pdfUrl } = await generateSecureDownloadLink(documentId);

    const payLink = await getSaleDocumentPaymentLink(document);

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
        ${paymentLinkDocumentHtml(payLink)}
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <div style="color: #666; font-size: 12px; text-align: center;">
          <p style="margin: 5px 0;"><strong>${company.name}</strong></p>
          <p style="margin: 5px 0;">${company.address || ''} ${company.city || ''}, ${company.province || ''} ${company.postal_code || ''}</p>
          <p style="margin: 5px 0;">Phone: ${company.phone || 'N/A'} | Email: ${company.email || 'N/A'}</p>
          ${company.gst_number ? `<p style="margin: 5px 0;">GST #: ${company.gst_number}</p>` : ''}
        </div>
      </div>
    `;
    
    await supabase.integrations.Core.SendEmail({
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

/**
 * @param {Window} [targetWindow] a tab opened synchronously in the click
 *   handler; the wa.me URL is loaded into it once the PDF is uploaded.
 */
export const shareViaWhatsApp = async (documentId, recipientPhone, targetWindow = null) => {
  try {
    const sales = await supabase.entities.Sale.filter({ id: documentId });
    const document = sales[0];
    if (!document) throw new Error("Sale not found");
    
    const companies = await supabase.entities.Company.filter({ id: document.company_id });
    const company = companies[0];
    if (!company) throw new Error("Company not found");
    
    const { secure_link } = await generateSecureDownloadLink(documentId);
    const payLink = await getSaleDocumentPaymentLink(document);
    
    const message = encodeURIComponent(
      `*📄 BILL OF SALE*\n` +
      `${company.name}\n\n` +
      `*BOS #:* ${document.bos_number || 'N/A'}\n` +
      `*Vehicle:* ${document.vehicle_details || 'N/A'}\n` +
      `*VIN:* ${document.vehicle_vin || 'N/A'}\n` +
      `*Customer:* ${document.customer_name || 'N/A'}\n` +
      `*Sale Date:* ${document.sale_date || 'N/A'}\n` +
      `*Total:* $${(document.grand_total || 0).toLocaleString()}\n\n` +
      (payLink ? `💳 *Pay online (${Number(payLink.amount).toFixed(2)} ${payLink.currency}):*\n${payLink.url}\n\n` : '') +
      `🔒 *Download PDF:*\n${secure_link}\n\n` +
      `_Link expires in 72 hours_\n\n` +
      `${company.phone || ''} | ${company.email || ''}`
    );
    
    // Log action
    await logSharingAction(document, "WHATSAPP", recipientPhone);
    
    // Open WhatsApp
    const cleanPhone = (recipientPhone || '').replace(/[^0-9]/g, '');
    const whatsappUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;

    openInTab(whatsappUrl, targetWindow);

    return { success: true, link: secure_link };
  } catch (error) {
    if (targetWindow && !targetWindow.closed) targetWindow.close();
    console.error("WhatsApp sharing error:", error);
    throw error;
  }
};

export const shareViaSMS = async (documentId, recipientPhone) => {
  try {
    const sales = await supabase.entities.Sale.filter({ id: documentId });
    const document = sales[0];
    if (!document) throw new Error("Sale not found");
    
    const companies = await supabase.entities.Company.filter({ id: document.company_id });
    const company = companies[0];
    if (!company) throw new Error("Company not found");
    
    const { secure_link } = await generateSecureDownloadLink(documentId);
    const payLink = await getSaleDocumentPaymentLink(document);
    
    const message = 
      `${company.name}\n` +
      `Bill of Sale: ${document.bos_number || document.sale_number}\n` +
      `Vehicle: ${document.vehicle_details}\n` +
      `Total: $${(document.grand_total || 0).toLocaleString()}\n\n` +
      (payLink ? `Pay online: ${payLink.url}\n` : '') +
      `Download PDF: ${secure_link}\n` +
      `Expires in 72 hours`;
    
    // Log action
    await logSharingAction(document, "SMS", recipientPhone);
    
    // Open SMS app (works on mobile devices)
    const cleanPhone = (recipientPhone || '').replace(/[^0-9]/g, '');
    const smsUrl = `sms:${cleanPhone}${/iPhone|iPad|iPod/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(message)}`;
    // sms: hands off to the messaging app without leaving the page, and
    // (unlike window.open after an await) isn't caught by popup blockers.
    window.location.href = smsUrl;
    
    return { success: true, link: secure_link };
  } catch (error) {
    console.error("SMS sharing error:", error);
    throw error;
  }
};

export const shareViaGoogleChat = async (documentId, webhookUrl) => {
  try {
    const sales = await supabase.entities.Sale.filter({ id: documentId });
    const document = sales[0];
    if (!document) throw new Error("Sale not found");
    
    const companies = await supabase.entities.Company.filter({ id: document.company_id });
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
    const sales = await supabase.entities.Sale.filter({ id: documentId });
    const document = sales[0];
    if (!document) throw new Error("Sale not found");
    
    // Log print action
    await logSharingAction(document, "PRINT", "local_printer");
    
    // Use browser's native print for the current page
    window.print();
    
    return { success: true };
  } catch (error) {
    console.error("Print error:", error);
    throw error;
  }
};

export const downloadDocument = async (documentId) => {
  try {
    const sales = await supabase.entities.Sale.filter({ id: documentId });
    const document = sales[0];
    if (!document) throw new Error("Sale not found");
    
    // Generate PDF from current DOM element
    const result = await generateDocumentPDF(documentId, "BOS");
    
    // Log download action
    await logSharingAction(document, "DOWNLOAD", "direct");
    
    // Trigger download
    const a = window.document.createElement("a");
    a.href = result.pdf_url;
    a.download = `BOS_${document.bos_number || document.id}.pdf`;
    a.click();
    
    // Clean up blob URL
    setTimeout(() => URL.revokeObjectURL(result.pdf_url), 100);
    
    return { success: true };
  } catch (error) {
    console.error("Download error:", error);
    throw error;
  }
};

const logSharingAction = async (document, channel, recipient) => {
  try {
    const user = await supabase.auth.me();
    await supabase.entities.AuditLog.create({
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