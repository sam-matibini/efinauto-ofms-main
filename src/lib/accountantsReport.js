import { subYears } from "date-fns";
import {
  balanceSheet,
  cashFlowStatement,
  profitAndLoss,
  retainedEarningsStatement,
} from "./financialStatements.js";
import { formatSignedAt } from "./accountantSignature.js";
import { formatExportAmount } from "./reportFormat.js";
import { isFinancialYear, rangeLabel } from "./reportPeriods.js";

function amount(value) {
  return formatExportAmount(value);
}

function columnAmounts(columns, pick) {
  return columns.map((column) => amount(pick(column)));
}

function row(label, columns, pick, options = {}) {
  return {
    label,
    amounts: columnAmounts(columns, pick),
    total: Boolean(options.total),
    indent: options.indent || 0,
  };
}

function money(value) {
  const formatted = formatExportAmount(value);
  if (formatted === "-") return "nil";
  return formatted.startsWith("(") ? formatted : `$${formatted}`;
}

export function suggestedPackageKind(from, to) {
  return isFinancialYear(from, to) ? "year_end" : "interim";
}

export function packagePeriod(from, to, kind) {
  if (kind === "year_end" && !isFinancialYear(from, to)) {
    const end = to instanceof Date ? to : new Date(to);
    const year = end.getMonth() === 11 && end.getDate() === 31 ? end.getFullYear() : end.getFullYear() - 1;
    return {
      from: new Date(year, 0, 1),
      to: new Date(year, 11, 31),
      adjusted: true,
    };
  }
  return { from, to, adjusted: false };
}

function withPriorYear(period, extraPeriods = []) {
  const priorFrom = subYears(period.from, 1);
  const priorTo = subYears(period.to, 1);
  const priorLabel = rangeLabel(priorFrom, priorTo);
  const columns = [{ from: period.from, to: period.to, label: rangeLabel(period.from, period.to) }];
  const extras = extraPeriods.filter((item) => item?.from && item?.to && item.label !== columns[0].label);
  const hasPrior = extras.some((item) => rangeLabel(item.from, item.to) === priorLabel);
  if (!hasPrior) columns.push({ from: priorFrom, to: priorTo, label: priorLabel });
  extras.forEach((item) => {
    const label = item.label || rangeLabel(item.from, item.to);
    if (!columns.some((column) => column.label === label)) columns.push({ ...item, label });
  });
  return columns;
}

function loadColumns(ledger, columns) {
  return columns.map((column) => ({
    ...column,
    income: profitAndLoss(ledger, column.from, column.to),
    retained: retainedEarningsStatement(ledger, column.from, column.to),
    position: balanceSheet(ledger, column.to),
    cash: cashFlowStatement(ledger, column.from, column.to),
  }));
}

function incomeRows(columns) {
  return [
    row("Vehicle sales", columns, (column) => column.income.vehicleSalesRevenue, { indent: 1 }),
    row("Service revenue", columns, (column) => column.income.serviceRevenue, { indent: 1 }),
    row("Parts revenue", columns, (column) => column.income.partsRevenue, { indent: 1 }),
    row("Other revenue", columns, (column) => column.income.otherRevenue, { indent: 1 }),
    row("Revenue", columns, (column) => column.income.revenue, { total: true }),
    row("Cost of vehicles sold", columns, (column) => column.income.vehicleCogs, { indent: 1 }),
    row("Cost of parts sold", columns, (column) => column.income.otherCogs, { indent: 1 }),
    row("Cost of sales", columns, (column) => column.income.cogs, { total: true }),
    row("Gross profit", columns, (column) => column.income.grossProfit, { total: true }),
    row("Operating expenses", columns, (column) => column.income.operatingExpenses, { indent: 1 }),
    row("Wages and salaries", columns, (column) => column.income.payrollExpenses, { indent: 1 }),
    row("Net income", columns, (column) => column.income.netProfit, { total: true }),
  ];
}

function retainedRows(columns) {
  return [
    row("Retained earnings, beginning of period", columns, (column) => column.retained.beginningRetainedEarnings),
    row("Net income", columns, (column) => column.retained.netIncome, { indent: 1 }),
    row("Other adjustments", columns, (column) => column.retained.otherAdjustments, { indent: 1 }),
    row("Drawings and dividends", columns, (column) => column.retained.dividends, { indent: 1 }),
    row("Retained earnings, end of period", columns, (column) => column.retained.endingRetainedEarnings, { total: true }),
  ];
}

