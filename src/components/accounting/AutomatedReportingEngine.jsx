import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Mail, FileText, Calendar, Clock, Send, Plus, X, 
  CheckCircle, AlertCircle, Loader2, Settings, Play
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

export default function AutomatedReportingEngine() {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  
  const [recipients, setRecipients] = useState([]);
  const [newRecipient, setNewRecipient] = useState("");
  const [selectedReports, setSelectedReports] = useState({
    profitLoss: true,
    balanceSheet: true,
    cashFlow: true
  });
  const [reportPeriod, setReportPeriod] = useState("last_month");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState(null);

  const { data: company } = useQuery({
    queryKey: ['company', selectedCompanyId],
    queryFn: async () => {
      const companies = await base44.entities.Company.filter({ id: selectedCompanyId });
      return companies[0];
    },
    enabled: !!selectedCompanyId,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', selectedCompanyId],
    queryFn: () => base44.entities.Transaction.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales', selectedCompanyId],
    queryFn: () => base44.entities.Sale.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['purchases', selectedCompanyId],
    queryFn: () => base44.entities.Purchase.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', selectedCompanyId],
    queryFn: () => base44.entities.Vehicle.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', selectedCompanyId],
    queryFn: () => base44.entities.Account.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const getPeriodDates = () => {
    const now = new Date();
    switch (reportPeriod) {
      case "last_month":
        const lastMonth = subMonths(now, 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      case "current_month":
        return { from: startOfMonth(now), to: now };
      case "last_quarter":
        const quarterStart = subMonths(startOfMonth(now), 3);
        return { from: quarterStart, to: endOfMonth(subMonths(now, 1)) };
      case "ytd":
        return { from: new Date(now.getFullYear(), 0, 1), to: now };
      default:
        return { from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) };
    }
  };

  const calculateFinancialData = () => {
    const { from, to } = getPeriodDates();
    
    const periodTransactions = transactions.filter(t => {
      const transDate = new Date(t.transaction_date);
      return transDate >= from && transDate <= to;
    });

    const periodSales = sales.filter(s => {
      const saleDate = new Date(s.sale_date || s.created_date);
      return saleDate >= from && saleDate <= to;
    });

    const periodPurchases = purchases.filter(p => {
      const purchaseDate = new Date(p.order_date || p.created_date);
      return purchaseDate >= from && purchaseDate <= to;
    });

    // P&L Calculations
    const revenue = periodSales.reduce((sum, s) => sum + (s.grand_total || s.sale_price || 0), 0);
    
    const vehicleCogs = periodSales.reduce((sum, s) => {
      if (s.vehicle_id) {
        const vehicle = vehicles.find(v => v.id === s.vehicle_id);
        return sum + (vehicle?.total_cost || vehicle?.purchase_price || 0);
      }
      return sum;
    }, 0);

    const operatingExpenses = periodTransactions
      .filter(t => {
        const account = accounts.find(a => a.id === t.account_id);
        return account?.account_type === 'expense' && !account?.account_code?.startsWith('50');
      })
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const grossProfit = revenue - vehicleCogs;
    const netProfit = grossProfit - operatingExpenses;

    // Balance Sheet Calculations
    const vehicleInventory = vehicles
      .filter(v => v.status === 'in_stock')
      .reduce((sum, v) => sum + (v.total_cost || v.purchase_price || 0), 0);

    const accountsReceivable = periodSales
      .filter(s => s.payment_status !== 'paid')
      .reduce((sum, s) => sum + ((s.grand_total || s.sale_price || 0) - (s.total_paid || 0)), 0);

    const accountsPayable = periodPurchases
      .filter(p => p.payment_status !== 'paid')
      .reduce((sum, p) => sum + ((p.total_amount || 0) - (p.amount_paid || 0)), 0);

    // Cash Flow Calculations
    const cashFromSales = periodSales
      .filter(s => s.payment_status === 'paid')
      .reduce((sum, s) => sum + (s.total_paid || 0), 0);

    const cashToSuppliers = periodPurchases
      .filter(p => p.payment_status === 'paid')
      .reduce((sum, p) => sum + (p.amount_paid || 0), 0);

    const netCashFromOperating = cashFromSales - cashToSuppliers - operatingExpenses;

    return {
      period: { from, to },
      profitLoss: { revenue, vehicleCogs, grossProfit, operatingExpenses, netProfit },
      balanceSheet: { vehicleInventory, accountsReceivable, accountsPayable, totalAssets: vehicleInventory + accountsReceivable },
      cashFlow: { cashFromSales, cashToSuppliers, operatingExpenses, netCashFromOperating }
    };
  };

  const generateReportHTML = (data) => {
    const { period, profitLoss, balanceSheet, cashFlow } = data;
    const periodLabel = `${format(period.from, 'MMM d, yyyy')} - ${format(period.to, 'MMM d, yyyy')}`;
    
    let html = `
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          h2 { color: #1e293b; margin-top: 30px; }
          .header { background: #1e293b; color: white; padding: 20px; margin-bottom: 20px; }
          .header h1 { color: white; border: none; margin: 0; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background: #f3f4f6; font-weight: 600; }
          .amount { text-align: right; font-family: monospace; }
          .total { font-weight: bold; background: #eff6ff; }
          .positive { color: #059669; }
          .negative { color: #dc2626; }
          .section { margin-bottom: 30px; padding: 20px; background: #fafafa; border-radius: 8px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${company?.name || 'Company'} - Monthly Financial Report</h1>
          <p>Period: ${periodLabel}</p>
          <p>Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')}</p>
        </div>
    `;

    if (selectedReports.profitLoss) {
      html += `
        <div class="section">
          <h2>Profit & Loss Statement</h2>
          <table>
            <tr><th>Account</th><th class="amount">Amount</th></tr>
            <tr><td>Revenue</td><td class="amount positive">$${profitLoss.revenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td></tr>
            <tr><td>Cost of Goods Sold</td><td class="amount negative">($${profitLoss.vehicleCogs.toLocaleString(undefined, {minimumFractionDigits: 2})})</td></tr>
            <tr class="total"><td>Gross Profit</td><td class="amount">$${profitLoss.grossProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}</td></tr>
            <tr><td>Operating Expenses</td><td class="amount negative">($${profitLoss.operatingExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})})</td></tr>
            <tr class="total"><td><strong>Net Profit</strong></td><td class="amount ${profitLoss.netProfit >= 0 ? 'positive' : 'negative'}"><strong>$${profitLoss.netProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}</strong></td></tr>
          </table>
        </div>
      `;
    }

    if (selectedReports.balanceSheet) {
      html += `
        <div class="section">
          <h2>Balance Sheet Summary</h2>
          <table>
            <tr><th colspan="2">Assets</th></tr>
            <tr><td>Vehicle Inventory</td><td class="amount">$${balanceSheet.vehicleInventory.toLocaleString(undefined, {minimumFractionDigits: 2})}</td></tr>
            <tr><td>Accounts Receivable</td><td class="amount">$${balanceSheet.accountsReceivable.toLocaleString(undefined, {minimumFractionDigits: 2})}</td></tr>
            <tr class="total"><td>Total Assets</td><td class="amount">$${balanceSheet.totalAssets.toLocaleString(undefined, {minimumFractionDigits: 2})}</td></tr>
            <tr><th colspan="2">Liabilities</th></tr>
            <tr><td>Accounts Payable</td><td class="amount">$${balanceSheet.accountsPayable.toLocaleString(undefined, {minimumFractionDigits: 2})}</td></tr>
          </table>
        </div>
      `;
    }

    if (selectedReports.cashFlow) {
      html += `
        <div class="section">
          <h2>Cash Flow Statement</h2>
          <table>
            <tr><th>Activity</th><th class="amount">Amount</th></tr>
            <tr><td>Cash from Customers</td><td class="amount positive">$${cashFlow.cashFromSales.toLocaleString(undefined, {minimumFractionDigits: 2})}</td></tr>
            <tr><td>Cash to Suppliers</td><td class="amount negative">($${cashFlow.cashToSuppliers.toLocaleString(undefined, {minimumFractionDigits: 2})})</td></tr>
            <tr><td>Operating Expenses</td><td class="amount negative">($${cashFlow.operatingExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})})</td></tr>
            <tr class="total"><td><strong>Net Cash from Operations</strong></td><td class="amount ${cashFlow.netCashFromOperating >= 0 ? 'positive' : 'negative'}"><strong>$${cashFlow.netCashFromOperating.toLocaleString(undefined, {minimumFractionDigits: 2})}</strong></td></tr>
          </table>
        </div>
      `;
    }

    html += `
        <div class="footer">
          <p>This report was automatically generated by the eFinAuto Financial Reporting System.</p>
          <p>For questions, please contact your system administrator.</p>
        </div>
      </body>
      </html>
    `;

    return html;
  };

  const addRecipient = () => {
    if (newRecipient && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newRecipient)) {
      if (!recipients.includes(newRecipient)) {
        setRecipients([...recipients, newRecipient]);
        setNewRecipient("");
      }
    } else {
      toast.error("Please enter a valid email address");
    }
  };

  const removeRecipient = (email) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  const generateAndSendReports = async () => {
    if (recipients.length === 0) {
      toast.error("Please add at least one recipient");
      return;
    }

    if (!selectedReports.profitLoss && !selectedReports.balanceSheet && !selectedReports.cashFlow) {
      toast.error("Please select at least one report to generate");
      return;
    }

    setIsGenerating(true);
    setGenerationStatus({ step: 'calculating', message: 'Calculating financial data...' });

    const financialData = calculateFinancialData();
    
    setGenerationStatus({ step: 'generating', message: 'Generating report...' });
    const reportHTML = generateReportHTML(financialData);

    const { from, to } = financialData.period;
    const periodLabel = `${format(from, 'MMM yyyy')}`;
    const subject = `${company?.name || 'Company'} - Monthly Financial Report - ${periodLabel}`;

    setGenerationStatus({ step: 'sending', message: `Sending to ${recipients.length} recipient(s)...` });

    let successCount = 0;
    let failCount = 0;

    for (const recipient of recipients) {
      try {
        await base44.integrations.Core.SendEmail({
          to: recipient,
          subject: subject,
          body: reportHTML
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to send to ${recipient}:`, error);
        failCount++;
      }
    }

    setIsGenerating(false);
    
    if (failCount === 0) {
      setGenerationStatus({ step: 'complete', message: `Successfully sent to ${successCount} recipient(s)` });
      toast.success(`Financial reports sent to ${successCount} recipient(s)`);
    } else {
      setGenerationStatus({ step: 'partial', message: `Sent to ${successCount}, failed for ${failCount}` });
      toast.warning(`Sent to ${successCount} recipient(s), ${failCount} failed`);
    }
  };

  const reportOptions = [
    { id: 'profitLoss', label: 'Profit & Loss Statement', icon: FileText },
    { id: 'balanceSheet', label: 'Balance Sheet', icon: FileText },
    { id: 'cashFlow', label: 'Cash Flow Statement', icon: FileText }
  ];

  const periodOptions = [
    { value: 'last_month', label: 'Last Month' },
    { value: 'current_month', label: 'Current Month (to date)' },
    { value: 'last_quarter', label: 'Last Quarter' },
    { value: 'ytd', label: 'Year to Date' }
  ];

  if (!selectedCompanyId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Please select a company to use the reporting engine
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Automated Financial Report Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Report Selection */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">Select Reports to Include</Label>
          <div className="grid sm:grid-cols-3 gap-3">
            {reportOptions.map((report) => (
              <div
                key={report.id}
                onClick={() => setSelectedReports(prev => ({ ...prev, [report.id]: !prev[report.id] }))}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedReports[report.id] 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Checkbox checked={selectedReports[report.id]} />
                <report.icon className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">{report.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Period Selection */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">Report Period</Label>
          <Select value={reportPeriod} onValueChange={setReportPeriod}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            {(() => {
              const { from, to } = getPeriodDates();
              return `${format(from, 'MMM d, yyyy')} - ${format(to, 'MMM d, yyyy')}`;
            })()}
          </p>
        </div>

        {/* Recipients */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">Email Recipients</Label>
          <div className="flex gap-2 mb-3">
            <Input
              type="email"
              placeholder="Enter email address"
              value={newRecipient}
              onChange={(e) => setNewRecipient(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addRecipient()}
              className="flex-1"
            />
            <Button onClick={addRecipient} variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
          
          {recipients.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {recipients.map((email) => (
                <Badge key={email} variant="secondary" className="py-1 px-3">
                  {email}
                  <button onClick={() => removeRecipient(email)} className="ml-2 hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No recipients added yet</p>
          )}
        </div>

        {/* Generation Status */}
        {generationStatus && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            generationStatus.step === 'complete' ? 'bg-green-50 border border-green-200' :
            generationStatus.step === 'partial' ? 'bg-yellow-50 border border-yellow-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            {generationStatus.step === 'complete' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : generationStatus.step === 'partial' ? (
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            ) : (
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            )}
            <span className={`text-sm font-medium ${
              generationStatus.step === 'complete' ? 'text-green-800' :
              generationStatus.step === 'partial' ? 'text-yellow-800' :
              'text-blue-800'
            }`}>
              {generationStatus.message}
            </span>
          </div>
        )}

        {/* Generate Button */}
        <div className="flex gap-3 pt-4 border-t">
          <Button 
            onClick={generateAndSendReports} 
            disabled={isGenerating || recipients.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Generate & Send Reports
              </>
            )}
          </Button>
        </div>

        {/* Info */}
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            How it works
          </h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Select which financial reports to include</li>
            <li>Choose the reporting period</li>
            <li>Add one or more email recipients</li>
            <li>Click "Generate & Send" to create and email the reports</li>
            <li>Reports are generated as formatted HTML emails</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}