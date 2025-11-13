import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Edit, TrendingUp, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function ProductCard({ product, onEdit, index = 0 }) {
  const isLowStock = product.quantity <= product.reorder_level;
  const stockPercentage = (product.quantity / product.reorder_level) * 100;

  const categoryColors = {
    electronics: "bg-blue-100 text-blue-800 border-blue-200",
    clothing: "bg-purple-100 text-purple-800 border-purple-200",
    food_beverage: "bg-green-100 text-green-800 border-green-200",
    furniture: "bg-amber-100 text-amber-800 border-amber-200",
    tools: "bg-gray-100 text-gray-800 border-gray-200",
    books: "bg-indigo-100 text-indigo-800 border-indigo-200",
    toys: "bg-pink-100 text-pink-800 border-pink-200",
    sports: "bg-cyan-100 text-cyan-800 border-cyan-200",
    health_beauty: "bg-rose-100 text-rose-800 border-rose-200",
    automotive: "bg-red-100 text-red-800 border-red-200",
    office_supplies: "bg-teal-100 text-teal-800 border-teal-200",
    other: "bg-gray-100 text-gray-800 border-gray-200"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="group hover:shadow-lg transition-all duration-300 border-none shadow-md bg-white overflow-hidden">
        <div className="relative">
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name}
              className="w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <Package className="w-16 h-16 text-gray-400" />
            </div>
          )}
          {isLowStock && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-orange-500 text-white border-none shadow-lg">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Low Stock
              </Badge>
            </div>
          )}
        </div>
        
        <CardContent className="p-5">
          <div className="space-y-3">
            <div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">{product.name}</h3>
              <p className="text-sm text-gray-500">SKU: {product.sku}</p>
            </div>

            {product.description && (
              <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
            )}

            <div className="flex gap-2 flex-wrap">
              <Badge className={`${categoryColors[product.category] || categoryColors.other} border`}>
                {product.category?.replace(/_/g, ' ')}
              </Badge>
              {product.location && (
                <Badge variant="outline" className="text-gray-600">
                  📍 {product.location}
                </Badge>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-xs text-gray-500">In Stock</p>
                  <p className="text-lg font-bold text-gray-900">{product.quantity}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Unit Price</p>
                  <p className="text-lg font-bold text-blue-600">
                    ${product.unit_price?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>

              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Stock Level</span>
                  <span>{product.quantity} / {product.reorder_level}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      isLowStock ? 'bg-orange-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                  />
                </div>
              </div>

              <Button 
                onClick={() => onEdit(product)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Manage Stock
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}