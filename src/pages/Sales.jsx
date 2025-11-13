import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, DollarSign, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import CustomerSelector from "../components/shared/CustomerSelector";

export default function Sales() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date'),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Sale.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
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
                <p className="text-sm text-gray-600">Pending Sales</p>
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
        {sales.map((sale, index) => (
          <motion.div
            key={sale.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="border-none shadow-md hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-lg">{sale.vehicle_details}</h3>
                      <Badge className={statusColors[sale.status]}>
                        {sale.status}
                      </Badge>
                    </div>
                    <p className="text-gray-600">Customer: {sale.customer_name}</p>
                    <p className="text-sm text-gray-500">
                      Sale Date: {sale.sale_date ? format(new Date(sale.sale_date), 'MMM d, yyyy') : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      ${sale.sale_price?.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {sale.payment_status === 'paid' ? '✓ Paid' : 'Pending Payment'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
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
  const [formData, setFormData] = useState({
    sale_number: `SALE-${Date.now()}`,
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_id: null,
    vehicle_vin: "",
    vehicle_details: "",
    sale_price: 0,
    deposit_amount: 0,
    payment_method: "cash",
    payment_status: "pending",
    sale_date: new Date().toISOString().split('T')[0],
    status: "pending",
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Sale</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Customer</Label>
            <CustomerSelector
              value={formData.customer_id}
              onSelect={handleCustomerSelect}
              onCreateNew={onCreateCustomer}
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
              <Label>Sale Price ($) *</Label>
              <Input type="number" value={formData.sale_price} onChange={(e) => setFormData({...formData, sale_price: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Deposit Amount ($)</Label>
              <Input type="number" value={formData.deposit_amount} onChange={(e) => setFormData({...formData, deposit_amount: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={formData.payment_method} onValueChange={(v) => setFormData({...formData, payment_method: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="trade_in">Trade-in</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sale Date</Label>
              <Input type="date" value={formData.sale_date} onChange={(e) => setFormData({...formData, sale_date: e.target.value})} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formData)} className="bg-blue-600 hover:bg-blue-700">
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