import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package } from "lucide-react";
import { motion } from "framer-motion";

export default function LowStockAlert({ products }) {
  const lowStockProducts = products.filter(
    product => product.quantity <= product.reorder_level
  ).slice(0, 5);

  if (lowStockProducts.length === 0) {
    return (
      <Card className="shadow-md border-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5 text-green-600" />
            Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-50" />
            <p className="text-sm text-gray-500">All products are well stocked!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          Low Stock Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {lowStockProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-3 rounded-lg bg-orange-50 border border-orange-100"
            >
              <div className="flex items-center gap-3">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-200 to-orange-300 flex items-center justify-center">
                    <Package className="w-5 h-5 text-orange-700" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.sku}</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-white border-orange-300 text-orange-700">
                {product.quantity} left
              </Badge>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}