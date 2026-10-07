import {
  applyMapping,
  autoMapColumns,
  mergeImportHistory,
  parseStatementBytes,
  parseStatementText,
  reversalPlan,
  sampleCsv,
  sampleSpreadsheetXml,
  TEMPLATE_HEADERS,
} from "./statementImport.js";

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

function zipStored(name, text) {
  const data = new TextEncoder().encode(text);
  const nameBytes = new TextEncoder().encode(name);
  const header = new Uint8Array(30 + nameBytes.length + data.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(8, 0, true);
  view.setUint32(18, data.length, true);
  view.setUint32(22, data.length, true);
  view.setUint16(26, nameBytes.length, true);
  header.set(nameBytes, 30);
  header.set(data, 30 + nameBytes.length);
  return header;
}

const table = parseStatementText(sampleCsv(), "bank-statement-sample.csv");
assert(table.headers.join("|") === TEMPLATE_HEADERS.join("|"), "sample csv uses the statement template");
const mapping = autoMapColumns(table.headers);
assert(mapping.transaction_date === 0 && mapping.debit === 2 && mapping.credit === 3, "template columns map to date, debit, and credit");
const preview = applyMapping(table, mapping);
assert(preview.length === 2 && preview.every((row) => !row.error), "sample rows preview without errors");
assert(preview[0].transaction_type === "credit" && preview[0].amount === 1500, "a deposit previews as a credit");
assert(preview[1].transaction_type === "debit" && preview[1].amount === 240.5, "a withdrawal previews as a debit");

const sheet = parseStatementText(sampleSpreadsheetXml(), "bank-statement-sample.xls");
assert(applyMapping(sheet, autoMapColumns(sheet.headers))[1].reference_number === "CHK-442", "the xls template previews the same reference");

const ofx = parseStatementText(`<OFX><STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260116
<TRNAMT>-240.50
<FITID>CHK-442
<NAME>NAPA
<MEMO>Parts supplier payment
</STMTTRN></OFX>`, "statement.ofx");
assert(applyMapping(ofx, autoMapColumns(ofx.headers))[0].transaction_type === "debit", "an OFX withdrawal maps as a debit");

const qif = parseStatementText(`!Type:Bank
D01/15/2026
T1500.00
PAda Okonkwo
MCustomer deposit
NDEP-1001
^`, "statement.qif");
const qifRow = applyMapping(qif, autoMapColumns(qif.headers))[0];
assert(qifRow.transaction_date === "2026-01-15" && qifRow.transaction_type === "credit", "a QIF deposit previews with a January date");

const camt = parseStatementText(`<Document><Ntry>
<Amt Ccy="CAD">240.50</Amt><CdtDbtInd>DBIT</CdtDbtInd>
<BookgDt><Dt>2026-01-16</Dt></BookgDt>
<NtryDtls><TxDtls><Refs><EndToEndId>CHK-442</EndToEndId></Refs>
<RltdPties><Cdtr><Nm>NAPA</Nm></Cdtr></RltdPties>
<RmtInf><Ustrd>Parts supplier payment</Ustrd></RmtInf>
</TxDtls></NtryDtls></Ntry></Document>`, "camt.053.xml");
assert(applyMapping(camt, autoMapColumns(camt.headers))[0].payee === "NAPA", "a CAMT entry previews the payee");

const workbook = zipStored(
  "xl/worksheets/sheet1.xml",
  `<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Date</t></is></c><c r="B1" t="inlineStr"><is><t>Amount</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>2026-01-15</t></is></c><c r="B2"><v>-25.00</v></c></row></sheetData></worksheet>`,
);
const xlsx = await parseStatementBytes(workbook, "statement.xlsx");
const xlsxRow = applyMapping(xlsx, autoMapColumns(xlsx.headers))[0];
assert(xlsxRow.transaction_date === "2026-01-15" && xlsxRow.transaction_type === "debit" && xlsxRow.amount === 25, "an xlsx amount column previews as a debit");

const history = mergeImportHistory([], [
  { id: "b1", import_batch_id: "import-1700000000000", bank_account_id: "acct", description: "Deposit" },
  { id: "b2", import_batch_id: "import-1700000000000", bank_account_id: "acct", description: "Payment" },
], [{ id: "acct", account_name: "ScotiaBank" }]);
assert(history.length === 1 && history[0].count === 2 && history[0].accountName === "ScotiaBank", "import history groups a batch");
const plan = reversalPlan([
  { id: "b1", import_batch_id: "import-1", posted_to_gl: true, transaction_id: "gl-1" },
  { id: "b2", import_batch_id: "import-1", reconciled: true },
], "import-1");
assert(plan.blocked && plan.glIds[0] === "gl-1" && plan.bankIds.length === 2, "a reconciled import is blocked and still lists the ledger posting");

console.log(`${passed} checks passed, ${failed} failed`);
if (failed > 0) process.exit(1);
