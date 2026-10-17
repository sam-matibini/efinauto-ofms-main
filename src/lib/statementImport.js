export const TEMPLATE_HEADERS = ["Date", "Description", "Debit", "Credit", "Payee", "Reference Number", "Balance"];

export const STATEMENT_FIELDS = [
  { key: "transaction_date", label: "Date", required: true },
  { key: "description", label: "Description", required: true },
  { key: "debit", label: "Debit" },
  { key: "credit", label: "Credit" },
  { key: "amount", label: "Amount" },
  { key: "transaction_type", label: "Type" },
  { key: "payee", label: "Payee" },
  { key: "reference_number", label: "Reference Number" },
  { key: "balance", label: "Balance" },
];

const FIELD_ALIASES = {
  transaction_date: ["date", "transaction date", "posted date", "posting date", "trans date", "value date"],
  description: ["description", "memo", "narrative", "details", "particulars", "transaction description"],
  debit: ["debit", "withdrawal", "withdrawals", "money out", "paid out", "debit amount"],
  credit: ["credit", "deposit", "deposits", "money in", "paid in", "credit amount"],
  amount: ["amount", "amt", "transaction amount"],
  transaction_type: ["type", "transaction type", "dr/cr", "debit/credit", "cr/dr"],
  payee: ["payee", "name", "merchant", "paid to"],
  reference_number: ["reference number", "reference", "ref", "cheque", "check number", "check", "fitid", "transaction id"],
  balance: ["balance", "running balance", "closing balance"],
};

const SAMPLE_ROWS = [
  ["2026-01-15", "Customer deposit", "", "1500.00", "Ada Okonkwo", "DEP-1001", "1500.00"],
  ["2026-01-16", "Parts supplier payment", "240.50", "", "NAPA", "CHK-442", "1259.50"],
];

const storageKey = (companyId) => `efinauto.statementImports.${companyId || "local"}`;

