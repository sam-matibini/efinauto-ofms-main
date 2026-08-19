import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Car, Package, Ship, Clock, AlertTriangle, DollarSign,
  Plus, FileText, Upload, TrendingUp, Sparkles, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";

const formatCurrency = (amount) => `$${(amount || 0).toLocaleString()}`;

export default function ShippingDashboard({ 
  kpis, 
  shipments = [], 
  containers = [], 
  vehicles = [],
  exports = [],
  loadingDeclarations = [],
  onCreateShipment,
  onAddContainer,
  onAddVehicle,
  onUploadDocument
}) {
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const statusColors = {
    booked: "bg-yellow-100 text-yellow-800",
    picked_up: "bg-blue-100 text-blue-800",
    in_transit: "bg-purple-100 text-purple-800",
    customs_clearance: "bg-orange-100 text-orange-800",
    out_for_delivery: "bg-cyan-100 text-cyan-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    pending: "bg-gray-100 text-gray-800"
  };

  const generateAIInsights = async () => {
    setLoadingInsights(true);
    try {
      const response = await supabase.integrations.Core.InvokeLLM({
        prompt: `Analyze this shipping logistics data and provide actionable insights:

Shipments: ${shipments.length} total
- In Transit: ${shipments.filter(s => s.status === 'in_transit').length}
- Pending Customs: ${shipments.filter(s => s.status === 'customs_clearance').length}
- Delivered: ${shipments.filter(s => s.status === 'delivered').length}
- Delayed/Issues: ${shipments.filter(s => s.status === 'cancelled').length}

Containers: ${containers.length} total
Vehicles in Transit: ${vehicles.length}
Exports: ${exports.length}

Total Freight Value: $${shipments.reduce((s, sh) => s + (sh.cargo_value || 0), 0).toLocaleString()}
Total Fees: $${shipments.reduce((s, sh) => s + (sh.total_cost || 0), 0).toLocaleString()}

Provide:
1. Key performance summary (1-2 sentences)
2. Risk alerts (any delays, customs issues, overdue arrivals)
3. Cost optimization suggestions
4. Predicted delivery delays based on patterns
5. Action items for this week`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            risk_alerts: { type: "array", items: { type: "string" } },
            cost_tips: { type: "array", items: { type: "string" } },
            delay_predictions: { type: "array", items: { type: "string" } },
            action_items: { type: "array", items: { type: "string" } }
          }
        }
      });
      setAiInsights(response);
    } catch (error) {
      toast.error("Failed to generate insights");
    } finally {
      setLoadingInsights(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Cars in Transit</p>
                <p className="text-3xl font-bold">{kpis.carsInTransit}</p>
              </div>
              <Car className="w-10 h-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Containers</p>
                <p className="text-3xl font-bold">{kpis.containersInTransit}</p>
              </div>
              <Package className="w-10 h-10 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Arrivals This Week</p>
                <p className="text-3xl font-bold">{kpis.arrivalsThisWeek}</p>
              </div>
              <Ship className="w-10 h-10 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Pending Customs</p>
                <p className="text-3xl font-bold">{kpis.pendingCustoms}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white border-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cyan-100 text-sm">Avg. Ship Time</p>
                <p className="text-3xl font-bold">{kpis.avgShippingDays || 'N/A'}</p>
              </div>
              <Clock className="w-10 h-10 text-cyan-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-100 text-sm">Est. Clearing Fees</p>
                <p className="text-2xl font-bold">{formatCurrency(kpis.totalClearingFees)}</p>
              </div>
              <DollarSign className="w-10 h-10 text-pink-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={onCreateShipment}>
              <Plus className="w-4 h-4 mr-2" />
              Create Shipment
            </Button>
            <Button variant="outline" onClick={onAddContainer}>
              <Package className="w-4 h-4 mr-2" />
              Add Container
            </Button>
            <Button variant="outline" onClick={onAddVehicle}>
              <Car className="w-4 h-4 mr-2" />
              Add Vehicle
            </Button>
            <Button variant="outline" onClick={onUploadDocument}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Logistics Insights
            </CardTitle>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={generateAIInsights}
              disabled={loadingInsights}
              className="border-purple-300"
            >
              {loadingInsights ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Generate Insights
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {aiInsights ? (
            <div className="space-y-4">
              <p className="text-gray-700">{aiInsights.summary}</p>
              
              {aiInsights.risk_alerts?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Risk Alerts
                  </h4>
                  <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                    {aiInsights.risk_alerts.map((alert, i) => (
                      <li key={i}>{alert}</li>
                    ))}
                  </ul>
                </div>
              )}

              {aiInsights.action_items?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-blue-700 mb-2">Action Items</h4>
                  <ul className="list-disc list-inside text-sm text-blue-600 space-y-1">
                    {aiInsights.action_items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Click "Generate Insights" to get AI-powered analysis of your shipping operations.</p>
          )}
        </CardContent>
      </Card>

      {/* Overview Tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Shipments Overview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Ship className="w-5 h-5" />
                Shipments Overview
              </CardTitle>
              <Badge variant="outline">{shipments.length} total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>BL #</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.slice(0, 5).map((shipment) => (
                  <TableRow key={shipment.id}>
                    <TableCell className="font-medium">{shipment.shipment_number || shipment.tracking_number || '-'}</TableCell>
                    <TableCell className="text-sm">{shipment.origin_country} → {shipment.destination_country}</TableCell>
                    <TableCell className="text-sm">
                      {shipment.expected_arrival ? format(new Date(shipment.expected_arrival), 'MMM d') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[shipment.status] || 'bg-gray-100'}>
                        {shipment.status?.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Containers Overview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5" />
                Containers Overview
              </CardTitle>
              <Badge variant="outline">{containers.length} total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Container #</TableHead>
                  <TableHead>Seal #</TableHead>
                  <TableHead>Vehicles</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {containers.slice(0, 5).map((container) => (
                  <TableRow key={container.id}>
                    <TableCell className="font-medium">{container.container_number}</TableCell>
                    <TableCell>{container.seal_number || '-'}</TableCell>
                    <TableCell>{container.vehicle_count || 0}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[container.status] || 'bg-gray-100'}>
                        {container.status?.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {containers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                      No containers yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Vehicles in Transit */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Car className="w-5 h-5" />
                Vehicles in Transit
              </CardTitle>
              <Badge variant="outline">{vehicles.length} total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>VIN</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.slice(0, 5).map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-mono text-xs">{vehicle.vin?.slice(-8) || '-'}</TableCell>
                    <TableCell>{vehicle.year} {vehicle.make} {vehicle.model}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[vehicle.status] || 'bg-gray-100'}>
                        {vehicle.status?.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {vehicles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                      No vehicles in transit
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Latest Documents */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Latest Documents
              </CardTitle>
              <Badge variant="outline">{loadingDeclarations.length} declarations</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingDeclarations.slice(0, 5).map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Badge variant="outline">Loading Declaration</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{doc.declaration_number || doc.booking_number || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {doc.created_date ? format(new Date(doc.created_date), 'MMM d') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={doc.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}>
                        {doc.status || 'draft'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {loadingDeclarations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                      No documents uploaded
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}