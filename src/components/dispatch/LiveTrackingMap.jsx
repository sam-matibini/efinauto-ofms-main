import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Navigation, Share2, Mail, MessageCircle, Truck, User, History } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createDriverIcon = (type, isSelected) => {
  const color = type === 'internal' ? '#3b82f6' : '#f59e0b';
  const size = isSelected ? 40 : 30;
  
  return L.divIcon({
    className: 'custom-driver-marker',
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        ${isSelected ? 'animation: pulse 2s infinite;' : ''}
      ">
        <svg width="${size * 0.6}" height="${size * 0.6}" viewBox="0 0 24 24" fill="white">
          <path d="M18 18.5C18 19.881 17.328 21 16.5 21H7.5C6.672 21 6 19.881 6 18.5V8.5C6 7.119 6.672 6 7.5 6H9V5C9 3.343 10.343 2 12 2C13.657 2 15 3.343 15 5V6H16.5C17.328 6 18 7.119 18 8.5V18.5ZM11 5C11 4.448 11.448 4 12 4C12.552 4 13 4.448 13 5V6H11V5Z"/>
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};

// Map controller component to handle center changes
function MapController({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  
  return null;
}

export default function LiveTrackingMap({ shipments }) {
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showRouteHistory, setShowRouteHistory] = useState(false);
  const [mapCenter, setMapCenter] = useState([43.6532, -79.3832]); // Default: Toronto

  // Fetch internal drivers
  const { data: internalDrivers = [] } = useQuery({
    queryKey: ['internalDrivers'],
    queryFn: () => base44.entities.Driver.filter({ status: 'on_duty' }),
  });

  // Fetch third-party drivers
  const { data: thirdPartyDrivers = [] } = useQuery({
    queryKey: ['thirdPartyDrivers'],
    queryFn: () => base44.entities.ThirdPartyDriver.filter({ status: 'active' }),
  });

  // Fetch latest GPS points for active shipments
  const { data: gpsPoints = [] } = useQuery({
    queryKey: ['gpsPoints', shipments.map(s => s.id)],
    queryFn: async () => {
      const allPoints = [];
      for (const shipment of shipments) {
        const points = await base44.entities.GPSTrackingPoint.filter(
          { shipment_id: shipment.id },
          '-timestamp',
          1
        );
        if (points.length > 0) {
          allPoints.push({ ...points[0], shipment });
        }
      }
      return allPoints;
    },
    enabled: shipments.length > 0,
    refetchInterval: 10000 // Refresh every 10 seconds for real-time updates
  });

  // Fetch route history for selected shipment
  const { data: routeHistory = [] } = useQuery({
    queryKey: ['routeHistory', selectedShipment?.id],
    queryFn: () => base44.entities.GPSTrackingPoint.filter(
      { shipment_id: selectedShipment.id },
      '-timestamp',
      100
    ),
    enabled: !!selectedShipment && showRouteHistory,
  });

  // Get driver location and type
  const getDriverLocation = (driverId) => {
    const point = gpsPoints.find(p => p.shipment?.driver_id === driverId);
    const shipment = shipments.find(s => s.driver_id === driverId);
    const internalDriver = internalDrivers.find(d => d.id === driverId);
    const thirdPartyDriver = thirdPartyDrivers.find(d => d.id === driverId);
    
    return {
      point,
      shipment,
      driver: internalDriver || thirdPartyDriver,
      type: internalDriver ? 'internal' : 'third_party'
    };
  };

  // All active drivers with locations
  const activeDrivers = [
    ...internalDrivers.map(d => ({ ...d, type: 'internal' })),
    ...thirdPartyDrivers.map(d => ({ ...d, type: 'third_party' }))
  ].filter(driver => {
    const shipment = shipments.find(s => s.driver_id === driver.id);
    return shipment && gpsPoints.some(p => p.shipment_id === shipment.id);
  });

  useEffect(() => {
    // Auto-center map on first GPS point
    if (gpsPoints.length > 0 && !selectedShipment && !selectedDriver) {
      setMapCenter([gpsPoints[0].latitude, gpsPoints[0].longitude]);
    }
  }, [gpsPoints.length]);

  const generateTrackingLink = (shipment) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/track/${shipment.tracking_token}`;
  };

  const shareTracking = async (shipment, channel) => {
    const trackingLink = generateTrackingLink(shipment);
    const message = `
🚚 Live Shipment Tracking

Shipment: ${shipment.shipment_number}
From: ${shipment.origin_city}, ${shipment.origin_province}
To: ${shipment.destination_city}, ${shipment.destination_province}

Track live: ${trackingLink}

Updates every 30 seconds
    `.trim();

    try {
      if (channel === 'email') {
        const email = prompt("Enter email address:");
        if (email) {
          await base44.integrations.Core.SendEmail({
            to: email,
            subject: `Live Tracking - ${shipment.shipment_number}`,
            body: message.replace(/\n/g, '<br>')
          });
          toast.success("Tracking link sent via email");
        }
      } else if (channel === 'whatsapp') {
        const phone = prompt("Enter phone number (optional):");
        window.open(`https://wa.me/${phone || ''}?text=${encodeURIComponent(message)}`, '_blank');
        toast.success("Opening WhatsApp");
      } else if (channel === 'sms') {
        const phone = prompt("Enter phone number:");
        if (phone) {
          window.open(`sms:${phone}?body=${encodeURIComponent(message)}`, '_blank');
          toast.success("Opening SMS");
        }
      }
    } catch (error) {
      toast.error("Failed to share tracking link");
    }
  };

  const handleDriverSelect = (driverId) => {
    if (driverId === 'all') {
      setSelectedDriver(null);
      setSelectedShipment(null);
      setShowRouteHistory(false);
      if (gpsPoints.length > 0) {
        setMapCenter([gpsPoints[0].latitude, gpsPoints[0].longitude]);
      }
    } else {
      const shipment = shipments.find(s => s.driver_id === driverId);
      const point = gpsPoints.find(p => p.shipment_id === shipment?.id);
      setSelectedDriver(driverId);
      setSelectedShipment(shipment);
      if (point) {
        setMapCenter([point.latitude, point.longitude]);
      }
    }
  };

  const handleShipmentSelect = (shipmentId) => {
    if (shipmentId === 'all') {
      setSelectedShipment(null);
      setSelectedDriver(null);
      setShowRouteHistory(false);
    } else {
      const shipment = shipments.find(s => s.id === shipmentId);
      const point = gpsPoints.find(p => p.shipment_id === shipmentId);
      setSelectedShipment(shipment);
      setSelectedDriver(shipment?.driver_id);
      if (point) {
        setMapCenter([point.latitude, point.longitude]);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <Select value={selectedDriver || 'all'} onValueChange={handleDriverSelect}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="All Drivers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Drivers ({activeDrivers.length})</SelectItem>
            <SelectItem value="internal" disabled className="font-semibold">Internal Drivers</SelectItem>
            {internalDrivers.filter(d => activeDrivers.some(ad => ad.id === d.id)).map(driver => (
              <SelectItem key={driver.id} value={driver.id}>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  {driver.driver_name}
                </div>
              </SelectItem>
            ))}
            <SelectItem value="third_party" disabled className="font-semibold mt-2">Third-Party Drivers</SelectItem>
            {thirdPartyDrivers.filter(d => activeDrivers.some(ad => ad.id === d.id)).map(driver => (
              <SelectItem key={driver.id} value={driver.id}>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-orange-600" />
                  {driver.driver_name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedShipment?.id || 'all'} onValueChange={handleShipmentSelect}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="All Shipments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Shipments ({shipments.length})</SelectItem>
            {shipments.map(shipment => (
              <SelectItem key={shipment.id} value={shipment.id}>
                {shipment.shipment_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedShipment && (
          <Button
            variant={showRouteHistory ? "default" : "outline"}
            size="sm"
            onClick={() => setShowRouteHistory(!showRouteHistory)}
          >
            <History className="w-4 h-4 mr-2" />
            {showRouteHistory ? 'Hide' : 'Show'} Route History
          </Button>
        )}

        <div className="ml-auto flex gap-2">
          <Badge className="bg-blue-100 text-blue-800">
            <Truck className="w-3 h-3 mr-1" />
            {internalDrivers.filter(d => activeDrivers.some(ad => ad.id === d.id)).length} Internal
          </Badge>
          <Badge className="bg-orange-100 text-orange-800">
            <User className="w-3 h-3 mr-1" />
            {thirdPartyDrivers.filter(d => activeDrivers.some(ad => ad.id === d.id)).length} 3rd Party
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live GPS Tracking Map</CardTitle>
        </CardHeader>
        <CardContent>
          {gpsPoints.length > 0 ? (
            <div className="rounded-lg overflow-hidden h-[600px] border">
              <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <MapController center={mapCenter} zoom={selectedShipment ? 14 : 13} />

                {/* Route history polyline */}
                {showRouteHistory && routeHistory.length > 1 && (
                  <Polyline
                    positions={routeHistory.map(p => [p.latitude, p.longitude])}
                    color="#6366f1"
                    weight={3}
                    opacity={0.6}
                    dashArray="5, 10"
                  />
                )}

                {/* Driver markers */}
                {gpsPoints.map((point, idx) => {
                  const shipment = shipments.find(s => s.id === point.shipment_id);
                  if (!shipment) return null;

                  const internalDriver = internalDrivers.find(d => d.id === shipment.driver_id);
                  const thirdPartyDriver = thirdPartyDrivers.find(d => d.id === shipment.driver_id);
                  const driver = internalDriver || thirdPartyDriver;
                  const driverType = internalDriver ? 'internal' : 'third_party';
                  const isSelected = selectedShipment?.id === shipment.id || selectedDriver === shipment.driver_id;

                  // Filter based on selection
                  if (selectedShipment && shipment.id !== selectedShipment.id) return null;
                  if (selectedDriver && shipment.driver_id !== selectedDriver) return null;

                  return (
                    <Marker
                      key={`${point.shipment_id}-${idx}`}
                      position={[point.latitude, point.longitude]}
                      icon={createDriverIcon(driverType, isSelected)}
                    >
                      <Popup>
                        <div className="p-2 min-w-[200px]">
                          <div className="flex items-center gap-2 mb-2">
                            {driverType === 'internal' ? (
                              <Truck className="w-5 h-5 text-blue-600" />
                            ) : (
                              <User className="w-5 h-5 text-orange-600" />
                            )}
                            <Badge className={driverType === 'internal' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}>
                              {driverType === 'internal' ? 'Internal' : '3rd Party'}
                            </Badge>
                          </div>
                          <h4 className="font-bold mb-1">{driver?.driver_name}</h4>
                          <p className="text-sm text-gray-600 mb-2">{shipment.shipment_number}</p>
                          <div className="text-xs space-y-1">
                            <p><strong>From:</strong> {shipment.origin_city}</p>
                            <p><strong>To:</strong> {shipment.destination_city}</p>
                            {point.speed_kmh && (
                              <p><strong>Speed:</strong> {point.speed_kmh} km/h</p>
                            )}
                            <p className="text-gray-500">
                              {new Date(point.timestamp || point.created_date).toLocaleTimeString()}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => handleShipmentSelect(shipment.id)}
                          >
                            Focus on This Driver
                          </Button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg h-[600px] flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No active shipments with GPS tracking</p>
                <p className="text-sm text-gray-500 mt-2">
                  Enable tracking on shipments to see live locations
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Drivers Summary */}
      {gpsPoints.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4">
          {activeDrivers.slice(0, selectedDriver ? 1 : 6).map(driver => {
            const shipment = shipments.find(s => s.driver_id === driver.id);
            const point = gpsPoints.find(p => p.shipment_id === shipment?.id);
            if (!point) return null;

            const isSelected = selectedDriver === driver.id;

            return (
              <Card 
                key={driver.id} 
                className={`hover:shadow-lg transition-all cursor-pointer ${
                  isSelected ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleDriverSelect(driver.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {driver.type === 'internal' ? (
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Truck className="w-4 h-4 text-blue-600" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-orange-600" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-sm">{driver.driver_name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {driver.type === 'internal' ? 'Internal' : '3rd Party'}
                        </Badge>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      <Navigation className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                  <div className="text-xs space-y-1 mt-3">
                    <p className="text-gray-600">{shipment?.shipment_number}</p>
                    <p className="text-gray-500">
                      {point.speed_kmh ? `${point.speed_kmh} km/h` : 'Stationary'}
                    </p>
                    <p className="text-gray-400">
                      Updated {new Date(point.timestamp || point.created_date).toLocaleTimeString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}