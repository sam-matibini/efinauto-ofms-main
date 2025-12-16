/**
 * Shipment Alert Service
 * Provides proactive notifications for delays, exceptions, and critical events
 */

import { base44 } from "@/api/base44Client";
import { differenceInDays } from "date-fns";

export const ShipmentAlertService = {
  /**
   * Check for potential delays
   */
  async checkForDelays(tracking) {
    const alerts = [];

    // Check if shipment is delayed
    if (tracking.current_status === 'delayed' || tracking.delay_reason) {
      alerts.push({
        type: "delay_detected",
        severity: "high",
        tracking_id: tracking.id,
        message: `Shipment ${tracking.tracking_number} is delayed: ${tracking.delay_reason || 'Unknown reason'}`,
        timestamp: new Date().toISOString()
      });
    }

    // Check if estimated delivery is past due
    if (tracking.estimated_delivery) {
      const daysUntilDelivery = differenceInDays(new Date(tracking.estimated_delivery), new Date());
      
      if (daysUntilDelivery < 0 && tracking.current_status !== 'delivered') {
        alerts.push({
          type: "overdue_delivery",
          severity: "high",
          tracking_id: tracking.id,
          message: `Shipment ${tracking.tracking_number} is overdue by ${Math.abs(daysUntilDelivery)} days`,
          timestamp: new Date().toISOString()
        });
      } else if (daysUntilDelivery <= 2 && tracking.current_status === 'in_transit') {
        alerts.push({
          type: "delivery_soon",
          severity: "info",
          tracking_id: tracking.id,
          message: `Shipment ${tracking.tracking_number} will arrive in ${daysUntilDelivery} days`,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Check for customs delays
    if (tracking.current_status === 'customs_clearance') {
      const lastEvent = tracking.tracking_events?.[0];
      if (lastEvent) {
        const daysInCustoms = differenceInDays(new Date(), new Date(lastEvent.timestamp));
        if (daysInCustoms > 3) {
          alerts.push({
            type: "customs_delay",
            severity: "medium",
            tracking_id: tracking.id,
            message: `Shipment ${tracking.tracking_number} has been in customs for ${daysInCustoms} days`,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    return alerts;
  },

  /**
   * Check for exceptions
   */
  async checkForExceptions(tracking) {
    const alerts = [];

    if (tracking.current_status === 'exception') {
      alerts.push({
        type: "exception",
        severity: "critical",
        tracking_id: tracking.id,
        message: `Exception reported for shipment ${tracking.tracking_number}`,
        timestamp: new Date().toISOString()
      });
    }

    return alerts;
  },

  /**
   * Send proactive alert notification
   */
  async sendProactiveAlert(alert, tracking) {
    try {
      const exportOrder = await base44.entities.ExportOrder.filter({ id: tracking.export_order_id });
      const order = exportOrder?.[0];

      if (!order) return { success: false, error: "Order not found" };

      const severityEmoji = {
        info: "ℹ️",
        medium: "⚠️",
        high: "🚨",
        critical: "🔴"
      };

      const subject = `${severityEmoji[alert.severity]} Shipment Alert: ${alert.type.replace(/_/g, ' ').toUpperCase()}`;

      // Create notification log
      await base44.entities.NotificationLog.create({
        company_id: order.company_id,
        notification_type: "export_update",
        recipient_email: order.consignee_email || 'customer@example.com',
        subject: subject,
        body: alert.message,
        sent_at: new Date().toISOString(),
        delivery_method: "email",
        status: "sent",
        reference_type: "ShipmentTracking",
        reference_id: tracking.id
      });

      // Send email notification
      if (order.consignee_email) {
        await base44.integrations.Core.SendEmail({
          to: order.consignee_email,
          subject: subject,
          body: `${alert.message}

Order: ${order.export_order_number}
Tracking Number: ${tracking.tracking_number}
Carrier: ${tracking.carrier.toUpperCase()}
Current Status: ${tracking.current_status.replace(/_/g, ' ').toUpperCase()}
Current Location: ${tracking.current_location || 'Unknown'}
${tracking.estimated_delivery ? `Estimated Delivery: ${tracking.estimated_delivery}` : ''}

${alert.severity === 'high' || alert.severity === 'critical' ? 'Please contact the carrier for more information.' : 'We will keep you updated on any changes.'}

This is an automated alert to keep you informed of important shipment updates.`
        });
      }

      return { success: true, alert };
    } catch (error) {
      console.error("Failed to send proactive alert:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Monitor all shipments for proactive alerts
   */
  async monitorAllShipments(companyId) {
    try {
      const exports = await base44.entities.ExportOrder.filter({ company_id: companyId });
      const exportIds = exports.map(e => e.id);
      
      if (exportIds.length === 0) return { alerts: [], notifications_sent: 0 };

      const trackingRecords = await base44.entities.ShipmentTracking.filter({});
      const activeTracking = trackingRecords.filter(t => 
        exportIds.includes(t.export_order_id) &&
        !['delivered', 'cancelled'].includes(t.current_status)
      );

      const allAlerts = [];
      let notificationsSent = 0;

      for (const tracking of activeTracking) {
        const delayAlerts = await this.checkForDelays(tracking);
        const exceptionAlerts = await this.checkForExceptions(tracking);
        
        const alerts = [...delayAlerts, ...exceptionAlerts];
        allAlerts.push(...alerts);

        // Send notifications for high severity alerts
        for (const alert of alerts) {
          if (alert.severity === 'high' || alert.severity === 'critical') {
            const result = await this.sendProactiveAlert(alert, tracking);
            if (result.success) notificationsSent++;
          }
        }
      }

      return { 
        alerts: allAlerts, 
        notifications_sent: notificationsSent,
        total_monitored: activeTracking.length
      };
    } catch (error) {
      console.error("Failed to monitor shipments:", error);
      return { alerts: [], notifications_sent: 0, error: error.message };
    }
  },

  /**
   * Get alert summary for dashboard
   */
  async getAlertSummary(companyId) {
    const result = await this.monitorAllShipments(companyId);
    
    return {
      total_alerts: result.alerts?.length || 0,
      critical: result.alerts?.filter(a => a.severity === 'critical').length || 0,
      high: result.alerts?.filter(a => a.severity === 'high').length || 0,
      medium: result.alerts?.filter(a => a.severity === 'medium').length || 0,
      info: result.alerts?.filter(a => a.severity === 'info').length || 0,
      alerts: result.alerts || []
    };
  }
};