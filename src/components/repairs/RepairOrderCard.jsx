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
import { MoreVertical, Edit, Trash2, FileText, Calendar, DollarSign, User, Car } from "lucide-react";

export default function RepairOrderCard({ order, onEdit, onDelete, onGenerateInvoice, fullWidth }) {
  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    waiting_parts: "bg-orange-100 text-orange-800",
    completed: "bg-green-100 text-green-800",
    picked_up: "bg-purple-100 text-purple-800",
    cancelled: "bg-gray-100 text-gray-800",
  };

  const priorityColors = {
    low: "bg-gray-100 text-gray-700",
    medium: "bg-blue-100 text-blue-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700",
  };

  return (
    <Card className={`hover:shadow-lg transition-shadow ${fullWidth ? 'w-full' : ''}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-lg">#{order.order_number}</h4>
              <Badge className={priorityColors[order.priority]}>
                {order.priority}
              </Badge>
              <Badge className={statusColors[order.status]}>
                {order.status?.replace(/_/g, ' ')}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span><strong>Customer:</strong> {order.customer_name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Car className="w-4 h-4" />
                <span><strong>Vehicle:</strong> {order.vehicle_year} {order.vehicle_make} {order.vehicle_model}</span>
              </div>
              {order.vehicle_vin && (
                <div className="text-xs">
                  <strong>VIN:</strong> {order.vehicle_vin}
                </div>
              )}
              {order.assigned_technician && (
                <div className="text-xs">
                  <strong>Technician:</strong> {order.assigned_technician}
                </div>
              )}
              {order.estimated_completion && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Est: {new Date(order.estimated_completion).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                <span className="font-semibold text-green-600">${(order.total_cost || 0).toLocaleString()}</span>
              </div>
            </div>

            {order.description && (
              <p className="text-sm text-gray-700 mt-2 line-clamp-2">{order.description}</p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(order)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {order.status === 'completed' && onGenerateInvoice && (
                <DropdownMenuItem onClick={() => onGenerateInvoice(order)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Invoice
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDelete(order.id)} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}