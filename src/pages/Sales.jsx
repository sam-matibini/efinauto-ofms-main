import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, DollarSign, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import CustomerSelector from "../components/shared/CustomerSelector";
import VehicleSelector from "../components/sales/VehicleSelector";
import PaymentTracker from "../components/sales/PaymentTracker";
import TradeInForm from "../components/sales/TradeInForm";
import FinancingForm from "../components/sales/FinancingForm";

export default function Sales() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [expandedSaleId, setExpandedSaleId] = useState(null);
  const queryClient = useQueryClient();

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date'),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const sale = await base44.entities.Sale.create(data);
      
      // Update vehicle status if vehicle is selected
      if (data.vehicle_id) {
        await base44.entities.Vehicle.update(data.vehicle_id, { status: 'sold' });
      }
      
      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setDialogOpen(false);
      toast.success("Sale recorded successfully!");
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setCustomerDialogOpen(false);
      toast.success("Customer added successfully!");
    },
  });

  const totalSales = sales.reduce((sum, s) => sum + (s.sale_price || 0), 0);
  const pendingSales = sales.filter(s => s.payment_status === 'pending').length;

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800"
  };

  const paymentStatusColors = {
    pending: "bg-red-100 text-red-800",
    partial: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    refunded: "bg-gray-100 text-gray-800"
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sales Management</h1>
          <p className="text-gray-600">{sales.length} total sales</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Sale
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-none shadow-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Total Sales Value</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">${totalSales.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-green-100">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Total Sales</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{sales.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-100">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Pending Payment</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{pendingSales}</p>
              </div>
              <div className="p-3 rounded-xl bg-yellow-100">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {sales.map((sale, index) => {
          const isExpanded = expandedSaleId === sale.id;
          const totalPaid = sale.total_paid || 0;
          const balanceDue = (sale.sale_price || 0) - totalPaid;
          
          return (
            <motion.div
              key={sale.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-none shadow-md hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-bold text-lg">{sale.vehicle_details}</h3>
                          <Badge className={statusColors[sale.status]}>
                            {sale.status}
                          </Badge>
                          <Badge className={paymentStatusColors[sale.payment_status]}>
                            {sale.payment_status}
                          </Badge>
                          {sale.financing?.enabled && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              Financed
                            </Badge>
                          )}
                          {sale.trade_in?.has_trade_in && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              Trade-In
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600">
                          <strong>Customer:</strong> {sale.customer_name}
                        </p>
                        {sale.vehicle_vin && (
                          <p className="text-sm text-gray-500">
                            <strong>VIN:</strong> {sale.vehicle_vin}
                          </p>
                        )}
                        <p className="text-sm text-gray-500">
                          Sale Date: {sale.sale_date ? format(new Date(sale.sale_date), 'MMM d, yyyy') : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-2xl font-bold text-green-600">
                          ${sale.sale_price?.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Paid: ${totalPaid.toLocaleString()}
                        </p>
                        {balanceDue > 0 && (
                          <p className="text-sm text-orange-600 font-semibold">
                            Due: ${balanceDue.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {(sale.payments?.length > 0 || sale.trade_in?.has_trade_in || sale.financing?.enabled) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                        className="w-full"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4 mr-2" />
                            Hide Details
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4 mr-2" />
                            Show Details
                          </>
                        )}
                      </Button>
                    )}

                    {isExpanded && (
                      <div className="pt-4 border-t space-y-4">
                        {sale.payments?.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2">Payment History</h4>
                            <div className="space-y-2">
                              {sale.payments.map((payment, idx) => (
                                <div key={idx} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                                  <div>
                                    <span className="font-bold">${parseFloat(payment.amount).toLocaleString()}</span>
                                    <span className="text-sm text-gray-500 ml-2">via {payment.method}</span>
                                    {payment.reference && (
                                      <span className="text-xs text-gray-400 ml-2">({payment.reference})</span>
                                    )}
                                  </div>
                                  <span className="text-sm text-gray-500">{payment.date}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {sale.trade_in?.has_trade_in && (
                          <div>
                            <h4 className="font-semibold mb-2">Trade-In Vehicle</h4>
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <p className="font-medium">
                                {sale.trade_in.vehicle_year} {sale.trade_in.vehicle_make} {sale.trade_in.vehicle_model}
                              </p>
                              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                                <p>Trade Value: ${sale.trade_in.trade_in_value?.toLocaleString()}</p>
                                <p>Payoff: ${sale.trade_in.payoff_amount?.toLocaleString() || 0}</p>
                                <p className="font-semibold col-span-2">
                                  Net Value: ${sale.trade_in.net_trade_value?.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {sale.financing?.enabled && (
                          <div>
                            <h4 className="font-semibold mb-2">Financing Details</h4>
                            <div className="bg-purple-50 p-4 rounded-lg">
                              <p className="font-medium">{sale.financing.institution}</p>
                              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                                <p>Loan Amount: ${sale.financing.loan_amount?.toLocaleString()}</p>
                                <p>Rate: {sale.financing.interest_rate}%</p>
                                <p>Term: {sale.financing.term_months} months</p>
                                <p className="font-semibold">
                                  Monthly: ${sale.financing.monthly_payment?.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <SaleDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={(data) => createMutation.mutate(data)}
        onCreateCustomer={() => setCustomerDialogOpen(true)}
      />

      <QuickCustomerDialog
        open={customerDialogOpen}
        onClose={() => setCustomerDialogOpen(false)}
        onSave={(data) => createCustomerMutation.mutate(data)}
      />
    </div>
  );
}

function SaleDialog({ open, onClose, onSave, onCreateCustomer }) {
  const [activeTab, setActiveTab] = useState("basic");
  const [formData, setFormData] = useState({
    sale_number: `SALE-${Date.now()}`,
    customer_id: null,
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    vehicle_id: null,
    vehicle_vin: "",
    vehicle_details: "",
    sale_price: 0,
    payments: [],
    total_paid: 0,
    balance_due: 0,
    payment_status: "pending",
    sale_date: new Date().toISOString().split('T')[0],
    delivery_date: "",
    status: "pending",
    financing: { enabled: false },
    trade_in: { has_trade_in: false },
    notes: ""
  });

  const handleCustomerSelect = (customer) => {
    setFormData({
      ...formData,
      customer_id: customer.id,
      customer_name: customer.full_name,
      customer_phone: customer.phone,
      customer_email: customer.email || ""
    });
  };

  const handleVehicleSelect = (vehicle) => {
    setFormData({
      ...formData,
      vehicle_id: vehicle.id,
      vehicle_vin: vehicle.vin,
      vehicle_details: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      sale_price: vehicle.selling_price || 0
    });
  };

  const handlePaymentsChange = (payments) => {
    const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const balanceDue = formData.sale_price - totalPaid;
    let paymentStatus = "pending";
    
    if (totalPaid >= formData.sale_price) {
      paymentStatus = "paid";
    } else if (totalPaid > 0) {
      paymentStatus = "partial";
    }

    setFormData({
      ...formData,
      payments,
      total_paid: totalPaid,
      balance_due: balanceDue,
      payment_status: paymentStatus
    });
  };

  const handleSubmit = () => {
    if (!formData.customer_name || !formData.vehicle_details || !formData.sale_price) {
      toast.error("Please fill in all required fields");
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Sale</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="financing">Financing</TabsTrigger>
            <TabsTrigger value="tradein">Trade-In</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label>Select Customer *</Label>
              <CustomerSelector
                value={formData.customer_id}
                onSelect={handleCustomerSelect}
                onCreateNew={onCreateCustomer}
              />
            </div>

            <div className="space-y-2">
              <Label>Select Vehicle *</Label>
              <VehicleSelector
                value={formData.vehicle_id}
                onSelect={handleVehicleSelect}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input value={formData.customer_name} onChange={(e) => setFormData({...formData, customer_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Customer Phone</Label>
                <Input value={formData.customer_phone} onChange={(e) => setFormData({...formData, customer_phone: e.target.value})} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Vehicle Details *</Label>
                <Input placeholder="e.g., 2023 Toyota Camry" value={formData.vehicle_details} onChange={(e) => setFormData({...formData, vehicle_details: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>VIN</Label>
                <Input value={formData.vehicle_vin} onChange={(e) => setFormData({...formData, vehicle_vin: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Sale Price ($) *</Label>
                <Input type="number" value={formData.sale_price} onChange={(e) => setFormData({...formData, sale_price: parseFloat(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>Sale Date</Label>
                <Input type="date" value={formData.sale_date} onChange={(e) => setFormData({...formData, sale_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Delivery Date</Label>
                <Input type="date" value={formData.delivery_date} onChange={(e) => setFormData({...formData, delivery_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} />
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <PaymentTracker
              payments={formData.payments}
              onChange={handlePaymentsChange}
              salePrice={formData.sale_price}
            />
          </TabsContent>

          <TabsContent value="financing" className="space-y-4">
            <FinancingForm
              financing={formData.financing}
              onChange={(financing) => setFormData({...formData, financing})}
              salePrice={formData.sale_price}
            />
          </TabsContent>

          <TabsContent value="tradein" className="space-y-4">
            <TradeInForm
              tradeIn={formData.trade_in}
              onChange={(tradeIn) => setFormData({...formData, trade_in: tradeIn})}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
            Record Sale
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QuickCustomerDialog({ open, onClose, onSave }) {
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    customer_type: "individual"
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick Add Customer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Phone *</Label>
            <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formData)} className="bg-blue-600 hover:bg-blue-700">
            Add Customer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}