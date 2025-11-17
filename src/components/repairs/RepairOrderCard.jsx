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
import { MoreVertical, Edit, Trash2, Clock, DollarSign, User, Car } from "lucide-react";

const statusColors = {
  pending: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  waiting_parts: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  picked_up: "bg-purple-100 text-purple-700",
  cancelled: "bg-red-100 text-red-700"
};

const priorityColors = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700"
};

export default function RepairOrderCard({ order, onEdit, onDelete, fullWidth = false }) {
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  return (
    <Card className={`hover:shadow-md transition-shadow ${fullWidth ? 'w-full' : ''}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-gray-900">#{order.order_number}</h4>
              <Badge className={priorityColors[order.priority]}>
                {order.priority}
              </Badge>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-3 h-3" />
                {order.customer_name}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Car className="w-3 h-3" />
                {order.vehicle_year} {order.vehicle_make} {order.vehicle_model}
              </div>
              {order.vehicle_plate && (
                <p className="text-xs text-gray-500">Plate: {order.vehicle_plate}</p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(order)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(order.id)} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2">
          <Badge className={statusColors[order.status]}>
            {order.status?.replace(/_/g, ' ')}
          </Badge>
          
          {order.assigned_technician && (
            <p className="text-xs text-gray-500">Tech: {order.assigned_technician}</p>
          )}
          
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Clock className="w-3 h-3" />
              {formatDate(order.estimated_completion)}
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold text-green-600">
              <DollarSign className="w-3 h-3" />
              {order.total_cost?.toLocaleString() || '0'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}