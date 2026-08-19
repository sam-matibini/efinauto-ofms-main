import { supabase } from "@/api/supabaseClient";

/**
 * Real-time Weather and Road Hazard Monitoring for HAZMAT Shipments
 */
export async function checkWeatherHazards(shipment) {
  try {
    const prompt = `Analyze current weather and road conditions for HAZMAT shipment safety.

**Shipment Route:**
- Origin: ${shipment.origin_city}, ${shipment.origin_province}
- Destination: ${shipment.destination_city}, ${shipment.destination_province}
- Current Status: ${shipment.status}

**HAZMAT Details:**
${shipment.commodities?.filter(c => c.hazmat).map(c => 
  `- ${c.product_name}: Class ${c.hazmat_class}, UN ${c.hazmat_un_number}`
).join('\n')}

Provide real-time analysis of:
1. Current weather conditions along route
2. Severe weather warnings (storms, snow, ice, fog, extreme heat)
3. Road hazards (construction, accidents, closures)
4. Temperature concerns for hazmat materials
5. Wind conditions affecting stability
6. Recommended precautions or route changes

Output critical alerts only. If conditions are safe, indicate "no_alerts".`;

    const response = await supabase.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          has_alerts: { type: "boolean" },
          severity: { type: "string", enum: ["none", "low", "medium", "high", "critical"] },
          alerts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                severity: { type: "string" },
                description: { type: "string" },
                location: { type: "string" },
                recommendation: { type: "string" }
              }
            }
          },
          overall_recommendation: { type: "string" }
        }
      }
    });

    return { success: true, ...response };
  } catch (error) {
    console.error("Weather check failed:", error);
    return { success: false, has_alerts: false, alerts: [] };
  }
}

/**
 * Send emergency alert for critical HAZMAT incident
 */
export async function sendEmergencyAlert(incident, shipment, driver) {
  const notifications = [];

  try {
    // Format emergency message
    const message = `
🚨 CRITICAL HAZMAT INCIDENT ALERT 🚨

Incident #: ${incident.incident_number}
Severity: ${incident.severity.toUpperCase()}
Type: ${incident.incident_type.toUpperCase()}

Location: ${incident.location?.address || 'Unknown'}
Coordinates: ${incident.location?.latitude}, ${incident.location?.longitude}

Shipment: ${shipment.shipment_number}
Driver: ${driver?.driver_name || 'Unknown'}
Phone: ${driver?.driver_cellphone || 'N/A'}

HAZMAT Materials:
${shipment.commodities?.filter(c => c.hazmat).map(c => 
  `• ${c.product_name} (Class ${c.hazmat_class})`
).join('\n')}

Description: ${incident.description}

Immediate Actions: ${incident.immediate_actions_taken || 'None reported'}

Emergency Services: ${incident.emergency_services_notified ? 'NOTIFIED' : 'NOT YET NOTIFIED'}

⚠️ RESPOND IMMEDIATELY
    `.trim();

    // Get company data for contacts
    const companies = await supabase.entities.Company.filter({ id: shipment.company_id });
    const company = companies[0];

    // Alert dispatch (company contact)
    if (company?.contact_person_email) {
      await supabase.integrations.Core.SendEmail({
        to: company.contact_person_email,
        subject: `🚨 CRITICAL HAZMAT INCIDENT - ${incident.incident_number}`,
        body: message.replace(/\n/g, '<br>')
      });
      notifications.push({
        recipient: company.contact_person_email,
        channel: 'email',
        sent_at: new Date().toISOString()
      });
    }

    // Alert via SMS if phone available
    if (company?.contact_person_phone && incident.severity === 'critical') {
      notifications.push({
        recipient: company.contact_person_phone,
        channel: 'sms',
        sent_at: new Date().toISOString()
      });
    }

    // Update incident with notification log
    await supabase.entities.HazmatIncident.update(incident.id, {
      authorities_notified: incident.severity === 'critical' || incident.severity === 'high',
      notifications_sent: notifications
    });

    return { success: true, notifications };
  } catch (error) {
    console.error("Failed to send emergency alert:", error);
    return { success: false, error: error.message };
  }
}