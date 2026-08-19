import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, Polygon } from "react-leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ship, Package, AlertTriangle, Clock, MapPin, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { format } from "date-fns";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const statusColors = {
  in_transit: "#3b82f6",
  at_port: "#8b5cf6",
  customs_clearance: "#f59e0b",
  out_for_delivery: "#10b981",
  delivered: "#22c55e",
  delayed: "#ef4444",
  exception: "#dc2626"
};

const statusIcons = {
  in_transit: "🚢",
  at_port: "⚓",
  customs_clearance: "📋",
  out_for_delivery: "🚚",
  delivered: "✅",
  delayed: "⚠️",
  exception: "🚨"
};

// Port locations (sample coordinates)
const portLocations = {
  "CATOR": { lat: 43.6532, lng: -79.3832, name: "Toronto" },
  "CAVAN": { lat: 49.2827, lng: -123.1207, name: "Vancouver" },
  "USLAX": { lat: 33.7353, lng: -118.2667, name: "Los Angeles" },
  "USNYC": { lat: 40.6895, lng: -74.0447, name: "New York" },
  "SGSIN": { lat: 1.2644, lng: 103.8225, name: "Singapore" },
  "AEJEA": { lat: 24.9500, lng: 55.1000, name: "Jebel Ali" },
  "NLRTM": { lat: 51.9244, lng: 4.4777, name: "Rotterdam" },
  "DEHAM": { lat: 53.5395, lng: 9.9795, name: "Hamburg" },
  "default": { lat: 20.0, lng: 0.0, name: "At Sea" }
};

