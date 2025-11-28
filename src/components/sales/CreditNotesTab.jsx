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

export default function CreditNotesTab({ creditNotes, selectedCompanyId }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [sortBy, setSortBy] = useState("created_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const queryClient = useQueryClient();

  const filteredCreditNotes = creditNotes.filter(c =>
    c.credit_note_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
    mutationFn: (id) => base44.entities.CreditNote.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditNotes'] });
      toast.success("Credit note deleted!");
    },
  });

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    issued: "bg-blue-100 text-blue-800",
    applied: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800"
  };

  const reasonColors = {
    return: "bg-orange-100 text-orange-800",
    discount: "bg-purple-100 text-purple-800",
    error: "bg-red-100 text-red-800",
    goodwill: "bg-blue-100 text-blue-800",
    other: "bg-gray-100 text-gray-800"
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Credit Notes</h2>
        <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Credit Note
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input placeholder="Search credit notes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(v) => { const [field, order] = v.split("-"); setSortBy(field); setSortOrder(order); }}>
              <SelectTrigger><ArrowUpDown className="w-4 h-4 mr-2" /><SelectValue placeholder="Sort By" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created_date-desc">Newest First</SelectItem>
                <SelectItem value="created_date-asc">Oldest First</SelectItem>
                <SelectItem value="credit_note_number-asc">Credit Note # (A-Z)</SelectItem>
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
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("credit_note_number"); setSortOrder(sortBy === "credit_note_number" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Credit Note # {sortBy === "credit_note_number" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("customer_name"); setSortOrder(sortBy === "customer_name" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Customer {sortBy === "customer_name" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("total_amount"); setSortOrder(sortBy === "total_amount" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Amount {sortBy === "total_amount" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCreditNotes.map((credit) => (
                <TableRow key={credit.id}>
                  <TableCell className="font-medium">{credit.credit_note_number}</TableCell>
                  <TableCell>{credit.customer_name}</TableCell>
                  <TableCell>{credit.credit_date}</TableCell>
                  <TableCell><Badge className={statusColors[credit.status]}>{credit.status}</Badge></TableCell>
                  <TableCell><Badge className={reasonColors[credit.reason]}>{credit.reason}</Badge></TableCell>
                  <TableCell className="font-semibold text-red-600">-${credit.total_amount?.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteMutation.mutate(credit.id)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCreditNotes.map((credit) => (
            <Card key={credit.id} className="hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">{credit.credit_note_number}</h3>
                      <Badge className={statusColors[credit.status]}>{credit.status}</Badge>
                      <Badge className={reasonColors[credit.reason]}>{credit.reason}</Badge>
                    </div>
                    <p className="text-gray-600"><strong>Customer:</strong> {credit.customer_name}</p>
                    <p className="text-sm text-gray-500">Credit Date: {credit.credit_date}</p>
                    {credit.related_invoice_number && (
                      <p className="text-sm text-blue-600">Related Invoice: {credit.related_invoice_number}</p>
                    )}
                    {credit.notes && (
                      <p className="text-sm text-gray-500 mt-2">{credit.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-600">-${credit.total_amount?.toLocaleString()}</p>
                    <Button variant="outline" size="sm" className="mt-2 text-red-600" onClick={() => deleteMutation.mutate(credit.id)}>
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