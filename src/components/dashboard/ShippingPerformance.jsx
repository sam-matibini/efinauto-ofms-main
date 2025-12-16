import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Ship, TrendingUp, Clock, CheckCircle, Loader2 } from "lucide-react";
import { differenceInDays } from "date-fns";

export default function ShippingPerformance({ companyId }) {
  const { data: shipmentTracking = [], isLoading: trackingLoading } = useQuery({
    queryKey: ['shipmentTracking', companyId],
    queryFn: () => base44.entities.ShipmentTracking.filter({ company_id: companyId }),
    enabled: !!companyId,
  });

  const { data: exportOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['exportOrders', companyId],
    queryFn: () => base44.entities.ExportOrder.filter({ company_id: companyId }),
    enabled: !!companyId,
  });

  if (trackingLoading || ordersLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  // Carrier performance
  const carrierStats = {};
  shipmentTracking.forEach(shipment => {
    if (!carrierStats[shipment.carrier]) {
      carrierStats[shipment.carrier] = { total: 0, onTime: 0, delayed: 0 };
    }
    carrierStats[shipment.carrier].total++;
    if (shipment.current_status === 'delivered') {
      carrierStats[shipment.carrier].onTime++;
    } else if (shipment.current_status === 'delayed') {
      carrierStats[shipment.carrier].delayed++;
    }
  });

  const carrierPerformance = Object.entries(carrierStats).map(([carrier, stats]) => ({
    carrier: carrier.replace(/_/g, ' ').toUpperCase(),
    onTimeRate: stats.total > 0 ? (stats.onTime / stats.total * 100) : 0,
    delayRate: stats.total > 0 ? (stats.delayed / stats.total * 100) : 0,
    total: stats.total
  })).sort((a, b) => b.onTimeRate - a.onTimeRate);

  // Shipping mode performance
  const modeStats = {};
  exportOrders.forEach(order => {
    const mode = order.shipping_mode || 'sea';
    if (!modeStats[mode]) {
      modeStats[mode] = { count: 0, totalTransit: 0, avgTransit: 0 };
    }
    modeStats[mode].count++;
    
    if (order.actual_departure && order.actual_arrival) {
      const transitDays = differenceInDays(new Date(order.actual_arrival), new Date(order.actual_departure));
      modeStats[mode].totalTransit += transitDays;
    }
  });

  Object.keys(modeStats).forEach(mode => {
    modeStats[mode].avgTransit = modeStats[mode].totalTransit > 0 ? 
      (modeStats[mode].totalTransit / modeStats[mode].count) : 0;
  });

  const modePerformance = Object.entries(modeStats).map(([mode, stats]) => ({
    mode: mode.toUpperCase(),
    avgTransit: Math.round(stats.avgTransit),
    count: stats.count
  }));

  // Lane performance (top routes)
  const laneStats = {};
  exportOrders.forEach(order => {
    const lane = `${order.country_of_origin || 'CA'} → ${order.destination_country}`;
    if (!laneStats[lane]) {
      laneStats[lane] = { count: 0, onTime: 0 };
    }
    laneStats[lane].count++;
    
    if (order.export_status === 'delivered' && order.actual_arrival && order.estimated_arrival) {
      const arrivalDate = new Date(order.actual_arrival);
      const estimatedDate = new Date(order.estimated_arrival);
      if (arrivalDate <= estimatedDate) {
        laneStats[lane].onTime++;
      }
    }
  });

  const lanePerformance = Object.entries(laneStats)
    .map(([lane, stats]) => ({
      lane,
      onTimeRate: stats.count > 0 ? (stats.onTime / stats.count * 100) : 0,
      shipments: stats.count
    }))
    .sort((a, b) => b.shipments - a.shipments)
    .slice(0, 5);

  // Overall metrics
  const totalShipments = shipmentTracking.length;
  const deliveredShipments = shipmentTracking.filter(s => s.current_status === 'delivered').length;
  const delayedShipments = shipmentTracking.filter(s => s.current_status === 'delayed').length;
  const overallOnTimeRate = totalShipments > 0 ? (deliveredShipments / totalShipments * 100) : 0;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ship className="w-5 h-5" />
          Shipping Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Ship className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-gray-600">Total Shipments</p>
            </div>
            <p className="text-xl font-bold text-blue-600">{totalShipments}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <p className="text-xs text-gray-600">On-Time Rate</p>
            </div>
            <p className="text-xl font-bold text-green-600">{overallOnTimeRate.toFixed(1)}%</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-xs text-gray-600">Delivered</p>
            </div>
            <p className="text-xl font-bold text-green-600">{deliveredShipments}</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-red-600" />
              <p className="text-xs text-gray-600">Delayed</p>
            </div>
            <p className="text-xl font-bold text-red-600">{delayedShipments}</p>
          </div>
        </div>

        {/* Carrier Performance */}
        {carrierPerformance.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3">Carrier On-Time Performance</h4>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={carrierPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="carrier" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                <Legend />
                <Bar dataKey="onTimeRate" fill="#10b981" name="On-Time %" />
                <Bar dataKey="delayRate" fill="#ef4444" name="Delay %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Transit Time by Mode */}
          {modePerformance.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3">Avg Transit Days by Mode</h4>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={modePerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mode" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => `${value} days`} />
                  <Bar dataKey="avgTransit" fill="#3b82f6" name="Days" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Lanes */}
          {lanePerformance.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3">Top 5 Shipping Lanes</h4>
              <div className="space-y-2">
                {lanePerformance.map((lane, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <p className="text-xs font-medium">{lane.lane}</p>
                      <p className="text-xs text-gray-500">{lane.shipments} shipments</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${lane.onTimeRate >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {lane.onTimeRate.toFixed(0)}%
                      </p>
                      <p className="text-xs text-gray-500">on-time</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}