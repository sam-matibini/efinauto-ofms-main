import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, TrendingUp, Clock } from "lucide-react";
import { format } from "date-fns";

export default function RecentActivity({ products }) {
  const recentProducts = products
    .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
    .slice(0, 6);

  const categoryColors = {
    electronics: "bg-blue-100 text-blue-800",
    clothing: "bg-purple-100 text-purple-800",
    food_beverage: "bg-green-100 text-green-800",
    furniture: "bg-amber-100 text-amber-800",
    tools: "bg-gray-100 text-gray-800",
    books: "bg-indigo-100 text-indigo-800",
    toys: "bg-pink-100 text-pink-800",
    sports: "bg-cyan-100 text-cyan-800",
    health_beauty: "bg-rose-100 text-rose-800",
    automotive: "bg-red-100 text-red-800",
    office_supplies: "bg-teal-100 text-teal-800",
    other: "bg-gray-100 text-gray-800"
  };

  return (
    <Card className="shadow-md border-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="w-5 h-5 text-blue-600" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentProducts.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <Package className="w-5 h-5 text-gray-500" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                  <p className="text-xs text-gray-500">
                    Updated {format(new Date(product.updated_date), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
              <Badge className={categoryColors[product.category] || categoryColors.other}>
                {product.category?.replace(/_/g, ' ')}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}