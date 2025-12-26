import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigation, MapPin, AlertTriangle, Clock, TrendingUp, Shield, List, MessageSquare, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { predictShipmentETA, updateShipmentETA, calculateAverageSpeed } from "@/components/dispatch/AIETAPrediction";
import IncidentReportDialog from "@/components/dispatch/IncidentReportDialog";
import { checkWeatherHazards } from "@/components/dispatch/HazmatWeatherAlerts";
import ShipmentStatusUpdater from "@/components/driver/ShipmentStatusUpdater";
import ProofOfDeliveryCapture from "@/components/driver/ProofOfDeliveryCapture";
import DispatchCommunication from "@/components/driver/DispatchCommunication";
import RouteNavigation from "@/components/driver/RouteNavigation";

export default function DriverMobile() {
  const queryClient = useQueryClient();
  const [trackingActive, setTrackingActive] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [podDialogOpen, setPodDialogOpen] = useState(false);
  const [commDialogOpen, setCommDialogOpen] = useState(false);
  const [weatherAlerts, setWeatherAlerts] = useState(null);

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

  const { data: assignedShipments = [] } = useQuery({
    queryKey: ['assignedShipments', driver?.id],
    queryFn: () => base44.entities.LocalShipment.filter({ 
      driver_id: driver.id,
      status: { $in: ['assigned', 'in_transit', 'near_destination'] }
    }),
    enabled: !!driver?.id,
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

  // Check weather hazards for HAZMAT shipments
  useEffect(() => {
    if (activeShipment?.[0]?.contains_hazmat && trackingActive) {
      checkWeatherHazards(activeShipment[0]).then(alerts => {
        if (alerts.has_alerts) {
          setWeatherAlerts(alerts);
        }
      });
      
      const interval = setInterval(() => {
        checkWeatherHazards(activeShipment[0]).then(alerts => {
          if (alerts.has_alerts) {
            setWeatherAlerts(alerts);
          }
        });
      }, 300000); // Check every 5 minutes

      return () => clearInterval(interval);
    }
  }, [activeShipment, trackingActive]);

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

      <div className="p-4 max-w-2xl mx-auto">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="assigned">All Assigned ({assignedShipments.length})</TabsTrigger>
            <TabsTrigger value="navigation">Navigate</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
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
                  <>
                    <Badge className="bg-red-100 text-red-800">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      HAZMAT - Follow Safety Protocols
                    </Badge>
                    <Button
                      onClick={() => setIncidentDialogOpen(true)}
                      className="bg-red-600 hover:bg-red-700 w-full mt-2"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Report Safety Incident
                    </Button>
                  </>
                )}

                {weatherAlerts?.has_alerts && (
                  <div className="p-3 bg-orange-50 border-2 border-orange-400 rounded-lg mt-2">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-orange-700" />
                      <span className="font-bold text-orange-900">Weather/Road Alerts</span>
                    </div>
                    {weatherAlerts.alerts.map((alert, idx) => (
                      <div key={idx} className="text-sm mb-2 pb-2 border-b border-orange-200 last:border-0">
                        <p className="font-semibold text-orange-900">{alert.type}</p>
                        <p className="text-orange-800 text-xs">{alert.description}</p>
                        <p className="text-orange-700 text-xs mt-1">📍 {alert.location}</p>
                      </div>
                    ))}
                    <p className="text-xs text-orange-900 mt-2 font-semibold">
                      ⚠️ {weatherAlerts.overall_recommendation}
                    </p>
                  </div>
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

                <ShipmentStatusUpdater shipment={activeShipment[0]} />

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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => setCommDialogOpen(true)}
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Contact Dispatch
                </Button>
                <Button 
                  onClick={() => setPodDialogOpen(true)}
                  className="w-full justify-start bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Delivery & POD
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
          </TabsContent>

          <TabsContent value="assigned" className="space-y-4">
            {assignedShipments.length > 0 ? (
              assignedShipments.map((shipment) => (
                <Card key={shipment.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold">{shipment.shipment_number}</p>
                        <Badge className={
                          shipment.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                          shipment.status === 'in_transit' ? 'bg-purple-100 text-purple-800' :
                          'bg-orange-100 text-orange-800'
                        }>
                          {shipment.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      {shipment.contains_hazmat && (
                        <Badge className="bg-red-100 text-red-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          HAZMAT
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-600">From:</p>
                        <p className="font-medium">{shipment.origin_city}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">To:</p>
                        <p className="font-medium">{shipment.destination_city}</p>
                      </div>
                    </div>
                    {shipment.scheduled_delivery_time && (
                      <p className="text-xs text-gray-500 mt-2">
                        Due: {new Date(shipment.scheduled_delivery_time).toLocaleString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <List className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No assigned shipments</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="navigation" className="space-y-4">
            {activeShipment?.[0] ? (
              <RouteNavigation 
                shipment={activeShipment[0]} 
                currentLocation={currentLocation}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <Navigation className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No active shipment for navigation</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {activeShipment?.[0] && driver && (
          <>
            <IncidentReportDialog
              open={incidentDialogOpen}
              onClose={() => setIncidentDialogOpen(false)}
              shipment={activeShipment[0]}
              driver={driver}
            />
            <ProofOfDeliveryCapture
              open={podDialogOpen}
              onClose={() => setPodDialogOpen(false)}
              shipment={activeShipment[0]}
              driver={driver}
            />
            <DispatchCommunication
              open={commDialogOpen}
              onClose={() => setCommDialogOpen(false)}
              shipment={activeShipment[0]}
              driver={driver}
            />
          </>
        )}
      </div>
    </div>
  );
}