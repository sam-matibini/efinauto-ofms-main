import { balanceSheet, cents, dayKey, dollars, profitAndLoss } from "./financialStatements.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function asDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const key = dayKey(value);
  if (!key) return new Date();
  const [year, month, date] = key.split("-").map(Number);
  return new Date(year, month - 1, date);
}

function money(value) {
  return dollars(cents(value));
}

export function monthWindows(asOf, count = 6) {
  const end = asDate(asOf);
  const windows = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const start = new Date(end.getFullYear(), end.getMonth() - offset, 1);
    const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    const cap = offset === 0 && end < monthEnd ? end : monthEnd;
    windows.push({
      from: dayKey(start),
      to: dayKey(cap),
      label: `${MONTHS[start.getMonth()]} ${start.getFullYear()}`,
    });
  }
  return windows;
}

export function periodChange(current, previous) {
  const now = Number(current);
  const then = Number(previous);
  if (!Number.isFinite(now) || !Number.isFinite(then)) {
    return { percent: 0, label: "0.0% vs last month", comparable: true, direction: "flat" };
  }
  if (Math.abs(then) < 0.005) {
    if (Math.abs(now) < 0.005) {
      return { percent: 0, label: "0.0% vs last month", comparable: true, direction: "flat" };
    }
    return { percent: null, label: "No prior month", comparable: false, direction: "flat" };
  }
  const percent = ((now - then) / Math.abs(then)) * 100;
  const safe = Number.isFinite(percent) ? percent : 0;
  const direction = safe > 0.05 ? "up" : safe < -0.05 ? "down" : "flat";
  return {
    percent: safe,
    label: `${Math.abs(safe).toFixed(1)}% vs last month`,
    comparable: true,
    direction,
  };
}

function costsOf(statement) {
  return money(statement.cogs + statement.operatingExpenses + statement.payrollExpenses);
}

function marginOf(profit, revenue) {
  if (!(revenue > 0)) return 0;
  const margin = (profit / revenue) * 100;
  return Number.isFinite(margin) ? margin : 0;
}

export function buildDashboardInsights(ledger, asOf = new Date()) {
  const asOfKey = dayKey(asDate(asOf));
  const windows = monthWindows(asOfKey, 6);
  const series = windows.map((window) => {
    const statement = profitAndLoss(ledger, window.from, window.to);
    return {
      month: window.label,
      from: window.from,
      to: window.to,
      revenue: statement.revenue,
      costs: costsOf(statement),
      profit: statement.netProfit,
    };
  });
  const current = series[series.length - 1];
  const previous = series[series.length - 2];
  const yearStart = `${asOfKey.slice(0, 4)}-01-01`;
  const ytd = profitAndLoss(ledger, yearStart, asOfKey);
  const trailing = profitAndLoss(ledger, windows[0].from, asOfKey);
  const sheet = balanceSheet(ledger, asOfKey);

  return {
    asOf: asOfKey,
    series,
    current: {
      ...current,
      margin: marginOf(current.profit, current.revenue),
    },
    previous,
    revenueChange: periodChange(current.revenue, previous.revenue),
    ytd: {
      revenue: ytd.revenue,
      costs: costsOf(ytd),
      profit: ytd.netProfit,
      margin: marginOf(ytd.netProfit, ytd.revenue),
      vehicleSales: ytd.vehicleSalesRevenue,
      service: ytd.serviceRevenue,
      parts: ytd.partsRevenue,
      other: ytd.otherRevenue,
    },
    snapshot: {
      cash: sheet.cashAndBank,
      receivables: sheet.accountsReceivable,
      inventory: money(sheet.vehicleInventory + sheet.otherInventory),
      payables: sheet.accountsPayable,
    },
    revenueMix: [
      { name: "Vehicles", value: trailing.vehicleSalesRevenue },
      { name: "Service", value: trailing.serviceRevenue },
      { name: "Parts", value: trailing.partsRevenue },
      { name: "Other", value: trailing.otherRevenue },
    ],
    costBreakdown: [
      { name: "Vehicles", value: trailing.vehicleCogs },
      { name: "Parts & service", value: trailing.otherCogs },
      { name: "Operating", value: trailing.operatingExpenses },
      { name: "Payroll", value: trailing.payrollExpenses },
    ],
  };
}
