import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navigation, MapPin, CheckCircle, Upload, Camera, AlertTriangle, Phone, Clock, TrendingUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { predictShipmentETA, updateShipmentETA, calculateAverageSpeed } from "@/components/dispatch/AIETAPrediction";

export default function DriverMobile() {
  const queryClient = useQueryClient();
  const [trackingActive, setTrackingActive] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: driver } = useQuery({
    queryKey: ['myDriver', currentUser?.email],
    queryFn: async () => {
      const drivers = await base44.entities.Driver.filter({ driver_email: currentUser.email });
      return drivers.length > 0 ? drivers[0] : null;
    },
    enabled: !!currentUser?.email,
  });

  const { data: activeShipment } = useQuery({
    queryKey: ['activeShipment', driver?.current_shipment_id],
    queryFn: () => base44.entities.LocalShipment.filter({ id: driver.current_shipment_id }),
    enabled: !!driver?.current_shipment_id,
  });

  const recordGPSMutation = useMutation({
    mutationFn: (location) => base44.entities.GPSTrackingPoint.create({
      shipment_id: activeShipment[0].id,
      driver_id: driver.id,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      speed_kmh: location.coords.speed || 0,
      accuracy: location.coords.accuracy,
      timestamp: new Date().toISOString()
    }),
    onError: () => console.error("Failed to record GPS point")
  });

  const { data: recentGPS = [] } = useQuery({
    queryKey: ['recentGPS', activeShipment?.[0]?.id],
    queryFn: () => base44.entities.GPSTrackingPoint.filter(
      { shipment_id: activeShipment[0].id },
      '-timestamp',
      10
    ),
    enabled: !!activeShipment?.[0]?.id,
    refetchInterval: 30000
  });

  const updateETAMutation = useMutation({
    mutationFn: async () => {
      const prediction = await predictShipmentETA(activeShipment[0], recentGPS);
      if (prediction.success) {
        await updateShipmentETA(activeShipment[0].id, prediction);
      }
      return prediction;
    },
    onSuccess: (prediction) => {
      queryClient.invalidateQueries({ queryKey: ['activeShipment'] });
      if (prediction.success) {
        toast.success("ETA updated successfully");
      }
    },
    onError: () => toast.error("Failed to update ETA")
  });

  useEffect(() => {
    if (trackingActive && activeShipment?.[0]) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLocation(position);
          recordGPSMutation.mutate(position);
        },
        (error) => console.error("GPS error:", error),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [trackingActive, activeShipment]);

  if (!driver) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-orange-500" />
            <h2 className="text-xl font-bold mb-2">Driver Profile Not Found</h2>
            <p className="text-gray-600">Please contact your dispatcher to set up your driver profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4 bg-blue-600">
        <h1 className="text-2xl font-bold text-white">Driver App</h1>
        <p className="text-sm text-blue-100 mt-1">Welcome, {driver.driver_name}</p>
      </div>

      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Active Shipment */}
        {activeShipment?.[0] ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Active Shipment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Shipment Number</p>
                  <p className="font-bold text-lg">{activeShipment[0].shipment_number}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">From:</p>
                    <p className="font-medium">{activeShipment[0].origin_city}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">To:</p>
                    <p className="font-medium">{activeShipment[0].destination_city}</p>
                  </div>
                </div>

                {activeShipment[0].contains_hazmat && (
                  <Badge className="bg-red-100 text-red-800">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    HAZMAT - Follow Safety Protocols
                  </Badge>
                )}

                {activeShipment[0].estimated_arrival && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-900">AI Predicted ETA</span>
                      </div>
                      <Button
                        onClick={() => updateETAMutation.mutate()}
                        disabled={updateETAMutation.isPending}
                        size="sm"
                        variant="outline"
                        className="h-7"
                      >
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Update
                      </Button>
                    </div>
                    <p className="font-bold text-lg text-blue-700">
                      {new Date(activeShipment[0].estimated_arrival).toLocaleString()}
                    </p>
                    {activeShipment[0].eta_confidence && (
                      <p className="text-xs text-blue-600 mt-1">
                        Confidence: {Math.round(activeShipment[0].eta_confidence * 100)}%
                      </p>
                    )}
                    {recentGPS.length > 0 && (
                      <p className="text-xs text-gray-600 mt-1">
                        Avg Speed: {calculateAverageSpeed(recentGPS).toFixed(1)} km/h
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600 mb-2">GPS Tracking</p>
                  <Button
                    onClick={() => setTrackingActive(!trackingActive)}
                    className={trackingActive ? "bg-green-600 hover:bg-green-700 w-full" : "bg-blue-600 hover:bg-blue-700 w-full"}
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    {trackingActive ? "Tracking Active ✓" : "Start GPS Tracking"}
                  </Button>
                  {currentLocation && (
                    <p className="text-xs text-gray-500 mt-2">
                      Last update: {new Date().toLocaleTimeString()} • Accuracy: {currentLocation.coords.accuracy?.toFixed(0)}m
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Emergency Contact</p>
                  <Button variant="outline" className="w-full">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Dispatcher
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>
                <Button className="w-full justify-start bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Delivery
                </Button>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="font-semibold text-gray-700 mb-2">No Active Shipment</h3>
              <p className="text-sm">Contact dispatch for your next assignment</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}