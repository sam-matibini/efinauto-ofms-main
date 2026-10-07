import { compactSalesRates, refreshCanadianTaxes, salesRate } from "./canadianTaxSchedule.js";
import { calculatePayrollDeductions } from "./canadianPayroll.js";
import { canSeeNavItem } from "./access.js";

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

{
  const current = salesRate("NS", "2026-10-07");
  const previous = salesRate("NS", "2025-03-31");
  assert(current.hst === 14 && current.total === 14, "Nova Scotia HST is 14% after April 1, 2025");
  assert(previous.hst === 15, "Nova Scotia HST stays 15% before the change");
  assert(salesRate("ON", "2026-10-07").hst === 13, "Ontario HST");
  assert(salesRate("SK", "2026-10-07").pst === 6 && salesRate("SK").gst === 5, "Saskatchewan GST and PST");
  near(salesRate("QC").pst, 9.975, "Quebec QST");
  assert(salesRate("AB").hst === 0 && salesRate("AB").gst === 5, "Alberta GST only");
  const compact = compactSalesRates("2026-10-07");
  assert(compact.NS.hst === 14 && compact.ON.hst === 13, "company rate map uses the current schedule");
}

{
  const pay = calculatePayrollDeductions({
    grossPay: 2000,
    payFrequency: "bi_weekly",
    province: "ON",
    asOf: "2026-10-07",
  });
  near(pay.cppEmployee, 110.99, "biweekly CPP uses the 2026 exemption and 5.95%");
  near(pay.eiEmployee, 32.6, "biweekly EI uses 1.63%");
  assert(pay.federalTax > 0 && pay.provincialTax > 0, "income tax is withheld");
  assert(pay.netPay < 2000, "net pay is below gross");
  assert(pay.taxYear === 2026, "payroll year is 2026");
}

{
  const capped = calculatePayrollDeductions({
    grossPay: 2000,
    payFrequency: "bi_weekly",
    province: "ON",
    ytdGross: 74000,
    ytdCpp: 4230.45,
    ytdEi: 1123.07,
    asOf: "2026-10-07",
  });
  near(capped.cppEmployee, 56, "CPP2 applies only above the YMPE");
  near(capped.eiEmployee, 0, "EI stops at the annual maximum");
}

{
  const quebec = calculatePayrollDeductions({
    grossPay: 2000,
    payFrequency: "bi_weekly",
    province: "QC",
    asOf: "2026-10-07",
  });
  assert(quebec.cppEmployee > 110.99, "QPP rate is higher than CPP");
  near(quebec.eiEmployee, 26, "Quebec EI is 1.30%");
  near(quebec.qpipEmployee, 8.6, "QPIP is 0.430% of biweekly pay");
}

{
  const refreshed = refreshCanadianTaxes(new Date(2026, 9, 7));
  assert(refreshed.taxYear === 2026, "refresh stamps the 2026 year");
  assert(refreshed.sales.NS.hst === 14, "refresh returns the current Nova Scotia rate");
  assert(refreshed.companyRates.NS.hst === 14, "refresh prepares company tax rates");
}

for (const account of [{ role: "client" }, { role: "user" }, { role: "manager" }, null]) {
  assert(!canSeeNavItem({ pageId: "Pricing" }, account, ["Pricing"]), `${account?.role || "guest"} cannot see pricing`);
}
assert(canSeeNavItem({ pageId: "Pricing" }, { role: "admin" }), "admin sees pricing");

console.log(`${passed} checks passed, ${failed} failed`);
if (failed > 0) process.exit(1);
