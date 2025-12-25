import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Share2, Mail, MessageCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export default function LiveTrackingMap({ shipments }) {
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [shareChannel, setShareChannel] = useState(null);

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
    refetchInterval: 30000 // Refresh every 30 seconds
  });

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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Live GPS Tracking Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-100 rounded-lg h-[500px] flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Interactive map integration</p>
              <p className="text-sm text-gray-500 mt-2">
                Showing {gpsPoints.length} active shipment{gpsPoints.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Shipments List */}
      <div className="grid md:grid-cols-2 gap-4">
        {shipments.map(shipment => {
          const latestPoint = gpsPoints.find(p => p.shipment_id === shipment.id);
          
          return (
            <Card key={shipment.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold">{shipment.shipment_number}</h3>
                    <Badge className="bg-blue-100 text-blue-800 mt-1">
                      <Navigation className="w-3 h-3 mr-1" />
                      Live Tracking
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => shareTracking(shipment, 'email')}
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-green-50 hover:bg-green-100"
                      onClick={() => shareTracking(shipment, 'whatsapp')}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-gray-600">From:</p>
                      <p className="font-medium">{shipment.origin_city}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">To:</p>
                      <p className="font-medium">{shipment.destination_city}</p>
                    </div>
                  </div>

                  {latestPoint && (
                    <div className="pt-2 border-t">
                      <p className="text-gray-600">Last Update:</p>
                      <p className="font-medium">{new Date(latestPoint.timestamp || latestPoint.created_date).toLocaleString()}</p>
                      {latestPoint.speed_kmh && (
                        <p className="text-sm text-gray-500">Speed: {latestPoint.speed_kmh} km/h</p>
                      )}
                    </div>
                  )}

                  <div className="pt-2">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${latestPoint?.latitude},${latestPoint?.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" />
                      View on Google Maps
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {shipments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Navigation className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No shipments currently being tracked</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}