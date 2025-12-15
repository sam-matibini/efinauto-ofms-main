import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, DollarSign, TrendingUp, ChevronDown, ChevronUp, FileText, Users, FileCheck, Receipt, RefreshCw, CreditCard, FileX, Mail, Edit, Trash2, LayoutGrid, List, Download, FileSpreadsheet, Loader2, XCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import CanadianTaxCalculator, { calculateCanadianTax } from "../components/sales/CanadianTaxCalculator";
import BillOfSale from "../components/sales/BillOfSale";
import BillOfSaleShare from "../components/sales/BillOfSaleShare";
import { useCompany } from "../components/shared/CompanyContext";
import { generateBOSNumber, voidBOS } from "../components/sales/BOSNumberingService";
import CustomersTab from "../components/sales/CustomersTab";
import QuotesTab from "../components/sales/QuotesTab";
import InvoicesTab from "../components/sales/InvoicesTab";
import PaymentsTab from "../components/sales/PaymentsTab";
import RecurringInvoicesTab from "../components/sales/RecurringInvoicesTab";
import CreditNotesTab from "../components/sales/CreditNotesTab";
import AISalesInsights from "../components/sales/AISalesInsights";
import DateRangeFilter, { getDateRangeValues } from "../components/shared/DateRangeFilter";
import CompareWithFilter from "../components/shared/CompareWithFilter";
import BillOfSaleExport from "../components/sales/BillOfSaleExport";

