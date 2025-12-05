import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Search, Ship, Package, Car, Clock, CheckCircle, Loader2, Sparkles, Navigation, Globe } from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import AdvancedTrackingPanel from "./AdvancedTrackingPanel";

export default function TrackingTab({ shipments = [], containers = [], vehicles = [] }) {
  const [searchType, setSearchType] = useState("vin");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [aiTracking, setAiTracking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [advancedTrackingOpen, setAdvancedTrackingOpen] = useState(false);

  const statusColors = {
    booked: "bg-yellow-100 text-yellow-800",
    picked_up: "bg-blue-100 text-blue-800",
    in_transit: "bg-purple-100 text-purple-800",
    customs_clearance: "bg-orange-100 text-orange-800",
    out_for_delivery: "bg-cyan-100 text-cyan-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800"
  };

  const timelineSteps = [
    { key: 'booked', label: 'Booked', icon: Clock },
    { key: 'picked_up', label: 'Loaded', icon: Package },
    { key: 'in_transit', label: 'In Transit', icon: Ship },
    { key: 'customs_clearance', label: 'Arrived', icon: MapPin },
    { key: 'out_for_delivery', label: 'Cleared', icon: CheckCircle },
    { key: 'delivered', label: 'Released', icon: CheckCircle }
  ];

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    const term = searchTerm.toLowerCase();
    let result = null;

    if (searchType === "vin") {
      const vehicle = vehicles.find(v => v.vin?.toLowerCase().includes(term));
      if (vehicle) {
        // Find associated shipment
        const shipment = shipments.find(s => s.cargo_items?.some(i => i.vehicle_id === vehicle.id || i.vin === vehicle.vin));
        result = { type: 'vehicle', vehicle, shipment };
      }
    } else if (searchType === "container") {
      const container = containers.find(c => c.container_number?.toLowerCase().includes(term));
      if (container) {
        const shipment = shipments.find(s => s.id === container.shipment_id || s.container_number === container.container_number);
        result = { type: 'container', container, shipment };
      }
    } else if (searchType === "bl") {
      const shipment = shipments.find(s => 
        s.shipment_number?.toLowerCase().includes(term) || 
        s.tracking_number?.toLowerCase().includes(term)
      );
      if (shipment) {
        result = { type: 'shipment', shipment };
      }
    } else if (searchType === "shipment") {
      const shipment = shipments.find(s => s.shipment_number?.toLowerCase().includes(term));
      if (shipment) {
        result = { type: 'shipment', shipment };
      }
    }

    if (result) {
      setSearchResult(result);
      setAiTracking(null);
    } else {
      toast.error("No results found");
      setSearchResult(null);
    }
  };

  const getAITrackingUpdate = async () => {
    if (!searchResult?.shipment) return;
    
    setLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a realistic shipping tracking update for this shipment:
        
Shipment: ${searchResult.shipment.shipment_number}
Status: ${searchResult.shipment.status}
Route: ${searchResult.shipment.origin_country} → ${searchResult.shipment.destination_country}
Carrier: ${searchResult.shipment.carrier_name || 'Unknown'}
Container: ${searchResult.shipment.container_number || 'N/A'}
Departure: ${searchResult.shipment.departure_date || 'Not scheduled'}
ETA: ${searchResult.shipment.expected_arrival || 'TBD'}

Provide:
1. Current location description
2. Estimated time to next milestone
3. Any potential delays or notes
4. Weather/route conditions if relevant`,
        response_json_schema: {
          type: "object",
          properties: {
            current_location: { type: "string" },
            location_details: { type: "string" },
            next_milestone: { type: "string" },
            eta_next_milestone: { type: "string" },
            notes: { type: "array", items: { type: "string" } },
            route_conditions: { type: "string" }
          }
        }
      });
      setAiTracking(response);
    } catch (error) {
      toast.error("Failed to get tracking update");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIndex = (status) => {
    const index = timelineSteps.findIndex(s => s.key === status);
    return index >= 0 ? index : 0;
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Track Shipment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={searchType} onValueChange={setSearchType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vin">VIN</SelectItem>
                <SelectItem value="container">Container #</SelectItem>
                <SelectItem value="bl">BL #</SelectItem>
                <SelectItem value="shipment">Shipment ID</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={`Enter ${searchType === 'vin' ? 'VIN' : searchType === 'container' ? 'Container #' : searchType === 'bl' ? 'BL #' : 'Shipment ID'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
              <Search className="w-4 h-4 mr-2" />
              Track
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Result */}
      {searchResult && (
        <div className="space-y-6">
          {/* Timeline */}
          {searchResult.shipment && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Tracking Timeline - {searchResult.shipment.shipment_number}
                  </CardTitle>
                  <Badge className={statusColors[searchResult.shipment.status]}>
                    {searchResult.shipment.status?.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-8">
                  {timelineSteps.map((step, i) => {
                    const Icon = step.icon;
                    const isCompleted = i <= getStatusIndex(searchResult.shipment.status);
                    const isCurrent = i === getStatusIndex(searchResult.shipment.status);
                    return (
                      <div key={step.key} className="flex flex-col items-center relative">
                        {i > 0 && (
                          <div className={`absolute right-1/2 top-4 w-full h-1 -translate-y-1/2 ${
                            isCompleted ? 'bg-green-500' : 'bg-gray-200'
                          }`} style={{ width: 'calc(100% + 2rem)', right: '50%' }} />
                        )}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                          isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                        } ${isCurrent ? 'ring-4 ring-green-200' : ''}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className={`text-xs mt-2 ${isCurrent ? 'font-bold text-green-600' : 'text-gray-500'}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  <div className="space-y-2">
                    <p><strong>Route:</strong> {searchResult.shipment.origin_country} → {searchResult.shipment.destination_country}</p>
                    <p><strong>Carrier:</strong> {searchResult.shipment.carrier_name || 'N/A'}</p>
                    <p><strong>Container:</strong> {searchResult.shipment.container_number || 'N/A'}</p>
                  </div>
                  <div className="space-y-2">
                    <p><strong>Departure:</strong> {searchResult.shipment.departure_date ? format(new Date(searchResult.shipment.departure_date), 'MMM d, yyyy') : 'N/A'}</p>
                    <p><strong>ETA:</strong> {searchResult.shipment.expected_arrival ? format(new Date(searchResult.shipment.expected_arrival), 'MMM d, yyyy') : 'N/A'}</p>
                    <p><strong>Tracking #:</strong> {searchResult.shipment.tracking_number || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Tracking Update */}
          <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-purple-800">
                  <Sparkles className="w-5 h-5" />
                  AI Live Tracking Update
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={getAITrackingUpdate}
                  disabled={loading || !searchResult?.shipment}
                  className="border-purple-300"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Get Update
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {aiTracking ? (
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Current Location
                    </h4>
                    <p className="text-gray-700">{aiTracking.current_location}</p>
                    {aiTracking.location_details && (
                      <p className="text-sm text-gray-500 mt-1">{aiTracking.location_details}</p>
                    )}
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-500">Next Milestone</p>
                      <p className="font-semibold">{aiTracking.next_milestone}</p>
                      <p className="text-sm text-gray-600">{aiTracking.eta_next_milestone}</p>
                    </div>
                    {aiTracking.route_conditions && (
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-xs text-gray-500">Route Conditions</p>
                        <p className="text-sm">{aiTracking.route_conditions}</p>
                      </div>
                    )}
                  </div>

                  {aiTracking.notes?.length > 0 && (
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-xs font-semibold text-yellow-800 mb-1">Notes</p>
                      <ul className="text-sm text-yellow-700 list-disc list-inside">
                        {aiTracking.notes.map((note, i) => <li key={i}>{note}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Click "Get Update" to receive AI-powered tracking information.</p>
              )}
            </CardContent>
          </Card>

          {/* Vehicle/Container Details */}
          {searchResult.type === 'vehicle' && searchResult.vehicle && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  Vehicle Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p><strong>Vehicle:</strong> {searchResult.vehicle.year} {searchResult.vehicle.make} {searchResult.vehicle.model}</p>
                    <p><strong>VIN:</strong> {searchResult.vehicle.vin}</p>
                    <p><strong>Color:</strong> {searchResult.vehicle.color || 'N/A'}</p>
                  </div>
                  <div>
                    <p><strong>Status:</strong> <Badge className={statusColors[searchResult.vehicle.status]}>{searchResult.vehicle.status}</Badge></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {searchResult.type === 'container' && searchResult.container && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Container Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p><strong>Container #:</strong> {searchResult.container.container_number}</p>
                    <p><strong>Seal #:</strong> {searchResult.container.seal_number || 'N/A'}</p>
                    <p><strong>Type:</strong> {searchResult.container.container_type}</p>
                  </div>
                  <div>
                    <p><strong>Vehicles:</strong> {searchResult.container.vehicle_count || 0}</p>
                    <p><strong>Vessel:</strong> {searchResult.container.vessel_name || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* No Search Yet */}
      {!searchResult && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Track Your Shipment</h3>
            <p className="text-gray-500">Enter a VIN, Container #, BL #, or Shipment ID to track your cargo</p>
          </CardContent>
        </Card>
      )}

      {/* Advanced Tracking Button */}
      {searchResult?.shipment && (
        <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Navigation className="w-6 h-6 text-indigo-600" />
                <div>
                  <h4 className="font-semibold text-indigo-800">Advanced AI Tracking</h4>
                  <p className="text-sm text-indigo-600">GPS, ETA updates, delay predictions & customer portal</p>
                </div>
              </div>
              <Button onClick={() => setAdvancedTrackingOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Globe className="w-4 h-4 mr-2" />
                Open Advanced Tracking
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Tracking Dialog */}
      <Dialog open={advancedTrackingOpen} onOpenChange={setAdvancedTrackingOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              Advanced AI Tracking - {searchResult?.shipment?.shipment_number}
            </DialogTitle>
          </DialogHeader>
          <AdvancedTrackingPanel shipment={searchResult?.shipment} onClose={() => setAdvancedTrackingOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}