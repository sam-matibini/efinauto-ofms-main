import { base44 } from "@/api/base44Client";

export async function sendNotification({
  companyId,
  customerId,
  customerName,
  customerEmail,
  notificationType,
  subject,
  message,
  referenceId,
  referenceType,
  deliveryMethod = "email"
}) {
  try {
    // Check if customer has preferences configured
    const preferences = await base44.entities.NotificationPreference.filter({ 
      customer_id: customerId 
    });

    const pref = preferences[0];

    // Check if this notification type is enabled for the customer
    if (pref) {
      const typeMap = {
        'service_reminder': 'service_reminders',
        'appointment_reminder': 'appointment_reminders',
        'sale_status_update': 'sale_status_updates',
        'repair_status_update': 'repair_status_updates',
        'export_update': 'export_updates'
      };

      const prefKey = typeMap[notificationType];
      if (prefKey && !pref[prefKey]) {
        console.log(`Notification type ${notificationType} is disabled for customer ${customerId}`);
        return { success: false, reason: 'disabled_by_customer' };
      }

      deliveryMethod = pref.notification_method === "both" ? "email" : pref.notification_method;
    }

    // Create notification log
    const logData = {
      company_id: companyId,
      customer_id: customerId,
      customer_name: customerName,
      customer_email: customerEmail,
      notification_type: notificationType,
      subject,
      message,
      delivery_method: deliveryMethod,
      status: "pending",
      reference_id: referenceId,
      reference_type: referenceType
    };

    const log = await base44.entities.NotificationLog.create(logData);

    // Send notification via email
    if (deliveryMethod === "email" && customerEmail) {
      try {
        await base44.integrations.Core.SendEmail({
          to: customerEmail,
          subject: subject,
          body: message
        });

        // Update log as sent
        await base44.entities.NotificationLog.update(log.id, {
          status: "sent",
          sent_date: new Date().toISOString()
        });

        return { success: true, logId: log.id };
      } catch (emailError) {
        // Update log as failed
        await base44.entities.NotificationLog.update(log.id, {
          status: "failed",
          error_message: emailError.message || "Failed to send email"
        });

        return { success: false, error: emailError.message };
      }
    }

    // SMS sending would go here (not implemented in this example)
    if (deliveryMethod === "sms") {
      await base44.entities.NotificationLog.update(log.id, {
        status: "sent",
        sent_date: new Date().toISOString()
      });
      return { success: true, logId: log.id, note: "SMS sending not yet implemented" };
    }

    return { success: false, reason: 'no_delivery_method' };
  } catch (error) {
    console.error("Notification error:", error);
    return { success: false, error: error.message };
  }
}

// Helper functions for specific notification types
export async function notifySaleStatusChange(sale, companyId) {
  if (!sale.customer_email) return;

  const statusMessages = {
    'pending': 'Your vehicle purchase is pending confirmation.',
    'confirmed': 'Your vehicle purchase has been confirmed!',
    'delivered': 'Your vehicle has been delivered. Thank you for your purchase!',
    'cancelled': 'Your vehicle purchase has been cancelled.'
  };

  await sendNotification({
    companyId,
    customerId: sale.customer_id,
    customerName: sale.customer_name,
    customerEmail: sale.customer_email,
    notificationType: 'sale_status_update',
    subject: `Sale Status Update - ${sale.sale_number}`,
    message: `
Hello ${sale.customer_name},

${statusMessages[sale.status] || 'Your sale status has been updated.'}

Sale Number: ${sale.sale_number}
Vehicle: ${sale.vehicle_details}
Status: ${sale.status}

Thank you for choosing our dealership!

Best regards,
eFinAuto Center
    `,
    referenceId: sale.id,
    referenceType: 'Sale'
  });
}

export async function notifyRepairStatusChange(repair, companyId) {
  if (!repair.customer_phone && !repair.customer_email) return;

  const statusMessages = {
    'pending': 'Your repair order has been received and is pending review.',
    'in_progress': 'Our technicians have started working on your vehicle.',
    'waiting_parts': 'Your repair is on hold waiting for parts to arrive.',
    'completed': 'Your vehicle repair is complete and ready for pickup!',
    'picked_up': 'Thank you for picking up your vehicle.',
    'cancelled': 'Your repair order has been cancelled.'
  };

  await sendNotification({
    companyId,
    customerId: repair.customer_id,
    customerName: repair.customer_name,
    customerEmail: repair.customer_email || repair.customer_phone,
    notificationType: 'repair_status_update',
    subject: `Repair Status Update - ${repair.order_number}`,
    message: `
Hello ${repair.customer_name},

${statusMessages[repair.status] || 'Your repair status has been updated.'}

Order Number: ${repair.order_number}
Vehicle: ${repair.vehicle_year} ${repair.vehicle_make} ${repair.vehicle_model}
Status: ${repair.status}
${repair.estimated_completion ? `Estimated Completion: ${new Date(repair.estimated_completion).toLocaleDateString()}` : ''}

Total Cost: $${repair.total_cost?.toFixed(2) || '0.00'}

If you have any questions, please don't hesitate to contact us.

Best regards,
eFinAuto Center
    `,
    referenceId: repair.id,
    referenceType: 'RepairOrder'
  });
}

export async function sendServiceReminder(customer, companyId, reminderDetails) {
  await sendNotification({
    companyId,
    customerId: customer.id,
    customerName: customer.full_name,
    customerEmail: customer.email,
    notificationType: 'service_reminder',
    subject: 'Service Reminder - Time for Maintenance',
    message: `
Hello ${customer.full_name},

This is a friendly reminder that your vehicle may be due for scheduled maintenance.

${reminderDetails || 'Regular maintenance helps keep your vehicle running smoothly and can prevent costly repairs.'}

Please contact us to schedule your service appointment at your convenience.

Best regards,
eFinAuto Center
    `,
    referenceId: customer.id,
    referenceType: 'Customer'
  });
}