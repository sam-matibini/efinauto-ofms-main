import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Package, TrendingUp, DollarSign, Clock, FileText, Edit, Trash2, Users, Receipt, RefreshCw, CreditCard, FileX, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import { useCompany } from "../components/shared/CompanyContext";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AIPartsSearchLocal from "@/components/parts/AIPartsSearchLocal";
import AIPartsSearchCanada from "@/components/parts/AIPartsSearchCanada";
import AIPartsSearchUSA from "@/components/parts/AIPartsSearchUSA";
import AIPartsSearchMarketplace from "@/components/parts/AIPartsSearchMarketplace";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PurchaseDialog from "@/components/purchases/PurchaseDialog";
import VendorsTab from "../components/purchases/VendorsTab";
import ExpensesTab from "../components/purchases/ExpensesTab";
import BillsTab from "../components/purchases/BillsTab";
import RecurringExpensesTab from "../components/purchases/RecurringExpensesTab";
import RecurringBillsTab from "../components/purchases/RecurringBillsTab";
import PaymentsMadeTab from "../components/purchases/PaymentsMadeTab";
import VendorCreditsTab from "../components/purchases/VendorCreditsTab";

export default function Purchases() {
  const [activeMainTab, setActiveMainTab] = useState("purchases");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState(null);
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: purchases = [] } = useQuery({
    queryKey: ['purchases', selectedCompanyId],
    queryFn: () => base44.entities.Purchase.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors', selectedCompanyId],
    queryFn: () => base44.entities.Vendor.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', selectedCompanyId],
    queryFn: () => base44.entities.Expense.filter({ company_id: selectedCompanyId }, '-expense_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: bills = [] } = useQuery({
    queryKey: ['bills', selectedCompanyId],
    queryFn: () => base44.entities.Bill.filter({ company_id: selectedCompanyId }, '-bill_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: recurringExpenses = [] } = useQuery({
    queryKey: ['recurringExpenses', selectedCompanyId],
    queryFn: () => base44.entities.RecurringExpense.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: recurringBills = [] } = useQuery({
    queryKey: ['recurringBills', selectedCompanyId],
    queryFn: () => base44.entities.RecurringBill.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: paymentsMade = [] } = useQuery({
    queryKey: ['paymentsMade', selectedCompanyId],
    queryFn: () => base44.entities.PaymentMade.filter({ company_id: selectedCompanyId }, '-payment_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: vendorCredits = [] } = useQuery({
    queryKey: ['vendorCredits', selectedCompanyId],
    queryFn: () => base44.entities.VendorCredit.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const purchase = await base44.entities.Purchase.create({ ...data, company_id: selectedCompanyId });
      
      // Create accounting transaction for expense
      if (purchase.total_amount > 0 && purchase.status === 'received') {
        const transactionType = purchase.purchase_type === 'vehicle' ? 'vehicle_purchase' : 
                               purchase.purchase_type === 'parts' ? 'parts_purchase' : 'overhead_expense';
        
        await base44.entities.Transaction.create({
          company_id: selectedCompanyId,
          transaction_number: purchase.purchase_number || `PO-${purchase.id.slice(0, 8)}`,
          transaction_type: transactionType,
          category: 'expense',
          amount: purchase.total_amount || 0,
          reference_type: 'Purchase',
          reference_id: purchase.id,
          reference_number: purchase.purchase_number,
          customer_name: purchase.supplier_name,
          description: `Purchase: ${purchase.purchase_type} from ${purchase.supplier_name}`,
          transaction_date: purchase.received_date || new Date().toISOString().split('T')[0],
          payment_method: purchase.payment_method || 'other',
          status: purchase.payment_status === 'paid' ? 'completed' : 'pending',
          tax_amount: purchase.tax_amount || 0,
          tax_gst: data.tax_gst || 0,
          tax_pst: data.tax_pst || 0,
          tax_hst: data.tax_hst || 0
        });
      }
      
      return purchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setDialogOpen(false);
      setEditingPurchase(null);
      toast.success("Purchase order created successfully!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const oldPurchase = purchases.find(p => p.id === id);
      const updated = await base44.entities.Purchase.update(id, data);
      
      // If status changed to received and wasn't before, create expense transaction
      if (data.status === 'received' && oldPurchase?.status !== 'received' && data.total_amount > 0) {
        const transactionType = data.purchase_type === 'vehicle' ? 'vehicle_purchase' : 
                               data.purchase_type === 'parts' ? 'parts_purchase' : 'overhead_expense';
        
        await base44.entities.Transaction.create({
          company_id: selectedCompanyId,
          transaction_number: `RCV-${id.slice(0, 8)}`,
          transaction_type: transactionType,
          category: 'expense',
          amount: data.total_amount,
          account_code: data.purchase_type === 'vehicle' ? '1200' : data.purchase_type === 'parts' ? '1210' : '6000',
          account_name: data.purchase_type === 'vehicle' ? 'Vehicle Inventory' : data.purchase_type === 'parts' ? 'Parts Inventory' : 'Operating Expense',
          account_type: data.purchase_type === 'vehicle' || data.purchase_type === 'parts' ? 'asset' : 'expense',
          reference_type: 'Purchase',
          reference_id: id,
          reference_number: data.purchase_number,
          customer_name: data.supplier_name,
          description: `Purchase received: ${data.purchase_type} from ${data.supplier_name}`,
          transaction_date: data.received_date || new Date().toISOString().split('T')[0],
          status: 'completed'
        });
      }
      
      // If payment status changed to paid, create payment transaction
      if (data.payment_status === 'paid' && oldPurchase?.payment_status !== 'paid') {
        await base44.entities.Transaction.create({
          company_id: selectedCompanyId,
          transaction_number: `PMTOUT-${id.slice(0, 8)}`,
          transaction_type: 'payment_made',
          category: 'asset',
          amount: data.total_amount,
          account_code: '1000',
          account_name: 'Cash',
          account_type: 'asset',
          reference_type: 'Purchase',
          reference_id: id,
          reference_number: data.purchase_number,
          customer_name: data.supplier_name,
          description: `Payment made for purchase: ${data.purchase_number}`,
          transaction_date: new Date().toISOString().split('T')[0],
          status: 'completed'
        });
      }
      
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setDialogOpen(false);
      setEditingPurchase(null);
      toast.success("Purchase order updated successfully!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Purchase.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      setDeleteDialogOpen(false);
      setPurchaseToDelete(null);
      toast.success("Purchase order deleted successfully!");
    },
  });

  const filteredPurchases = purchases.filter(p => {
    const matchesSearch = p.purchase_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesType = typeFilter === "all" || p.purchase_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: purchases.length,
    pending: purchases.filter(p => p.status === "ordered").length,
    totalValue: purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0),
    unpaid: purchases.filter(p => p.payment_status !== "paid").length,
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: "bg-gray-100 text-gray-800",
      ordered: "bg-blue-100 text-blue-800",
      received: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      partial: "bg-orange-100 text-orange-800",
      paid: "bg-green-100 text-green-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (!selectedCompanyId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please select a company to view purchases management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Purchases Management</h1>
            <p className="text-sm text-gray-300 mt-1">Comprehensive purchasing operations</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 h-auto bg-white border-b">
            <TabsTrigger value="purchases" className="flex flex-col gap-1 py-3 data-[state=active]:border-b-2 data-[state=active]:border-gray-600 data-[state=active]:text-gray-900">
              <ShoppingCart className="w-4 h-4" />
              <span className="text-xs">Purchase Orders</span>
            </TabsTrigger>
            <TabsTrigger value="vendors" className="flex flex-col gap-1 py-3 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-900">
              <Users className="w-4 h-4" />
              <span className="text-xs">Vendors</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex flex-col gap-1 py-3 data-[state=active]:border-b-2 data-[state=active]:border-red-600 data-[state=active]:text-red-900">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">Expenses</span>
            </TabsTrigger>
            <TabsTrigger value="bills" className="flex flex-col gap-1 py-3 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:text-purple-900">
              <Receipt className="w-4 h-4" />
              <span className="text-xs">Bills</span>
            </TabsTrigger>
            <TabsTrigger value="recurringExpenses" className="flex flex-col gap-1 py-3 data-[state=active]:border-b-2 data-[state=active]:border-orange-600 data-[state=active]:text-orange-900">
              <RefreshCw className="w-4 h-4" />
              <span className="text-xs">Recurring Expenses</span>
            </TabsTrigger>
            <TabsTrigger value="recurringBills" className="flex flex-col gap-1 py-3 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-900">
              <RefreshCw className="w-4 h-4" />
              <span className="text-xs">Recurring Bills</span>
            </TabsTrigger>
            <TabsTrigger value="paymentsMade" className="flex flex-col gap-1 py-3 data-[state=active]:border-b-2 data-[state=active]:border-green-600 data-[state=active]:text-green-900">
              <CreditCard className="w-4 h-4" />
              <span className="text-xs">Payments Made</span>
            </TabsTrigger>
            <TabsTrigger value="vendorCredits" className="flex flex-col gap-1 py-3 data-[state=active]:border-b-2 data-[state=active]:border-teal-600 data-[state=active]:text-teal-900">
              <FileX className="w-4 h-4" />
              <span className="text-xs">Vendor Credits</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="purchases" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Purchase Orders</h2>
              <Button onClick={() => {
                setEditingPurchase(null);
                setDialogOpen(true);
              }} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Purchase Order
              </Button>
            </div>

            {/* AI Parts Search - Local Near Me */}
            <AIPartsSearchLocal />

            {/* AI Parts Search - Canada */}
            <div className="mt-6">
              <AIPartsSearchCanada />
            </div>

            {/* AI Parts Search - USA */}
            <div className="mt-6">
              <AIPartsSearchUSA />
            </div>

            {/* AI Parts Search - Marketplaces */}
            <div className="mt-6">
              <AIPartsSearchMarketplace />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 mt-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Orders</p>
                      <h3 className="text-2xl font-bold text-gray-900">{stats.total}</h3>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending Orders</p>
                      <h3 className="text-2xl font-bold text-blue-600">{stats.pending}</h3>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Value</p>
                      <h3 className="text-2xl font-bold text-green-600">${stats.totalValue.toLocaleString()}</h3>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Unpaid</p>
                      <h3 className="text-2xl font-bold text-orange-600">{stats.unpaid}</h3>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      placeholder="Search by PO number or supplier..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="ordered">Ordered</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="parts">Parts</SelectItem>
                      <SelectItem value="vehicle">Vehicle</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="supplies">Supplies</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Purchase Orders List */}
            {filteredPurchases.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No purchase orders found</h3>
                  <p className="text-gray-500 mb-6">Create your first purchase order to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredPurchases.map((purchase, index) => (
                  <motion.div
                    key={purchase.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-bold text-gray-900">
                                PO #{purchase.purchase_number || purchase.id.slice(0, 8)}
                              </h3>
                              <Badge className={getStatusColor(purchase.status)}>
                                {purchase.status}
                              </Badge>
                              <Badge className={getPaymentStatusColor(purchase.payment_status)}>
                                {purchase.payment_status}
                              </Badge>
                              <Badge variant="outline">{purchase.purchase_type}</Badge>
                            </div>
                            <p className="text-gray-600">Supplier: {purchase.supplier_name}</p>
                            {purchase.order_date && (
                              <p className="text-sm text-gray-500">Order Date: {new Date(purchase.order_date).toLocaleDateString()}</p>
                            )}
                            {purchase.items && purchase.items.length > 0 && (
                              <p className="text-sm text-gray-500 mt-2">{purchase.items.length} items</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">
                              ${purchase.total_amount?.toLocaleString() || '0.00'}
                            </p>
                            {purchase.amount_paid > 0 && (
                              <p className="text-sm text-gray-500">Paid: ${purchase.amount_paid.toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingPurchase(purchase);
                              setDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setPurchaseToDelete(purchase);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="vendors" className="space-y-6">
            <VendorsTab vendors={vendors} selectedCompanyId={selectedCompanyId} />
          </TabsContent>

          <TabsContent value="expenses" className="space-y-6">
            <ExpensesTab expenses={expenses} selectedCompanyId={selectedCompanyId} />
          </TabsContent>

          <TabsContent value="bills" className="space-y-6">
            <BillsTab bills={bills} selectedCompanyId={selectedCompanyId} />
          </TabsContent>

          <TabsContent value="recurringExpenses" className="space-y-6">
            <RecurringExpensesTab recurringExpenses={recurringExpenses} selectedCompanyId={selectedCompanyId} />
          </TabsContent>

          <TabsContent value="recurringBills" className="space-y-6">
            <RecurringBillsTab recurringBills={recurringBills} selectedCompanyId={selectedCompanyId} />
          </TabsContent>

          <TabsContent value="paymentsMade" className="space-y-6">
            <PaymentsMadeTab paymentsMade={paymentsMade} selectedCompanyId={selectedCompanyId} />
          </TabsContent>

          <TabsContent value="vendorCredits" className="space-y-6">
            <VendorCreditsTab vendorCredits={vendorCredits} selectedCompanyId={selectedCompanyId} />
          </TabsContent>
        </Tabs>

        <PurchaseDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setEditingPurchase(null);
          }}
          purchase={editingPurchase}
          onSave={(data) => {
            if (editingPurchase) {
              updateMutation.mutate({ id: editingPurchase.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          isSaving={createMutation.isPending || updateMutation.isPending}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this purchase order? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPurchaseToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => purchaseToDelete && deleteMutation.mutate(purchaseToDelete.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}