const SALES_BEFORE_APRIL_2025 = {
  AB: row("Alberta", 5, 0, 0, "GST"),
  BC: row("British Columbia", 5, 7, 0, "GST+PST"),
  MB: row("Manitoba", 5, 7, 0, "GST+PST"),
  NB: row("New Brunswick", 0, 0, 15, "HST"),
  NL: row("Newfoundland and Labrador", 0, 0, 15, "HST"),
  NT: row("Northwest Territories", 5, 0, 0, "GST"),
  NS: row("Nova Scotia", 0, 0, 15, "HST"),
  NU: row("Nunavut", 5, 0, 0, "GST"),
  ON: row("Ontario", 0, 0, 13, "HST"),
  PE: row("Prince Edward Island", 0, 0, 15, "HST"),
  QC: row("Quebec", 5, 9.975, 0, "GST+QST"),
  SK: row("Saskatchewan", 5, 6, 0, "GST+PST"),
  YT: row("Yukon", 5, 0, 0, "GST"),
};

const SALES_FROM_APRIL_2025 = {
  ...SALES_BEFORE_APRIL_2025,
  NS: row("Nova Scotia", 0, 0, 14, "HST"),
};

function row(name, gst, pst, hst, type) {
  return { name, gst, pst, hst, total: roundRate(gst + pst + hst), type };
}

function roundRate(value) {
  return Math.round(value * 1000) / 1000;
}

