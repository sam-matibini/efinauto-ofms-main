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
import { accountActivity, dayKey, formatAccounting, formatStatementDate, retainedEarningsStatement } from "@/lib/financialStatements";
import { downloadCsv, formatExportAmount } from "@/lib/reportFormat";

export default function RetainedEarningsStatement({ comparativePeriods = [], reportBasis = "accrual" }) {
  const { ledger } = useFinancialBooks(reportBasis);
  const [drilldown, setDrilldown] = useState(null);
  const basisLabel = reportBasis === "cash" ? "Cash basis" : "Accrual basis";
  
  const periods = comparativePeriods.length > 0 ? comparativePeriods : [{ 
    from: new Date(new Date().getFullYear(), 0, 1), 
    to: new Date(),
    label: 'Current Period'
  }];

  const periodData = periods.map((period) => ({ period, ...retainedEarningsStatement(ledger, period.from, period.to) }));
  const showAdjustments = periodData.some((row) => Math.abs(row.otherAdjustments) >= 0.01);

  const getDrilldownData = (category, periodIdx) => {
    const period = periods[periodIdx];
    if (category === "netIncome") {
      return {
        title: "Net Income",
        period,
        items: accountActivity(ledger, ["4000", "4100", "4200", "4300", "4400", "4500", "4600", "4700", "4900", "5000", "5100", "5200", "6000", "6100"], {
          from: period.from,
          to: period.to,
          normal: "credit",
        }),
      };
    }
    const opening = dayKey(period.from);
    return {
      title: "Beginning Retained Earnings",
      period,
      items: accountActivity(ledger, ["4000", "4100", "4200", "4300", "4400", "4500", "4600", "4700", "4900", "5000", "5100", "5200", "6000", "6100", "3100"], {
        normal: "credit",
      }).filter((item) => !opening || item.date < opening),
    };
  };

  const handleDrilldown = (category, periodIdx) => {
    const data = getDrilldownData(category, periodIdx);
    setDrilldown(data);
  };

  const exportToCSV = () => {
    const headers = ['Account', ...periods.map(p => p.label)];
    const money = (pick) => periodData.map((row) => formatExportAmount(pick(row)));
    downloadCsv(`retained-earnings-${format(new Date(), 'yyyy-MM-dd')}.csv`, [
      ['Statement of Retained Earnings'],
      ['Generated on', format(new Date(), 'MMMM d, yyyy')],
      [],
      headers,
      ['Beginning Retained Earnings', ...money((row) => row.beginningRetainedEarnings)],
      ['Add: Net Income', ...money((row) => row.netIncome)],
      ['Less: Dividends', ...money((row) => row.dividends)],
      ['Ending Retained Earnings', ...money((row) => row.endingRetainedEarnings)],
    ]);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Statement of Retained Earnings</CardTitle>
            <p className="text-sm text-gray-500 mt-1">{basisLabel} · ending balance equals the balance sheet</p>
          </div>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Column Headers */}
        <div className="grid gap-4 py-3 px-4 bg-gray-100 font-semibold border-b-2 border-gray-300 mb-4"
             style={{ gridTemplateColumns: `300px repeat(${periods.length}, 1fr)` }}>
          <span className="text-sm uppercase">Account</span>
          {periods.map((period, idx) => (
            <span key={idx} className="text-right text-sm">
              {period.label}
            </span>
          ))}
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 py-2 px-4 border-b"
               style={{ gridTemplateColumns: `300px repeat(${periods.length}, 1fr)` }}>
            <span className="font-medium">Beginning Retained Earnings</span>
            {periodData.map((d, idx) => (
              <span 
                key={idx} 
                className="text-right font-mono cursor-pointer hover:text-blue-600 hover:underline"
                onDoubleClick={() => handleDrilldown('beginningRetainedEarnings', idx)}
                title="Double-click to view details"
              >
                {formatAccounting(d.beginningRetainedEarnings)}
              </span>
            ))}
          </div>

          <div className="grid gap-4 py-2 px-4"
               style={{ gridTemplateColumns: `300px repeat(${periods.length}, 1fr)` }}>
            <span className="pl-6">Add: Net Income</span>
            {periodData.map((d, idx) => (
              <span 
                key={idx} 
                className="text-right font-mono text-green-600 cursor-pointer hover:text-blue-600 hover:underline"
                onDoubleClick={() => handleDrilldown('netIncome', idx)}
                title="Double-click to view details"
              >
                {formatAccounting(d.netIncome)}
              </span>
            ))}
          </div>

          {showAdjustments && (
            <div className="grid gap-4 py-2 px-4"
                 style={{ gridTemplateColumns: `300px repeat(${periods.length}, 1fr)` }}>
              <span className="pl-6">Other equity adjustments</span>
              {periodData.map((d, idx) => (
                <span key={idx} className="text-right font-mono">
                  {formatAccounting(d.otherAdjustments)}
                </span>
              ))}
            </div>
          )}

          <div className="grid gap-4 py-2 px-4 border-b pb-4"
               style={{ gridTemplateColumns: `300px repeat(${periods.length}, 1fr)` }}>
            <span className="pl-6">Less: Dividends</span>
            {periodData.map((d, idx) => (
              <span key={idx} className="text-right font-mono text-red-600">
                {formatAccounting(d.dividends)}
              </span>
            ))}
          </div>

          <div className="grid gap-4 py-3 px-4 bg-blue-50 font-bold text-blue-900 rounded-lg"
               style={{ gridTemplateColumns: `300px repeat(${periods.length}, 1fr)` }}>
            <span>Ending Retained Earnings</span>
            {periodData.map((d, idx) => (
              <span key={idx} className="text-right font-mono">
                {formatAccounting(d.endingRetainedEarnings)}
              </span>
            ))}
          </div>
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
                          <td className={`py-2 px-3 text-right font-medium ${item.amount < 0 ? 'text-red-600' : ''}`}>
                            {formatAccounting(item.amount)}
                          </td>
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