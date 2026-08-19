import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";

/**
 * AI-powered ETA Prediction Service
 * Analyzes GPS history, traffic patterns, and shipment data to predict accurate arrival times
 */
export async function predictShipmentETA(shipment, gpsPoints = []) {
  try {
    // Gather context for AI prediction
    const context = {
      shipment_details: {
        shipment_id: shipment.id,
        origin: `${shipment.origin_city}, ${shipment.origin_province}`,
        destination: `${shipment.destination_city}, ${shipment.destination_province}`,
        distance_km: shipment.distance_km,
        current_status: shipment.status,
        scheduled_delivery: shipment.scheduled_delivery_time,
        contains_hazmat: shipment.contains_hazmat
      },
      current_location: gpsPoints.length > 0 ? {
        latitude: gpsPoints[0].latitude,
        longitude: gpsPoints[0].longitude,
        speed_kmh: gpsPoints[0].speed_kmh,
        timestamp: gpsPoints[0].timestamp,
        distance_from_destination: calculateDistance(
          gpsPoints[0].latitude,
          gpsPoints[0].longitude,
          shipment.destination_lat,
          shipment.destination_lng
        )
      } : null,
      historical_gps: gpsPoints.slice(0, 10).map(p => ({
        latitude: p.latitude,
        longitude: p.longitude,
        speed_kmh: p.speed_kmh,
        timestamp: p.timestamp
      }))
    };

    const prompt = `You are an AI logistics expert specializing in ETA prediction. Analyze the following shipment data and predict an accurate Estimated Time of Arrival (ETA).

**Shipment Details:**
- Route: ${context.shipment_details.origin} → ${context.shipment_details.destination}
- Total Distance: ${context.shipment_details.distance_km || 'N/A'} km
- Current Status: ${context.shipment_details.current_status}
- Scheduled Delivery: ${context.shipment_details.scheduled_delivery || 'N/A'}
- HAZMAT: ${context.shipment_details.contains_hazmat ? 'Yes' : 'No'}

${context.current_location ? `
**Current Location:**
- Distance Remaining: ${context.current_location.distance_from_destination.toFixed(2)} km
- Current Speed: ${context.current_location.speed_kmh || 0} km/h
- Last Update: ${new Date(context.current_location.timestamp).toLocaleString()}
` : '**Status:** Shipment not yet in transit'}

${context.historical_gps.length > 0 ? `
**Recent GPS History (Last ${context.historical_gps.length} points):**
${context.historical_gps.map((p, i) => `${i + 1}. Speed: ${p.speed_kmh || 0} km/h at ${new Date(p.timestamp).toLocaleTimeString()}`).join('\n')}
` : ''}

**Analysis Required:**
1. Consider current traffic conditions (time of day: ${new Date().toLocaleTimeString()})
2. Factor in historical speed patterns from GPS data
3. Account for rest stops, refueling (estimate ~30 min every 400km)
4. Consider road conditions and typical delays
5. If HAZMAT, add 10-15% time buffer for additional checks

**Output Format:**
Provide:
- Predicted ETA (ISO datetime format)
- Confidence level (0-1)
- Expected delay vs scheduled time (in minutes, positive if late, negative if early)
- Key factors affecting ETA
- Recommended actions if running late`;

    const response = await supabase.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          predicted_eta: { type: "string" },
          confidence_level: { type: "number" },
          delay_minutes: { type: "number" },
          factors: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } }
        }
      }
    });

    return {
      success: true,
      ...response
    };
  } catch (error) {
    console.error("ETA prediction error:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update shipment with predicted ETA
 */
export async function updateShipmentETA(shipmentId, etaPrediction) {
  try {
    await supabase.entities.LocalShipment.update(shipmentId, {
      estimated_arrival: etaPrediction.predicted_eta,
      eta_confidence: etaPrediction.confidence_level,
      eta_last_updated: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to update ETA:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate average speed from GPS history
 */
export function calculateAverageSpeed(gpsPoints) {
  if (gpsPoints.length === 0) return 0;
  const validSpeeds = gpsPoints.filter(p => p.speed_kmh && p.speed_kmh > 0);
  if (validSpeeds.length === 0) return 0;
  return validSpeeds.reduce((sum, p) => sum + p.speed_kmh, 0) / validSpeeds.length;
}