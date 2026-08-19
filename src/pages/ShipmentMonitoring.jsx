import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, RefreshCw, MapPin, AlertTriangle, CheckCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { useCompany } from "@/components/shared/CompanyContext";
import { toast } from "sonner";
import ShipmentMapDashboard from "@/components/shipping/ShipmentMapDashboard";
import { ShipmentAlertService } from "@/components/shipping/ShipmentAlertService";
import { GeofencingService } from "@/components/shipping/GeofencingService";
import { format } from "date-fns";

export default function ShipmentMonitoring() {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [monitoring, setMonitoring] = useState(false);

  const { data: alertSummary, isLoading: loadingAlerts } = useQuery({
    queryKey: ['shipmentAlerts', selectedCompanyId],
    queryFn: () => ShipmentAlertService.getAlertSummary(selectedCompanyId),
    enabled: !!selectedCompanyId,
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notificationLog', selectedCompanyId],
    queryFn: () => supabase.entities.NotificationLog.filter({ 
      company_id: selectedCompanyId,
      notification_type: "export_update"
    }),
    enabled: !!selectedCompanyId,
  });

  const monitorShipmentsMutation = useMutation({
    mutationFn: async () => {
      setMonitoring(true);
      const [alertResult, geofenceResult] = await Promise.all([
        ShipmentAlertService.monitorAllShipments(selectedCompanyId),
        GeofencingService.monitorAllShipments(selectedCompanyId)
      ]);
      return { alertResult, geofenceResult };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shipmentAlerts', selectedCompanyId] });
      queryClient.invalidateQueries({ queryKey: ['notificationLog', selectedCompanyId] });
      
      toast.success(
        `Monitoring complete: ${data.alertResult.notifications_sent} alerts sent, ${data.geofenceResult.length} geofence events detected`
      );
      setMonitoring(false);
    },
    onError: () => {
      toast.error("Failed to monitor shipments");
      setMonitoring(false);
    }
  });

  if (!selectedCompanyId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-600" />
            <p className="text-lg text-gray-600">Please select a company to view shipment monitoring</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const severityColors = {
    info: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800"
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Real-Time Shipment Monitoring</h1>
          <p className="text-gray-600 mt-1">Track all active shipments with geofencing alerts and proactive notifications</p>
        </div>
        <Button 
          onClick={() => monitorShipmentsMutation.mutate()}
          disabled={monitoring}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {monitoring ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Monitoring...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Run Monitor Check
            </>
          )}
        </Button>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{alertSummary?.total_alerts || 0}</p>
                <p className="text-sm text-gray-600">Total Alerts</p>
              </div>
              <Bell className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{alertSummary?.critical || 0}</p>
                <p className="text-sm text-gray-600">Critical</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-600">{alertSummary?.high || 0}</p>
                <p className="text-sm text-gray-600">High Priority</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{alertSummary?.info || 0}</p>
                <p className="text-sm text-gray-600">Info</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="map">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="map">
            <MapPin className="w-4 h-4 mr-2" />
            Live Map
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Active Alerts ({alertSummary?.total_alerts || 0})
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notification History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map">
          <ShipmentMapDashboard companyId={selectedCompanyId} />
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alertSummary?.alerts?.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
                    <p>No active alerts - all shipments on track!</p>
                  </div>
                ) : (
                  alertSummary?.alerts?.map((alert, idx) => (
                    <div key={idx} className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={severityColors[alert.severity]}>
                              {alert.severity.toUpperCase()}
                            </Badge>
                            <span className="font-semibold">{alert.type.replace(/_/g, ' ').toUpperCase()}</span>
                          </div>
                          <p className="text-gray-700">{alert.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {format(new Date(alert.timestamp), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No notifications sent yet</p>
                  </div>
                ) : (
                  notifications.slice(0, 50).map((notif) => (
                    <div key={notif.id} className="p-4 border rounded-lg bg-white">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold">{notif.subject}</div>
                          <p className="text-sm text-gray-600 mt-1">{notif.body}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>To: {notif.recipient_email}</span>
                            <span>•</span>
                            <span>{format(new Date(notif.sent_at), 'MMM d, yyyy h:mm a')}</span>
                            <span>•</span>
                            <Badge variant="outline" className={notif.status === 'sent' ? 'text-green-600' : 'text-red-600'}>
                              {notif.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}