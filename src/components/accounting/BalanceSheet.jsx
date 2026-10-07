import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useFinancialBooks from "@/components/accounting/useFinancialBooks";
import { accountActivity, balanceSheet, formatAccounting, formatStatementDate } from "@/lib/financialStatements";
import { downloadCsv, formatExportAmount } from "@/lib/reportFormat";

const DRILLDOWNS = {
  cashAndBank: { title: "Cash and Bank", codes: ["1000", "1050"], normal: "debit" },
  accountsReceivable: { title: "Accounts Receivable", codes: ["1100"], normal: "debit" },
  vehicleInventory: { title: "Vehicle Inventory", codes: ["1200"], normal: "debit" },
  otherInventory: { title: "Parts and Other Inventory", codes: ["1210", "1220"], normal: "debit" },
  taxReceivable: { title: "Sales Tax Receivable", codes: ["1150"], normal: "debit" },
  accountsPayable: { title: "Accounts Payable", codes: ["2000"], normal: "credit" },
  taxPayable: { title: "Sales Tax Payable", codes: ["2100", "2110", "2120"], normal: "credit" },
  payrollLiabilities: { title: "Payroll Liabilities", codes: ["2300", "2400"], normal: "credit" },
};

export default function BalanceSheet({ comparativePeriods = [], reportBasis = "accrual" }) {
  const { ledger } = useFinancialBooks(reportBasis);
  const [drilldown, setDrilldown] = useState(null);
  const basisLabel = reportBasis === "cash" ? "Cash basis" : "Accrual basis";
  
  const periods = comparativePeriods.length > 0 ? comparativePeriods : [{ 
    from: new Date(new Date().getFullYear(), 0, 1), 
    to: new Date(),
    label: 'Current Period'
  }];

  const periodData = periods.map((period) => balanceSheet(ledger, period.to));
  const showOtherAssets = periodData.some((row) => Math.abs(row.otherAssets) >= 0.01);
  const showOtherLiabilities = periodData.some((row) => Math.abs(row.otherLiabilities) >= 0.01);

  const getDrilldownData = (accountKey, periodIdx) => {
    const period = periods[periodIdx];
    const spec = DRILLDOWNS[accountKey] || { title: accountKey, codes: [], normal: "debit" };
    return {
      title: spec.title,
      period,
      items: accountActivity(ledger, spec.codes, { to: period.to, normal: spec.normal }),
    };
  };

  const handleDrilldown = (accountKey, periodIdx) => {
    const data = getDrilldownData(accountKey, periodIdx);
    setDrilldown({ ...data, period: periods[periodIdx] });
  };

  const renderLine = (label, values, isSubtotal = false, isTotal = false, indent = 0, accountKey = null) => (
    <div className={`grid gap-4 py-2 px-4 ${isSubtotal || isTotal ? 'border-t border-gray-300 font-semibold' : ''} ${isTotal ? 'bg-blue-50 text-blue-900' : ''}`}
         style={{ gridTemplateColumns: `300px repeat(${periods.length}, 1fr)` }}>
      <span style={{ paddingLeft: `${indent * 20}px` }}>{label}</span>
      {values.map((value, idx) => (
        <span 
          key={idx} 
          className={`text-right ${accountKey ? 'cursor-pointer hover:text-blue-600 hover:underline' : ''}`}
          onDoubleClick={() => accountKey && handleDrilldown(accountKey, idx)}
          title={accountKey ? 'Double-click to view details' : ''}
        >
          {formatAccounting(value)}
        </span>
      ))}
    </div>
  );

  const exportToCSV = () => {
    const headers = ['Account', ...periods.map(p => p.label)];
    const money = (pick) => periodData.map((row) => formatExportAmount(pick(row)));
    downloadCsv(`balance-sheet-${format(new Date(), 'yyyy-MM-dd')}.csv`, [
      ['Balance Sheet'],
      ['Generated on', format(new Date(), 'MMMM d, yyyy')],
      [],
      headers,
      ['Cash and Bank', ...money((row) => row.cashAndBank)],
      ['Accounts Receivable', ...money((row) => row.accountsReceivable)],
      ['Vehicle Inventory', ...money((row) => row.vehicleInventory)],
      ['Parts and Other Inventory', ...money((row) => row.otherInventory)],
      ['Sales Tax Receivable', ...money((row) => row.taxReceivable)],
      ['Total Assets', ...money((row) => row.totalAssets)],
      ['Accounts Payable', ...money((row) => row.accountsPayable)],
      ['Sales Tax Payable', ...money((row) => row.taxPayable)],
      ['Total Liabilities', ...money((row) => row.totalLiabilities)],
      ['Owner Equity', ...money((row) => row.ownerEquity)],
      ['Retained Earnings', ...money((row) => row.retainedEarnings)],
      ['Total Liabilities and Equity', ...money((row) => row.totalLiabilitiesAndEquity)],
    ]);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Balance Sheet</CardTitle>
            <p className="text-sm text-gray-500 mt-1">{basisLabel} · assets equal liabilities and equity</p>
          </div>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Column Headers */}
        <div className="grid gap-4 py-3 px-4 bg-gray-100 font-semibold border-b-2 border-gray-300"
             style={{ gridTemplateColumns: `300px repeat(${periods.length}, 1fr)` }}>
          <span className="text-sm uppercase">Account</span>
          {periods.map((period, idx) => (
            <span key={idx} className="text-right text-sm">
              {period.label}
            </span>
          ))}
        </div>

        {/* ASSETS */}
        <div>
          <h3 className="font-bold text-base mb-2 text-gray-900 px-4">ASSETS</h3>
          
          <div className="mb-4">
            <h4 className="font-semibold text-sm mb-2 px-4 text-gray-700">Current Assets</h4>
            {renderLine('Cash and Bank', periodData.map(d => d.cashAndBank), false, false, 1, 'cashAndBank')}
            {renderLine('Accounts Receivable', periodData.map(d => d.accountsReceivable), false, false, 1, 'accountsReceivable')}
            {renderLine('Vehicle Inventory', periodData.map(d => d.vehicleInventory), false, false, 1, 'vehicleInventory')}
            {renderLine('Parts and Other Inventory', periodData.map(d => d.otherInventory), false, false, 1, 'otherInventory')}
            {renderLine('Sales Tax Receivable', periodData.map(d => d.taxReceivable), false, false, 1, 'taxReceivable')}
            {showOtherAssets && renderLine('Other Assets', periodData.map(d => d.otherAssets), false, false, 1)}
            {renderLine('Total Current Assets', periodData.map(d => d.totalCurrentAssets), true, false, 1)}
          </div>

          <div className="mb-4">
            <h4 className="font-semibold text-sm mb-2 px-4 text-gray-700">Fixed Assets</h4>
            {renderLine('Fixed Assets', periodData.map(d => d.fixedAssets), false, false, 1)}
            {renderLine('Less: Accumulated Depreciation', periodData.map(d => -d.accumulatedDepreciation), false, false, 1)}
            {renderLine('Net Fixed Assets', periodData.map(d => d.netFixedAssets), true, false, 1)}
          </div>

          {renderLine('TOTAL ASSETS', periodData.map(d => d.totalAssets), false, true)}
        </div>

        {/* LIABILITIES */}
        <div className="mt-8">
          <h3 className="font-bold text-base mb-2 text-gray-900 px-4">LIABILITIES</h3>
          
          <div className="mb-4">
            <h4 className="font-semibold text-sm mb-2 px-4 text-gray-700">Current Liabilities</h4>
            {renderLine('Accounts Payable', periodData.map(d => d.accountsPayable), false, false, 1, 'accountsPayable')}
            {renderLine('Sales Tax Payable', periodData.map(d => d.taxPayable), false, false, 1, 'taxPayable')}
            {renderLine('Payroll Liabilities', periodData.map(d => d.payrollLiabilities), false, false, 1, 'payrollLiabilities')}
            {renderLine('Short-term Debt', periodData.map(d => d.shortTermDebt), false, false, 1)}
            {showOtherLiabilities && renderLine('Other Liabilities', periodData.map(d => d.otherLiabilities), false, false, 1)}
            {renderLine('Total Current Liabilities', periodData.map(d => d.totalCurrentLiabilities), true, false, 1)}
          </div>

          <div className="mb-4">
            <h4 className="font-semibold text-sm mb-2 px-4 text-gray-700">Long-term Liabilities</h4>
            {renderLine('Long-term Debt', periodData.map(d => d.longTermDebt), false, false, 1)}
          </div>

          {renderLine('TOTAL LIABILITIES', periodData.map(d => d.totalLiabilities), false, true)}
        </div>

        {/* EQUITY */}
        <div className="mt-8">
          <h3 className="font-bold text-base mb-2 text-gray-900 px-4">EQUITY</h3>
          {renderLine('Owner Equity', periodData.map(d => d.ownerEquity), false, false, 1)}
          {renderLine('Retained Earnings', periodData.map(d => d.retainedEarnings), false, false, 1)}
          {renderLine('TOTAL EQUITY', periodData.map(d => d.totalEquity), false, true)}
        </div>

        {/* TOTAL LIABILITIES & EQUITY */}
        <div className="mt-6">
          {renderLine('TOTAL LIABILITIES & EQUITY', periodData.map(d => d.totalLiabilitiesAndEquity), false, true)}
          <p className={`px-4 pt-3 text-sm ${periodData.every((row) => row.inBalance) ? "text-green-700" : "text-red-700"}`}>
            {periodData.every((row) => row.inBalance)
              ? "In balance. Every amount comes from a journal entry with equal debits and credits."
              : `Out of balance by ${formatAccounting(periodData.find((row) => !row.inBalance)?.imbalance || 0)}.`}
          </p>
        </div>

        {/* Drilldown Dialog */}
        <Dialog open={!!drilldown} onOpenChange={() => setDrilldown(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{drilldown?.title} - {drilldown?.period?.label}</DialogTitle>
            </DialogHeader>
            {drilldown && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatAccounting(drilldown.items.reduce((sum, i) => sum + i.amount, 0))}
                  </p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 bg-gray-100">
                      <th className="text-left py-2 px-3">Date</th>
                      <th className="text-left py-2 px-3">Description</th>
                      <th className="text-left py-2 px-3">Reference</th>
                      <th className="text-right py-2 px-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drilldown.items.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-4 text-gray-500">No items found</td></tr>
                    ) : (
                      drilldown.items.map((item, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-3">{formatStatementDate(item.date)}</td>
                          <td className="py-2 px-3">{item.description}</td>
                          <td className="py-2 px-3 text-gray-600">{item.reference || '-'}</td>
                          <td className="py-2 px-3 text-right font-medium">{formatAccounting(item.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}