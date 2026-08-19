import React, { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Ship, MapPin, Clock, Package, Car, CheckCircle, 
  Loader2, Sparkles, RefreshCw, Globe, Navigation,
  AlertTriangle, Anchor
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function CustomerTracking() {
  const urlParams = new URLSearchParams(window.location.search);
  const shipmentId = urlParams.get('shipment');
  
  const [vesselData, setVesselData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [etaUpdate, setEtaUpdate] = useState(null);

  const { data: shipment, isLoading } = useQuery({
    queryKey: ['customer-shipment', shipmentId],
    queryFn: async () => {
      if (!shipmentId) return null;
      const shipments = await supabase.entities.FreightShipment.filter({ id: shipmentId });
      return shipments[0] || null;
    },
    enabled: !!shipmentId,
  });

  const statusColors = {
    booked: { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock },
    picked_up: { bg: "bg-blue-100", text: "text-blue-800", icon: Package },
    in_transit: { bg: "bg-purple-100", text: "text-purple-800", icon: Ship },
    customs_clearance: { bg: "bg-orange-100", text: "text-orange-800", icon: AlertTriangle },
    out_for_delivery: { bg: "bg-cyan-100", text: "text-cyan-800", icon: Car },
    delivered: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle }
  };

  const timelineSteps = [
    { key: 'booked', label: 'Booked', icon: Clock },
    { key: 'picked_up', label: 'Loaded', icon: Package },
    { key: 'in_transit', label: 'In Transit', icon: Ship },
    { key: 'customs_clearance', label: 'At Port', icon: Anchor },
    { key: 'out_for_delivery', label: 'Cleared', icon: CheckCircle },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle }
  ];

  const getStatusIndex = (status) => {
    const index = timelineSteps.findIndex(s => s.key === status);
    return index >= 0 ? index : 0;
  };

  const fetchLiveTracking = async () => {
    if (!shipment) return;
    
    setLoading(true);
    try {
      const response = await supabase.integrations.Core.InvokeLLM({
        prompt: `Generate real-time tracking update for customer viewing:

Shipment: ${shipment.shipment_number}
Route: ${shipment.origin_country} → ${shipment.destination_country}
Status: ${shipment.status}
Departure: ${shipment.departure_date}
ETA: ${shipment.expected_arrival}
Carrier: ${shipment.carrier_name}
Container: ${shipment.container_number}

Provide customer-friendly tracking information:
1. Current location description
2. Vessel/carrier name
3. Progress percentage
4. Updated ETA
5. Weather conditions summary
6. Next milestone
7. Estimated arrival at destination`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            current_location: { type: "string" },
            vessel_name: { type: "string" },
            progress_percent: { type: "number" },
            updated_eta: { type: "string" },
            weather_summary: { type: "string" },
            next_milestone: { type: "string" },
            next_milestone_eta: { type: "string" },
            distance_remaining: { type: "string" },
            special_notes: { type: "array", items: { type: "string" } }
          }
        }
      });
      setVesselData(response);
      setEtaUpdate(response.updated_eta);
    } catch (error) {
      console.error("Tracking error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shipment) {
      fetchLiveTracking();
    }
  }, [shipment?.id]);

  if (!shipmentId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Ship className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">No Shipment Found</h2>
            <p className="text-gray-500">Please use a valid tracking link to view shipment status.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Shipment Not Found</h2>
            <p className="text-gray-500">This tracking link may be invalid or expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStatus = statusColors[shipment.status] || statusColors.booked;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-slate-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-8 h-8 text-white" />
              <div>
                <h1 className="text-white font-bold">Shipment Tracking</h1>
                <p className="text-blue-200 text-sm">Real-time updates</p>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-white border-white/30 hover:bg-white/10"
              onClick={fetchLiveTracking}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-none shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-xl ${currentStatus.bg}`}>
                  <StatusIcon className={`w-8 h-8 ${currentStatus.text}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current Status</p>
                  <h2 className="text-2xl font-bold capitalize">{shipment.status?.replace(/_/g, ' ')}</h2>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Shipment #</p>
                  <p className="font-semibold">{shipment.shipment_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Container #</p>
                  <p className="font-semibold">{shipment.container_number || 'N/A'}</p>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <p className="font-bold">{shipment.origin_country}</p>
                    <p className="text-xs text-gray-500">Origin</p>
                  </div>
                  <div className="flex-1 px-4">
                    <div className="h-0.5 bg-gray-300 relative">
                      <div 
                        className="h-0.5 bg-blue-600 absolute left-0"
                        style={{ width: `${vesselData?.progress_percent || 50}%` }}
                      />
                      <Ship className="w-5 h-5 text-blue-600 absolute top-1/2 -translate-y-1/2" 
                        style={{ left: `${vesselData?.progress_percent || 50}%`, transform: 'translate(-50%, -50%)' }}
                      />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">{shipment.destination_country}</p>
                    <p className="text-xs text-gray-500">Destination</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-none shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Shipment Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between overflow-x-auto pb-2">
                {timelineSteps.map((step, i) => {
                  const Icon = step.icon;
                  const isCompleted = i <= getStatusIndex(shipment.status);
                  const isCurrent = i === getStatusIndex(shipment.status);
                  return (
                    <div key={step.key} className="flex flex-col items-center relative min-w-[60px]">
                      {i > 0 && (
                        <div className={`absolute right-1/2 top-4 w-full h-0.5 -translate-y-1/2 ${
                          isCompleted ? 'bg-green-500' : 'bg-gray-200'
                        }`} style={{ width: 'calc(100%)', right: '50%' }} />
                      )}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                        isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                      } ${isCurrent ? 'ring-4 ring-green-200' : ''}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`text-[10px] mt-1 text-center ${isCurrent ? 'font-bold text-green-600' : 'text-gray-500'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Live Tracking Data */}
        {vesselData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-none shadow-xl bg-gradient-to-r from-blue-50 to-cyan-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-blue-600" />
                  Live Position
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-white rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold">Current Location</span>
                    </div>
                    <p className="text-gray-700">{vesselData.current_location}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-500">Vessel</p>
                      <p className="font-semibold">{vesselData.vessel_name}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-500">Distance Remaining</p>
                      <p className="font-semibold">{vesselData.distance_remaining}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-xs text-gray-500">Weather Conditions</p>
                    <p className="text-sm">{vesselData.weather_summary}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ETA Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-none shadow-xl bg-gradient-to-r from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Estimated Arrival</p>
                  <p className="text-3xl font-bold text-green-700">
                    {etaUpdate || (shipment.expected_arrival ? format(new Date(shipment.expected_arrival), 'MMM d, yyyy') : 'TBD')}
                  </p>
                  {vesselData?.next_milestone && (
                    <p className="text-sm text-gray-500 mt-1">
                      Next: {vesselData.next_milestone} ({vesselData.next_milestone_eta})
                    </p>
                  )}
                </div>
                <Clock className="w-12 h-12 text-green-300" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notes */}
        {vesselData?.special_notes?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-none shadow-xl">
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-2">📢 Updates</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {vesselData.special_notes.map((note, i) => (
                    <li key={i}>• {note}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-blue-200 text-xs">Powered by eFinAuto OFMS</p>
          <p className="text-blue-300 text-xs mt-1">Last updated: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}