export default function Sales() {
  const [activeMainTab, setActiveMainTab] = useState("sales");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [expandedSaleId, setExpandedSaleId] = useState(null);
  const [billOfSaleOpen, setBillOfSaleOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [deletingSale, setDeletingSale] = useState(null);
  const [salesViewMode, setSalesViewMode] = useState("cards");
  const [dateRange, setDateRange] = useState("all");
  const [compareWith, setCompareWith] = useState(null);
  const [finalizingBOS, setFinalizingBOS] = useState(null);
  const [voidingBOS, setVoidingBOS] = useState(null);
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: sales = [] } = useQuery({
    queryKey: ['sales', selectedCompanyId],
    queryFn: () => base44.entities.Sale.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', selectedCompanyId],
    queryFn: () => base44.entities.Customer.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes', selectedCompanyId],
    queryFn: () => base44.entities.Quote.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', selectedCompanyId],
    queryFn: () => base44.entities.SalesInvoice.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', selectedCompanyId],
    queryFn: () => base44.entities.PaymentReceived.filter({ company_id: selectedCompanyId }, '-payment_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: creditNotes = [] } = useQuery({
    queryKey: ['creditNotes', selectedCompanyId],
    queryFn: () => base44.entities.CreditNote.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: recurringInvoices = [] } = useQuery({
    queryKey: ['recurringInvoices', selectedCompanyId],
    queryFn: () => base44.entities.RecurringInvoice.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', selectedCompanyId],
    queryFn: () => base44.entities.Vehicle.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services', selectedCompanyId],
    queryFn: () => base44.entities.Service.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  // This query fetches the selected company details to be used in BillOfSale
  const { data: company } = useQuery({
    queryKey: ['company', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return []; // Return empty array if no company ID, will result in 'undefined' after select
      const result = await base44.entities.Company.filter({ id: selectedCompanyId });
      return result;
    },
    enabled: !!selectedCompanyId,
    select: (data) => data?.[0], // Select the first (and only) company object
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const oldSale = sales.find(s => s.id === id);
      const updatedSale = await base44.entities.Sale.update(id, data);
      
      // If payment status changed to paid and wasn't before, create payment transaction
      if (data.payment_status === 'paid' && oldSale?.payment_status !== 'paid') {
        await base44.entities.Transaction.create({
          company_id: selectedCompanyId,
          transaction_number: `PMT-${id.slice(0, 8)}`,
          transaction_type: 'payment_received',
          category: 'asset',
          amount: data.grand_total || data.sale_price || 0,
          account_code: '1000',
          account_name: 'Cash',
          account_type: 'asset',
          reference_type: 'Sale',
          reference_id: id,
          reference_number: data.sale_number,
          customer_name: data.customer_name,
          description: `Payment received for sale: ${data.vehicle_details}`,
          transaction_date: new Date().toISOString().split('T')[0],
          status: 'completed'
        });
      }
      
      return updatedSale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setDialogOpen(false);
      setEditingSale(null);
      toast.success("Sale updated successfully!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.Sale.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      setDeletingSale(null);
      toast.success("Sale deleted successfully!");
    },
  });

  // Finalize BOS and generate number
  const finalizeBOSMutation = useMutation({
    mutationFn: async (sale) => {
      const user = await base44.auth.me();
      const locationCode = company?.code?.substring(0, 5).toUpperCase() || 'HQ';
      
      // Generate BOS number
      const bosData = await generateBOSNumber(selectedCompanyId, locationCode);
      
      // Update sale with BOS details
      return await base44.entities.Sale.update(sale.id, {
        bos_number: bosData.bos_number,
        bos_sequence: bosData.bos_sequence,
        bos_status: 'finalized',
        bos_issued_date: new Date().toISOString(),
        bos_issued_by: user.email,
        location_code: bosData.location_code
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      setFinalizingBOS(null);
      toast.success("Bill of Sale finalized and number assigned!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to finalize Bill of Sale");
      setFinalizingBOS(null);
    }
  });

  // Void BOS
  const voidBOSMutation = useMutation({
    mutationFn: async ({ saleId, reason }) => {
      const user = await base44.auth.me();
      return await voidBOS(saleId, reason, user.email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      setVoidingBOS(null);
      toast.success("Bill of Sale voided");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to void Bill of Sale");
    }
  });

  const handleFinalizeBOS = (sale) => {
    setFinalizingBOS(sale);
  };

  const handleVoidBOS = (sale) => {
    setVoidingBOS(sale);
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const sale = await base44.entities.Sale.create({
        ...data, 
        company_id: selectedCompanyId,
        bos_status: 'draft'
      });
      
      if (data.vehicle_id) {
        const vehicleStatus = data.sale_type === 'export' ? 'exported' : 'sold';
        await base44.entities.Vehicle.update(data.vehicle_id, { status: vehicleStatus });
      }
      
      // If export sale, create an Export record
      let exportRecord = null;
      if (data.sale_type === 'export') {
        exportRecord = await base44.entities.Export.create({
          company_id: selectedCompanyId,
          export_number: `EXP-${Date.now()}`,
          export_type: 'vehicle',
          customer_name: data.customer_name,
          customer_email: data.customer_email || '',
          customer_phone: data.customer_phone || '',
          destination_country: 'TBD',
          items: [{
            description: data.vehicle_details,
            quantity: 1,
            value: data.sale_price,
            vin: data.vehicle_vin
          }],
          total_value: data.sale_price,
          status: 'pending',
          payment_status: data.payment_status,
          notes: `Auto-created from export sale: ${sale.sale_number}`
        });

        // Update sale with export_id
        await base44.entities.Sale.update(sale.id, { export_id: exportRecord.id });
      }
      
      // Create accounting transaction for revenue
      await base44.entities.Transaction.create({
        company_id: selectedCompanyId,
        transaction_number: sale.sale_number,
        transaction_type: 'sale_revenue',
        category: 'revenue',
        amount: sale.grand_total || sale.sale_price,
        reference_type: 'Sale',
        reference_id: sale.id,
        reference_number: sale.sale_number,
        customer_name: sale.customer_name,
        description: `${data.sale_type === 'export' ? 'Export ' : ''}Vehicle sale: ${sale.vehicle_details}`,
        transaction_date: sale.sale_date || new Date().toISOString().split('T')[0],
        payment_method: 'other',
        status: sale.payment_status === 'paid' ? 'completed' : 'pending',
        tax_amount: sale.tax_total || 0,
        tax_status: data.tax_status
      });
      
      return { sale, exportRecord };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['exports'] });
      setDialogOpen(false);
      if (result.exportRecord) {
        toast.success("Export sale recorded and export order created!");
      } else {
        toast.success("Sale recorded successfully!");
      }
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

  // Filter sales by date range
  const filteredSales = sales.filter(s => {
    if (dateRange === "all") return true;
    const { start, end } = getDateRangeValues(dateRange);
    if (start && end) {
      const saleDate = s.sale_date ? new Date(s.sale_date) : new Date(s.created_date);
      return saleDate >= start && saleDate <= new Date(end.getTime() + 86400000);
    }
    return true;
  });

  const totalSales = filteredSales.reduce((sum, s) => sum + (s.grand_total || s.sale_price || 0), 0);
  const pendingSales = filteredSales.filter(s => s.payment_status === 'pending').length;

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

  const handleViewBillOfSale = (sale) => {
    setSelectedSale(sale);
    setBillOfSaleOpen(true);
  };

  if (!selectedCompanyId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please select a company to view sales management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 md:px-6 py-3 md:py-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Sales Management</h1>
            <p className="text-xs md:text-sm text-gray-300 mt-1">Comprehensive sales operations</p>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 h-auto bg-white border-b overflow-x-auto">
            <TabsTrigger value="sales" className="flex flex-col gap-1 py-2 md:py-3 data-[state=active]:border-b-2 data-[state=active]:border-gray-600 data-[state=active]:text-gray-900 min-w-[60px]">
              <FileText className="w-3 h-3 md:w-4 md:h-4" />
              <span className="text-[10px] md:text-xs">Sales</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex flex-col gap-1 py-2 md:py-3 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-900 min-w-[60px]">
              <Users className="w-3 h-3 md:w-4 md:h-4" />
              <span className="text-[10px] md:text-xs">Customers</span>
            </TabsTrigger>
            <TabsTrigger value="quotes" className="flex flex-col gap-1 py-2 md:py-3 data-[state=active]:border-b-2 data-[state=active]:border-yellow-500 data-[state=active]:text-yellow-900 min-w-[60px]">
              <FileCheck className="w-3 h-3 md:w-4 md:h-4" />
              <span className="text-[10px] md:text-xs">Quotes</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex flex-col gap-1 py-2 md:py-3 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:text-purple-900 min-w-[60px]">
              <Receipt className="w-3 h-3 md:w-4 md:h-4" />
              <span className="text-[10px] md:text-xs">Invoices</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex flex-col gap-1 py-2 md:py-3 data-[state=active]:border-b-2 data-[state=active]:border-green-600 data-[state=active]:text-green-900 min-w-[60px]">
              <CreditCard className="w-3 h-3 md:w-4 md:h-4" />
              <span className="text-[10px] md:text-xs">Payments</span>
            </TabsTrigger>
            <TabsTrigger value="recurring" className="flex flex-col gap-1 py-2 md:py-3 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-900 min-w-[60px]">
              <RefreshCw className="w-3 h-3 md:w-4 md:h-4" />
              <span className="text-[10px] md:text-xs">Recurring</span>
            </TabsTrigger>
            <TabsTrigger value="credits" className="flex flex-col gap-1 py-2 md:py-3 data-[state=active]:border-b-2 data-[state=active]:border-red-600 data-[state=active]:text-red-900 min-w-[60px]">
              <FileX className="w-3 h-3 md:w-4 md:h-4" />
              <span className="text-[10px] md:text-xs">Credits</span>
            </TabsTrigger>
            <TabsTrigger value="ai-insights" className="flex flex-col gap-1 py-2 md:py-3 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:text-purple-900 min-w-[60px]">
              <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
              <span className="text-[10px] md:text-xs">AI</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-6">

            <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-4">
              <h2 className="text-lg md:text-xl font-bold">Bills of Sale</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <BillOfSaleExport sales={filteredSales} company={company} />
                <div className="flex gap-1 border rounded-lg p-1">
                  <Button
                    variant={salesViewMode === "cards" ? "default" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSalesViewMode("cards")}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={salesViewMode === "list" ? "default" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSalesViewMode("list")}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
                <Button onClick={() => { setEditingSale(null); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="text-xs md:text-sm">New Bill of Sale</span>
                </Button>
              </div>
            </div>

            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <DateRangeFilter value={dateRange} onChange={setDateRange} />
                  <CompareWithFilter value={compareWith} onChange={setCompareWith} />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
        <Card className="border-none shadow-md">
          <CardContent className="p-4 md:p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs md:text-sm text-gray-600">Total Sales Value</p>
                <p className="text-xl md:text-3xl font-bold text-gray-900 mt-1 md:mt-2">${totalSales.toLocaleString()}</p>
              </div>
              <div className="p-2 md:p-3 rounded-xl bg-green-100">
                <DollarSign className="w-4 h-4 md:w-6 md:h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="p-4 md:p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs md:text-sm text-gray-600">Total Sales</p>
                <p className="text-xl md:text-3xl font-bold text-gray-900 mt-1 md:mt-2">{sales.length}</p>
              </div>
              <div className="p-2 md:p-3 rounded-xl bg-blue-100">
                <TrendingUp className="w-4 h-4 md:w-6 md:h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="p-4 md:p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs md:text-sm text-gray-600">Pending Payment</p>
                <p className="text-xl md:text-3xl font-bold text-gray-900 mt-1 md:mt-2">{pendingSales}</p>
              </div>
              <div className="p-2 md:p-3 rounded-xl bg-yellow-100">
                <DollarSign className="w-4 h-4 md:w-6 md:h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {salesViewMode === "list" ? (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sale #</TableHead>
                      <TableHead>BOS #</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{sale.sale_number}</TableCell>
                        <TableCell>
                          {sale.bos_number ? (
                            <div>
                              <p className="font-mono text-xs font-semibold">{sale.bos_number}</p>
                              <Badge className={`text-xs ${sale.bos_status === 'finalized' ? 'bg-green-100 text-green-800' : sale.bos_status === 'voided' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
                                {sale.bos_status}
                              </Badge>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-xs">No BOS</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sale.vehicle_details}</p>
                            {sale.vehicle_vin && <p className="text-xs text-gray-500">{sale.vehicle_vin}</p>}
                          </div>
                        </TableCell>
                        <TableCell>{sale.customer_name}</TableCell>
                        <TableCell>{sale.sale_date ? format(new Date(sale.sale_date), 'MMM d, yyyy') : '-'}</TableCell>
                        <TableCell>
                          <Badge className={sale.sale_type === 'export' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                            {sale.sale_type || 'domestic'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Badge className={statusColors[sale.status]}>{sale.status}</Badge>
                            <Badge className={paymentStatusColors[sale.payment_status]}>{sale.payment_status}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          ${(sale.grand_total || sale.sale_price)?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {sale.bos_status === 'draft' && (
                              <Button size="icon" variant="ghost" onClick={() => handleFinalizeBOS(sale)} className="text-green-600">
                                <FileCheck className="w-4 h-4" />
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" onClick={() => handleViewBillOfSale(sale)}>
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => { setEditingSale(sale); setDialogOpen(true); }} disabled={sale.bos_status === 'finalized'}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-red-600" onClick={() => setDeletingSale(sale)} disabled={sale.bos_status === 'finalized'}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <div className="space-y-4">
        {filteredSales.map((sale, index) => {
          const isExpanded = expandedSaleId === sale.id;
          const totalPaid = sale.total_paid || 0;
          const balanceDue = (sale.grand_total || sale.sale_price || 0) - totalPaid;
          
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
                          {sale.bos_number && (
                            <Badge className="bg-slate-700 text-white font-mono text-xs">
                              {sale.bos_number}
                            </Badge>
                          )}
                          {sale.bos_status === 'voided' && (
                            <Badge className="bg-red-100 text-red-800">
                              VOIDED
                            </Badge>
                          )}
                          {sale.bos_status === 'finalized' && (
                            <Badge className="bg-green-100 text-green-800">
                              BOS Finalized
                            </Badge>
                          )}
                          {sale.bos_status === 'draft' && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              Draft
                            </Badge>
                          )}
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
                          {sale.sale_type === 'export' && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Export
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
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {sale.bos_status === 'draft' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleFinalizeBOS(sale)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <FileCheck className="w-4 h-4 mr-2" />
                              Finalize BOS
                            </Button>
                          )}
                          {sale.bos_status === 'finalized' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVoidBOS(sale)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <FileX className="w-4 h-4 mr-2" />
                              Void BOS
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewBillOfSale(sale)}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setEditingSale(sale); setDialogOpen(true); }}
                            disabled={sale.bos_status === 'finalized'}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setDeletingSale(sale)}
                            disabled={sale.bos_status === 'finalized'}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-2xl font-bold text-green-600">
                          ${(sale.grand_total || sale.sale_price)?.toLocaleString()}
                        </p>
                        {sale.tax_total > 0 && (
                          <p className="text-xs text-gray-500">
                            (incl. ${sale.tax_total?.toFixed(2)} tax)
                          </p>
                        )}
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
            )}
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <CustomersTab customers={customers} selectedCompanyId={selectedCompanyId} />
          </TabsContent>

          <TabsContent value="quotes" className="space-y-6">
            <QuotesTab quotes={quotes} selectedCompanyId={selectedCompanyId} />
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6">
            <InvoicesTab invoices={invoices} selectedCompanyId={selectedCompanyId} company={company} />
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <PaymentsTab payments={payments} selectedCompanyId={selectedCompanyId} />
          </TabsContent>

          <TabsContent value="recurring" className="space-y-6">
            <RecurringInvoicesTab recurringInvoices={recurringInvoices} selectedCompanyId={selectedCompanyId} />
          </TabsContent>

          <TabsContent value="credits" className="space-y-6">
            <CreditNotesTab creditNotes={creditNotes} selectedCompanyId={selectedCompanyId} />
          </TabsContent>

          <TabsContent value="ai-insights" className="space-y-6">
            <AISalesInsights sales={sales} vehicles={vehicles} services={services} />
          </TabsContent>
        </Tabs>

      <SaleDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingSale(null); }}
        onSave={(data) => {
          if (editingSale) {
            updateMutation.mutate({ id: editingSale.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        onCreateCustomer={() => setCustomerDialogOpen(true)}
        editingSale={editingSale}
      />

      <AlertDialog open={!!deletingSale} onOpenChange={() => setDeletingSale(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bill of Sale</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this sale for "{deletingSale?.vehicle_details}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deletingSale.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <QuickCustomerDialog
        open={customerDialogOpen}
        onClose={() => setCustomerDialogOpen(false)}
        onSave={(data) => createCustomerMutation.mutate(data)}
      />

      <Dialog open={billOfSaleOpen} onOpenChange={setBillOfSaleOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bill of Sale</DialogTitle>
          </DialogHeader>
          <BillOfSale sale={selectedSale} company={company} />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setBillOfSaleOpen(false)}>Close</Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setBillOfSaleOpen(false);
                setShareDialogOpen(true);
              }}
              className="border-green-600 text-green-600 hover:bg-green-50"
            >
              <Mail className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700">
              Print
            </Button>
            </div>
            </DialogContent>
            </Dialog>

            <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Share Bill of Sale</DialogTitle>
                </DialogHeader>
                <BillOfSaleShare 
                  sale={selectedSale} 
                  company={company} 
                  onClose={() => setShareDialogOpen(false)} 
                />
              </DialogContent>
            </Dialog>

            {/* Finalize BOS Confirmation */}
            <AlertDialog open={!!finalizingBOS} onOpenChange={() => setFinalizingBOS(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Finalize Bill of Sale</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will assign a permanent BOS number to this sale. Once finalized:
                    <ul className="mt-2 space-y-1 list-disc list-inside text-sm">
                      <li>A unique BOS number will be generated</li>
                      <li>The sale cannot be edited or deleted</li>
                      <li>The BOS number is permanent for audit purposes</li>
                    </ul>
                    <p className="mt-3 font-semibold">
                      Sale: {finalizingBOS?.vehicle_details} - {finalizingBOS?.customer_name}
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => finalizeBOSMutation.mutate(finalizingBOS)}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={finalizeBOSMutation.isPending}
                  >
                    {finalizeBOSMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Finalize BOS
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Void BOS Dialog */}
            <AlertDialog open={!!voidingBOS} onOpenChange={() => setVoidingBOS(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Void Bill of Sale</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will void BOS #{voidingBOS?.bos_number}. The BOS number will be retained for audit purposes but marked as VOIDED.
                    <p className="mt-3 font-semibold text-red-600">
                      This action cannot be undone.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => voidBOSMutation.mutate({ 
                      saleId: voidingBOS?.id, 
                      reason: "Voided by user" 
                    })}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={voidBOSMutation.isPending}
                  >
                    {voidBOSMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Void BOS
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            </div>
            </div>
            );
            }

function SaleDialog({ open, onClose, onSave, onCreateCustomer, editingSale }) {
  const [activeTab, setActiveTab] = useState("basic");
  const [formData, setFormData] = useState({
    sale_number: `SALE-${Date.now()}`,
    sale_type: "domestic",
    customer_id: null,
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    customer_address: "",
    customer_city: "",
    customer_postal_code: "",
    customer_country: "",
    vehicle_id: null,
    vehicle_vin: "",
    vehicle_details: "",
    vehicle_year: null,
    vehicle_make_model: "",
    vehicle_mileage: 0,
    vehicle_color: "",
    sale_price: 0,
    province: "ON",
    tax_status: "taxable",
    tax_gst: 0,
    tax_pst: 0,
    tax_hst: 0,
    tax_total: 0,
    grand_total: 0,
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

  // Load editing sale data
  React.useEffect(() => {
    if (open && editingSale) {
      setFormData({
        sale_number: editingSale.sale_number || `SALE-${Date.now()}`,
        sale_type: editingSale.sale_type || "domestic",
        customer_id: editingSale.customer_id || null,
        customer_name: editingSale.customer_name || "",
        customer_phone: editingSale.customer_phone || "",
        customer_email: editingSale.customer_email || "",
        customer_address: editingSale.customer_address || "",
        customer_city: editingSale.customer_city || "",
        customer_postal_code: editingSale.customer_postal_code || "",
        customer_country: editingSale.customer_country || "",
        vehicle_id: editingSale.vehicle_id || null,
        vehicle_vin: editingSale.vehicle_vin || "",
        vehicle_details: editingSale.vehicle_details || "",
        vehicle_year: editingSale.vehicle_year || null,
        vehicle_make_model: editingSale.vehicle_make_model || "",
        vehicle_mileage: editingSale.vehicle_mileage || 0,
        vehicle_color: editingSale.vehicle_color || "",
        sale_price: editingSale.sale_price || 0,
        province: editingSale.province || "ON",
        tax_status: editingSale.tax_status || "taxable",
        tax_gst: editingSale.tax_gst || 0,
        tax_pst: editingSale.tax_pst || 0,
        tax_hst: editingSale.tax_hst || 0,
        tax_total: editingSale.tax_total || 0,
        grand_total: editingSale.grand_total || 0,
        payments: editingSale.payments || [],
        total_paid: editingSale.total_paid || 0,
        balance_due: editingSale.balance_due || 0,
        payment_status: editingSale.payment_status || "pending",
        sale_date: editingSale.sale_date || new Date().toISOString().split('T')[0],
        delivery_date: editingSale.delivery_date || "",
        status: editingSale.status || "pending",
        financing: editingSale.financing || { enabled: false },
        trade_in: editingSale.trade_in || { has_trade_in: false },
        notes: editingSale.notes || ""
      });
    } else if (open && !editingSale) {
      setFormData({
        sale_number: `SALE-${Date.now()}`,
        sale_type: "domestic",
        customer_id: null,
        customer_name: "",
        customer_phone: "",
        customer_email: "",
        customer_address: "",
        customer_city: "",
        customer_postal_code: "",
        customer_country: "",
        vehicle_id: null,
        vehicle_vin: "",
        vehicle_details: "",
        vehicle_year: null,
        vehicle_make_model: "",
        vehicle_mileage: 0,
        vehicle_color: "",
        sale_price: 0,
        province: "ON",
        tax_status: "taxable",
        tax_gst: 0,
        tax_pst: 0,
        tax_hst: 0,
        tax_total: 0,
        grand_total: 0,
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
    }
  }, [open, editingSale]);

  // Auto-set tax_status to zero_rated when sale_type is export
  const handleSaleTypeChange = (isExport) => {
    const newSaleType = isExport ? "export" : "domestic";
    const newTaxStatus = isExport ? "zero_rated" : "taxable";
    setFormData(prev => ({
      ...prev,
      sale_type: newSaleType,
      tax_status: newTaxStatus
    }));
  };

  React.useEffect(() => {
    const taxDetails = calculateCanadianTax(formData.sale_price, formData.province, formData.tax_status);
    setFormData(prev => ({
      ...prev,
      tax_gst: taxDetails.gst,
      tax_pst: taxDetails.pst,
      tax_hst: taxDetails.hst,
      tax_total: taxDetails.total,
      grand_total: formData.sale_price + taxDetails.total
    }));
  }, [formData.sale_price, formData.province, formData.tax_status]);

  const handleCustomerSelect = (customer) => {
    setFormData({
      ...formData,
      customer_id: customer.id,
      customer_name: customer.full_name,
      customer_phone: customer.phone,
      customer_email: customer.email || "",
      customer_address: customer.address || "",
      customer_city: customer.city || "",
      customer_postal_code: customer.postal_code || "",
      customer_country: customer.country || "",
      province: customer.province || formData.province
    });
  };

  const handleVehicleSelect = (vehicle) => {
    setFormData({
      ...formData,
      vehicle_id: vehicle.id,
      vehicle_vin: vehicle.vin,
      vehicle_details: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      vehicle_year: vehicle.year,
      vehicle_make_model: `${vehicle.make} ${vehicle.model}`,
      vehicle_mileage: vehicle.mileage || 0,
      vehicle_color: vehicle.color || "",
      sale_price: vehicle.selling_price || 0
    });
  };

  const handlePaymentsChange = (payments) => {
    const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const balanceDue = formData.grand_total - totalPaid;
    let paymentStatus = "pending";
    
    if (totalPaid >= formData.grand_total) {
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
          <DialogTitle>{editingSale ? 'Edit Bill of Sale' : 'New Bill of Sale'}</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="financing">Financing</TabsTrigger>
            <TabsTrigger value="tradein">Trade-In</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            {!editingSale && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">BOS Number Assignment</h4>
                    <p className="text-sm text-blue-800">
                      This sale will be created as a <strong>Draft</strong>. A unique BOS number (format: <span className="font-mono">BOS-YYYY-LOC-NNNNNN</span>) will be automatically assigned when you finalize the Bill of Sale.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {editingSale?.bos_number && (
              <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">BOS NUMBER</p>
                    <p className="text-lg font-bold text-slate-900 font-mono tracking-wider">{editingSale.bos_number}</p>
                    {editingSale.bos_issued_date && (
                      <p className="text-xs text-slate-500 mt-1">
                        Issued: {format(new Date(editingSale.bos_issued_date), 'MMM d, yyyy')} by {editingSale.bos_issued_by}
                      </p>
                    )}
                  </div>
                  <Badge className={`${editingSale.bos_status === 'finalized' ? 'bg-green-100 text-green-800' : editingSale.bos_status === 'voided' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {editingSale.bos_status?.toUpperCase()}
                  </Badge>
                </div>
              </div>
            )}

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

            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg mb-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_export_sale"
                  checked={formData.sale_type === "export"}
                  onChange={(e) => handleSaleTypeChange(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-blue-600"
                />
                <Label htmlFor="is_export_sale" className="cursor-pointer font-medium">
                  Export Sale
                </Label>
              </div>
              {formData.sale_type === "export" && (
                <Badge className="bg-blue-100 text-blue-800">
                  Zero-Rated (No Tax)
                </Badge>
              )}
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
                <Input type="number" value={formData.sale_price} onChange={(e) => setFormData({...formData, sale_price: parseFloat(e.target.value) || 0})} />
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

            <CanadianTaxCalculator
              value={formData.province}
              onChange={(province) => setFormData({...formData, province})}
              subtotal={formData.sale_price}
              taxStatus={formData.tax_status}
              onTaxStatusChange={(tax_status) => setFormData({...formData, tax_status})}
            />

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} />
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <PaymentTracker
              payments={formData.payments}
              onChange={handlePaymentsChange}
              salePrice={formData.grand_total}
            />
          </TabsContent>

          <TabsContent value="financing" className="space-y-4">
            <FinancingForm
              financing={formData.financing}
              onChange={(financing) => setFormData({...formData, financing})}
              salePrice={formData.grand_total}
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
            {editingSale ? 'Update Sale' : 'Record Sale'}
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