/**
 * Geofencing Service
 * Monitors shipment locations and triggers alerts for key milestones
 */

import { base44 } from "@/api/base44Client";

// Define geofence zones for key milestones
const GEOFENCE_ZONES = {
  port_arrival: {
    name: "Port Arrival",
    radius: 50, // km
    alert_status: "at_port"
  },
  customs_zone: {
    name: "Customs Clearance Zone",
    radius: 20,
    alert_status: "customs_clearance"
  },
  delivery_zone: {
    name: "Final Delivery Zone",
    radius: 30,
    alert_status: "out_for_delivery"
  }
};

export const GeofencingService = {
  /**
   * Check if shipment has entered a geofence zone
   */
  async checkGeofence(tracking, previousLocation, currentLocation) {
    const alerts = [];

    // Check for port arrival
    if (this.hasEnteredZone(previousLocation, currentLocation, GEOFENCE_ZONES.port_arrival)) {
      alerts.push({
        type: "port_arrival",
        tracking_id: tracking.id,
        message: `Shipment ${tracking.tracking_number} has arrived at port`,
        timestamp: new Date().toISOString(),
        severity: "info"
      });
    }

    // Check for customs zone entry
    if (this.hasEnteredZone(previousLocation, currentLocation, GEOFENCE_ZONES.customs_zone)) {
      alerts.push({
        type: "customs_entry",
        tracking_id: tracking.id,
        message: `Shipment ${tracking.tracking_number} is entering customs clearance`,
        timestamp: new Date().toISOString(),
        severity: "warning"
      });
    }

    // Check for delivery zone entry
    if (this.hasEnteredZone(previousLocation, currentLocation, GEOFENCE_ZONES.delivery_zone)) {
      alerts.push({
        type: "delivery_zone",
        tracking_id: tracking.id,
        message: `Shipment ${tracking.tracking_number} is out for delivery`,
        timestamp: new Date().toISOString(),
        severity: "success"
      });
    }

    // Send alerts
    for (const alert of alerts) {
      await this.sendGeofenceAlert(alert, tracking);
    }

    return alerts;
  },

  /**
   * Check if shipment has entered a zone
   */
  hasEnteredZone(previousLocation, currentLocation, zone) {
    // In production, calculate actual distance from zone center
    // For now, simulate based on status change
    return previousLocation?.status !== currentLocation?.status;
  },

  /**
   * Send geofence alert
   */
  async sendGeofenceAlert(alert, tracking) {
    try {
      // Get export order details
      const exportOrder = await base44.entities.ExportOrder.filter({ id: tracking.export_order_id });
      const order = exportOrder?.[0];

      if (!order || !order.consignee_email) return;

      // Create notification record
      await base44.entities.NotificationLog.create({
        company_id: order.company_id,
        notification_type: "export_update",
        recipient_email: order.consignee_email,
        subject: `📍 Shipment Alert: ${alert.type.replace(/_/g, ' ').toUpperCase()}`,
        body: `${alert.message}
        
Tracking Number: ${tracking.tracking_number}
Current Location: ${tracking.current_location}
Status: ${tracking.current_status.replace(/_/g, ' ').toUpperCase()}
Estimated Delivery: ${tracking.estimated_delivery || 'TBD'}

Track your shipment for real-time updates.`,
        sent_at: new Date().toISOString(),
        delivery_method: "email",
        status: "sent",
        reference_type: "ShipmentTracking",
        reference_id: tracking.id
      });

      // Send actual email
      await base44.integrations.Core.SendEmail({
        to: order.consignee_email,
        subject: `📍 Shipment Alert: ${alert.type.replace(/_/g, ' ').toUpperCase()}`,
        body: `${alert.message}
        
Tracking Number: ${tracking.tracking_number}
Order: ${order.export_order_number}
Current Location: ${tracking.current_location}
Status: ${tracking.current_status.replace(/_/g, ' ').toUpperCase()}
Estimated Delivery: ${tracking.estimated_delivery || 'TBD'}

This is an automated geofencing alert to keep you informed of your shipment's progress.`
      });

      return { success: true, alert };
    } catch (error) {
      console.error("Failed to send geofence alert:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Monitor all active shipments for geofence alerts
   */
  async monitorAllShipments(companyId) {
    try {
      const exports = await base44.entities.ExportOrder.filter({ company_id: companyId });
      const exportIds = exports.map(e => e.id);
      
      if (exportIds.length === 0) return [];

      const trackingRecords = await base44.entities.ShipmentTracking.filter({});
      const activeTracking = trackingRecords.filter(t => 
        exportIds.includes(t.export_order_id) &&
        !['delivered', 'cancelled'].includes(t.current_status)
      );

      const alerts = [];
      for (const tracking of activeTracking) {
        // Get previous status from tracking events
        const events = tracking.tracking_events || [];
        if (events.length > 1) {
          const previousEvent = events[1];
          const currentEvent = events[0];
          
          const newAlerts = await this.checkGeofence(
            tracking,
            { status: previousEvent.status, location: previousEvent.location },
            { status: currentEvent.status, location: currentEvent.location }
          );
          
          alerts.push(...newAlerts);
        }
      }

      return alerts;
    } catch (error) {
      console.error("Failed to monitor shipments:", error);
      return [];
    }
  }
};