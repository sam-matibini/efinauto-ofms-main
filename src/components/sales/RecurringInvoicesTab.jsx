import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, LayoutGrid, List, ArrowUpDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function RecurringInvoicesTab({ recurringInvoices, selectedCompanyId }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [sortBy, setSortBy] = useState("created_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const queryClient = useQueryClient();

  const filteredRecurring = recurringInvoices.filter(r =>
    r.template_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
    mutationFn: (id) => base44.entities.RecurringInvoice.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringInvoices'] });
      toast.success("Recurring invoice deleted!");
    },
  });

  const statusColors = {
    active: "bg-green-100 text-green-800",
    paused: "bg-yellow-100 text-yellow-800",
    completed: "bg-blue-100 text-blue-800",
    cancelled: "bg-gray-100 text-gray-800"
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Recurring Invoices</h2>
        <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Recurring Invoice
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input placeholder="Search recurring invoices..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(v) => { const [field, order] = v.split("-"); setSortBy(field); setSortOrder(order); }}>
              <SelectTrigger><ArrowUpDown className="w-4 h-4 mr-2" /><SelectValue placeholder="Sort By" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created_date-desc">Newest First</SelectItem>
                <SelectItem value="created_date-asc">Oldest First</SelectItem>
                <SelectItem value="template_name-asc">Template (A-Z)</SelectItem>
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
        </CardContent>
      </Card>

      {viewMode === "list" ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("template_name"); setSortOrder(sortBy === "template_name" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Template {sortBy === "template_name" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("customer_name"); setSortOrder(sortBy === "customer_name" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Customer {sortBy === "customer_name" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Next Invoice</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("total_amount"); setSortOrder(sortBy === "total_amount" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Amount {sortBy === "total_amount" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecurring.map((recurring) => (
                <TableRow key={recurring.id}>
                  <TableCell className="font-medium">{recurring.template_name}</TableCell>
                  <TableCell>{recurring.customer_name}</TableCell>
                  <TableCell><Badge variant="outline">{recurring.frequency}</Badge></TableCell>
                  <TableCell>{recurring.next_invoice_date || "-"}</TableCell>
                  <TableCell><Badge className={statusColors[recurring.status]}>{recurring.status}</Badge></TableCell>
                  <TableCell className="font-semibold text-blue-600">${recurring.total_amount?.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteMutation.mutate(recurring.id)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRecurring.map((recurring) => (
            <Card key={recurring.id} className="hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">{recurring.template_name}</h3>
                      <Badge className={statusColors[recurring.status]}>{recurring.status}</Badge>
                      <Badge variant="outline">{recurring.frequency}</Badge>
                    </div>
                    <p className="text-gray-600"><strong>Customer:</strong> {recurring.customer_name}</p>
                    <p className="text-sm text-gray-500">Start Date: {recurring.start_date}</p>
                    {recurring.next_invoice_date && (
                      <p className="text-sm text-blue-600">Next Invoice: {recurring.next_invoice_date}</p>
                    )}
                    {recurring.end_date && (
                      <p className="text-sm text-gray-500">End Date: {recurring.end_date}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">${recurring.total_amount?.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">per {recurring.frequency}</p>
                    <Button variant="outline" size="sm" className="mt-2 text-red-600" onClick={() => deleteMutation.mutate(recurring.id)}>
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