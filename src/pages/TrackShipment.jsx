import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Ship, Search, Loader2, MapPin, Clock, Package, Calendar, Share2 } from "lucide-react";
import { MSCAPIService } from "../components/export/MSCAPIService";
import { format } from "date-fns";
import ShipmentShareDialog from "../components/shipping/ShipmentShareDialog";

export default function TrackShipment() {
  const [trackingNumber, setTrackingNumber] = useState("MEDURS030563");
  const [carrier, setCarrier] = useState("MSC");
  const [loading, setLoading] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const handleTrack = async () => {
    setLoading(true);
    try {
      const result = await MSCAPIService.getTrackingUpdate(trackingNumber, trackingNumber);
      
      if (result.success) {
        setTrackingData(result.tracking);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    loaded: "bg-blue-100 text-blue-800",
    in_transit: "bg-purple-100 text-purple-800",
    at_port: "bg-yellow-100 text-yellow-800",
    customs_clearance: "bg-orange-100 text-orange-800",
    out_for_delivery: "bg-green-100 text-green-800",
    delivered: "bg-green-100 text-green-800"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Track Your Shipment</h1>
          <p className="text-gray-600">Real-time tracking for ocean freight containers</p>
        </div>

        {/* Search Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Enter Tracking Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Label>Container / B/L Number</Label>
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter container or B/L number"
                  className="text-lg"
                />
              </div>
              <div>
                <Label>Carrier</Label>
                <Select value={carrier} onValueChange={setCarrier}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MSC">MSC</SelectItem>
                    <SelectItem value="MAERSK">Maersk</SelectItem>
                    <SelectItem value="CMA_CGM">CMA CGM</SelectItem>
                    <SelectItem value="HAPAG">Hapag-Lloyd</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleTrack} 
              disabled={loading || !trackingNumber}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Tracking...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  Track Shipment
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Tracking Results */}
        {trackingData && (
          <div className="space-y-4">
            {/* Status Card */}
            <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Ship className="w-8 h-8 text-blue-600" />
                    <div>
                      <h3 className="text-xl font-bold">Container {trackingNumber}</h3>
                      <p className="text-sm text-gray-600">Carrier: {carrier}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${statusColors[trackingData.status]} text-lg px-4 py-2`}>
                      {trackingData.status.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                    <Button 
                      onClick={() => setShareDialogOpen(true)}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-500">Current Location</p>
                      <p className="font-semibold">{trackingData.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-xs text-gray-500">Estimated Arrival</p>
                      <p className="font-semibold">
                        {trackingData.estimated_arrival 
                          ? format(new Date(trackingData.estimated_arrival), 'MMM d, yyyy')
                          : 'TBD'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                    <Package className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-gray-500">Last Event</p>
                      <p className="font-semibold text-sm">{trackingData.last_event}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            {trackingData.events && trackingData.events.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Tracking History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {trackingData.events.map((event, idx) => (
                      <div key={idx} className="flex gap-4 relative">
                        {idx < trackingData.events.length - 1 && (
                          <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-blue-200" />
                        )}
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center z-10 mt-1">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold">{event.description}</p>
                              <p className="text-sm text-gray-600">{event.location}</p>
                              <Badge className={`${statusColors[event.status]} mt-2`}>
                                {event.status.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500">
                              {format(new Date(event.timestamp), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <ShipmentShareDialog
          open={shareDialogOpen}
          onClose={() => setShareDialogOpen(false)}
          trackingData={trackingData}
          trackingNumber={trackingNumber}
          carrier={carrier}
        />
      </div>
    </div>
  );
}