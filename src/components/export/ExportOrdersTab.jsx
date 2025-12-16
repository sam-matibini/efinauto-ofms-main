import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Ship, FileText, Search, Plus, Eye, Edit, Lock, Unlock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import ExportOrderDetailDialog from "./ExportOrderDetailDialog";
import CreateExportOrderDialog from "./CreateExportOrderDialog";

export default function ExportOrdersTab({ companyId }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: exportOrders = [], isLoading } = useQuery({
    queryKey: ['exportOrders', companyId],
    queryFn: () => base44.entities.ExportOrder.filter({ company_id: companyId }, '-created_date'),
    enabled: !!companyId,
  });

  const filteredOrders = exportOrders.filter(order =>
    order.export_order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.consignee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.destination_country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    compliance_review: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    logistics_booked: "bg-blue-100 text-blue-800",
    shipped: "bg-purple-100 text-purple-800",
    in_transit: "bg-indigo-100 text-indigo-800",
    delivered: "bg-green-100 text-green-800",
    closed: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800"
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold">Export Orders</h3>
          <p className="text-sm text-gray-600">Manage international shipments and compliance</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Export Order
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by order #, consignee, or country..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{exportOrders.length}</div>
            <div className="text-sm text-gray-600">Total Orders</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {exportOrders.filter(o => o.export_status === 'compliance_review').length}
            </div>
            <div className="text-sm text-gray-600">Pending Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {exportOrders.filter(o => ['shipped', 'in_transit'].includes(o.export_status)).length}
            </div>
            <div className="text-sm text-gray-600">In Transit</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {exportOrders.filter(o => o.export_status === 'delivered').length}
            </div>
            <div className="text-sm text-gray-600">Delivered</div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <Card key={order.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <Ship className="w-5 h-5 text-blue-600" />
                    <h4 className="font-bold text-lg">{order.export_order_number}</h4>
                    <Badge className={statusColors[order.export_status]}>
                      {order.export_status?.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                    {order.locked && (
                      <Badge variant="outline" className="text-red-600 border-red-300">
                        <Lock className="w-3 h-3 mr-1" />
                        Locked
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Consignee:</span>
                      <p className="font-medium">{order.consignee_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Destination:</span>
                      <p className="font-medium">{order.destination_country} - {order.destination_port || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Value:</span>
                      <p className="font-medium">{order.currency} ${order.total_value?.toLocaleString()}</p>
                    </div>
                  </div>

                  {order.linked_sale_number && (
                    <div className="text-xs text-gray-500">
                      Linked to: {order.linked_sale_number}
                    </div>
                  )}

                  {order.estimated_departure && (
                    <div className="text-xs text-gray-500">
                      ETD: {format(new Date(order.estimated_departure), 'MMM d, yyyy')}
                      {order.estimated_arrival && ` → ETA: ${format(new Date(order.estimated_arrival), 'MMM d, yyyy')}`}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewOrder(order)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredOrders.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              <Ship className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No export orders found</p>
            </CardContent>
          </Card>
        )}
      </div>

      <ExportOrderDetailDialog
        open={detailDialogOpen}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        companyId={companyId}
      />

      <CreateExportOrderDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        companyId={companyId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['exportOrders', companyId] });
          setCreateDialogOpen(false);
        }}
      />
    </div>
  );
}