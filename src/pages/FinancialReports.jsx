import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  FileText, Download, Printer, Calendar as CalendarIcon, 
  Filter, BarChart3, DollarSign, Wallet, Building2,
  ChevronDown, RefreshCw, Settings2
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from "date-fns";
import { motion } from "framer-motion";
import jsPDF from "jspdf";

import ProfitLossStatement from "@/components/accounting/ProfitLossStatement";
import BalanceSheet from "@/components/accounting/BalanceSheet";
import CashFlowStatement from "@/components/accounting/CashFlowStatement";
import AutomatedReportingEngine from "@/components/accounting/AutomatedReportingEngine";

const DATE_PRESETS = [
  { label: "This Month", getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: "Last Month", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "This Quarter", getValue: () => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    return { from: new Date(now.getFullYear(), quarter * 3, 1), to: now };
  }},
  { label: "Last Quarter", getValue: () => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) - 1;
    const year = quarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
    const q = quarter < 0 ? 3 : quarter;
    return { from: new Date(year, q * 3, 1), to: new Date(year, q * 3 + 3, 0) };
  }},
  { label: "This Year", getValue: () => ({ from: startOfYear(new Date()), to: new Date() }) },
  { label: "Last Year", getValue: () => ({ from: startOfYear(subYears(new Date(), 1)), to: endOfYear(subYears(new Date(), 1)) }) },
  { label: "Last 12 Months", getValue: () => ({ from: subMonths(new Date(), 12), to: new Date() }) },
  { label: "Custom", getValue: () => null },
];

const ACCOUNT_TYPES = [
  { id: "all", label: "All Accounts" },
  { id: "asset", label: "Assets" },
  { id: "liability", label: "Liabilities" },
  { id: "equity", label: "Equity" },
  { id: "revenue", label: "Revenue" },
  { id: "expense", label: "Expenses" },
];

