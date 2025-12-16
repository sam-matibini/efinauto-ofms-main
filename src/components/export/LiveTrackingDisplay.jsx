import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MapPin, Package, Clock, AlertCircle, RefreshCw, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fetchTrackingData, updateTrackingData, carrierInfo, statusColors } from "./ShipmentTrackingService";

export default function LiveTrackingDisplay({ order }) {
  const [addingTracking, setAddingTracking] = useState(false);
  const [newTracking, setNewTracking] = useState({ tracking_number: "", carrier: "maersk" });
  const queryClient = useQueryClient();

  const { data: trackingRecords = [], isLoading } = useQuery({
    queryKey: ['shipmentTracking', order.id],
    queryFn: () => base44.entities.ShipmentTracking.filter({ export_order_id: order.id }),
    refetchInterval: 60000, // Auto-refresh every 60 seconds
  });

  const createTrackingMutation = useMutation({
    mutationFn: async (data) => {
      const trackingData = await fetchTrackingData(data.tracking_number, data.carrier);
      return base44.entities.ShipmentTracking.create({
        company_id: order.company_id,
        export_order_id: order.id,
        ...data,
        ...trackingData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipmentTracking', order.id] });
      toast.success("Tracking added successfully");
      setAddingTracking(false);
      setNewTracking({ tracking_number: "", carrier: "maersk" });
    },
    onError: (error) => {
      toast.error("Failed to add tracking: " + error.message);
    }
  });

  const refreshTrackingMutation = useMutation({
    mutationFn: (trackingId) => updateTrackingData(trackingId, order.company_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipmentTracking', order.id] });
      toast.success("Tracking data refreshed");
    },
    onError: (error) => {
      toast.error("Failed to refresh: " + error.message);
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold flex items-center gap-2">
          <Package className="w-5 h-5" />
          Live Shipment Tracking
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddingTracking(!addingTracking)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Tracking
        </Button>
      </div>

      {addingTracking && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4 space-y-3">
            <div>
              <Label>Carrier</Label>
              <Select value={newTracking.carrier} onValueChange={(v) => setNewTracking({...newTracking, carrier: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(carrierInfo).map(([key, info]) => (
                    <SelectItem key={key} value={key}>
                      {info.logo} {info.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tracking Number</Label>
              <Input
                value={newTracking.tracking_number}
                onChange={(e) => setNewTracking({...newTracking, tracking_number: e.target.value})}
                placeholder="e.g., MAEU123456789"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => createTrackingMutation.mutate(newTracking)}
                disabled={!newTracking.tracking_number || createTrackingMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createTrackingMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Add & Track
              </Button>
              <Button variant="outline" onClick={() => setAddingTracking(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
        </div>
      ) : trackingRecords.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No tracking information available</p>
            <p className="text-sm">Add a tracking number to monitor shipment</p>
          </CardContent>
        </Card>
      ) : (
        trackingRecords.map((tracking) => (
          <Card key={tracking.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {carrierInfo[tracking.carrier]?.logo} {carrierInfo[tracking.carrier]?.name}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Tracking: <span className="font-mono font-semibold">{tracking.tracking_number}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge className={statusColors[tracking.current_status]}>
                    {tracking.current_status.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refreshTrackingMutation.mutate(tracking.id)}
                    disabled={refreshTrackingMutation.isPending}
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshTrackingMutation.isPending ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Status */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-600">Current Location</p>
                    <p className="font-semibold">{tracking.current_location || 'In Transit'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-600">Estimated Delivery</p>
                    <p className="font-semibold">
                      {tracking.estimated_delivery ? format(new Date(tracking.estimated_delivery), 'MMM d, yyyy') : 'TBD'}
                    </p>
                  </div>
                </div>
              </div>

              {tracking.delay_reason && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">Delay Reported</p>
                    <p className="text-sm text-red-700">{tracking.delay_reason}</p>
                  </div>
                </div>
              )}

              {/* Tracking Events Timeline */}
              {tracking.tracking_events?.length > 0 && (
                <div>
                  <h5 className="font-semibold text-sm mb-3">Tracking History</h5>
                  <div className="space-y-3">
                    {tracking.tracking_events.map((event, idx) => (
                      <div key={idx} className="flex gap-3 relative">
                        {idx < tracking.tracking_events.length - 1 && (
                          <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-gray-200" />
                        )}
                        <div className="w-4 h-4 rounded-full bg-blue-600 mt-1 z-10" />
                        <div className="flex-1 pb-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{event.description}</p>
                              <p className="text-xs text-gray-600">{event.location}</p>
                            </div>
                            <p className="text-xs text-gray-500 whitespace-nowrap">
                              {format(new Date(event.timestamp), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500 pt-2 border-t">
                Last updated: {format(new Date(tracking.last_updated), 'MMM d, yyyy h:mm a')}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}