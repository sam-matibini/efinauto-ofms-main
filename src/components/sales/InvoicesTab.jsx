import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, LayoutGrid, List, ArrowUpDown, Search, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DateRangeFilter, { getDateRangeValues } from "../shared/DateRangeFilter";
import CompareWithFilter from "../shared/CompareWithFilter";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import InvoiceDialog from "./InvoiceDialog";

export default function InvoicesTab({ invoices, selectedCompanyId }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [sortBy, setSortBy] = useState("created_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [dateRange, setDateRange] = useState("all");
  const [compareWith, setCompareWith] = useState(null);
  const queryClient = useQueryClient();

  const filteredInvoices = invoices.filter(i => {
    const matchesSearch = i.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesDateRange = true;
    if (dateRange !== "all") {
      const { start, end } = getDateRangeValues(dateRange);
      if (start && end) {
        const invoiceDate = i.invoice_date ? new Date(i.invoice_date) : new Date(i.created_date);
        matchesDateRange = invoiceDate >= start && invoiceDate <= new Date(end.getTime() + 86400000);
      }
    }
    
    return matchesSearch && matchesDateRange;
  }).sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    if (typeof aVal === "string") aVal = aVal?.toLowerCase() || "";
    if (typeof bVal === "string") bVal = bVal?.toLowerCase() || "";
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', selectedCompanyId],
    queryFn: () => base44.entities.Customer.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services', selectedCompanyId],
    queryFn: () => base44.entities.Service.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SalesInvoice.create({ ...data, company_id: selectedCompanyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setDialogOpen(false);
      setEditingInvoice(null);
      toast.success("Invoice created!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SalesInvoice.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setDialogOpen(false);
      setEditingInvoice(null);
      toast.success("Invoice updated!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SalesInvoice.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success("Invoice deleted!");
    },
  });

  const handleSaveInvoice = (data) => {
    if (editingInvoice) {
      updateMutation.mutate({ id: editingInvoice.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setDialogOpen(true);
  };

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    sent: "bg-blue-100 text-blue-800",
    paid: "bg-green-100 text-green-800",
    partial: "bg-yellow-100 text-yellow-800",
    overdue: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800"
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Sales Invoices</h2>
        <Button onClick={() => { setEditingInvoice(null); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input placeholder="Search invoices..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(v) => { const [field, order] = v.split("-"); setSortBy(field); setSortOrder(order); }}>
              <SelectTrigger><ArrowUpDown className="w-4 h-4 mr-2" /><SelectValue placeholder="Sort By" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created_date-desc">Newest First</SelectItem>
                <SelectItem value="created_date-asc">Oldest First</SelectItem>
                <SelectItem value="invoice_number-asc">Invoice # (A-Z)</SelectItem>
                <SelectItem value="customer_name-asc">Customer (A-Z)</SelectItem>
                <SelectItem value="total_amount-desc">Amount (High-Low)</SelectItem>
                <SelectItem value="total_amount-asc">Amount (Low-High)</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1 justify-end">
              <Button variant={viewMode === "grid" ? "default" : "outline"} size="icon" onClick={() => setViewMode("grid")}><LayoutGrid className="w-4 h-4" /></Button>
              <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")}><List className="w-4 h-4" /></Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
            <CompareWithFilter value={compareWith} onChange={setCompareWith} />
          </div>
        </CardContent>
      </Card>

      {viewMode === "list" ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("invoice_number"); setSortOrder(sortBy === "invoice_number" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Invoice # {sortBy === "invoice_number" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("customer_name"); setSortOrder(sortBy === "customer_name" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Customer {sortBy === "customer_name" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("total_amount"); setSortOrder(sortBy === "total_amount" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Amount {sortBy === "total_amount" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead>Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                  <TableCell>{invoice.customer_name}</TableCell>
                  <TableCell>{invoice.invoice_date}</TableCell>
                  <TableCell><Badge className={statusColors[invoice.status]}>{invoice.status}</Badge></TableCell>
                  <TableCell className="font-semibold text-blue-600">${invoice.total_amount?.toLocaleString()}</TableCell>
                  <TableCell className={invoice.balance_due > 0 ? "text-orange-600 font-semibold" : ""}>${invoice.balance_due?.toLocaleString() || 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEditInvoice(invoice)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteMutation.mutate(invoice.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">{invoice.invoice_number}</h3>
                      <Badge className={statusColors[invoice.status]}>{invoice.status}</Badge>
                    </div>
                    <p className="text-gray-600"><strong>Customer:</strong> {invoice.customer_name}</p>
                    <p className="text-sm text-gray-500">Invoice Date: {invoice.invoice_date}</p>
                    {invoice.due_date && <p className="text-sm text-gray-500">Due Date: {invoice.due_date}</p>}
                    {invoice.balance_due > 0 && (
                      <p className="text-sm text-orange-600 font-semibold mt-2">Balance Due: ${invoice.balance_due.toLocaleString()}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">${invoice.total_amount?.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Paid: ${invoice.amount_paid?.toLocaleString()}</p>
                    <Button variant="outline" size="sm" className="mt-2 text-red-600" onClick={() => deleteMutation.mutate(invoice.id)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}