export default function FinancialReports() {
  const { selectedCompanyId } = useCompany();
  const reportRef = useRef(null);
  
  // Filter States
  const [activeReport, setActiveReport] = useState("income");
  const [datePreset, setDatePreset] = useState("This Year");
  const [dateRange, setDateRange] = useState({ 
    from: startOfYear(new Date()), 
    to: new Date() 
  });
  const [comparePeriod, setComparePeriod] = useState(false);
  const [comparisonType, setComparisonType] = useState("previous_period");
  const [accountTypeFilter, setAccountTypeFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(true);
  const [reportBasis, setReportBasis] = useState("accrual");

  // Fetch company data
  const { data: company } = useQuery({
    queryKey: ['company', selectedCompanyId],
    queryFn: () => base44.entities.Company.filter({ id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    select: (data) => data[0],
  });

  // Build comparative periods
  const buildPeriods = () => {
    const periods = [{ 
      from: dateRange.from, 
      to: dateRange.to, 
      label: `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}` 
    }];

    if (comparePeriod) {
      const duration = dateRange.to - dateRange.from;
      let compareFrom, compareTo;

      if (comparisonType === "previous_period") {
        compareTo = new Date(dateRange.from.getTime() - 1);
        compareFrom = new Date(compareTo.getTime() - duration);
      } else if (comparisonType === "previous_year") {
        compareFrom = subYears(dateRange.from, 1);
        compareTo = subYears(dateRange.to, 1);
      }

      periods.push({
        from: compareFrom,
        to: compareTo,
        label: `${format(compareFrom, 'MMM d, yyyy')} - ${format(compareTo, 'MMM d, yyyy')}`
      });
    }

    return periods;
  };

  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    const presetConfig = DATE_PRESETS.find(p => p.label === preset);
    if (presetConfig && preset !== "Custom") {
      const range = presetConfig.getValue();
      if (range) setDateRange(range);
    }
  };

  // Export to CSV
  const exportToCSV = (reportName, data) => {
    const csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportName}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export to PDF
  const exportToPDF = (reportName) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(reportName, pageWidth / 2, 20, { align: "center" });
    
    // Company name
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(company?.name || "Company", pageWidth / 2, 30, { align: "center" });
    
    // Date range
    doc.setFontSize(10);
    doc.text(`Period: ${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`, pageWidth / 2, 38, { align: "center" });
    doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, pageWidth / 2, 44, { align: "center" });
    
    // Line separator
    doc.setLineWidth(0.5);
    doc.line(20, 50, pageWidth - 20, 50);
    
    // Note about full report
    doc.setFontSize(10);
    doc.text("Full report data available in the application.", 20, 60);
    doc.text("Use Print function for detailed output.", 20, 68);
    
    doc.save(`${reportName.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  // Print report
  const handlePrint = () => {
    window.print();
  };

  if (!selectedCompanyId) {
    return (
      <div className="p-6">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6 text-center">
            <p className="text-yellow-800">Please select a company to generate financial reports.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const periods = buildPeriods();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4 print:hidden" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Financial Reports
            </h1>
            <p className="text-sm text-gray-300 mt-1">
              {company?.name || 'Company'} • Customizable financial statements
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="print:hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings2 className="w-5 h-5" />
                  Report Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Date Preset */}
                  <div className="space-y-2">
                    <Label>Date Range</Label>
                    <Select value={datePreset} onValueChange={handleDatePresetChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DATE_PRESETS.map(preset => (
                          <SelectItem key={preset.label} value={preset.label}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Date Range */}
                  {datePreset === "Custom" && (
                    <>
                      <div className="space-y-2">
                        <Label>From</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                              <CalendarIcon className="w-4 h-4 mr-2" />
                              {format(dateRange.from, 'MMM d, yyyy')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={dateRange.from}
                              onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label>To</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                              <CalendarIcon className="w-4 h-4 mr-2" />
                              {format(dateRange.to, 'MMM d, yyyy')}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={dateRange.to}
                              onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </>
                  )}

                  {/* Account Type Filter */}
                  <div className="space-y-2">
                    <Label>Account Type</Label>
                    <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCOUNT_TYPES.map(type => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Report Basis */}
                  <div className="space-y-2">
                    <Label>Accounting Basis</Label>
                    <Select value={reportBasis} onValueChange={setReportBasis}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="accrual">Accrual</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Comparison Options */}
                <div className="mt-4 pt-4 border-t flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="compare" 
                      checked={comparePeriod} 
                      onCheckedChange={setComparePeriod} 
                    />
                    <Label htmlFor="compare" className="cursor-pointer">Compare with</Label>
                  </div>
                  {comparePeriod && (
                    <Select value={comparisonType} onValueChange={setComparisonType}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="previous_period">Previous Period</SelectItem>
                        <SelectItem value="previous_year">Previous Year</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Active Filters Summary */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                  </Badge>
                  {accountTypeFilter !== "all" && (
                    <Badge variant="secondary">
                      {ACCOUNT_TYPES.find(t => t.id === accountTypeFilter)?.label}
                    </Badge>
                  )}
                  <Badge variant="secondary">{reportBasis === "accrual" ? "Accrual Basis" : "Cash Basis"}</Badge>
                  {comparePeriod && (
                    <Badge variant="secondary">
                      vs {comparisonType === "previous_period" ? "Previous Period" : "Previous Year"}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Report Tabs */}
        <Tabs value={activeReport} onValueChange={setActiveReport}>
          <div className="flex justify-between items-center mb-4 print:hidden">
            <TabsList className="grid grid-cols-4 w-auto">
              <TabsTrigger value="income" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Income Statement
              </TabsTrigger>
              <TabsTrigger value="balance" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Balance Sheet
              </TabsTrigger>
              <TabsTrigger value="cashflow" className="flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Cash Flow
              </TabsTrigger>
              <TabsTrigger value="automated" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Auto Reports
              </TabsTrigger>
            </TabsList>

            {/* Export Buttons */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToCSV(
                  activeReport === "income" ? "Income-Statement" : 
                  activeReport === "balance" ? "Balance-Sheet" : "Cash-Flow",
                  [["Report exported from Financial Reports module"]]
                )}
              >
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToPDF(
                  activeReport === "income" ? "Income Statement" : 
                  activeReport === "balance" ? "Balance Sheet" : "Cash Flow Statement"
                )}
              >
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>

          {/* Report Content */}
          <div ref={reportRef}>
            {/* Print Header */}
            <div className="hidden print:block mb-6">
              <h1 className="text-2xl font-bold text-center">
                {activeReport === "income" ? "Income Statement" : 
                 activeReport === "balance" ? "Balance Sheet" : "Cash Flow Statement"}
              </h1>
              <p className="text-center text-gray-600">{company?.name}</p>
              <p className="text-center text-sm text-gray-500">
                {format(dateRange.from, 'MMMM d, yyyy')} - {format(dateRange.to, 'MMMM d, yyyy')}
              </p>
              <p className="text-center text-xs text-gray-400 mt-2">
                Generated on {format(new Date(), 'MMMM d, yyyy h:mm a')}
              </p>
            </div>

            <TabsContent value="income">
              <ProfitLossStatement 
                comparativePeriods={periods}
                accountTypeFilter={accountTypeFilter}
                reportBasis={reportBasis}
              />
            </TabsContent>

            <TabsContent value="balance">
              <BalanceSheet 
                comparativePeriods={periods}
                accountTypeFilter={accountTypeFilter}
              />
            </TabsContent>

            <TabsContent value="cashflow">
              <CashFlowStatement 
                comparativePeriods={periods}
              />
            </TabsContent>
          </div>
        </Tabs>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
          <Card 
            className={`cursor-pointer transition-all ${activeReport === 'income' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setActiveReport('income')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Income Statement</p>
                  <p className="font-semibold">Profit & Loss</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Revenue, expenses, and net income</p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${activeReport === 'balance' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setActiveReport('balance')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Balance Sheet</p>
                  <p className="font-semibold">Assets & Liabilities</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Financial position at a point in time</p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${activeReport === 'cashflow' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setActiveReport('cashflow')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Wallet className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cash Flow</p>
                  <p className="font-semibold">Cash Movements</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Operating, investing, financing activities</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            margin: 1cm;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
}