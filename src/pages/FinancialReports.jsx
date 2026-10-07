import { useEffect, useState, useRef } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  FileText, Download, Printer, Calendar as CalendarIcon, 
  Filter, BarChart3, DollarSign, Wallet, Building2,
  Settings2, PenTool
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

import ProfitLossStatement from "@/components/accounting/ProfitLossStatement";
import BalanceSheet from "@/components/accounting/BalanceSheet";
import CashFlowStatement from "@/components/accounting/CashFlowStatement";
import AccountantsReport from "@/components/accounting/AccountantsReport";
import FinancialDashboard from "@/components/accounting/FinancialDashboard";
import CustomReportBuilder from "@/components/accounting/CustomReportBuilder";
import useFinancialBooks from "@/components/accounting/useFinancialBooks";
import { buildAccountantsPackage, financialReportSections, packageRows, sectionsToRows, suggestedPackageKind } from "@/lib/accountantsReport";
import { downloadCsv } from "@/lib/reportFormat";
import { downloadReportPdf } from "@/lib/reportPdf";
import { COMPARE_OPTIONS, DATE_PRESETS, compareCountLabel, compareRanges, presetRange, rangeLabel } from "@/lib/reportPeriods";

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
  const [activeReport, setActiveReport] = useState("dashboard");
  const [datePreset, setDatePreset] = useState("this_year");
  const [dateRange, setDateRange] = useState(() => presetRange("this_year"));
  const [compareWith, setCompareWith] = useState("none");
  const [compareCount, setCompareCount] = useState(1);
  const [packageKind, setPackageKind] = useState("interim");
  const [packageKindTouched, setPackageKindTouched] = useState(false);
  const [accountTypeFilter, setAccountTypeFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(true);
  const [reportBasis, setReportBasis] = useState("accrual");

  // Fetch company data
  const { ledger } = useFinancialBooks(reportBasis);

  useEffect(() => {
    if (!packageKindTouched && dateRange?.from && dateRange?.to) {
      setPackageKind(suggestedPackageKind(dateRange.from, dateRange.to));
    }
  }, [dateRange, packageKindTouched]);

  const { data: company } = useQuery({
    queryKey: ['company', selectedCompanyId],
    queryFn: () => supabase.entities.Company.filter({ id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    select: (data) => data[0],
  });

  const comparisons = compareRanges({
    from: dateRange.from,
    to: dateRange.to,
    mode: compareWith,
    count: compareCount,
    preset: datePreset,
  });

  const buildPeriods = () => [
    { from: dateRange.from, to: dateRange.to, label: rangeLabel(dateRange.from, dateRange.to) },
    ...comparisons,
  ];

  const reportTitle = (report) => {
    if (report === "income") return "Statement of Income";
    if (report === "balance") return "Statement of Financial Position";
    if (report === "cashflow") return "Statement of Cash Flows";
    if (report === "accountant") return "Accountant's Report";
    if (report === "custom") return "Custom Report";
    return "Financial Dashboard";
  };

  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    const range = presetRange(preset);
    if (range) setDateRange(range);
  };

  const handleCustomDate = (edge, date) => {
    if (!date) return;
    setDatePreset("custom");
    setDateRange((current) => {
      const next = { ...current, [edge]: date };
      if (next.to < next.from) return edge === "from" ? { from: date, to: date } : { from: date, to: date };
      return next;
    });
  };

  const exportRows = () => {
    const currentPeriods = buildPeriods();
    if (activeReport === "accountant") {
      return packageRows(buildAccountantsPackage({
        ledger,
        companyName: company?.name || "Company",
        from: dateRange.from,
        to: dateRange.to,
        kind: packageKind,
        basis: reportBasis,
        extraPeriods: currentPeriods.slice(1),
      }));
    }
    return sectionsToRows(financialReportSections(ledger, currentPeriods, activeReport), currentPeriods);
  };

  const exportToCSV = () => {
    downloadCsv(`${reportTitle(activeReport).replace(/\s+/g, "-").toLowerCase()}-${format(new Date(), "yyyy-MM-dd")}.csv`, exportRows());
  };

  const exportToPDF = () => {
    const currentPeriods = buildPeriods();
    const pack = activeReport === "accountant"
      ? buildAccountantsPackage({
        ledger,
        companyName: company?.name || "Company",
        from: dateRange.from,
        to: dateRange.to,
        kind: packageKind,
        basis: reportBasis,
        extraPeriods: currentPeriods.slice(1),
      })
      : null;
    const sections = pack
      ? [
        ...pack.sections.map((section) => ({ ...section, columns: pack.columns.map((column) => column.label) })),
        {
          title: "Notes to the Financial Statements",
          columns: [],
          rows: pack.notes.flatMap((note) => [
            { label: `${note.number}. ${note.title}`, amounts: [], total: true },
            ...note.paragraphs.map((paragraph) => ({ label: paragraph, amounts: [] })),
          ]),
        },
      ]
      : financialReportSections(ledger, currentPeriods, activeReport).map((section) => ({
        ...section,
        columns: currentPeriods.map((period) => period.label),
      }));
    downloadReportPdf({
      filename: `${reportTitle(activeReport).replace(/\s+/g, "-").toLowerCase()}-${format(new Date(), "yyyy-MM-dd")}.pdf`,
      title: reportTitle(activeReport),
      company: company?.name || "Company",
      subtitle: pack?.periodText || `${rangeLabel(dateRange.from, dateRange.to)} · ${reportBasis === "cash" ? "Cash basis" : "Accrual basis"}`,
      paragraphs: pack?.preface || [],
      sections,
    });
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>Date Range</Label>
                    <Select value={datePreset} onValueChange={handleDatePresetChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DATE_PRESETS.map(preset => (
                          <SelectItem key={preset.id} value={preset.id}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>From</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          {format(dateRange.from, "MMM d, yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={dateRange.from} onSelect={(date) => handleCustomDate("from", date)} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>To</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          {format(dateRange.to, "MMM d, yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={dateRange.to} onSelect={(date) => handleCustomDate("to", date)} />
                      </PopoverContent>
                    </Popover>
                  </div>

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
                <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>Compare With</Label>
                    <Select value={compareWith} onValueChange={setCompareWith}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPARE_OPTIONS.map((option) => (
                          <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {compareWith !== "none" && (
                    <div className="space-y-2">
                      <Label>{compareCountLabel(compareWith)}</Label>
                      <Select value={String(compareCount)} onValueChange={(value) => setCompareCount(Number(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((value) => (
                            <SelectItem key={value} value={value}>{value}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">{rangeLabel(dateRange.from, dateRange.to)}</Badge>
                  {comparisons.map((period) => (
                    <Badge key={period.label} variant="outline">vs {period.label}</Badge>
                  ))}
                  {accountTypeFilter !== "all" && (
                    <Badge variant="secondary">
                      {ACCOUNT_TYPES.find(t => t.id === accountTypeFilter)?.label}
                    </Badge>
                  )}
                  <Badge variant="secondary">{reportBasis === "accrual" ? "Accrual Basis" : "Cash Basis"}</Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Report Tabs */}
        <Tabs value={activeReport} onValueChange={setActiveReport}>
          <div className="flex justify-between items-center mb-4 print:hidden">
            <TabsList className="flex h-auto w-auto flex-wrap justify-start">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </TabsTrigger>
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
              <TabsTrigger value="custom" className="flex items-center gap-2">
                <PenTool className="w-4 h-4" />
                Custom Reports
              </TabsTrigger>
              <TabsTrigger value="accountant" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Accountant's Report
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF}>
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
              <h1 className="text-2xl font-bold text-center">{reportTitle(activeReport)}</h1>
              <p className="text-center text-gray-600">{company?.name}</p>
              <p className="text-center text-sm text-gray-500">
                {rangeLabel(dateRange.from, dateRange.to)}
              </p>
              <p className="text-center text-xs text-gray-400 mt-2">
                Generated on {format(new Date(), 'MMMM d, yyyy h:mm a')}
              </p>
            </div>

            <TabsContent value="dashboard">
              <FinancialDashboard 
                dateRange={dateRange}
                accountTypeFilter={accountTypeFilter}
                reportBasis={reportBasis}
              />
            </TabsContent>

            <TabsContent value="income">
              <ProfitLossStatement 
                comparativePeriods={periods}
                reportBasis={reportBasis}
              />
            </TabsContent>

            <TabsContent value="balance">
              <BalanceSheet 
                comparativePeriods={periods}
                reportBasis={reportBasis}
              />
            </TabsContent>

            <TabsContent value="cashflow">
              <CashFlowStatement 
                comparativePeriods={periods}
                reportBasis={reportBasis}
              />
            </TabsContent>

            <TabsContent value="custom">
              <CustomReportBuilder />
            </TabsContent>

            <TabsContent value="accountant">
              <AccountantsReport
                dateRange={dateRange}
                periods={periods}
                reportBasis={reportBasis}
                kind={packageKind}
                onKindChange={(next) => {
                  setPackageKindTouched(true);
                  setPackageKind(next);
                }}
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
          .print\\:hidden, button, [role="tablist"] {
            display: none !important;
          }
          body {
            background: white;
          }
          @page {
            margin: 1cm;
            size: letter;
          }
        }
      `}</style>
    </div>
  );
}