export function roundMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function taxDay(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const date = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${date}`;
  }
  const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : taxDay(new Date());
}

export function salesRatesAsOf(asOf = new Date()) {
  return taxDay(asOf) >= "2025-04-01" ? SALES_FROM_APRIL_2025 : SALES_BEFORE_APRIL_2025;
}

export function salesRate(province, asOf = new Date()) {
  return salesRatesAsOf(asOf)[province] || null;
}

export function compactSalesRates(asOf = new Date()) {
  return Object.fromEntries(
    Object.entries(salesRatesAsOf(asOf)).map(([code, rate]) => [code, { gst: rate.gst, pst: rate.pst, hst: rate.hst }])
  );
}

const BRACKETS_2026 = {
  federal: [
    { limit: 58523, rate: 0.14 },
    { limit: 117045, rate: 0.205 },
    { limit: 181440, rate: 0.26 },
    { limit: 258482, rate: 0.29 },
    { limit: Infinity, rate: 0.33 },
  ],
  AB: [
    { limit: 61200, rate: 0.08 },
    { limit: 154259, rate: 0.1 },
    { limit: 185111, rate: 0.12 },
    { limit: 246813, rate: 0.13 },
    { limit: 370220, rate: 0.14 },
    { limit: Infinity, rate: 0.15 },
  ],
  BC: [
    { limit: 50363, rate: 0.056 },
    { limit: 100728, rate: 0.077 },
    { limit: 115648, rate: 0.105 },
    { limit: 140430, rate: 0.1229 },
    { limit: 190405, rate: 0.147 },
    { limit: 265545, rate: 0.168 },
    { limit: Infinity, rate: 0.205 },
  ],
  MB: [
    { limit: 47000, rate: 0.108 },
    { limit: 100000, rate: 0.1275 },
    { limit: Infinity, rate: 0.174 },
  ],
  NB: [
    { limit: 52333, rate: 0.094 },
    { limit: 104666, rate: 0.14 },
    { limit: 193861, rate: 0.16 },
    { limit: Infinity, rate: 0.195 },
  ],
  NL: [
    { limit: 44678, rate: 0.087 },
    { limit: 89354, rate: 0.145 },
    { limit: 159528, rate: 0.158 },
    { limit: 223340, rate: 0.178 },
    { limit: 285319, rate: 0.198 },
    { limit: 570638, rate: 0.208 },
    { limit: 1141275, rate: 0.213 },
    { limit: Infinity, rate: 0.218 },
  ],
  NS: [
    { limit: 30995, rate: 0.0879 },
    { limit: 61991, rate: 0.1495 },
    { limit: 97417, rate: 0.1667 },
    { limit: 157124, rate: 0.175 },
    { limit: Infinity, rate: 0.21 },
  ],
  NT: [
    { limit: 53003, rate: 0.059 },
    { limit: 106009, rate: 0.086 },
    { limit: 172346, rate: 0.122 },
    { limit: Infinity, rate: 0.1405 },
  ],
  NU: [
    { limit: 55801, rate: 0.04 },
    { limit: 111602, rate: 0.07 },
    { limit: 181439, rate: 0.09 },
    { limit: Infinity, rate: 0.115 },
  ],
  ON: [
    { limit: 53891, rate: 0.0505 },
    { limit: 107785, rate: 0.0915 },
    { limit: 150000, rate: 0.1116 },
    { limit: 220000, rate: 0.1216 },
    { limit: Infinity, rate: 0.1316 },
  ],
  PE: [
    { limit: 33928, rate: 0.095 },
    { limit: 65820, rate: 0.1347 },
    { limit: 106890, rate: 0.166 },
    { limit: 142250, rate: 0.1762 },
    { limit: 200000, rate: 0.19 },
    { limit: Infinity, rate: 0.2 },
  ],
  QC: [
    { limit: 54345, rate: 0.14 },
    { limit: 108680, rate: 0.19 },
    { limit: 132245, rate: 0.24 },
    { limit: Infinity, rate: 0.2575 },
  ],
  SK: [
    { limit: 54532, rate: 0.105 },
    { limit: 155805, rate: 0.125 },
    { limit: Infinity, rate: 0.145 },
  ],
  YT: [
    { limit: 58523, rate: 0.064 },
    { limit: 117045, rate: 0.09 },
    { limit: 181440, rate: 0.109 },
    { limit: 500000, rate: 0.128 },
    { limit: Infinity, rate: 0.15 },
  ],
};

const PERSONAL_2026 = {
  federal: { amount: 16452, reduced: 14829, from: 181440, to: 258482 },
  AB: { amount: 22769 },
  BC: { amount: 13216 },
  MB: { amount: 15780 },
  NB: { amount: 13664 },
  NL: { amount: 13094 },
  NS: { amount: 11932 },
  NT: { amount: 18198 },
  NU: { amount: 19659 },
  ON: { amount: 12989 },
  PE: { amount: 15000 },
  QC: { amount: 18952 },
  SK: { amount: 20381 },
  YT: { amount: 16452 },
};

const PAYROLL_2026 = {
  taxYear: 2026,
  effective: "2026-01-01",
  cpp: {
    ympe: 74600,
    yampe: 85000,
    basicExemption: 3500,
    rate: 0.0595,
    maxEmployee: 4230.45,
    cpp2Rate: 0.04,
    cpp2Max: 416,
  },
  qpp: {
    ympe: 74600,
    yampe: 85000,
    basicExemption: 3500,
    rate: 0.063,
    maxEmployee: 4479.3,
    cpp2Rate: 0.04,
    cpp2Max: 416,
  },
  ei: {
    maxInsurable: 68900,
    employeeRate: 0.0163,
    employerRate: 0.02282,
    maxEmployee: 1123.07,
    maxEmployer: 1572.3,
  },
  eiQuebec: {
    maxInsurable: 68900,
    employeeRate: 0.013,
    employerRate: 0.0182,
    maxEmployee: 895.7,
    maxEmployer: 1253.98,
  },
  qpip: {
    maxInsurable: 103000,
    employeeRate: 0.0043,
    employerRate: 0.00602,
    maxEmployee: 442.9,
    maxEmployer: 620.06,
  },
  federalAbatement: 0.165,
  ontarioSurtax: [
    { over: 5818, rate: 0.2 },
    { over: 7446, rate: 0.36 },
  ],
  brackets: BRACKETS_2026,
  personal: PERSONAL_2026,
  sources: [
    "CRA GST/HST rates, Nova Scotia 14% from April 1, 2025",
    "CRA CPP and EI maximums for 2026",
    "CRA federal and provincial income tax brackets for 2026",
    "Revenu Québec QPP and QPIP for 2026",
  ],
};

export function payrollRules(asOf = new Date()) {
  const year = Number(taxDay(asOf).slice(0, 4));
  if (year >= 2026) return PAYROLL_2026;
  return PAYROLL_2026;
}

const REFRESH_KEY = "efinauto.canadianTaxRefresh";

export function lastTaxRefresh() {
  if (typeof localStorage === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(REFRESH_KEY) || "null");
  } catch {
    return null;
  }
}

export function refreshCanadianTaxes(now = new Date()) {
  const sales = salesRatesAsOf(now);
  const payroll = payrollRules(now);
  const record = {
    refreshedAt: now.toISOString(),
    taxYear: payroll.taxYear,
    salesEffective: taxDay(now) >= "2025-04-01" ? "2025-04-01" : "2016-10-01",
    sources: payroll.sources,
  };
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(REFRESH_KEY, JSON.stringify(record));
  }
  return { ...record, sales, payroll, companyRates: compactSalesRates(now) };
}
