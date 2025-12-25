import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, DollarSign, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function RouteMapEstimator({ originAddress, destinationAddress, weight, shipmentType }) {
  const [distance, setDistance] = useState(null);
  const [costEstimate, setCostEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapUrl, setMapUrl] = useState(null);

  useEffect(() => {
    if (originAddress && destinationAddress) {
      calculateRoute();
    }
  }, [originAddress, destinationAddress]);

  const calculateRoute = async () => {
    if (!originAddress || !destinationAddress) return;

    setLoading(true);
    try {
      // Use AI to calculate distance and generate cost estimates
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Calculate the driving distance and provide cost estimates for a ${shipmentType || 'LOCAL'} freight shipment:
        
Origin: ${originAddress}
Destination: ${destinationAddress}
Weight: ${weight || 0} kg

Provide:
1. Estimated distance in kilometers (straight-line approximation acceptable)
2. Estimated driving time
3. Breakdown of costs:
   - Fuel cost (assume $1.50/L, 35L/100km for trucks)
   - Driver cost (assume $30/hour including benefits)
   - Average 3PL carrier rate for this route ($2.50-4.00/km typical)
4. Total estimated cost range (low, medium, high scenarios)
5. Route recommendations

Consider factors like:
- Urban vs highway driving
- Typical traffic patterns
- City-to-city premium rates`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            distance_km: { type: "number" },
            duration_hours: { type: "number" },
            fuel_cost: { type: "number" },
            driver_cost: { type: "number" },
            carrier_rate_low: { type: "number" },
            carrier_rate_medium: { type: "number" },
            carrier_rate_high: { type: "number" },
            total_cost_low: { type: "number" },
            total_cost_medium: { type: "number" },
            total_cost_high: { type: "number" },
            route_notes: { type: "string" },
            cost_breakdown: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  amount: { type: "number" },
                  notes: { type: "string" }
                }
              }
            }
          }
        }
      });

      setDistance(result.distance_km);
      setCostEstimate(result);

      // Generate static map URL
      const encodedOrigin = encodeURIComponent(originAddress);
      const encodedDest = encodeURIComponent(destinationAddress);
      setMapUrl(`https://maps.googleapis.com/maps/api/staticmap?size=600x300&markers=color:green|label:A|${encodedOrigin}&markers=color:red|label:B|${encodedDest}&path=color:0x0000ff|weight:3|${encodedOrigin}|${encodedDest}&key=YOUR_API_KEY`);

      toast.success("Route calculated successfully");
    } catch (error) {
      console.error("Route calculation failed:", error);
      toast.error("Failed to calculate route");
    } finally {
      setLoading(false);
    }
  };

  if (!originAddress || !destinationAddress) {
    return (
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-6 text-center text-gray-500">
          <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">Enter origin and destination to calculate route</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Navigation className="w-5 h-5 text-blue-600" />
          Route & Cost Analysis
          {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Route Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-500">Origin</span>
            </div>
            <p className="text-sm font-medium truncate">{originAddress}</p>
          </div>
          <div className="p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-red-600" />
              <span className="text-xs text-gray-500">Destination</span>
            </div>
            <p className="text-sm font-medium truncate">{destinationAddress}</p>
          </div>
        </div>

        {distance && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-gray-600 mb-1">Distance</p>
              <p className="text-2xl font-bold text-blue-900">{distance.toFixed(0)} km</p>
              {costEstimate?.duration_hours && (
                <p className="text-xs text-gray-600 mt-1">~{costEstimate.duration_hours.toFixed(1)} hours</p>
              )}
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-gray-600 mb-1">Estimated Cost</p>
              <p className="text-xl font-bold text-green-900">
                ${costEstimate?.total_cost_low?.toFixed(0)} - ${costEstimate?.total_cost_high?.toFixed(0)}
              </p>
              <p className="text-xs text-gray-600 mt-1">CAD (estimated)</p>
            </div>
          </div>
        )}

        {/* Cost Breakdown */}
        {costEstimate && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold">Cost Breakdown</span>
            </div>
            <div className="space-y-1">
              {costEstimate.cost_breakdown?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-white rounded border text-sm">
                  <div>
                    <span className="font-medium">{item.category}</span>
                    {item.notes && <p className="text-xs text-gray-500">{item.notes}</p>}
                  </div>
                  <Badge variant="outline">${item.amount?.toFixed(2)}</Badge>
                </div>
              ))}
            </div>

            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-semibold text-purple-900">3PL Carrier Rates</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-600">Low</p>
                  <p className="font-bold text-purple-900">${costEstimate.carrier_rate_low?.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Average</p>
                  <p className="font-bold text-purple-900">${costEstimate.carrier_rate_medium?.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">High</p>
                  <p className="font-bold text-purple-900">${costEstimate.carrier_rate_high?.toFixed(0)}</p>
                </div>
              </div>
            </div>

            {costEstimate.route_notes && (
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-sm">
                <p className="font-semibold text-yellow-900 mb-1">Route Notes</p>
                <p className="text-gray-700">{costEstimate.route_notes}</p>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={calculateRoute}
          disabled={loading}
          variant="outline"
          size="sm"
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Recalculate Route & Costs
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}