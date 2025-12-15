import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

/**
 * Sales Notification Service
 * Handles email notifications for key sales events
 */

export const sendBOSCreatedNotification = async (sale, company) => {
  try {
    if (!company?.notification_settings?.enable_email_notifications || 
        !company?.notification_settings?.notify_bos_created) {
      return;
    }

    const recipients = company.notification_settings.notification_recipients || 
                      [company.contact_person_email, company.email].filter(Boolean);

    if (!recipients.length) return;

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e3a8a; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">New Bill of Sale Created</h2>
        </div>
        
        <div style="padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>A new Bill of Sale has been created in the system.</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Sale Number:</td>
                <td style="padding: 8px 0;">${sale.sale_number}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Status:</td>
                <td style="padding: 8px 0;"><span style="background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px;">Draft</span></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Customer:</td>
                <td style="padding: 8px 0;">${sale.customer_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Vehicle:</td>
                <td style="padding: 8px 0;">${sale.vehicle_details}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">VIN:</td>
                <td style="padding: 8px 0;">${sale.vehicle_vin || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Sale Price:</td>
                <td style="padding: 8px 0; font-size: 18px; color: #10b981;">$${sale.sale_price?.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Sale Date:</td>
                <td style="padding: 8px 0;">${sale.sale_date ? format(new Date(sale.sale_date), 'MMM d, yyyy') : 'N/A'}</td>
              </tr>
            </table>
          </div>
          
          <p style="margin-top: 20px; padding: 12px; background: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 4px; font-size: 14px;">
            <strong>📋 Next Step:</strong> This BOS is currently a draft. Finalize it to assign a permanent BOS number.
          </p>
        </div>
      </div>
    `;

    for (const recipient of recipients) {
      await base44.integrations.Core.SendEmail({
        from_name: company.name,
        to: recipient,
        subject: `New Bill of Sale Created - ${sale.sale_number}`,
        body: emailBody
      });

      await base44.entities.NotificationLog.create({
        company_id: company.id,
        notification_type: 'bos_created',
        recipient_email: recipient,
        subject: `New Bill of Sale Created - ${sale.sale_number}`,
        sent_at: new Date().toISOString(),
        status: 'sent',
        reference_type: 'Sale',
        reference_id: sale.id
      });
    }
  } catch (error) {
    console.error('Failed to send BOS created notification:', error);
  }
};

export const sendBOSFinalizedNotification = async (sale, company) => {
  try {
    if (!company?.notification_settings?.enable_email_notifications || 
        !company?.notification_settings?.notify_bos_finalized) {
      return;
    }

    const recipients = company.notification_settings.notification_recipients || 
                      [company.contact_person_email, company.email].filter(Boolean);

    if (!recipients.length) return;

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">✓ Bill of Sale Finalized</h2>
        </div>
        
        <div style="padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>A Bill of Sale has been finalized and assigned a permanent BOS number.</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; margin-bottom: 15px;">
              <p style="margin: 0; font-size: 12px; color: #6b7280; font-weight: 600;">BOS NUMBER</p>
              <p style="margin: 5px 0 0; font-size: 20px; font-weight: bold; font-family: monospace; color: #1e293b; letter-spacing: 1px;">${sale.bos_number}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Customer:</td>
                <td style="padding: 8px 0;">${sale.customer_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Vehicle:</td>
                <td style="padding: 8px 0;">${sale.vehicle_details}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">VIN:</td>
                <td style="padding: 8px 0;">${sale.vehicle_vin || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Total Amount:</td>
                <td style="padding: 8px 0; font-size: 18px; color: #10b981;">$${(sale.grand_total || sale.sale_price)?.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Finalized:</td>
                <td style="padding: 8px 0;">${sale.bos_issued_date ? format(new Date(sale.bos_issued_date), 'MMM d, yyyy h:mm a') : 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Finalized By:</td>
                <td style="padding: 8px 0;">${sale.bos_issued_by || 'N/A'}</td>
              </tr>
            </table>
          </div>
          
          <p style="margin-top: 20px; padding: 12px; background: #d1fae5; border-left: 4px solid #10b981; border-radius: 4px; font-size: 14px;">
            <strong>✓ Status:</strong> This BOS is now permanent and cannot be edited or deleted.
          </p>
        </div>
      </div>
    `;

    for (const recipient of recipients) {
      await base44.integrations.Core.SendEmail({
        from_name: company.name,
        to: recipient,
        subject: `BOS Finalized - ${sale.bos_number}`,
        body: emailBody
      });

      await base44.entities.NotificationLog.create({
        company_id: company.id,
        notification_type: 'bos_finalized',
        recipient_email: recipient,
        subject: `BOS Finalized - ${sale.bos_number}`,
        sent_at: new Date().toISOString(),
        status: 'sent',
        reference_type: 'Sale',
        reference_id: sale.id
      });
    }
  } catch (error) {
    console.error('Failed to send BOS finalized notification:', error);
  }
};

export const sendSignatureRequestNotification = async (sale, company, signerEmail, signerName, signerType) => {
  try {
    if (!company?.notification_settings?.enable_email_notifications || 
        !company?.notification_settings?.notify_signature_request) {
      return;
    }

    const recipients = company.notification_settings.notification_recipients || 
                      [company.contact_person_email, company.email].filter(Boolean);

    if (!recipients.length) return;

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #6366f1; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">✉️ Signature Request Sent</h2>
        </div>
        
        <div style="padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>A digital signature request has been sent for a Bill of Sale.</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">BOS Number:</td>
                <td style="padding: 8px 0; font-family: monospace;">${sale.bos_number || sale.sale_number}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Signer Type:</td>
                <td style="padding: 8px 0;"><span style="background: #e0e7ff; color: #4338ca; padding: 4px 8px; border-radius: 4px; text-transform: capitalize;">${signerType}</span></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Signer Name:</td>
                <td style="padding: 8px 0;">${signerName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Signer Email:</td>
                <td style="padding: 8px 0;">${signerEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Vehicle:</td>
                <td style="padding: 8px 0;">${sale.vehicle_details}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Customer:</td>
                <td style="padding: 8px 0;">${sale.customer_name}</td>
              </tr>
            </table>
          </div>
          
          <p style="margin-top: 20px; padding: 12px; background: #e0e7ff; border-left: 4px solid #6366f1; border-radius: 4px; font-size: 14px;">
            <strong>📧 Notification Sent:</strong> The ${signerType} will receive an email with a link to digitally sign the BOS.
          </p>
        </div>
      </div>
    `;

    for (const recipient of recipients) {
      await base44.integrations.Core.SendEmail({
        from_name: company.name,
        to: recipient,
        subject: `Signature Request Sent - ${signerName} (${signerType})`,
        body: emailBody
      });

      await base44.entities.NotificationLog.create({
        company_id: company.id,
        notification_type: 'signature_request_sent',
        recipient_email: recipient,
        subject: `Signature Request Sent - ${signerName}`,
        sent_at: new Date().toISOString(),
        status: 'sent',
        reference_type: 'Sale',
        reference_id: sale.id
      });
    }
  } catch (error) {
    console.error('Failed to send signature request notification:', error);
  }
};

export const sendCompletionCertificateNotification = async (sale, company) => {
  try {
    if (!company?.notification_settings?.enable_email_notifications || 
        !company?.notification_settings?.notify_completion_certificate) {
      return;
    }

    const recipients = company.notification_settings.notification_recipients || 
                      [company.contact_person_email, company.email].filter(Boolean);

    if (!recipients.length) return;

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #8b5cf6; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">🎉 Completion Certificate Generated</h2>
        </div>
        
        <div style="padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>A Certificate of Completion has been generated for a fully signed Bill of Sale.</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; margin-bottom: 15px;">
              <p style="margin: 0; font-size: 12px; color: #6b7280; font-weight: 600;">BOS NUMBER</p>
              <p style="margin: 5px 0 0; font-size: 20px; font-weight: bold; font-family: monospace; color: #1e293b; letter-spacing: 1px;">${sale.bos_number}</p>
            </div>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Customer:</td>
                <td style="padding: 8px 0;">${sale.customer_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Vehicle:</td>
                <td style="padding: 8px 0;">${sale.vehicle_details}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">VIN:</td>
                <td style="padding: 8px 0;">${sale.vehicle_vin || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Total Amount:</td>
                <td style="padding: 8px 0; font-size: 18px; color: #10b981;">$${(sale.grand_total || sale.sale_price)?.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Buyer Signed:</td>
                <td style="padding: 8px 0;">${sale.buyer_signed_at ? format(new Date(sale.buyer_signed_at), 'MMM d, yyyy h:mm a') : 'Pending'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #374151;">Seller Signed:</td>
                <td style="padding: 8px 0;">${sale.seller_signed_at ? format(new Date(sale.seller_signed_at), 'MMM d, yyyy h:mm a') : 'Pending'}</td>
              </tr>
            </table>
          </div>
          
          <p style="margin-top: 20px; padding: 12px; background: #f3e8ff; border-left: 4px solid #8b5cf6; border-radius: 4px; font-size: 14px;">
            <strong>✓ Complete:</strong> All parties have signed. The transaction is complete and the certificate is available for download.
          </p>
        </div>
      </div>
    `;

    for (const recipient of recipients) {
      await base44.integrations.Core.SendEmail({
        from_name: company.name,
        to: recipient,
        subject: `Completion Certificate Generated - ${sale.bos_number}`,
        body: emailBody
      });

      await base44.entities.NotificationLog.create({
        company_id: company.id,
        notification_type: 'completion_certificate_generated',
        recipient_email: recipient,
        subject: `Completion Certificate Generated - ${sale.bos_number}`,
        sent_at: new Date().toISOString(),
        status: 'sent',
        reference_type: 'Sale',
        reference_id: sale.id
      });
    }
  } catch (error) {
    console.error('Failed to send completion certificate notification:', error);
  }
};