export function sampleCsv() {
  return [TEMPLATE_HEADERS, ...SAMPLE_ROWS].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function sampleSpreadsheetXml() {
  const rows = [TEMPLATE_HEADERS, ...SAMPLE_ROWS].map((row) => {
    const cells = row.map((value) => `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`).join("");
    return `<Row>${cells}</Row>`;
  }).join("");
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Statement"><Table>${rows}</Table></Worksheet>
</Workbook>`;
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function escapeXml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function parseAmount(value) {
  if (value == null) return null;
  let text = String(value).trim();
  if (!text || text === "-") return null;
  const negative = /^\(.*\)$/.test(text) || text.startsWith("-");
  text = text.replace(/[$,\s]/g, "").replace(/[()]/g, "");
  if (!text) return null;
  const amount = Number(text);
  if (!Number.isFinite(amount)) return null;
  return negative ? -Math.abs(amount) : amount;
}

export function detectDateOrder(values) {
  let dayFirst = 0;
  let monthFirst = 0;
  (values || []).forEach((value) => {
    const match = String(value || "").trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (!match) return;
    const first = Number(match[1]);
    const second = Number(match[2]);
    if (first > 12) dayFirst += 1;
    else if (second > 12) monthFirst += 1;
  });
  return monthFirst > dayFirst ? "mdy" : "dmy";
}

export function parseStatementDate(value, order = "dmy") {
  const text = String(value || "").trim();
  if (!text) return "";
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const compact = text.match(/^(\d{4})(\d{2})(\d{2})/);
  if (compact && !text.includes("/") && !text.includes("-")) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  const named = text.match(/^(\d{1,2})[-\s/]([A-Za-z]{3,})[-\s/](\d{2,4})$/);
  if (named) {
    const month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(named[2].slice(0, 3).toLowerCase());
    if (month >= 0) {
      const year = named[3].length === 2 ? `20${named[3]}` : named[3];
      return `${year}-${String(month + 1).padStart(2, "0")}-${named[1].padStart(2, "0")}`;
    }
  }
  const parts = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!parts) return "";
  let day = parts[1];
  let month = parts[2];
  if (order === "mdy") [month, day] = [day, month];
  let year = parts[3];
  if (year.length === 2) year = `20${year}`;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export function parseDelimited(text, delimiter) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const source = String(text || "").replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === "\"" && source[index + 1] === "\"") {
        cell += "\"";
        index += 1;
      } else if (char === "\"") quoted = false;
      else cell += char;
      continue;
    }
    if (char === "\"") {
      quoted = true;
      continue;
    }
    if (char === delimiter) {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (char !== "\r") cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function headerKey(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function autoMapColumns(headers) {
  const mapping = {};
  const used = new Set();
  (headers || []).forEach((header, index) => {
    const key = headerKey(header);
    const field = Object.entries(FIELD_ALIASES).find(([name, aliases]) => !used.has(name) && (aliases.includes(key) || key === name));
    if (!field) return;
    mapping[field[0]] = index;
    used.add(field[0]);
  });
  return mapping;
}

function tableFromRows(rows) {
  if (!rows.length) throw new Error("The file has no rows.");
  const firstLooksLikeDate = Boolean(parseStatementDate(rows[0][0], "dmy") || parseStatementDate(rows[0][0], "mdy"));
  const headers = firstLooksLikeDate ? TEMPLATE_HEADERS.slice(0, rows[0].length) : rows[0];
  const data = firstLooksLikeDate ? rows : rows.slice(1);
  if (!data.length) throw new Error("The file has headers but no transactions.");
  return { headers, rows: data.map((row) => headers.map((_, index) => row[index] || "")) };
}

export function parseStatementText(text, filename = "") {
  const source = String(text || "").replace(/^\uFEFF/, "").trim();
  const lower = filename.toLowerCase();
  if (!source) throw new Error("The file is empty.");
  if (lower.endsWith(".ofx") || source.includes("<STMTTRN>") || source.includes("<OFX")) return parseOfx(source);
  if (lower.endsWith(".qif") || source.startsWith("!Type:")) return parseQif(source);
  if (source.includes("<Ntry") || lower.endsWith(".xml") || lower.includes("camt")) return parseCamt(source);
  if (source.includes("urn:schemas-microsoft-com:office:spreadsheet") || (lower.endsWith(".xls") && source.startsWith("<"))) {
    return tableFromRows(parseSpreadsheetMl(source));
  }
  if (source.includes("<table") || source.includes("<tr")) return tableFromRows(parseHtmlTable(source));
  const delimiter = lower.endsWith(".tsv") || (source.split("\t").length > source.split(",").length) ? "\t" : ",";
  return { ...tableFromRows(parseDelimited(source, delimiter)), format: delimiter === "\t" ? "tsv" : "csv" };
}

function parseOfx(text) {
  const blocks = text.split(/<STMTTRN>/i).slice(1);
  if (!blocks.length) throw new Error("No OFX transactions were found.");
  const rows = blocks.map((block) => {
    const pick = (tag) => {
      const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, "i"));
      return match ? match[1].trim() : "";
    };
    const amount = pick("TRNAMT");
    const numeric = parseAmount(amount);
    const type = (pick("TRNTYPE") || "").toUpperCase();
    const debit = numeric != null && (numeric < 0 || type.includes("DEBIT")) ? Math.abs(numeric).toFixed(2) : "";
    const credit = numeric != null && numeric > 0 && !type.includes("DEBIT") ? numeric.toFixed(2) : "";
    return [pick("DTPOSTED") || pick("DTUSER"), pick("MEMO") || pick("NAME"), debit, credit, pick("NAME"), pick("FITID") || pick("CHECKNUM"), ""];
  });
  return { headers: TEMPLATE_HEADERS, rows, format: "ofx" };
}

function parseQif(text) {
  const records = text.split("^").map((part) => part.trim()).filter(Boolean);
  const rows = [];
  records.forEach((record) => {
    const fields = {};
    record.split(/\r?\n/).forEach((line) => {
      if (!line || line.startsWith("!")) return;
      if (line.length > 1) fields[line[0]] = line.slice(1).trim();
    });
    const numeric = parseAmount(fields.T);
    const debit = numeric != null && numeric < 0 ? Math.abs(numeric).toFixed(2) : "";
    const credit = numeric != null && numeric > 0 ? numeric.toFixed(2) : "";
    if (!fields.D && numeric == null) return;
    rows.push([fields.D || "", fields.M || fields.P || "", debit, credit, fields.P || "", fields.N || "", ""]);
  });
  if (!rows.length) throw new Error("No QIF transactions were found.");
  return { headers: TEMPLATE_HEADERS, rows, format: "qif" };
}

function tagText(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, "i"));
  return match ? match[1].trim() : "";
}

function parseCamt(text) {
  const entries = text.split(/<Ntry\b/i).slice(1);
  if (!entries.length) throw new Error("No CAMT entries were found.");
  const rows = entries.map((entry) => {
    const amount = tagText(entry, "Amt");
    const indicator = tagText(entry, "CdtDbtInd").toUpperCase();
    const numeric = parseAmount(amount);
    const debit = indicator.startsWith("D") && numeric != null ? Math.abs(numeric).toFixed(2) : "";
    const credit = indicator.startsWith("C") && numeric != null ? Math.abs(numeric).toFixed(2) : "";
    const date = tagText(entry, "Dt") || tagText(entry, "DtTm");
    const description = tagText(entry, "Ustrd") || tagText(entry, "AddtlNtryInf");
    const payee = tagText(entry, "Nm");
    const reference = tagText(entry, "EndToEndId") || tagText(entry, "AcctSvcrRef");
    return [date, description, debit, credit, payee, reference, ""];
  });
  return { headers: TEMPLATE_HEADERS, rows, format: "camt" };
}

function parseSpreadsheetMl(text) {
  const rows = [];
  const rowMatches = text.match(/<Row\b[\s\S]*?<\/Row>/gi) || [];
  rowMatches.forEach((row) => {
    const cells = [...row.matchAll(/<Data\b[^>]*>([\s\S]*?)<\/Data>/gi)].map((match) => decodeXml(match[1].trim()));
    if (cells.some(Boolean)) rows.push(cells);
  });
  if (!rows.length) throw new Error("The spreadsheet has no rows.");
  return rows;
}

function parseHtmlTable(text) {
  const rows = [];
  const rowMatches = text.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
  rowMatches.forEach((row) => {
    const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) => decodeXml(match[1].replace(/<[^>]+>/g, "").trim()));
    if (cells.some(Boolean)) rows.push(cells);
  });
  if (!rows.length) throw new Error("The spreadsheet has no rows.");
  return rows;
}

function decodeXml(value) {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"");
}

function excelSerialToIso(serial) {
  const utc = Date.UTC(1899, 11, 30) + Number(serial) * 86400000;
  const date = new Date(utc);
  if (Number.isNaN(date.getTime())) return String(serial);
  return date.toISOString().slice(0, 10);
}

function columnIndex(reference) {
  const letters = String(reference || "").replace(/\d+/g, "");
  let index = 0;
  for (const char of letters) index = index * 26 + char.charCodeAt(0) - 64;
  return Math.max(0, index - 1);
}

export function parseSheetXml(sheetXml, sharedStrings = []) {
  const rows = [];
  const rowMatches = sheetXml.match(/<row\b[\s\S]*?<\/row>/gi) || [];
  rowMatches.forEach((row) => {
    const cells = [];
    const cellMatches = [...row.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/gi)];
    cellMatches.forEach((match) => {
      const attrs = match[1];
      const body = match[2];
      const reference = (attrs.match(/\br="([A-Z]+)\d+"/i) || [])[1] || "";
      const type = (attrs.match(/\bt="([^"]+)"/i) || [])[1] || "";
      let value = "";
      if (type === "inlineStr") value = decodeXml((body.match(/<t[^>]*>([\s\S]*?)<\/t>/i) || [])[1] || "");
      else if (type === "s") value = sharedStrings[Number((body.match(/<v>([\s\S]*?)<\/v>/i) || [])[1] || 0)] || "";
      else value = decodeXml((body.match(/<v>([\s\S]*?)<\/v>/i) || [])[1] || (body.match(/<t[^>]*>([\s\S]*?)<\/t>/i) || [])[1] || "");
      cells[columnIndex(reference)] = value.trim();
    });
    if (cells.some(Boolean)) rows.push(Array.from(cells, (cell) => cell || ""));
  });
  if (!rows.length) throw new Error("The spreadsheet has no rows.");
  const width = Math.max(...rows.map((row) => row.length));
  const rectangular = rows.map((row) => Array.from({ length: width }, (_, index) => row[index] || ""));
  if (rectangular.length > 1) {
    rectangular[0].forEach((header, index) => {
      if (!/date/i.test(header)) return;
      for (let rowIndex = 1; rowIndex < rectangular.length; rowIndex += 1) {
        const value = rectangular[rowIndex][index];
        if (/^\d{4,6}(\.\d+)?$/.test(value)) rectangular[rowIndex][index] = excelSerialToIso(value);
      }
    });
  }
  return rectangular;
}

function sharedStringsFromXml(xml) {
  const items = xml.match(/<si\b[\s\S]*?<\/si>/gi) || [];
  return items.map((item) => decodeXml([...item.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/gi)].map((match) => match[1]).join("")));
}

async function inflateRaw(data) {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzip(bytes) {
  const files = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const flags = view.getUint16(offset + 6, true);
    const method = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const name = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameLength));
    const dataStart = offset + 30 + nameLength + extraLength;
    if (flags & 0x8) throw new Error("This Excel file uses a format the importer cannot read. Save it as CSV.");
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    const data = method === 0 ? compressed : await inflateRaw(compressed);
    files.push({ name, text: new TextDecoder().decode(data) });
    offset = dataStart + compressedSize;
  }
  return files;
}

export async function parseStatementBytes(bytes, filename = "", encoding = "utf-8") {
  const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const lower = filename.toLowerCase();
  if (lower.endsWith(".xlsx") || (source[0] === 0x50 && source[1] === 0x4b)) {
    const files = await unzip(source);
    const sheet = files.find((file) => /xl\/worksheets\/sheet1\.xml$/i.test(file.name));
    const shared = files.find((file) => /xl\/sharedStrings\.xml$/i.test(file.name));
    if (!sheet) throw new Error("The workbook has no sheet. Save the first sheet as CSV.");
    const grid = parseSheetXml(sheet.text, shared ? sharedStringsFromXml(shared.text) : []);
    return { ...tableFromRows(grid), format: "xlsx" };
  }
  const label = encoding.toLowerCase() === "utf-8" ? "utf-8" : encoding;
  const text = new TextDecoder(label).decode(source);
  return parseStatementText(text, filename);
}

export function applyMapping(table, mapping) {
  const rows = table?.rows || [];
  const dateOrder = detectDateOrder(rows.map((row) => row[mapping.transaction_date]));
  return rows.filter((row) => row.some(Boolean)).map((row, index) => {
    const cell = (field) => (mapping[field] == null ? "" : row[mapping[field]] || "");
    const date = parseStatementDate(cell("transaction_date"), dateOrder);
    const description = cell("description") || cell("payee") || "Bank transaction";
    const debit = parseAmount(cell("debit"));
    const credit = parseAmount(cell("credit"));
    const signed = parseAmount(cell("amount"));
    const explicitType = headerKey(cell("transaction_type"));
    let transactionType = "";
    let amount = null;
    if (debit != null && Math.abs(debit) > 0) {
      transactionType = "debit";
      amount = Math.abs(debit);
    } else if (credit != null && Math.abs(credit) > 0) {
      transactionType = "credit";
      amount = Math.abs(credit);
    } else if (signed != null) {
      const markedDebit = explicitType.startsWith("d") || explicitType.includes("debit") || explicitType.includes("withdrawal");
      transactionType = markedDebit || signed < 0 ? "debit" : "credit";
      amount = Math.abs(signed);
    }
    const balance = parseAmount(cell("balance"));
    const errors = [];
    if (!date) errors.push("missing date");
    if (amount == null) errors.push("missing amount");
    return {
      rowNumber: index + 2,
      transaction_date: date,
      description,
      payee: cell("payee"),
      reference_number: cell("reference_number"),
      amount,
      transaction_type: transactionType,
      balance,
      error: errors.join(", "),
    };
  });
}

export function loadImportHistory(companyId) {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(companyId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveImportHistory(companyId, records) {
  if (typeof localStorage === "undefined") return records;
  localStorage.setItem(storageKey(companyId), JSON.stringify(records));
  return records;
}

export function rememberImport(companyId, record) {
  const next = mergeImportHistory([record, ...loadImportHistory(companyId).filter((item) => item.id !== record.id)], []);
  return saveImportHistory(companyId, next);
}

export function markImportReversed(companyId, batchId) {
  const next = loadImportHistory(companyId).map((item) => (
    item.id === batchId ? { ...item, status: "reversed", reversedAt: new Date().toISOString() } : item
  ));
  return saveImportHistory(companyId, next);
}

export function mergeImportHistory(savedRecords, transactions, bankAccounts = []) {
  const byId = new Map();
  (savedRecords || []).forEach((record) => {
    if (record?.id) byId.set(record.id, { ...record });
  });
  const groups = new Map();
  (transactions || []).forEach((row) => {
    if (!row?.import_batch_id) return;
    const list = groups.get(row.import_batch_id) || [];
    list.push(row);
    groups.set(row.import_batch_id, list);
  });
  groups.forEach((rows, id) => {
    const account = bankAccounts.find((item) => item.id === rows[0].bank_account_id);
    const existing = byId.get(id);
    if (existing) {
      if (existing.status !== "reversed") existing.count = rows.length;
      if (!existing.accountName && account) existing.accountName = account.account_name;
      return;
    }
    const stamped = Number(String(id).replace(/^import-/, ""));
    byId.set(id, {
      id,
      filename: "Imported statement",
      accountId: rows[0].bank_account_id || "",
      accountName: account?.account_name || "Bank account",
      importedAt: Number.isFinite(stamped) && stamped > 1e11 ? new Date(stamped).toISOString() : new Date().toISOString(),
      count: rows.length,
      status: "imported",
    });
  });
  return [...byId.values()].sort((left, right) => String(right.importedAt).localeCompare(String(left.importedAt)));
}

export function reversalPlan(transactions, batchId) {
  const rows = (transactions || []).filter((row) => row.import_batch_id === batchId);
  const reconciled = rows.filter((row) => row.reconciled);
  return {
    rows,
    reconciled,
    blocked: reconciled.length > 0,
    glIds: [...new Set(rows.filter((row) => row.posted_to_gl && row.transaction_id).map((row) => row.transaction_id))],
    bankIds: rows.map((row) => row.id).filter(Boolean),
  };
}