function positionRows(columns) {
  return [
    row("Cash and bank", columns, (column) => column.position.cashAndBank, { indent: 1 }),
    row("Accounts receivable", columns, (column) => column.position.accountsReceivable, { indent: 1 }),
    row("Vehicle inventory", columns, (column) => column.position.vehicleInventory, { indent: 1 }),
    row("Parts and other inventory", columns, (column) => column.position.otherInventory, { indent: 1 }),
    row("Sales taxes recoverable", columns, (column) => column.position.taxReceivable, { indent: 1 }),
    row("Other current assets", columns, (column) => column.position.otherAssets, { indent: 1 }),
    row("Total current assets", columns, (column) => column.position.totalCurrentAssets, { total: true }),
    row("Property and equipment, at cost", columns, (column) => column.position.fixedAssets, { indent: 1 }),
    row("Accumulated depreciation", columns, (column) => column.position.accumulatedDepreciation, { indent: 1 }),
    row("Property and equipment, net", columns, (column) => column.position.netFixedAssets, { total: true }),
    row("Total assets", columns, (column) => column.position.totalAssets, { total: true }),
    row("Accounts payable and accrued liabilities", columns, (column) => column.position.accountsPayable, { indent: 1 }),
    row("Sales taxes payable", columns, (column) => column.position.taxPayable, { indent: 1 }),
    row("Payroll liabilities", columns, (column) => column.position.payrollLiabilities, { indent: 1 }),
    row("Short-term debt", columns, (column) => column.position.shortTermDebt, { indent: 1 }),
    row("Other current liabilities", columns, (column) => column.position.otherLiabilities, { indent: 1 }),
    row("Total current liabilities", columns, (column) => column.position.totalCurrentLiabilities, { total: true }),
    row("Long-term debt", columns, (column) => column.position.longTermDebt, { indent: 1 }),
    row("Total liabilities", columns, (column) => column.position.totalLiabilities, { total: true }),
    row("Owner's equity", columns, (column) => column.position.ownerEquity, { indent: 1 }),
    row("Retained earnings", columns, (column) => column.position.retainedEarnings, { indent: 1 }),
    row("Total equity", columns, (column) => column.position.totalEquity, { total: true }),
    row("Total liabilities and equity", columns, (column) => column.position.totalLiabilitiesAndEquity, { total: true }),
  ];
}

function cashRows(columns) {
  return [
    row("Cash received from customers", columns, (column) => column.cash.cashFromSales, { indent: 1 }),
    row("Cash paid to suppliers", columns, (column) => -column.cash.cashPaidToSuppliers, { indent: 1 }),
    row("Vehicle inventory purchases", columns, (column) => -column.cash.vehicleInventoryPurchases, { indent: 1 }),
    row("Cash paid for operating costs", columns, (column) => -column.cash.operatingExpenses, { indent: 1 }),
    row("Cash from operating activities", columns, (column) => column.cash.netCashFromOperating, { total: true }),
    row("Purchase of property and equipment", columns, (column) => -column.cash.equipmentPurchases, { indent: 1 }),
    row("Cash from investing activities", columns, (column) => column.cash.netCashFromInvesting, { total: true }),
    row("Cash from financing activities", columns, (column) => column.cash.netCashFromFinancing, { total: true }),
    row("Increase (decrease) in cash", columns, (column) => column.cash.netChangeInCash, { total: true }),
    row("Cash, beginning of period", columns, (column) => column.cash.beginningCash),
    row("Cash, end of period", columns, (column) => column.cash.endingCash, { total: true }),
  ];
}

