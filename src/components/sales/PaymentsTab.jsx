import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, LayoutGrid, List, ArrowUpDown, Search, Receipt, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import PaymentReceiptDialog from "./PaymentReceiptDialog";

export default function PaymentsTab({ payments, selectedCompanyId }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [sortBy, setSortBy] = useState("created_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const payment = await supabase.entities.PaymentReceived.create({ ...data, company_id: selectedCompanyId });
      
      // Create GL transaction for payment received
      await supabase.entities.Transaction.create({
        company_id: selectedCompanyId,
        transaction_number: payment.payment_number || `PMT-${payment.id.slice(0, 8)}`,
        transaction_type: 'payment_received',
        category: 'asset',
        amount: payment.amount || 0,
        account_code: '1000',
        account_name: 'Cash',
        account_type: 'asset',
        contra_account_code: '1100',
        contra_account_name: 'Accounts Receivable',
        reference_type: 'PaymentReceived',
        reference_id: payment.id,
        reference_number: payment.payment_number,
        customer_name: payment.customer_name,
        description: `Payment received from ${payment.customer_name}${payment.invoice_number ? ` for Invoice ${payment.invoice_number}` : ''}`,
        transaction_date: payment.payment_date,
        payment_method: payment.payment_method,
        status: 'completed'
      });
      
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setDialogOpen(false);
      toast.success("Payment recorded!");
    },
  });

  const { data: company } = useQuery({
    queryKey: ['company', selectedCompanyId],
    queryFn: async () => {
      const result = await supabase.entities.Company.filter({ id: selectedCompanyId });
      return result?.[0];
    },
    enabled: !!selectedCompanyId,
  });

  const handleViewReceipt = (payment) => {
    setSelectedPayment(payment);
    setReceiptDialogOpen(true);
  };

  const filteredPayments = payments.filter(p =>
    p.payment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    if (typeof aVal === "string") aVal = aVal?.toLowerCase() || "";
    if (typeof bVal === "string") bVal = bVal?.toLowerCase() || "";
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supabase.entities.PaymentReceived.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success("Payment deleted!");
    },
  });

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800"
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Payments Received</h2>
        <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Record Payment
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input placeholder="Search payments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(v) => { const [field, order] = v.split("-"); setSortBy(field); setSortOrder(order); }}>
              <SelectTrigger><ArrowUpDown className="w-4 h-4 mr-2" /><SelectValue placeholder="Sort By" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created_date-desc">Newest First</SelectItem>
                <SelectItem value="created_date-asc">Oldest First</SelectItem>
                <SelectItem value="customer_name-asc">Customer (A-Z)</SelectItem>
                <SelectItem value="amount-desc">Amount (High-Low)</SelectItem>
                <SelectItem value="amount-asc">Amount (Low-High)</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1 justify-end">
              <Button variant={viewMode === "grid" ? "default" : "outline"} size="icon" onClick={() => setViewMode("grid")}><LayoutGrid className="w-4 h-4" /></Button>
              <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")}><List className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {viewMode === "list" ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment #</TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("customer_name"); setSortOrder(sortBy === "customer_name" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Customer {sortBy === "customer_name" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("amount"); setSortOrder(sortBy === "amount" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Amount {sortBy === "amount" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.payment_number || 'Payment'}</TableCell>
                  <TableCell>{payment.customer_name}</TableCell>
                  <TableCell>{payment.payment_date}</TableCell>
                  <TableCell>{payment.payment_method}</TableCell>
                  <TableCell><Badge className={statusColors[payment.status]}>{payment.status}</Badge></TableCell>
                  <TableCell className="font-semibold text-green-600">${payment.amount?.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleViewReceipt(payment)}><Receipt className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteMutation.mutate(payment.id)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPayments.map((payment) => (
            <Card key={payment.id} className="hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">{payment.payment_number || 'Payment'}</h3>
                      <Badge className={statusColors[payment.status]}>{payment.status}</Badge>
                    </div>
                    <p className="text-gray-600"><strong>Customer:</strong> {payment.customer_name}</p>
                    <p className="text-sm text-gray-500">Payment Date: {payment.payment_date}</p>
                    <p className="text-sm text-gray-500">Method: {payment.payment_method}</p>
                    {payment.reference_number && (
                      <p className="text-sm text-gray-500">Reference: {payment.reference_number}</p>
                    )}
                    {payment.invoice_number && (
                      <p className="text-sm text-blue-600">Applied to Invoice: {payment.invoice_number}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">${payment.amount?.toLocaleString()}</p>
                    <div className="flex gap-2 mt-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => handleViewReceipt(payment)}>
                        <Receipt className="w-4 h-4 mr-2" />
                        Receipt
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600" onClick={() => deleteMutation.mutate(payment.id)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PaymentReceiptDialog
        open={receiptDialogOpen}
        onClose={() => { setReceiptDialogOpen(false); setSelectedPayment(null); }}
        payment={selectedPayment}
        company={company}
      />
    </>
  );
}