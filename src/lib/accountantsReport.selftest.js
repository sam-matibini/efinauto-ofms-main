import { compileLedger } from "./financialStatements.js";
import { csvDocument, formatExportAmount } from "./reportFormat.js";
import { buildAccountantsPackage, chunkNotes, packageRows, suggestedPackageKind } from "./accountantsReport.js";
import { resolveReportLogo, saveReportLogo } from "./reportLogo.js";
import { amountColumnPositions, buildAccountantsPdf, buildStatementPdf } from "./reportPdf.js";

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

assert(formatExportAmount(1905603.34) === "1,905,603.34", "exports group thousands with commas");
assert(formatExportAmount(-1250) === "(1,250.00)", "negative exports use accounting parentheses");
assert(formatExportAmount(0) === "-" && formatExportAmount(0.001) === "-", "a zero amount is a dash");
assert(csvDocument([["Jan 1, 2026 - Oct 7, 2026", "1,905,603.34"]]) === '"Jan 1, 2026 - Oct 7, 2026","1,905,603.34"', "commas inside a CSV cell are quoted");

const ledger = compileLedger({
  sales: [{ id: "s1", sale_date: "2025-03-01", grand_total: 48978.05, payment_status: "pending", total_paid: 0, customer_name: "Ada" }],
});

const annual = buildAccountantsPackage({
  ledger,
  companyName: "DTMS",
  from: new Date(2025, 0, 1),
  to: new Date(2025, 11, 31),
  kind: "year_end",
  basis: "accrual",
});
assert(suggestedPackageKind(new Date(2025, 0, 1), new Date(2025, 11, 31)) === "year_end", "a full year suggests year end");
assert(annual.kind === "year_end" && annual.adjusted === false, "year-end package keeps the selected year");
assert(annual.sections.map((section) => section.title).join("|") === "Statement of Income|Statement of Retained Earnings|Statement of Financial Position|Statement of Cash Flows", "ASPE package has the four statements");
assert(annual.notes.length >= 8, "notes cover the ASPE package");
assert(annual.inBalance, "year-end package stays in balance");
assert(annual.columns.length >= 2, "ASPE comparative column is included");
const revenue = annual.sections[0].rows.find((line) => line.label === "Revenue");
const parts = annual.sections[0].rows.find((line) => line.label === "Parts revenue");
assert(revenue.amounts[0] === "48,978.05", "statement revenue uses comma formatting");
assert(parts.amounts[0] === "-", "a zero statement line is a dash");
assert(annual.notes.some((note) => note.paragraphs.join(" ").includes("$48,978.05")), "notes quote the same revenue");
assert(annual.preface.join(" ").includes("ASPE"), "accrual package cites ASPE");
assert(annual.notes.some((note) => note.paragraphs.join(" ").includes("nil")), "zero balances stay nil in the note narrative");
const signatureRow = packageRows({ ...annual, signature: { name: "Sam Matibini", designation: "Accountant", signedAt: "2026-10-07" } })
  .find((row) => row[0] === "Accountant's signature");
assert(signatureRow?.[1] === "Sam Matibini" && signatureRow?.[2] === "Accountant", "package lists the accountant signature");
assert(chunkNotes(annual.notes).length >= 2, "notes are split across letter pages");
const positions = amountColumnPositions(612, 2);
assert(positions[0] < positions[1], "current year column sits left of the comparative column");
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, value),
  removeItem: (key) => store.delete(key),
};
assert(resolveReportLogo("co", "https://cdn.example/logo.png") === "https://cdn.example/logo.png", "cover uses the company logo until one is inserted");
saveReportLogo("co", { image: png, hidden: false });
assert(resolveReportLogo("co", "https://cdn.example/logo.png") === png, "an inserted logo replaces the company logo");
saveReportLogo("co", { image: "", hidden: true });
assert(resolveReportLogo("co", "https://cdn.example/logo.png") === "", "removing the logo leaves the cover without one");

function textPlacements(pdf) {
  const raw = pdf.output();
  const placements = [];
  const pattern = /([0-9.]+) ([0-9.]+) Td\s*\(([^)]*)\) Tj/g;
  let match = pattern.exec(raw);
  while (match) {
    placements.push({ x: Number(match[1]), y: Number(match[2]), text: match[3] });
    match = pattern.exec(raw);
  }
  return placements;
}

const pdf = buildAccountantsPdf(annual, { name: "Sam Matibini", designation: "Accountant" }, { logo: png });
const notePages = chunkNotes(annual.notes).length;
assert(pdf.getNumberOfPages() >= 2 + annual.sections.length + notePages, "cover, letter, each statement, and the notes each start a page");
const placed = textPlacements(pdf);
const currentYear = placed.filter((item) => item.text === "2025");
const priorYear = placed.filter((item) => item.text === "2024");
assert(currentYear.length > 0 && priorYear.length > 0, "statement headers print both years");
const paired = currentYear.find((item) => priorYear.some((prior) => prior.y === item.y));
const priorOnSameLine = priorYear.find((item) => item.y === paired?.y);
assert(paired && priorOnSameLine && paired.x < priorOnSameLine.x, "PDF prints the current year before the comparative year");
assert(placed.some((item) => item.text === "Account"), "PDF statement has an account column");
assert(placed.some((item) => item.text === "Financial Statements"), "the cover names the package");
assert(pdf.output().includes("/Subtype /Image") || pdf.output().includes("/Image"), "the cover can carry an inserted logo");

const statement = buildStatementPdf({
  company: "Oluspe Auto Sales and Parts Inc.",
  title: "Statement of Financial Position",
  subtitle: "the year ended Dec 31, 2025",
  columns: ["2025", "2024"],
  rows: [
    { label: "Cash and bank", amounts: ["26,512.89", "-"], indent: 1 },
    { label: "Total assets", amounts: ["1,962,087.15", "552,859.83"], total: true },
  ],
  footer: "Accrual basis",
});
const statementText = textPlacements(statement);
const statementCurrent = statementText.find((item) => item.text === "2025");
const statementPrior = statementText.find((item) => item.text === "2024");
assert(statementCurrent && statementPrior && statementCurrent.x < statementPrior.x, "a single statement PDF keeps the current year first");

const interim = buildAccountantsPackage({
  ledger,
  companyName: "DTMS",
  from: new Date(2026, 0, 1),
  to: new Date(2026, 9, 7),
  kind: "interim",
  basis: "accrual",
});
assert(suggestedPackageKind(new Date(2026, 0, 1), new Date(2026, 9, 7)) === "interim", "year to date suggests interim");
assert(interim.kind === "interim" && interim.preface.join(" ").toLowerCase().includes("interim"), "interim report is labelled interim");

const rolled = buildAccountantsPackage({
  ledger,
  companyName: "DTMS",
  from: new Date(2026, 0, 1),
  to: new Date(2026, 9, 7),
  kind: "year_end",
  basis: "accrual",
});
assert(rolled.adjusted && rolled.period.to.getFullYear() === 2025, "year end before December uses the last completed year");
assert(rolled.sections[0].rows.find((line) => line.label === "Revenue").amounts[0] === "48,978.05", "completed year still contains the 2025 sale");

console.log(`${passed} checks passed, ${failed} failed`);
if (failed > 0) process.exit(1);
