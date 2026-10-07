import { compileLedger } from "./financialStatements.js";
import { csvDocument, formatExportAmount } from "./reportFormat.js";
import { buildAccountantsPackage, chunkNotes, packageRows, suggestedPackageKind } from "./accountantsReport.js";
import { buildAccountantsPdf } from "./reportPdf.js";

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
const pdf = buildAccountantsPdf(annual, { name: "Sam Matibini", designation: "Accountant" });
assert(pdf.getNumberOfPages() >= 1 + annual.sections.length + 1, "each statement starts on its own PDF page");

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
