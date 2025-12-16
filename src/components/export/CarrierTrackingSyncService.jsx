/**
 * Carrier Tracking Sync Service
 * Scheduled sync job to fetch tracking updates from carrier APIs
 */

import { base44 } from "@/api/base44Client";
import { getCarrierAPIService, isCarrierAPIEnabled } from "./CarrierAPIRegistry";

export const CarrierTrackingSyncService = {
  /**
   * Sync tracking for a single export order
   */
  async syncOrderTracking(order) {
    if (!order.carrier_code || !isCarrierAPIEnabled(order.carrier_code)) {
      return { success: false, message: "Carrier API not enabled" };
    }

    if (!order.container_number && !order.bill_of_lading_number) {
      return { success: false, message: "No tracking reference available" };
    }

    try {
      const apiService = getCarrierAPIService(order.carrier_code);
      const result = await apiService.getTrackingUpdate(
        order.container_number,
        order.bill_of_lading_number
      );

      if (result.success) {
        // Update export order with latest tracking info
        const updateData = {
          export_status: mapCarrierStatusToExportStatus(result.tracking.status),
          estimated_arrival: result.tracking.estimated_arrival,
          notes: `${order.notes || ''}\n[Auto-sync] ${new Date().toISOString()}: ${result.tracking.last_event}`
        };

        await base44.entities.ExportOrder.update(order.id, updateData);

        // Update or create tracking record
        const trackingRecords = await base44.entities.ShipmentTracking.filter({
          export_order_id: order.id
        });

        if (trackingRecords.length > 0) {
          await base44.entities.ShipmentTracking.update(trackingRecords[0].id, {
            current_status: result.tracking.status,
            current_location: result.tracking.location,
            estimated_delivery: result.tracking.estimated_arrival,
            tracking_events: result.tracking.events,
            last_updated: new Date().toISOString()
          });
        }

        // Send notification if status changed significantly
        if (shouldNotifyStatusChange(order.export_status, updateData.export_status)) {
          await base44.integrations.Core.SendEmail({
            to: order.consignee_email || 'shipping@company.com',
            subject: `Shipment Status Update - ${order.export_order_number}`,
            body: `Your shipment status has been updated:

Order: ${order.export_order_number}
Status: ${updateData.export_status.replace(/_/g, ' ').toUpperCase()}
Container: ${order.container_number}
Location: ${result.tracking.location}
ETA: ${result.tracking.estimated_arrival || 'TBD'}

Latest Event: ${result.tracking.last_event}

Track your shipment for real-time updates.`
          });
        }

        return { success: true, updated: true };
      }

      return { success: false, message: result.error };
    } catch (error) {
      console.error("Tracking sync error:", error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Sync tracking for all active shipments
   * This can be called by a scheduled job
   */
  async syncAllActiveShipments(companyId) {
    const activeOrders = await base44.entities.ExportOrder.filter({
      company_id: companyId,
      export_status: {
        $in: ["shipped", "in_transit"]
      }
    });

    const results = [];
    for (const order of activeOrders) {
      const result = await this.syncOrderTracking(order);
      results.push({
        order_number: order.export_order_number,
        ...result
      });
      
      // Rate limiting - wait between API calls
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  },

  /**
   * Manual refresh tracking for specific order
   */
  async refreshTracking(orderId) {
    const orders = await base44.entities.ExportOrder.filter({ id: orderId });
    if (orders.length === 0) {
      return { success: false, message: "Order not found" };
    }

    return await this.syncOrderTracking(orders[0]);
  }
};

// Helper functions
function mapCarrierStatusToExportStatus(carrierStatus) {
  const statusMap = {
    "booked": "logistics_booked",
    "loaded": "shipped",
    "in_transit": "in_transit",
    "at_port": "in_transit",
    "customs_clearance": "in_transit",
    "out_for_delivery": "in_transit",
    "delivered": "delivered"
  };

  return statusMap[carrierStatus] || "in_transit";
}

function shouldNotifyStatusChange(oldStatus, newStatus) {
  const significantChanges = [
    ["shipped", "in_transit"],
    ["in_transit", "delivered"],
    ["logistics_booked", "shipped"]
  ];

  return significantChanges.some(
    ([from, to]) => oldStatus === from && newStatus === to
  );
}