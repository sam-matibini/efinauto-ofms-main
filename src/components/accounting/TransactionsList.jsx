import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpCircle, ArrowDownCircle, Download, Printer, FileText, Plus, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import JournalEntryDialog from "./JournalEntryDialog";
import ImportTransactionsDialog from "./ImportTransactionsDialog";
import TemplateDialog from "./TemplateDialog";

export default function TransactionsList({ transactions, dateRange, comparativePeriods = [] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [journalDialogOpen, setJournalDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [createFromTemplateOpen, setCreateFromTemplateOpen] = useState(false);

  // Use first comparative period if available, otherwise use dateRange
  const currentPeriod = comparativePeriods.length > 0 ? comparativePeriods[0] : dateRange;

  const filteredTransactions = transactions.filter(t => {
    // Filter by date range if provided
    if (currentPeriod) {
      const transDate = new Date(t.transaction_date);
      if (transDate < currentPeriod.from || transDate > currentPeriod.to) {
        return false;
      }
    }
    
    const matchesSearch = !searchTerm || 
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.transaction_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || t.transaction_type === filterType;
    const matchesCategory = filterCategory === "all" || t.category === filterCategory;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  const getTransactionIcon = (category) => {
    return category === 'revenue' ? (
      <ArrowUpCircle className="w-5 h-5 text-green-600" />
    ) : (
      <ArrowDownCircle className="w-5 h-5 text-red-600" />
    );
  };

  const getCategoryBadge = (category) => {
    const colors = {
      revenue: 'bg-green-100 text-green-700',
      expense: 'bg-red-100 text-red-700',
      asset: 'bg-blue-100 text-blue-700',
      liability: 'bg-orange-100 text-orange-700',
      equity: 'bg-purple-100 text-purple-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Transaction #', 'Description', 'Customer', 'Category', 'Type', 'Amount', 'Tax', 'Status'];
    const rows = filteredTransactions.map(t => [
      format(new Date(t.transaction_date), 'yyyy-MM-dd'),
      t.transaction_number || '',
      t.description || '',
      t.customer_name || '',
      t.category || '',
      t.transaction_type || '',
      t.amount || 0,
      t.tax_amount || 0,
      t.status || ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const exportToPDF = () => {
    const printContent = document.getElementById('transactions-print-content');
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  const handlePrint = () => {
    const printContent = document.getElementById('transactions-print-content');
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>All Transactions</CardTitle>
            {currentPeriod && (
              <p className="text-sm text-gray-500 mt-1">
                {format(currentPeriod.from, 'MMM d, yyyy')} - {format(currentPeriod.to, 'MMM d, yyyy')}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setJournalDialogOpen(true)}>
                  New Journal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCreateFromTemplateOpen(true)}>
                  Create from Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTemplateDialogOpen(true)}>
                  New Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                  Manual Import (CSV/Excel)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button onClick={exportToPDF} variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="asset">Asset</SelectItem>
                <SelectItem value="liability">Liability</SelectItem>
                <SelectItem value="equity">Equity</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sale_revenue">Vehicle Sales</SelectItem>
                <SelectItem value="service_revenue">Service Revenue</SelectItem>
                <SelectItem value="parts_revenue">Parts Revenue</SelectItem>
                <SelectItem value="vehicle_purchase">Vehicle Purchase</SelectItem>
                <SelectItem value="parts_purchase">Parts Purchase</SelectItem>
                <SelectItem value="labor_expense">Labor Expense</SelectItem>
                <SelectItem value="overhead_expense">Overhead</SelectItem>
                <SelectItem value="payroll_expense">Payroll Expense</SelectItem>
                <SelectItem value="payroll_liability">Payroll Liability</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transactions List */}
          <div className="space-y-2">
            {filteredTransactions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No transactions found</p>
            ) : (
              filteredTransactions.map(transaction => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {getTransactionIcon(transaction.category)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{transaction.description || 'Untitled Transaction'}</span>
                        <Badge className={getCategoryBadge(transaction.category)}>
                          {transaction.category}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                        <span>{transaction.transaction_number || transaction.id.slice(0, 8)}</span>
                        {transaction.customer_name && <span>• {transaction.customer_name}</span>}
                        <span>• {format(new Date(transaction.transaction_date), 'MMM d, yyyy')}</span>
                        {transaction.reference_number && <span>• Ref: {transaction.reference_number}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${transaction.category === 'revenue' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.category === 'revenue' ? '+' : '-'}${transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    {transaction.tax_amount > 0 && (
                      <p className="text-xs text-gray-500">Tax: ${transaction.tax_amount.toFixed(2)}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Hidden print content */}
          <div id="transactions-print-content" className="hidden print:block">
            <style>{`
              @media print {
                body * { visibility: hidden; }
                #transactions-print-content, #transactions-print-content * { visibility: visible; }
                #transactions-print-content { position: absolute; left: 0; top: 0; width: 100%; }
              }
            `}</style>
            <div className="p-8">
              <h1 className="text-2xl font-bold mb-4">Transactions Report</h1>
              <p className="text-sm text-gray-600 mb-6">Generated on {format(new Date(), 'MMMM d, yyyy')}</p>
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left">Date</th>
                    <th className="border border-gray-300 p-2 text-left">Transaction #</th>
                    <th className="border border-gray-300 p-2 text-left">Description</th>
                    <th className="border border-gray-300 p-2 text-left">Customer</th>
                    <th className="border border-gray-300 p-2 text-left">Category</th>
                    <th className="border border-gray-300 p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map(t => (
                    <tr key={t.id}>
                      <td className="border border-gray-300 p-2">{format(new Date(t.transaction_date), 'MMM d, yyyy')}</td>
                      <td className="border border-gray-300 p-2">{t.transaction_number || t.id.slice(0, 8)}</td>
                      <td className="border border-gray-300 p-2">{t.description}</td>
                      <td className="border border-gray-300 p-2">{t.customer_name || '-'}</td>
                      <td className="border border-gray-300 p-2">{t.category}</td>
                      <td className="border border-gray-300 p-2 text-right">${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CardContent>

      <JournalEntryDialog 
        open={journalDialogOpen} 
        onClose={() => setJournalDialogOpen(false)} 
      />

      <ImportTransactionsDialog 
        open={importDialogOpen} 
        onClose={() => setImportDialogOpen(false)} 
      />

      <TemplateDialog 
        open={templateDialogOpen} 
        onClose={() => setTemplateDialogOpen(false)} 
      />
    </Card>
  );
}