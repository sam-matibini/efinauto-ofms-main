import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
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

export default function RetainedEarningsStatement({ comparativePeriods = [] }) {
  const { selectedCompanyId } = useCompany();
  const [drilldown, setDrilldown] = useState(null);
  
  const periods = comparativePeriods.length > 0 ? comparativePeriods : [{ 
    from: new Date(new Date().getFullYear(), 0, 1), 
    to: new Date(),
    label: 'Current Period'
  }];

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', selectedCompanyId],
    queryFn: () => base44.entities.Transaction.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  // Calculate for each period
  const periodData = periods.map(period => {
    const periodTransactions = transactions.filter(t => {
      const transDate = new Date(t.transaction_date);
      return transDate >= period.from && transDate <= period.to;
    });

    const priorTransactions = transactions.filter(t => {
      const transDate = new Date(t.transaction_date);
      return transDate < period.from;
    });

    const beginningRetainedEarnings = priorTransactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => {
        return t.category === 'revenue' ? sum + t.amount : sum - t.amount;
      }, 0);

    const netIncome = periodTransactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => {
        return t.category === 'revenue' ? sum + t.amount : sum - t.amount;
      }, 0);

    const dividends = 0;

    const endingRetainedEarnings = beginningRetainedEarnings + netIncome - dividends;

    return { period, beginningRetainedEarnings, netIncome, dividends, endingRetainedEarnings };
  });

  const exportToCSV = () => {
    const headers = ['Account', ...periods.map(p => p.label)];
    const csvContent = [
      ['Statement of Retained Earnings'],
      ['Generated on', format(new Date(), 'MMMM d, yyyy')],
      [],
      headers,
      ['Beginning Retained Earnings', ...periodData.map(d => d.beginningRetainedEarnings.toFixed(2))],
      ['Add: Net Income', ...periodData.map(d => d.netIncome.toFixed(2))],
      ['Less: Dividends', ...periodData.map(d => d.dividends.toFixed(2))],
      ['Ending Retained Earnings', ...periodData.map(d => d.endingRetainedEarnings.toFixed(2))],
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retained-earnings-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Statement of Retained Earnings</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Comparative Period Analysis</p>
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
              <span key={idx} className="text-right font-mono">
                ${d.beginningRetainedEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            ))}
          </div>

          <div className="grid gap-4 py-2 px-4"
               style={{ gridTemplateColumns: `300px repeat(${periods.length}, 1fr)` }}>
            <span className="pl-6">Add: Net Income</span>
            {periodData.map((d, idx) => (
              <span key={idx} className="text-right font-mono text-green-600">
                ${d.netIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            ))}
          </div>

          <div className="grid gap-4 py-2 px-4 border-b pb-4"
               style={{ gridTemplateColumns: `300px repeat(${periods.length}, 1fr)` }}>
            <span className="pl-6">Less: Dividends</span>
            {periodData.map((d, idx) => (
              <span key={idx} className="text-right font-mono text-red-600">
                $({d.dividends.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
              </span>
            ))}
          </div>

          <div className="grid gap-4 py-3 px-4 bg-blue-50 font-bold text-blue-900 rounded-lg"
               style={{ gridTemplateColumns: `300px repeat(${periods.length}, 1fr)` }}>
            <span>Ending Retained Earnings</span>
            {periodData.map((d, idx) => (
              <span key={idx} className="text-right font-mono">
                ${d.endingRetainedEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}