export default function ShipmentMapDashboard({ companyId }) {
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedShipment, setSelectedShipment] = useState(null);

  const { data: trackingRecords = [], isLoading } = useQuery({
    queryKey: ['allShipmentTracking', companyId],
    queryFn: async () => {
      const exports = await supabase.entities.ExportOrder.filter({ company_id: companyId });
      const exportIds = exports.map(e => e.id);
      
      if (exportIds.length === 0) return [];
      
      const tracking = await supabase.entities.ShipmentTracking.filter({});
      return tracking.filter(t => exportIds.includes(t.export_order_id));
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: exports = [] } = useQuery({
    queryKey: ['exports', companyId],
    queryFn: () => supabase.entities.ExportOrder.filter({ company_id: companyId }),
  });

  const { data: geofences = [] } = useQuery({
    queryKey: ['geofences', companyId],
    queryFn: () => supabase.entities.Geofence.filter({ company_id: companyId, active: true }),
    enabled: !!companyId
  });

  // Filter active shipments
  const activeShipments = trackingRecords.filter(t => 
    !['delivered', 'cancelled'].includes(t.current_status) &&
    (selectedStatus === 'all' || t.current_status === selectedStatus)
  );

  // Get shipment location
  const getShipmentLocation = (tracking) => {
    const lastEvent = tracking.tracking_events?.[0];
    if (lastEvent?.location) {
      // Try to match with known ports
      for (const [code, loc] of Object.entries(portLocations)) {
        if (lastEvent.location.includes(loc.name)) {
          return loc;
        }
      }
    }
    return portLocations.default;
  };

  // Calculate statistics
  const stats = {
    total: activeShipments.length,
    in_transit: activeShipments.filter(s => s.current_status === 'in_transit').length,
    at_port: activeShipments.filter(s => s.current_status === 'at_port').length,
    customs: activeShipments.filter(s => s.current_status === 'customs_clearance').length,
    delayed: activeShipments.filter(s => s.current_status === 'delayed' || s.delay_reason).length,
  };

  const getExportOrder = (exportOrderId) => {
    return exports.find(e => e.id === exportOrderId);
  };

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedStatus('all')}>
          <CardContent className="pt-6">
            <div className="text-center">
              <Package className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-gray-600">Active Shipments</div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedStatus('in_transit')}>
          <CardContent className="pt-6">
            <div className="text-center">
              <Ship className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">{stats.in_transit}</div>
              <div className="text-xs text-gray-600">In Transit</div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedStatus('at_port')}>
          <CardContent className="pt-6">
            <div className="text-center">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold">{stats.at_port}</div>
              <div className="text-xs text-gray-600">At Port</div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedStatus('customs_clearance')}>
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
              <div className="text-2xl font-bold">{stats.customs}</div>
              <div className="text-xs text-gray-600">Customs</div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedStatus('delayed')}>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-600" />
              <div className="text-2xl font-bold">{stats.delayed}</div>
              <div className="text-xs text-gray-600">Delayed</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Real-Time Shipment Tracking
            </CardTitle>
            {selectedStatus !== 'all' && (
              <Button variant="outline" size="sm" onClick={() => setSelectedStatus('all')}>
                <Filter className="w-4 h-4 mr-2" />
                Clear Filter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] rounded-lg overflow-hidden border">
            <MapContainer 
              center={[20, 0]} 
              zoom={2} 
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Render Geofences */}
              {geofences.map((geofence) => (
                <React.Fragment key={geofence.id}>
                  {geofence.shape === 'circle' ? (
                    <Circle
                      center={[geofence.center_latitude, geofence.center_longitude]}
                      radius={geofence.radius_km * 1000}
                      pathOptions={{ 
                        color: geofence.color, 
                        fillColor: geofence.color,
                        fillOpacity: 0.15,
                        weight: 2,
                        dashArray: '5, 5'
                      }}
                    >
                      <Popup>
                        <div className="p-2">
                          <p className="font-semibold">{geofence.name}</p>
                          <p className="text-xs text-gray-600 capitalize">
                            {geofence.location_type.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-gray-600">
                            Radius: {geofence.radius_km} km
                          </p>
                        </div>
                      </Popup>
                    </Circle>
                  ) : geofence.polygon_coordinates ? (
                    <Polygon
                      positions={geofence.polygon_coordinates.map(c => [c.lat, c.lng])}
                      pathOptions={{ 
                        color: geofence.color,
                        fillColor: geofence.color,
                        fillOpacity: 0.15,
                        weight: 2,
                        dashArray: '5, 5'
                      }}
                    >
                      <Popup>
                        <div className="p-2">
                          <p className="font-semibold">{geofence.name}</p>
                          <p className="text-xs text-gray-600 capitalize">
                            {geofence.location_type.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </Popup>
                    </Polygon>
                  ) : null}
                </React.Fragment>
              ))}
              
              {/* Render Shipments */}
              {activeShipments.map((tracking) => {
                const location = getShipmentLocation(tracking);
                const order = getExportOrder(tracking.export_order_id);
                
                return (
                  <Marker 
                    key={tracking.id} 
                    position={[location.lat, location.lng]}
                    eventHandlers={{
                      click: () => setSelectedShipment(tracking)
                    }}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{statusIcons[tracking.current_status]}</span>
                          <Badge style={{ backgroundColor: statusColors[tracking.current_status] }}>
                            {tracking.current_status.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p><strong>Tracking:</strong> {tracking.tracking_number}</p>
                          <p><strong>Order:</strong> {order?.export_order_number || 'N/A'}</p>
                          <p><strong>Location:</strong> {tracking.current_location || location.name}</p>
                          <p><strong>Carrier:</strong> {tracking.carrier.toUpperCase()}</p>
                          {tracking.estimated_delivery && (
                            <p><strong>ETA:</strong> {format(new Date(tracking.estimated_delivery), 'MMM d, yyyy')}</p>
                          )}
                          {tracking.delay_reason && (
                            <div className="mt-2 p-2 bg-red-50 rounded text-red-800">
                              <strong>⚠️ Delay:</strong> {tracking.delay_reason}
                            </div>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      {/* Shipment List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Shipments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeShipments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Ship className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No active shipments</p>
              </div>
            ) : (
              activeShipments.map((tracking) => {
                const order = getExportOrder(tracking.export_order_id);
                return (
                  <div 
                    key={tracking.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedShipment(tracking)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">{statusIcons[tracking.current_status]}</div>
                      <div>
                        <div className="font-semibold">{tracking.tracking_number}</div>
                        <div className="text-sm text-gray-600">
                          {order?.export_order_number} • {tracking.carrier.toUpperCase()}
                        </div>
                        <div className="text-sm text-gray-600">{tracking.current_location || 'At Sea'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge style={{ backgroundColor: statusColors[tracking.current_status] }}>
                        {tracking.current_status.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                      {tracking.estimated_delivery && (
                        <div className="text-sm text-gray-600 mt-1">
                          ETA: {format(new Date(tracking.estimated_delivery), 'MMM d')}
                        </div>
                      )}
                      {tracking.delay_reason && (
                        <div className="text-xs text-red-600 mt-1 max-w-[200px]">
                          ⚠️ {tracking.delay_reason}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}