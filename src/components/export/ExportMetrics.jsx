import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Package, Weight, Globe } from "lucide-react";

export default function ExportMetrics({ data, currency }) {
  const metrics = [
    {
      label: "Total Export Value",
      value: `${currency} $${data.totalValue.toLocaleString()}`,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50"
    },
    {
      label: "Total Orders",
      value: data.totalOrders,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      label: "Total Weight",
      value: `${data.totalWeight.toFixed(0)} kg`,
      icon: Weight,
      color: "text-purple-600",
      bg: "bg-purple-50"
    },
    {
      label: "Destinations",
      value: data.byDestination.length,
      icon: Globe,
      color: "text-orange-600",
      bg: "bg-orange-50"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, idx) => (
        <Card key={idx}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{metric.label}</p>
                <p className="text-2xl font-bold mt-1">{metric.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg ${metric.bg} flex items-center justify-center`}>
                <metric.icon className={`w-6 h-6 ${metric.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}