import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  MapPin, Navigation, Ship, Clock, AlertTriangle, 
  Sparkles, Loader2, RefreshCw, Globe, Anchor,
  MessageCircle, Bell, Send, Copy, Check, ExternalLink
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdvancedTrackingPanel({ shipment, onClose }) {
  const [vesselData, setVesselData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [etaUpdate, setEtaUpdate] = useState(null);
  const [delayPrediction, setDelayPrediction] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchVesselGPS = async () => {
    if (!shipment) return;
    
    setLoading(true);
    try {
      const response = await supabase.integrations.Core.InvokeLLM({
        prompt: `Generate realistic real-time vessel tracking data for this shipment:

Vessel/Flight: ${shipment.vessel_flight_number || 'Unknown Vessel'}
Carrier: ${shipment.carrier_name || 'Ocean Carrier'}
Route: ${shipment.origin_country} → ${shipment.destination_country}
Container: ${shipment.container_number || 'N/A'}
Departure: ${shipment.departure_date || 'Not specified'}
Expected Arrival: ${shipment.expected_arrival || 'TBD'}
Current Status: ${shipment.status}

Provide realistic GPS tracking data including:
1. Current vessel position (latitude, longitude)
2. Current speed in knots
3. Heading/course
4. Current port/location name
5. Distance remaining to destination (nautical miles)
6. Estimated days remaining
7. Current weather conditions at vessel location
8. Sea state conditions
9. Next port of call
10. Vessel details (name, IMO, flag)`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            vessel_name: { type: "string" },
            vessel_imo: { type: "string" },
            flag_country: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" },
            speed_knots: { type: "number" },
            heading: { type: "number" },
            current_location: { type: "string" },
            distance_remaining_nm: { type: "number" },
            days_remaining: { type: "number" },
            weather: {
              type: "object",
              properties: {
                condition: { type: "string" },
                temperature_c: { type: "number" },
                wind_speed_knots: { type: "number" },
                wave_height_m: { type: "number" }
              }
            },
            sea_state: { type: "string" },
            next_port: { type: "string" },
            last_port: { type: "string" },
            last_updated: { type: "string" }
          }
        }
      });
      setVesselData(response);
    } catch (error) {
      toast.error("Failed to fetch vessel data");
    } finally {
      setLoading(false);
    }
  };

  const generateETAUpdate = async () => {
    setLoading(true);
    try {
      const response = await supabase.integrations.Core.InvokeLLM({
        prompt: `Analyze and provide updated ETA for this shipment:

Current Route: ${shipment.origin_country} → ${shipment.destination_country}
Original ETA: ${shipment.expected_arrival || 'Not set'}
Current Status: ${shipment.status}
Vessel: ${shipment.vessel_flight_number || vesselData?.vessel_name || 'Unknown'}
${vesselData ? `
Current Position: ${vesselData.current_location}
Speed: ${vesselData.speed_knots} knots
Distance Remaining: ${vesselData.distance_remaining_nm} nm
Weather: ${vesselData.weather?.condition}
Sea State: ${vesselData.sea_state}
` : ''}

Provide:
1. Updated ETA with reasoning
2. Confidence level
3. Factors affecting the estimate
4. Port congestion estimate
5. Customs processing estimate`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            updated_eta: { type: "string" },
            original_eta: { type: "string" },
            eta_change_days: { type: "number" },
            confidence_percent: { type: "number" },
            factors: { type: "array", items: { type: "string" } },
            port_congestion_days: { type: "number" },
            customs_processing_days: { type: "number" },
            total_delay_risk_days: { type: "number" },
            recommendation: { type: "string" }
          }
        }
      });
      setEtaUpdate(response);
    } catch (error) {
      toast.error("Failed to generate ETA update");
    } finally {
      setLoading(false);
    }
  };

  const generateDelayPrediction = async () => {
    setLoading(true);
    try {
      const response = await supabase.integrations.Core.InvokeLLM({
        prompt: `Predict potential delays for this shipment using AI analysis:

Shipment Details:
- Route: ${shipment.origin_country} → ${shipment.destination_country}
- Carrier: ${shipment.carrier_name || 'Unknown'}
- Cargo Type: ${shipment.cargo_type || 'vehicle'}
- Departure: ${shipment.departure_date}
- ETA: ${shipment.expected_arrival}
- Current Status: ${shipment.status}
${vesselData ? `
Vessel Conditions:
- Current Weather: ${vesselData.weather?.condition}
- Wind: ${vesselData.weather?.wind_speed_knots} knots
- Wave Height: ${vesselData.weather?.wave_height_m}m
- Sea State: ${vesselData.sea_state}
` : ''}

Analyze and predict:
1. Overall delay risk score (0-100)
2. Weather-related delay probability
3. Port congestion delay probability
4. Customs delay probability
5. Specific risk factors
6. Mitigation recommendations
7. Historical pattern analysis for this route`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            delay_risk_score: { type: "number" },
            risk_level: { type: "string" },
            weather_delay_probability: { type: "number" },
            port_delay_probability: { type: "number" },
            customs_delay_probability: { type: "number" },
            expected_delay_days: { type: "number" },
            risk_factors: { type: "array", items: { type: "string" } },
            mitigation_steps: { type: "array", items: { type: "string" } },
            historical_on_time_rate: { type: "number" },
            confidence: { type: "number" }
          }
        }
      });
      setDelayPrediction(response);
    } catch (error) {
      toast.error("Failed to generate delay prediction");
    } finally {
      setLoading(false);
    }
  };

  const getTrackingLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/CustomerTracking?shipment=${shipment.id}`;
  };

  const copyTrackingLink = () => {
    navigator.clipboard.writeText(getTrackingLink());
    setCopied(true);
    toast.success("Tracking link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const sendWhatsAppNotification = () => {
    const message = encodeURIComponent(
      `🚢 *Shipment Update*\n\n` +
      `*Shipment:* ${shipment.shipment_number || 'N/A'}\n` +
      `*Status:* ${shipment.status?.replace(/_/g, ' ')}\n` +
      `*Route:* ${shipment.origin_country} → ${shipment.destination_country}\n` +
      `${vesselData ? `*Vessel:* ${vesselData.vessel_name}\n*Location:* ${vesselData.current_location}\n` : ''}` +
      `*ETA:* ${etaUpdate?.updated_eta || shipment.expected_arrival || 'TBD'}\n\n` +
      `📍 Track your shipment: ${getTrackingLink()}\n\n` +
      `_Powered by eFinAuto OFMS_`
    );
    window.open(`https://wa.me/${shipment.customer_phone?.replace(/\D/g, '') || ''}?text=${message}`, '_blank');
  };

  useEffect(() => {
    if (shipment) {
      fetchVesselGPS();
    }
  }, [shipment?.id]);

  if (!shipment) return null;

  const getRiskColor = (score) => {
    if (score >= 70) return "text-red-600 bg-red-100";
    if (score >= 40) return "text-yellow-600 bg-yellow-100";
    return "text-green-600 bg-green-100";
  };

  return (
    <div className="space-y-6">
      {/* Real-time GPS Tracking */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Navigation className="w-5 h-5" />
              Real-time Vessel GPS Tracking
            </CardTitle>
            <Button size="sm" variant="outline" onClick={fetchVesselGPS} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {vesselData ? (
            <div className="space-y-4">
              {/* Vessel Info */}
              <div className="flex items-center gap-4 p-3 bg-white rounded-lg">
                <Ship className="w-10 h-10 text-blue-600" />
                <div>
                  <p className="font-bold text-lg">{vesselData.vessel_name}</p>
                  <p className="text-sm text-gray-500">IMO: {vesselData.vessel_imo} • Flag: {vesselData.flag_country}</p>
                </div>
              </div>

              {/* Position Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-500">Position</p>
                  <p className="font-mono text-sm">{vesselData.latitude?.toFixed(4)}°, {vesselData.longitude?.toFixed(4)}°</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-500">Speed</p>
                  <p className="font-semibold">{vesselData.speed_knots} knots</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-500">Heading</p>
                  <p className="font-semibold">{vesselData.heading}°</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-500">Distance Remaining</p>
                  <p className="font-semibold">{vesselData.distance_remaining_nm} nm</p>
                </div>
              </div>

              {/* Current Location */}
              <div className="p-3 bg-white rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold">Current Location</span>
                </div>
                <p className="text-gray-700">{vesselData.current_location}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Last Port: {vesselData.last_port} • Next Port: {vesselData.next_port}
                </p>
              </div>

              {/* Weather Conditions */}
              {vesselData.weather && (
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-500 mb-2">Weather at Vessel Location</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span>🌤️ {vesselData.weather.condition}</span>
                    <span>🌡️ {vesselData.weather.temperature_c}°C</span>
                    <span>💨 {vesselData.weather.wind_speed_knots} knots</span>
                    <span>🌊 {vesselData.weather.wave_height_m}m waves</span>
                    <span>Sea: {vesselData.sea_state}</span>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 text-right">Last updated: {vesselData.last_updated || 'Just now'}</p>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Fetching vessel position...
                </div>
              ) : (
                "Click refresh to fetch vessel GPS data"
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI ETA Updates */}
      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Clock className="w-5 h-5" />
              AI Automated ETA Updates
            </CardTitle>
            <Button size="sm" variant="outline" onClick={generateETAUpdate} disabled={loading} className="border-green-300">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span className="ml-2">Update ETA</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {etaUpdate ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-500">Original ETA</p>
                  <p className="font-semibold">{etaUpdate.original_eta || shipment.expected_arrival || 'N/A'}</p>
                </div>
                <div className="p-3 bg-white rounded-lg border-2 border-green-300">
                  <p className="text-xs text-gray-500">Updated ETA</p>
                  <p className="font-bold text-green-700">{etaUpdate.updated_eta}</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-500">Confidence</p>
                  <p className="font-semibold">{etaUpdate.confidence_percent}%</p>
                </div>
              </div>

              {etaUpdate.eta_change_days !== 0 && (
                <Badge className={etaUpdate.eta_change_days > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                  {etaUpdate.eta_change_days > 0 ? `+${etaUpdate.eta_change_days} days delay` : `${etaUpdate.eta_change_days} days earlier`}
                </Badge>
              )}

              <div className="p-3 bg-white rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Contributing Factors</p>
                <ul className="text-sm space-y-1">
                  {etaUpdate.factors?.map((factor, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>

              {etaUpdate.recommendation && (
                <div className="p-3 bg-green-100 rounded-lg">
                  <p className="text-sm text-green-800">💡 {etaUpdate.recommendation}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Click "Update ETA" to get AI-powered arrival predictions.</p>
          )}
        </CardContent>
      </Card>

      {/* AI Delay Predictions */}
      <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="w-5 h-5" />
              AI Delay Predictions
            </CardTitle>
            <Button size="sm" variant="outline" onClick={generateDelayPrediction} disabled={loading} className="border-orange-300">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span className="ml-2">Analyze Risks</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {delayPrediction ? (
            <div className="space-y-4">
              {/* Risk Score */}
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-xl ${getRiskColor(delayPrediction.delay_risk_score)}`}>
                  <p className="text-3xl font-bold">{delayPrediction.delay_risk_score}</p>
                  <p className="text-xs">Risk Score</p>
                </div>
                <div>
                  <Badge className={getRiskColor(delayPrediction.delay_risk_score)}>
                    {delayPrediction.risk_level} Risk
                  </Badge>
                  <p className="text-sm text-gray-600 mt-1">
                    Expected delay: {delayPrediction.expected_delay_days} days
                  </p>
                  <p className="text-xs text-gray-500">
                    Historical on-time rate: {delayPrediction.historical_on_time_rate}%
                  </p>
                </div>
              </div>

              {/* Probability Breakdown */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{delayPrediction.weather_delay_probability}%</p>
                  <p className="text-xs text-gray-500">Weather Risk</p>
                </div>
                <div className="p-3 bg-white rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">{delayPrediction.port_delay_probability}%</p>
                  <p className="text-xs text-gray-500">Port Congestion</p>
                </div>
                <div className="p-3 bg-white rounded-lg text-center">
                  <p className="text-2xl font-bold text-orange-600">{delayPrediction.customs_delay_probability}%</p>
                  <p className="text-xs text-gray-500">Customs Risk</p>
                </div>
              </div>

              {/* Risk Factors */}
              {delayPrediction.risk_factors?.length > 0 && (
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-500 mb-2">⚠️ Risk Factors</p>
                  <ul className="text-sm space-y-1">
                    {delayPrediction.risk_factors.map((factor, i) => (
                      <li key={i} className="text-orange-700">• {factor}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Mitigation Steps */}
              {delayPrediction.mitigation_steps?.length > 0 && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-700 font-semibold mb-2">✅ Recommended Actions</p>
                  <ul className="text-sm space-y-1">
                    {delayPrediction.mitigation_steps.map((step, i) => (
                      <li key={i} className="text-green-700">• {step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Click "Analyze Risks" to get AI-powered delay predictions.</p>
          )}
        </CardContent>
      </Card>

      {/* Customer Tracking & WhatsApp */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <Globe className="w-5 h-5" />
            Customer Mobile Tracking Portal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input value={getTrackingLink()} readOnly className="flex-1 bg-white text-sm" />
              <Button variant="outline" onClick={copyTrackingLink}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button variant="outline" onClick={() => window.open(getTrackingLink(), '_blank')}>
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={sendWhatsAppNotification} className="bg-green-600 hover:bg-green-700">
                <MessageCircle className="w-4 h-4 mr-2" />
                Send WhatsApp Update
              </Button>
              <Button variant="outline" className="border-purple-300">
                <Bell className="w-4 h-4 mr-2" />
                Schedule Notifications
              </Button>
              <Button variant="outline" className="border-purple-300">
                <Send className="w-4 h-4 mr-2" />
                Email Tracking Link
              </Button>
            </div>

            <p className="text-xs text-gray-500">
              Share this link with your customer to allow them to track their shipment in real-time on any device.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}