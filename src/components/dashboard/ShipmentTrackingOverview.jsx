import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function ShipmentTrackingOverview({ companyId }) {
  const { data: trackingRecords = [] } = useQuery({
    queryKey: ['allShipmentTracking', companyId],
    queryFn: async () => {
      const exports = await base44.entities.ExportOrder.filter({ company_id: companyId });
      const trackingPromises = exports.map(exp => 
        base44.entities.ShipmentTracking.filter({ export_order_id: exp.id })
      );
      const results = await Promise.all(trackingPromises);
      return results.flat();
    },
    enabled: !!companyId,
  });

  // Calculate metrics
  const delivered = trackingRecords.filter(t => t.current_status === 'delivered').length;
  const delayed = trackingRecords.filter(t => t.current_status === 'delayed' || t.delay_reason).length;
  const inTransit = trackingRecords.filter(t => 
    ['in_transit', 'at_port', 'customs_clearance', 'out_for_delivery'].includes(t.current_status)
  ).length;

  const onTimeRate = trackingRecords.length > 0 
    ? ((delivered - delayed) / trackingRecords.length * 100).toFixed(1)
    : 0;

  // Calculate average transit time (for delivered shipments with timestamps)
  const deliveredWithData = trackingRecords.filter(t => 
    t.current_status === 'delivered' && t.actual_delivery && t.tracking_events?.[0]?.timestamp
  );
  const avgTransitDays = deliveredWithData.length > 0
    ? (deliveredWithData.reduce((sum, t) => {
        const start = new Date(t.tracking_events[0].timestamp);
        const end = new Date(t.actual_delivery);
        return sum + (end - start) / (1000 * 60 * 60 * 24);
      }, 0) / deliveredWithData.length).toFixed(1)
    : 0;

  const chartData = [
    { name: 'Delivered', value: delivered, color: '#10b981' },
    { name: 'In Transit', value: inTransit, color: '#3b82f6' },
    { name: 'Delayed', value: delayed, color: '#ef4444' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Shipment Tracking Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-600">On-Time Rate</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{onTimeRate}%</div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-xs text-gray-600">Delayed</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{delayed}</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-gray-600">In Transit</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{inTransit}</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-gray-600">Avg Transit</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">{avgTransitDays}d</div>
          </div>
        </div>

        {chartData.some(d => d.value > 0) ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No tracking data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}