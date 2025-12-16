/**
 * Enhanced Geofencing Service
 * Monitors shipment locations and triggers alerts based on user-defined geofences
 */

import { base44 } from "@/api/base44Client";

export const GeofencingService = {
  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },

  /**
   * Check if point is inside circular geofence
   */
  isInsideCircle(pointLat, pointLng, centerLat, centerLng, radiusKm) {
    const distance = this.calculateDistance(pointLat, pointLng, centerLat, centerLng);
    return distance <= radiusKm;
  },

  /**
   * Check if point is inside polygon geofence (ray casting algorithm)
   */
  isInsidePolygon(pointLat, pointLng, polygonCoords) {
    let inside = false;
    for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
      const xi = polygonCoords[i].lat, yi = polygonCoords[i].lng;
      const xj = polygonCoords[j].lat, yj = polygonCoords[j].lng;
      
      const intersect = ((yi > pointLng) !== (yj > pointLng))
        && (pointLat < (xj - xi) * (pointLng - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  },

  /**
   * Check if shipment is inside a geofence
   */
  isInsideGeofence(lat, lng, geofence) {
    if (geofence.shape === 'polygon' && geofence.polygon_coordinates) {
      return this.isInsidePolygon(lat, lng, geofence.polygon_coordinates);
    } else {
      return this.isInsideCircle(lat, lng, geofence.center_latitude, geofence.center_longitude, geofence.radius_km);
    }
  },
  /**
   * Check geofences for a shipment at specific coordinates
   */
  async checkGeofences(companyId, tracking, currentLat, currentLng, previousLat, previousLng) {
    try {
      // Get all active geofences for company
      const geofences = await base44.entities.Geofence.filter({
        company_id: companyId,
        active: true
      });

      const alerts = [];

      for (const geofence of geofences) {
        const wasInside = previousLat && previousLng ? 
          this.isInsideGeofence(previousLat, previousLng, geofence) : false;
        const isInside = this.isInsideGeofence(currentLat, currentLng, geofence);

        // Entry detection
        if (!wasInside && isInside && geofence.trigger_on_entry) {
          alerts.push({
            type: "geofence_entry",
            geofence_id: geofence.id,
            geofence_name: geofence.name,
            location_type: geofence.location_type,
            tracking_id: tracking.id,
            message: geofence.alert_message_template || 
              `Shipment ${tracking.tracking_number} entered ${geofence.name}`,
            timestamp: new Date().toISOString(),
            severity: "info"
          });
        }

        // Exit detection
        if (wasInside && !isInside && geofence.trigger_on_exit) {
          alerts.push({
            type: "geofence_exit",
            geofence_id: geofence.id,
            geofence_name: geofence.name,
            location_type: geofence.location_type,
            tracking_id: tracking.id,
            message: `Shipment ${tracking.tracking_number} left ${geofence.name}`,
            timestamp: new Date().toISOString(),
            severity: "info"
          });
        }
      }

      // Send alerts
      for (const alert of alerts) {
        const geofence = geofences.find(g => g.id === alert.geofence_id);
        await this.sendGeofenceAlert(alert, tracking, geofence);
      }

      return alerts;
    } catch (error) {
      console.error("Error checking geofences:", error);
      return [];
    }
  },

  /**
   * Send geofence alert
   */
  async sendGeofenceAlert(alert, tracking, geofence) {
    try {
      // Get export order details
      const exportOrder = await base44.entities.ExportOrder.filter({ id: tracking.export_order_id });
      const order = exportOrder?.[0];

      if (!order) return;

      // Determine recipients
      const recipients = geofence?.alert_recipients?.length > 0 
        ? geofence.alert_recipients 
        : [order.consignee_email].filter(Boolean);

      if (recipients.length === 0) return;

      // Create notification records
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