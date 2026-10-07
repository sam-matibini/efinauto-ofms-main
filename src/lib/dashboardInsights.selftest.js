import { compileLedger } from "./financialStatements.js";
import { buildDashboardInsights, periodChange } from "./dashboardInsights.js";
import { canSeeNavItem, isAdminUser } from "./access.js";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed += 1;
    return;
  }
  failed += 1;
  console.error(`FAIL ${message}`);
}

function near(actual, expected, message) {
  assert(Math.abs(Number(actual) - Number(expected)) < 0.02, `${message}: expected ${expected}, got ${actual}`);
}

const asOf = new Date(2026, 9, 7);

{
  const insights = buildDashboardInsights(compileLedger({}), asOf);
  assert(insights.asOf === "2026-10-07", "as-of date is today");
  assert(insights.series.length === 6, "six months");
  assert(insights.series[0].month === "May 2026" && insights.series[0].from === "2026-05-01", "window starts in May");
  assert(insights.series[4].to === "2026-09-30", "September is a full month");
  assert(insights.series[5].to === "2026-10-07", "current month stops today");
  assert(insights.revenueChange.label === "0.0% vs last month", "flat months are 0 percent");
  assert(insights.revenueChange.percent === 0, "flat percent is numeric");
  assert(insights.current.margin === 0, "empty margin is zero");
  assert(!JSON.stringify(insights).includes("NaN"), "empty books never produce NaN");
  near(insights.snapshot.cash, 0, "empty cash");
}

{
  const change = periodChange(1000, 0);
  assert(change.label === "No prior month", "a new month does not divide by zero");
  assert(change.percent === null, "no prior base has no percent");
  assert(!change.label.includes("NaN"), "label is defined");
}

{
  const ledger = compileLedger({
    sales: [
      { id: "sep", sale_date: "2026-09-15", grand_total: 200, payment_status: "pending", total_paid: 0 },
      { id: "oct", sale_date: "2026-10-02", grand_total: 300, payment_status: "pending", total_paid: 0 },
    ],
  });
  const insights = buildDashboardInsights(ledger, asOf);
  near(insights.previous.revenue, 200, "prior month revenue");
  near(insights.current.revenue, 300, "current month revenue through today");
  near(insights.revenueChange.percent, 50, "month over month");
  assert(insights.revenueChange.label === "50.0% vs last month", "comparison label");
  near(insights.ytd.revenue, 500, "year to date includes both months");
  near(insights.snapshot.receivables, 500, "open invoices are receivables");
  near(insights.ytd.vehicleSales, 500, "vehicle sales mix");
  assert(!JSON.stringify(insights).includes("NaN"), "active books never produce NaN");
}

{
  const ledger = compileLedger({
    sales: [{ id: "only", sale_date: "2026-10-03", grand_total: 1000, payment_status: "paid", total_paid: 1000 }],
  });
  const insights = buildDashboardInsights(ledger, asOf);
  near(insights.current.revenue, 1000, "first month of revenue");
  assert(insights.revenueChange.label === "No prior month", "zero prior month stays defined");
  near(insights.snapshot.cash, 1000, "collected cash is current");
  near(insights.current.margin, 100, "margin on a sale with no cost");
}

{
  const admin = { role: "admin" };
  const client = { role: "client" };
  const user = { role: "user" };
  const manager = { role: "manager" };
  assert(isAdminUser(admin) && !isAdminUser(client) && !isAdminUser(user) && !isAdminUser(manager), "only admin role");
  assert(canSeeNavItem({ pageId: "Settings" }, admin), "admin sees settings");
  assert(canSeeNavItem({ pageId: "Companies" }, admin), "admin sees companies");
  assert(canSeeNavItem({ pageId: "AdminPortal" }, admin, ["Dashboard"]), "admin portal ignores module filter");
  for (const account of [client, user, manager, null]) {
    assert(!canSeeNavItem({ pageId: "Settings" }, account, ["Settings", "Companies"]), `${account?.role || "guest"} cannot see settings`);
    assert(!canSeeNavItem({ pageId: "Companies" }, account), `${account?.role || "guest"} cannot see companies`);
    assert(!canSeeNavItem({ pageId: "AdminPortal" }, account), `${account?.role || "guest"} cannot see the admin portal`);
  }
  assert(canSeeNavItem({ pageId: "Dashboard" }, client, ["Dashboard"]), "client keeps granted pages");
  assert(!canSeeNavItem({ pageId: "Banking" }, client, ["Dashboard"]), "module filter still applies");
}

console.log(`${passed} checks passed, ${failed} failed`);
if (failed > 0) process.exit(1);
