import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, LayoutGrid, List, ArrowUpDown, Search, Eye, Edit } from "lucide-react";
import DocumentViewer from "../shared/DocumentViewer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import CustomerSelector from "../shared/CustomerSelector";

export default function QuotesTab({ quotes, selectedCompanyId, company }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [sortBy, setSortBy] = useState("created_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const queryClient = useQueryClient();

  const handleViewQuote = (quote) => {
    setSelectedQuote(quote);
    setViewerOpen(true);
  };

  const filteredQuotes = quotes.filter(q =>
    q.quote_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    if (typeof aVal === "string") aVal = aVal?.toLowerCase() || "";
    if (typeof bVal === "string") bVal = bVal?.toLowerCase() || "";
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const createMutation = useMutation({
    mutationFn: (data) => supabase.entities.Quote.create({ ...data, company_id: selectedCompanyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      setDialogOpen(false);
      setEditingQuote(null);
      toast.success("Quote saved!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supabase.entities.Quote.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success("Quote deleted!");
    },
  });

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    sent: "bg-blue-100 text-blue-800",
    accepted: "bg-green-100 text-green-800",
    declined: "bg-red-100 text-red-800",
    expired: "bg-orange-100 text-orange-800"
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Quotes</h2>
        <Button onClick={() => { setEditingQuote(null); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Quote
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input placeholder="Search quotes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(v) => { const [field, order] = v.split("-"); setSortBy(field); setSortOrder(order); }}>
              <SelectTrigger><ArrowUpDown className="w-4 h-4 mr-2" /><SelectValue placeholder="Sort By" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created_date-desc">Newest First</SelectItem>
                <SelectItem value="created_date-asc">Oldest First</SelectItem>
                <SelectItem value="quote_number-asc">Quote # (A-Z)</SelectItem>
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
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("quote_number"); setSortOrder(sortBy === "quote_number" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Quote # {sortBy === "quote_number" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("customer_name"); setSortOrder(sortBy === "customer_name" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Customer {sortBy === "customer_name" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => { setSortBy("total_amount"); setSortOrder(sortBy === "total_amount" && sortOrder === "asc" ? "desc" : "asc"); }}>
                  <div className="flex items-center gap-1">Amount {sortBy === "total_amount" && <ArrowUpDown className="w-3 h-3" />}</div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium">{quote.quote_number}</TableCell>
                  <TableCell>{quote.customer_name}</TableCell>
                  <TableCell>{quote.quote_date}</TableCell>
                  <TableCell>{quote.expiry_date || "-"}</TableCell>
                  <TableCell><Badge className={statusColors[quote.status]}>{quote.status}</Badge></TableCell>
                  <TableCell className="font-semibold text-blue-600">${quote.total_amount?.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleViewQuote(quote)}><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteMutation.mutate(quote.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredQuotes.map((quote) => (
            <Card key={quote.id} className="hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">{quote.quote_number}</h3>
                      <Badge className={statusColors[quote.status]}>{quote.status}</Badge>
                    </div>
                    <p className="text-gray-600"><strong>Customer:</strong> {quote.customer_name}</p>
                    <p className="text-sm text-gray-500">Quote Date: {quote.quote_date}</p>
                    {quote.expiry_date && <p className="text-sm text-gray-500">Expires: {quote.expiry_date}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">${quote.total_amount?.toLocaleString()}</p>
                    <div className="flex gap-2 mt-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewQuote(quote)}>
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600" onClick={() => deleteMutation.mutate(quote.id)}>
                        <Trash2 className="w-4 h-4 mr-1" />
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

      <QuoteDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingQuote(null); }}
        onSave={(data) => createMutation.mutate(data)}
      />

      <DocumentViewer
        open={viewerOpen}
        onClose={() => { setViewerOpen(false); setSelectedQuote(null); }}
        documentType="quote"
        documentData={selectedQuote}
        company={company}
      />
    </>
  );
}

function QuoteDialog({ open, onClose, onSave }) {
  const [formData, setFormData] = useState({
    quote_number: `QT-${Date.now()}`,
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    line_items: [{ description: "", quantity: 1, unit_price: 0, total: 0 }],
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    quote_date: new Date().toISOString().split('T')[0],
    expiry_date: "",
    status: "draft",
    notes: "",
    terms: ""
  });

  React.useEffect(() => {
    const subtotal = formData.line_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const tax = subtotal * 0.13;
    setFormData(prev => ({ ...prev, subtotal, tax_amount: tax, total_amount: subtotal + tax }));
  }, [formData.line_items]);

  const addLineItem = () => {
    setFormData({
      ...formData,
      line_items: [...formData.line_items, { description: "", quantity: 1, unit_price: 0, total: 0 }]
    });
  };

  const updateLineItem = (index, field, value) => {
    const newItems = [...formData.line_items];
    newItems[index][field] = value;
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    }
    setFormData({ ...formData, line_items: newItems });
  };

  const removeLineItem = (index) => {
    setFormData({ ...formData, line_items: formData.line_items.filter((_, i) => i !== index) });
  };

  const handleCustomerSelect = (customer) => {
    setFormData({
      ...formData,
      customer_name: customer.full_name,
      customer_email: customer.email || "",
      customer_phone: customer.phone || ""
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Quote</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quote Number</Label>
              <Input value={formData.quote_number} onChange={(e) => setFormData({...formData, quote_number: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Customer</Label>
            <CustomerSelector value={null} onSelect={handleCustomerSelect} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quote Date</Label>
              <Input type="date" value={formData.quote_date} onChange={(e) => setFormData({...formData, quote_date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input type="date" value={formData.expiry_date} onChange={(e) => setFormData({...formData, expiry_date: e.target.value})} />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Line Items</Label>
              <Button onClick={addLineItem} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
            <div className="space-y-2">
              {formData.line_items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2">
                  <Input
                    placeholder="Description"
                    className="col-span-5"
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    className="col-span-2"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                  />
                  <Input
                    type="number"
                    placeholder="Price"
                    className="col-span-2"
                    value={item.unit_price}
                    onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                  />
                  <Input
                    value={`$${item.total.toFixed(2)}`}
                    disabled
                    className="col-span-2 bg-gray-50"
                  />
                  <Button variant="ghost" size="icon" className="col-span-1" onClick={() => removeLineItem(index)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between"><span>Subtotal:</span><span className="font-bold">${formData.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Tax (13%):</span><span className="font-bold">${formData.tax_amount.toFixed(2)}</span></div>
            <div className="flex justify-between text-lg border-t pt-2"><span>Total:</span><span className="font-bold text-blue-600">${formData.total_amount.toFixed(2)}</span></div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formData)} className="bg-blue-600 hover:bg-blue-700">Create Quote</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}