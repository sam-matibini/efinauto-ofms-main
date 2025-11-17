import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, AlertTriangle, Package, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export default function PartCard({ part, index, onEdit, onDelete, onAdjustStock }) {
  const isLowStock = part.quantity <= part.reorder_level && part.quantity > 0;
  const isOutOfStock = part.quantity === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="hover:shadow-lg transition-all">
        <CardContent className="p-5 space-y-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {isOutOfStock && (
                <Badge className="bg-red-500 text-white mb-2">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Out of Stock
                </Badge>
              )}
              {isLowStock && (
                <Badge className="bg-orange-500 text-white mb-2">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Low Stock
                </Badge>
              )}
              
              <h3 className="font-bold text-lg text-gray-900 line-clamp-2">{part.name}</h3>
              <p className="text-sm text-gray-500">{part.part_number}</p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(part)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAdjustStock(part)}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Adjust Stock
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(part)} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{part.category?.replace(/_/g, ' ')}</Badge>
            {part.supplier && (
              <Badge variant="outline" className="text-xs">{part.supplier}</Badge>
            )}
          </div>

          {(part.compatible_makes || part.compatible_models) && (
            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
              {part.compatible_makes && (
                <div><strong>Makes:</strong> {part.compatible_makes}</div>
              )}
              {part.compatible_models && (
                <div><strong>Models:</strong> {part.compatible_models}</div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-3 border-t">
            <div>
              <p className="text-xs text-gray-500">In Stock</p>
              <p className={`text-xl font-bold ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-gray-900'}`}>
                {part.quantity}
              </p>
              <p className="text-xs text-gray-400">Reorder: {part.reorder_level}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Selling Price</p>
              <p className="text-xl font-bold text-green-600">
                ${part.selling_price?.toFixed(2) || '0.00'}
              </p>
              {part.cost_price > 0 && (
                <p className="text-xs text-gray-400">Cost: ${part.cost_price.toFixed(2)}</p>
              )}
            </div>
          </div>

          {part.location && (
            <div className="text-xs text-gray-600 flex items-center gap-1">
              <Package className="w-3 h-3" />
              Location: {part.location}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}