import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ship, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";

const statusColors = {
  draft: "#9ca3af",
  compliance_review: "#fbbf24",
  approved: "#10b981",
  logistics_booked: "#3b82f6",
  shipped: "#8b5cf6",
  in_transit: "#6366f1",
  delivered: "#059669",
  closed: "#6b7280",
  cancelled: "#ef4444"
};

export default function ExportOrderPipeline({ companyId }) {
  const { data: exportOrders = [] } = useQuery({
    queryKey: ['exportOrders', companyId],
    queryFn: () => supabase.entities.ExportOrder.filter({ company_id: companyId }),
    enabled: !!companyId,
  });

  const statusCounts = exportOrders.reduce((acc, order) => {
    const status = order.export_status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.replace(/_/g, ' ').toUpperCase(),
    count,
    color: statusColors[status]
  }));

  const activeOrders = exportOrders.filter(o => 
    !['delivered', 'closed', 'cancelled'].includes(o.export_status)
  ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ship className="w-5 h-5" />
          Export Order Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{exportOrders.length}</div>
            <div className="text-sm text-gray-600">Total Orders</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{activeOrders}</div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {statusCounts.delivered || 0}
            </div>
            <div className="text-sm text-gray-600">Delivered</div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={11} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <Badge 
              key={status} 
              style={{ backgroundColor: statusColors[status] }}
              className="text-white"
            >
              {status.replace(/_/g, ' ')}: {count}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}