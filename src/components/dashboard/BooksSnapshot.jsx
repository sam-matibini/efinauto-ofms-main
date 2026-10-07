import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Landmark } from "lucide-react";
import useFinancialBooks from "@/components/accounting/useFinancialBooks";
import { buildDashboardInsights } from "@/lib/dashboardInsights";
import { formatAccounting, formatStatementDate } from "@/lib/financialStatements";

const TILES = [
  { key: "cash", label: "Cash", className: "bg-blue-50 text-blue-700" },
  { key: "receivables", label: "Receivables", className: "bg-amber-50 text-amber-700" },
  { key: "inventory", label: "Inventory", className: "bg-slate-50 text-slate-800" },
  { key: "payables", label: "Payables", className: "bg-red-50 text-red-700" },
];

export default function BooksSnapshot() {
  const { ledger, isReady, companyId } = useFinancialBooks("accrual");
  const insights = useMemo(() => buildDashboardInsights(ledger), [ledger]);

  if (!companyId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-slate-500">
          Select a company to see the current position.
        </CardContent>
      </Card>
    );
  }

  if (!isReady) {
    return (
      <Card>
        <CardContent className="flex h-32 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Landmark className="h-5 w-5" />
          Current position
        </CardTitle>
        <p className="text-sm text-slate-500">
          Accrual books through {formatStatementDate(insights.asOf)}. Month-to-date profit{" "}
          <span className="font-semibold text-slate-800">{formatAccounting(insights.current.profit)}</span>.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {TILES.map((tile) => (
            <div key={tile.key} className={`rounded-lg p-3 ${tile.className}`}>
              <p className="text-xs opacity-80">{tile.label}</p>
              <p className="mt-1 text-lg font-bold md:text-2xl">{formatAccounting(insights.snapshot[tile.key])}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