function buildNotes(companyName, kind, basis, current) {
  const income = current.income;
  const position = current.position;
  const accrual = basis !== "cash";
  const framework = accrual
    ? "Canadian accounting standards for private enterprises (ASPE)"
    : "the cash basis of accounting, which is a special-purpose basis and is not a complete ASPE presentation";
  const notes = [
    {
      title: "Nature of operations and basis of presentation",
      paragraphs: [
        `${companyName} is a private enterprise. These ${kind === "year_end" ? "annual" : "interim"} financial statements are prepared from the company's books in accordance with ${framework}. Amounts are in Canadian dollars.`,
        kind === "interim"
          ? "The interim statements use the same recognition rules as the annual statements and should be read with the most recent annual financial statements. They are not a substitute for a complete year-end package."
          : "These statements present the financial year ended on the reporting date, with the preceding year shown for comparison.",
        accrual
          ? "Revenue is recognized when a vehicle is delivered, a repair is completed, or parts are sold, including amounts not yet collected. Expenses are recognized when incurred."
          : "Revenue and expenses are recognized only when cash is collected or paid.",
      ],
    },
    {
      title: "Significant accounting policies",
      paragraphs: [
        "Vehicle, parts, and other inventory are carried at cost. Unsold dealer inventory remains an asset and is not charged to income.",
        "Property and equipment are carried at cost less accumulated depreciation recorded in the books.",
        "Sales taxes are recorded separately as recoverable input tax credits and as taxes payable. They are not included in revenue.",
        "The company follows the taxes payable method. No income tax expense or future income tax balance is recorded in these books, so net income is presented before income tax.",
        "No allowance for doubtful accounts, related-party balances, commitments, or contingencies are identified in these books. A dash in the statements means the books contain no balance for that item.",
      ],
    },
    {
      title: "Cash and accounts receivable",
      paragraphs: [
        `Cash and bank at the reporting date is ${money(position.cashAndBank)}. Accounts receivable are ${money(position.accountsReceivable)} and are recorded at the amounts outstanding in the books.`,
      ],
    },
    {
      title: "Inventories",
      paragraphs: [
        `Vehicle inventory is ${money(position.vehicleInventory)}. Parts and other inventory are ${money(position.otherInventory)}. Inventory is stated at cost.`,
      ],
    },
    {
      title: "Property and equipment",
      paragraphs: [
        `Property and equipment at cost is ${money(position.fixedAssets)}. Accumulated depreciation is ${money(position.accumulatedDepreciation)}. The net carrying amount is ${money(position.netFixedAssets)}.`,
      ],
    },
    {
      title: "Liabilities",
      paragraphs: [
        `Accounts payable and accrued liabilities are ${money(position.accountsPayable)}. Sales taxes payable are ${money(position.taxPayable)}. Payroll liabilities are ${money(position.payrollLiabilities)}. Short-term debt is ${money(position.shortTermDebt)} and long-term debt is ${money(position.longTermDebt)}.`,
      ],
    },
    {
      title: "Equity and income",
      paragraphs: [
        `Owner's equity is ${money(position.ownerEquity)}. Retained earnings at the reporting date are ${money(position.retainedEarnings)}.`,
        `Revenue for the period is ${money(income.revenue)}, cost of sales is ${money(income.cogs)}, and net income is ${money(income.netProfit)}.`,
      ],
    },
    {
      title: "Statement of cash flows",
      paragraphs: [
        "The statement of cash flows is presented using the direct method. Cash at the end of the period equals cash on the statement of financial position.",
      ],
    },
    {
      title: "Comparative figures",
      paragraphs: [
        "Comparative figures are the same period of the prior year, together with any additional periods selected in the report filters. No audit or review engagement has been performed.",
      ],
    },
  ];
  return notes.map((note, index) => ({ number: index + 1, ...note }));
}

