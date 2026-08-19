import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation, MapPin, Clock, AlertTriangle, ExternalLink } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";

export default function RouteNavigation({ shipment, currentLocation }) {
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentLocation && shipment) {
      calculateRoute();
    }
  }, [currentLocation, shipment]);

  const calculateRoute = async () => {
    if (!currentLocation) return;

    setLoading(true);
    try {
      const result = await supabase.integrations.Core.InvokeLLM({
        prompt: `Calculate the optimal route from current location to destination.
        
Current Location: ${currentLocation.coords.latitude}, ${currentLocation.coords.longitude}
Destination: ${shipment.destination_address}, ${shipment.destination_city}
Destination Coords: ${shipment.destination_lat}, ${shipment.destination_lng}

Provide:
- Estimated distance
- Estimated time
- Route warnings (construction, traffic, road conditions)
- Alternative routes if available
- Turn-by-turn directions summary`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            distance_km: { type: "number" },
            estimated_time_minutes: { type: "number" },
            route_summary: { type: "string" },
            warnings: { type: "array", items: { type: "string" } },
            directions_summary: { type: "string" },
            has_alternative: { type: "boolean" },
            alternative_info: { type: "string" }
          }
        }
      });

      setRouteInfo(result);
    } catch (error) {
      console.error("Route calculation error:", error);
      toast.error("Failed to calculate route");
    } finally {
      setLoading(false);
    }
  };

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.coords.latitude},${currentLocation.coords.longitude}&destination=${shipment.destination_lat},${shipment.destination_lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const openInAppleMaps = () => {
    const url = `http://maps.apple.com/?saddr=${currentLocation.coords.latitude},${currentLocation.coords.longitude}&daddr=${shipment.destination_lat},${shipment.destination_lng}`;
    window.open(url, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="w-5 h-5" />
          Route Navigation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Calculating optimal route...</p>
          </div>
        ) : routeInfo ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-600">Distance</p>
                <p className="text-lg font-bold text-blue-900">{routeInfo.distance_km?.toFixed(1)} km</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-600">Est. Time</p>
                <p className="text-lg font-bold text-green-900">
                  {Math.floor(routeInfo.estimated_time_minutes / 60)}h {routeInfo.estimated_time_minutes % 60}m
                </p>
              </div>
            </div>

            {routeInfo.warnings?.length > 0 && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span className="font-semibold text-sm text-orange-900">Route Warnings</span>
                </div>
                {routeInfo.warnings.map((warning, idx) => (
                  <p key={idx} className="text-xs text-orange-800 mb-1">• {warning}</p>
                ))}
              </div>
            )}

            {routeInfo.directions_summary && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-700 mb-1">Directions Summary</p>
                <p className="text-xs text-gray-600">{routeInfo.directions_summary}</p>
              </div>
            )}

            {routeInfo.has_alternative && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-xs font-semibold text-purple-900 mb-1">Alternative Route Available</p>
                <p className="text-xs text-purple-800">{routeInfo.alternative_info}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={openInGoogleMaps} className="bg-blue-600 hover:bg-blue-700">
                <ExternalLink className="w-4 h-4 mr-2" />
                Google Maps
              </Button>
              <Button onClick={openInAppleMaps} variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                Apple Maps
              </Button>
            </div>

            <Button onClick={calculateRoute} variant="outline" className="w-full" size="sm">
              Recalculate Route
            </Button>
          </>
        ) : (
          <div className="text-center py-4">
            <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600 mb-3">Enable GPS to calculate route</p>
            <Button onClick={calculateRoute} disabled={!currentLocation}>
              Calculate Route
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}