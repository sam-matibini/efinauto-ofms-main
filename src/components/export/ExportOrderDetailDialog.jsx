import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ship, FileText, Package, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import AIComplianceChecker from "./AIComplianceChecker";
import ExportDocumentGenerator from "./ExportDocumentGenerator";
import AIInvoiceGenerator from "./AIInvoiceGenerator";
import EnhancedDocumentGenerator from "./EnhancedDocumentGenerator";
import LiveTrackingDisplay from "./LiveTrackingDisplay";
import PaymentGateway from "./PaymentGateway";
import PaymentHistory from "./PaymentHistory";
import { validateExportOrder } from "./ExportValidationService";

export default function ExportOrderDetailDialog({ open, onClose, order, companyId }) {
  const queryClient = useQueryClient();
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const { data: sale } = useQuery({
    queryKey: ['sale', order?.linked_sales_document_id],
    queryFn: () => base44.entities.Sale.filter({ id: order.linked_sales_document_id }),
    enabled: !!order?.linked_sales_document_id,
    select: (data) => data?.[0]
  });

  const { data: company } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => base44.entities.Company.filter({ id: companyId }),
    enabled: !!companyId,
    select: (data) => data?.[0]
  });

  if (!order) return null;

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

  const handleApprove = async () => {
    setUpdatingStatus(true);
    try {
      // Validate ISO + HS codes before approval
      const validation = validateExportOrder(order, order.line_items || order.items || []);
      
      if (!validation.isValid) {
        toast.error("Cannot approve: Validation failed");
        validation.errors.forEach(err => toast.error(err, { duration: 5000 }));
        setUpdatingStatus(false);
        return;
      }

      if (validation.warnings.length > 0) {
        console.warn("Export validation warnings:", validation.warnings);
      }

      const user = await base44.auth.me();
      await base44.entities.ExportOrder.update(order.id, {
        export_status: "approved",
        compliance_reviewed_by: user.email,
        compliance_reviewed_at: new Date().toISOString(),
        approved_by: user.email,
        approved_at: new Date().toISOString(),
        hs_codes_validated: true,
        hs_validation_timestamp: new Date().toISOString()
      });
      
      queryClient.invalidateQueries({ queryKey: ['exportOrders'] });
      toast.success("Export order approved with ISO & HS validation");
      onClose();
    } catch (error) {
      toast.error("Failed to approve: " + error.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleShip = async () => {
    setUpdatingStatus(true);
    try {
      await base44.entities.ExportOrder.update(order.id, {
        export_status: "shipped",
        actual_departure: new Date().toISOString().split('T')[0],
        locked: true
      });
      
      queryClient.invalidateQueries({ queryKey: ['exportOrders'] });
      toast.success("Order marked as shipped and locked");
      onClose();
    } catch (error) {
      toast.error("Failed to ship: " + error.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship className="w-5 h-5" />
            {order.export_order_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Badge className={statusColors[order.export_status]} className="text-sm">
              {order.export_status?.replace(/_/g, ' ').toUpperCase()}
            </Badge>
            {order.locked && (
              <Badge variant="outline" className="text-red-600 border-red-300">
                Read-Only (Shipped)
              </Badge>
            )}
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="grid grid-cols-8 w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="payment">Payment</TabsTrigger>
                <TabsTrigger value="compliance">Compliance</TabsTrigger>
                <TabsTrigger value="tracking">Tracking</TabsTrigger>
                <TabsTrigger value="ai-check">AI Check</TabsTrigger>
                <TabsTrigger value="invoice">Invoice</TabsTrigger>
                <TabsTrigger value="logistics">Logistics</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Export Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Export Type:</span>
                      <p className="font-medium capitalize">{order.export_type}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Export Reason:</span>
                      <p className="font-medium">{order.export_reason || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Linked Sale:</span>
                      <p className="font-medium">{order.linked_sale_number || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Created:</span>
                      <p className="font-medium">{format(new Date(order.created_date), 'MMM d, yyyy')}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Items:</span>
                      <p className="font-medium">{(order.line_items || order.items || []).length}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Value:</span>
                      <p className="font-medium">{order.currency} ${order.total_value?.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Line Items */}
              {(order.line_items || order.items || []).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Line Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(order.line_items || order.items).map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between p-3 border rounded-lg bg-gray-50">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{item.description}</span>
                              {item.item_type && (
                                <Badge className={
                                  item.item_type === 'vehicle' ? 'bg-blue-100 text-blue-800' :
                                  item.item_type === 'part' ? 'bg-purple-100 text-purple-800' :
                                  'bg-green-100 text-green-800'
                                }>
                                  {item.item_type}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-gray-600 space-x-3">
                              {item.hs_code ? (
                                <span className={item.hs_code.replace(/\./g, '').length < 6 ? 'text-red-600 font-medium' : ''}>
                                  HS: {item.hs_code}
                                  {item.hs_code_level && <span className="ml-1">({item.hs_code_level}-digit)</span>}
                                </span>
                              ) : (
                                <span className="text-red-600 font-medium">⚠ HS Code Missing</span>
                              )}
                              <span>Qty: {item.quantity} {item.unit_of_measure || ''}</span>
                              {item.weight && <span>Weight: {item.weight} kg</span>}
                              {item.country_of_origin && <span>Origin: {item.country_of_origin}</span>}
                              {item.item_condition && <span className="capitalize">Condition: {item.item_condition}</span>}
                              {item.vin && <span>VIN: {item.vin}</span>}
                              {item.part_number && <span>P/N: {item.part_number}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{order.currency} ${item.total_value?.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Consignee Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>Name:</strong> {order.consignee_name}</p>
                  <p><strong>Email:</strong> {order.consignee_email || 'N/A'}</p>
                  <p><strong>Phone:</strong> {order.consignee_phone || 'N/A'}</p>
                  <p><strong>Address:</strong> {order.consignee_address || 'N/A'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Destination</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>Country:</strong> {order.destination_country}</p>
                  <p><strong>Port:</strong> {order.destination_port || 'N/A'}</p>
                  <p><strong>Address:</strong> {order.destination_address || 'N/A'}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payment" className="space-y-4">
              <PaymentGateway 
                order={order} 
                onPaymentComplete={() => queryClient.invalidateQueries({ queryKey: ['exportOrders'] })}
              />
              <PaymentHistory orderId={order.id} />
            </TabsContent>

            <TabsContent value="tracking" className="space-y-4">
              <LiveTrackingDisplay order={order} />
            </TabsContent>

            <TabsContent value="compliance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Customs Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600">HS Code:</span>
                      <p className="font-medium">{order.hs_code || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Country of Origin:</span>
                      <p className="font-medium">{order.country_of_origin || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Customs Value:</span>
                      <p className="font-medium">{order.currency} ${order.customs_value?.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Export Declaration:</span>
                      <p className="font-medium">{order.export_declaration_required ? 'Required' : 'Not Required'}</p>
                    </div>
                  </div>
                  {order.export_declaration_number && (
                    <div>
                      <span className="text-gray-600">Declaration #:</span>
                      <p className="font-medium">{order.export_declaration_number}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {order.compliance_reviewed_at && (
                <Card className="bg-green-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="w-4 h-4" />
                      <p className="text-sm">
                        <strong>Compliance Approved</strong> by {order.compliance_reviewed_by} on{' '}
                        {format(new Date(order.compliance_reviewed_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    {order.compliance_notes && (
                      <p className="text-sm text-gray-600 mt-2">{order.compliance_notes}</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="ai-check" className="space-y-4">
              <AIComplianceChecker order={order} />
              <EnhancedDocumentGenerator order={order} sale={sale} company={company} />
            </TabsContent>

            <TabsContent value="invoice" className="space-y-4">
              <AIInvoiceGenerator 
                order={order} 
                sale={sale} 
                company={company}
                onInvoiceCreated={() => {
                  toast.success("Navigate to Financials > Transactions to view the invoice");
                }}
              />
            </TabsContent>

            <TabsContent value="logistics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Shipping Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600">Incoterms:</span>
                      <p className="font-medium">{order.incoterms || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Shipping Mode:</span>
                      <p className="font-medium capitalize">{order.shipping_mode}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Carrier:</span>
                      <p className="font-medium">{order.carrier || 'TBD'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Container:</span>
                      <p className="font-medium">{order.container_type || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Booking Reference:</span>
                      <p className="font-medium">{order.booking_reference || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Tracking #:</span>
                      <p className="font-medium">{order.tracking_number || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {order.estimated_departure && (
                    <p><strong>Est. Departure:</strong> {format(new Date(order.estimated_departure), 'MMM d, yyyy')}</p>
                  )}
                  {order.actual_departure && (
                    <p className="text-green-600"><strong>Actual Departure:</strong> {format(new Date(order.actual_departure), 'MMM d, yyyy')}</p>
                  )}
                  {order.estimated_arrival && (
                    <p><strong>Est. Arrival:</strong> {format(new Date(order.estimated_arrival), 'MMM d, yyyy')}</p>
                  )}
                  {order.actual_arrival && (
                    <p className="text-green-600"><strong>Actual Arrival:</strong> {format(new Date(order.actual_arrival), 'MMM d, yyyy')}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Costs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Freight:</span>
                    <span>${order.freight_cost?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Insurance:</span>
                    <span>${order.insurance_cost?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Handling:</span>
                    <span>${order.handling_fees?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customs:</span>
                    <span>${order.customs_fees?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Total Logistics:</span>
                    <span>${order.total_logistics_cost?.toLocaleString() || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  {order.documents?.length > 0 ? (
                    <div className="space-y-2">
                      {order.documents.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span className="text-sm">{doc.name}</span>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => window.open(doc.url, '_blank')}>
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No documents generated yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          {!order.locked && (
            <div className="flex gap-2 pt-4 border-t">
              {order.export_status === 'compliance_review' && (
                <Button onClick={handleApprove} disabled={updatingStatus} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve for Export
                </Button>
              )}
              {order.export_status === 'approved' && (
                <Button onClick={handleShip} disabled={updatingStatus} className="bg-blue-600 hover:bg-blue-700">
                  <Ship className="w-4 h-4 mr-2" />
                  Mark as Shipped
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}