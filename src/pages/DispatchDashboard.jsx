import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, MapPin, Package, AlertTriangle, Clock, CheckCircle, Plus, TrendingUp } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { toast } from "sonner";
import ShipmentDialog from "@/components/dispatch/ShipmentDialog";
import LiveTrackingMap from "@/components/dispatch/LiveTrackingMap";
import DriverManagement from "@/components/dispatch/DriverManagement";
import FleetManagement from "@/components/dispatch/FleetManagement";
import HazmatCompliance from "@/components/dispatch/HazmatCompliance";
import DocumentManager from "@/components/dispatch/DocumentManager";
import ThirdPartyCarriers from "@/components/dispatch/ThirdPartyCarriers";
import DriverPerformanceAnalytics from "@/components/dispatch/DriverPerformanceAnalytics";
import { predictShipmentETA, updateShipmentETA } from "@/components/dispatch/AIETAPrediction";

export default function DispatchDashboard() {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [shipmentDialogOpen, setShipmentDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);

  const { data: shipments = [] } = useQuery({
    queryKey: ['localShipments', selectedCompanyId],
    queryFn: () => base44.entities.LocalShipment.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers', selectedCompanyId],
    queryFn: () => base44.entities.Driver.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const { data: trucks = [] } = useQuery({
    queryKey: ['trucks', selectedCompanyId],
    queryFn: () => base44.entities.TruckVehicle.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const predictETAMutation = useMutation({
    mutationFn: async (shipmentId) => {
      const shipment = shipments.find(s => s.id === shipmentId);
      const gpsPoints = await base44.entities.GPSTrackingPoint.filter(
        { shipment_id: shipmentId },
        '-timestamp',
        20
      );
      const prediction = await predictShipmentETA(shipment, gpsPoints);
      if (prediction.success) {
        await updateShipmentETA(shipmentId, prediction);
      }
      return prediction;
    },
    onSuccess: (prediction) => {
      queryClient.invalidateQueries({ queryKey: ['localShipments'] });
      if (prediction.success) {
        toast.success(`ETA updated: ${new Date(prediction.predicted_eta).toLocaleString()}`);
      }
    },
    onError: () => toast.error("Failed to predict ETA")
  });

  // KPIs
  const activeShipments = shipments.filter(s => s.status === 'in_transit').length;
  const pendingShipments = shipments.filter(s => s.status === 'pending').length;
  const hazmatShipments = shipments.filter(s => s.contains_hazmat && s.status === 'in_transit').length;
  const availableDrivers = drivers.filter(d => d.status === 'active' || d.status === 'off_duty').length;

  if (!selectedCompanyId) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Please select a company to view dispatch dashboard</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <h1 className="text-2xl font-bold text-white">Dispatch & Tracking Dashboard</h1>
        <p className="text-sm text-gray-300 mt-1">Local & Long-Haul Shipment Management with Live GPS Tracking</p>
      </div>

      <div className="p-6 max-w-[1800px] mx-auto space-y-6">
        {/* KPIs */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Shipments</p>
                  <p className="text-3xl font-bold text-blue-600">{activeShipments}</p>
                </div>
                <Truck className="w-10 h-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Dispatch</p>
                  <p className="text-3xl font-bold text-orange-600">{pendingShipments}</p>
                </div>
                <Clock className="w-10 h-10 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">HAZMAT Loads</p>
                  <p className="text-3xl font-bold text-red-600">{hazmatShipments}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Available Drivers</p>
                  <p className="text-3xl font-bold text-green-600">{availableDrivers}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="shipments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="shipments">Shipments</TabsTrigger>
            <TabsTrigger value="live_tracking">Live Tracking</TabsTrigger>
            <TabsTrigger value="drivers">Drivers</TabsTrigger>
            <TabsTrigger value="fleet">Fleet</TabsTrigger>
            <TabsTrigger value="carriers">3rd Party Carriers</TabsTrigger>
            <TabsTrigger value="performance">Performance Analytics</TabsTrigger>
            <TabsTrigger value="hazmat">HAZMAT Compliance</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="shipments" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">All Shipments</h2>
              <Button onClick={() => {
                setSelectedShipment(null);
                setShipmentDialogOpen(true);
              }} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Shipment
              </Button>
            </div>

            <div className="grid gap-4">
              {shipments.map(shipment => (
                <Card key={shipment.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg">{shipment.shipment_number}</h3>
                          <Badge className={
                            shipment.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                            shipment.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            shipment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {shipment.status}
                          </Badge>
                          <Badge variant="outline">{shipment.shipment_type}</Badge>
                          {shipment.contains_hazmat && (
                            <Badge className="bg-red-100 text-red-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              HAZMAT
                            </Badge>
                          )}
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Origin:</p>
                            <p className="font-medium">{shipment.origin_city}, {shipment.origin_province}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Destination:</p>
                            <p className="font-medium">{shipment.destination_city}, {shipment.destination_province}</p>
                          </div>
                          {shipment.driver_id && (
                            <div>
                              <p className="text-gray-600">Driver:</p>
                              <p className="font-medium">{drivers.find(d => d.id === shipment.driver_id)?.driver_name || 'N/A'}</p>
                            </div>
                          )}
                          {shipment.truck_id && (
                            <div>
                              <p className="text-gray-600">Truck:</p>
                              <p className="font-medium">{trucks.find(t => t.id === shipment.truck_id)?.truck_number || 'N/A'}</p>
                            </div>
                          )}
                        </div>
                        {shipment.estimated_arrival && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="w-4 h-4 text-blue-600" />
                              <span className="text-xs text-gray-600 font-semibold">AI Predicted ETA:</span>
                            </div>
                            <p className="font-bold text-blue-700">
                              {new Date(shipment.estimated_arrival).toLocaleString()}
                            </p>
                            {shipment.eta_confidence && (
                              <p className="text-xs text-gray-500 mt-1">
                                Confidence: {Math.round(shipment.eta_confidence * 100)}%
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => {
                            setSelectedShipment(shipment);
                            setShipmentDialogOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                        >
                          View Details
                        </Button>
                        {(shipment.status === 'in_transit' || shipment.status === 'near_destination') && (
                          <Button
                            onClick={() => predictETAMutation.mutate(shipment.id)}
                            disabled={predictETAMutation.isPending}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            title="Update AI ETA"
                          >
                            <TrendingUp className="w-4 h-4 mr-1" />
                            Update ETA
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {shipments.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No shipments yet. Create your first shipment to get started.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="live_tracking">
            <LiveTrackingMap shipments={shipments.filter(s => s.tracking_enabled && s.status === 'in_transit')} />
          </TabsContent>

          <TabsContent value="drivers">
            <DriverManagement />
          </TabsContent>

          <TabsContent value="fleet">
            <FleetManagement />
          </TabsContent>

          <TabsContent value="carriers">
            <ThirdPartyCarriers />
          </TabsContent>

          <TabsContent value="performance">
            <DriverPerformanceAnalytics />
          </TabsContent>

          <TabsContent value="hazmat">
            <HazmatCompliance shipments={shipments.filter(s => s.contains_hazmat)} />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentManager />
          </TabsContent>
        </Tabs>
      </div>

      <ShipmentDialog
        open={shipmentDialogOpen}
        onClose={() => {
          setShipmentDialogOpen(false);
          setSelectedShipment(null);
        }}
        shipment={selectedShipment}
        drivers={drivers}
        trucks={trucks}
      />
    </div>
  );
}