export function buildAccountantsPackage({
  ledger,
  companyName = "Company",
  from,
  to,
  kind = "interim",
  basis = "accrual",
  extraPeriods = [],
} = {}) {
  const period = packagePeriod(from, to, kind);
  const columns = loadColumns(ledger, withPriorYear(period, extraPeriods));
  const current = columns[0];
  const periodText = kind === "year_end"
    ? `the year ended ${rangeLabel(period.to, period.to)}`
    : `the period ${rangeLabel(period.from, period.to)}`;
  const reportingDate = rangeLabel(period.to, period.to);
  const preface = [
    `To the management of ${companyName}:`,
    `On the basis of information recorded in the company's books, the accompanying ${kind === "year_end" ? "annual" : "interim"} financial statements of ${companyName} as at ${reportingDate}, covering ${periodText}, have been assembled as an accountant's package.`,
    basis === "cash"
      ? "The statements are prepared on the cash basis. They are a special-purpose report and are not a complete set of financial statements under Canadian accounting standards for private enterprises."
      : "The statements are prepared in accordance with Canadian accounting standards for private enterprises (ASPE) and include the statement of income, the statement of retained earnings, the statement of financial position, the statement of cash flows, and the notes.",
    "No audit or review engagement has been performed, and this report is not an audit opinion. The package is generated from the accounting records for the accountant to review.",
  ];
  if (period.adjusted) {
    preface.push(`The selected dates are not a complete financial year, so the year-end package uses January 1 to December 31, ${period.to.getFullYear()}.`);
  }
  return {
    companyName,
    kind,
    basis,
    period,
    adjusted: period.adjusted,
    title: kind === "year_end" ? "Financial Statements" : "Interim Financial Statements",
    periodText,
    reportingDate,
    preface,
    columns,
    sections: [
      { title: "Statement of Income", rows: incomeRows(columns) },
      { title: "Statement of Retained Earnings", rows: retainedRows(columns) },
      { title: "Statement of Financial Position", rows: positionRows(columns) },
      { title: "Statement of Cash Flows", rows: cashRows(columns) },
    ],
    notes: buildNotes(companyName, kind, basis, current),
    inBalance: current.position.inBalance,
  };
}

export function chunkNotes(notes, budget = 10) {
  const pages = [];
  let current = [];
  let weight = 0;
  (notes || []).forEach((note) => {
    const noteWeight = 2 + (note.paragraphs || []).reduce(
      (sum, paragraph) => sum + Math.max(1, Math.ceil(String(paragraph).length / 380)),
      0,
    );
    if (current.length > 0 && weight + noteWeight > budget) {
      pages.push(current);
      current = [];
      weight = 0;
    }
    current.push(note);
    weight += noteWeight;
  });
  if (current.length) pages.push(current);
  return pages;
}

export function packageRows(pack) {
  const header = ["", ...pack.columns.map((column) => column.label)];
  const rows = [
    [pack.companyName],
    [pack.title],
    [pack.periodText],
    [`Prepared under ${pack.basis === "cash" ? "cash basis" : "ASPE"}`],
    [],
    ["Accountant's Report"],
    ...pack.preface.map((paragraph) => [paragraph]),
    [],
    [
      "Accountant's signature",
      pack.signature?.name || "Accountant",
      pack.signature?.designation || "Accountant",
      formatSignedAt(pack.signature?.signedAt),
    ],
    [],
  ];
  pack.sections.forEach((section) => {
    rows.push([section.title]);
    rows.push(header);
    section.rows.forEach((line) => rows.push([line.label, ...line.amounts]));
    rows.push([]);
  });
  rows.push(["Notes to the Financial Statements"]);
  pack.notes.forEach((note) => {
    rows.push([`${note.number}. ${note.title}`]);
    note.paragraphs.forEach((paragraph) => rows.push([paragraph]));
    rows.push([]);
  });
  return rows;
}

export function financialReportSections(ledger, periods, reportId) {
  const columns = (periods || []).filter((period) => period?.from && period?.to).map((period) => ({
    ...period,
    label: period.label || rangeLabel(period.from, period.to),
  }));
  if (columns.length === 0) return [];
  const loaded = loadColumns(ledger, columns);
  if (reportId === "income") return [{ title: "Statement of Income", rows: incomeRows(loaded) }];
  if (reportId === "balance") return [{ title: "Statement of Financial Position", rows: positionRows(loaded) }];
  if (reportId === "cashflow") return [{ title: "Statement of Cash Flows", rows: cashRows(loaded) }];
  if (reportId === "dashboard") {
    return [{
      title: "Financial Dashboard",
      rows: [
        row("Revenue", loaded, (column) => column.income.revenue),
        row("Net income", loaded, (column) => column.income.netProfit),
        row("Total assets", loaded, (column) => column.position.totalAssets),
        row("Cash", loaded, (column) => column.position.cashAndBank, { total: true }),
      ],
    }];
  }
  return [];
}

export function sectionsToRows(sections, periods) {
  const header = ["Account", ...(periods || []).map((period) => period.label)];
  const rows = [];
  sections.forEach((section) => {
    rows.push([section.title]);
    rows.push(header);
    section.rows.forEach((line) => rows.push([line.label, ...line.amounts]));
    rows.push([]);
  });
  return rows;
}
