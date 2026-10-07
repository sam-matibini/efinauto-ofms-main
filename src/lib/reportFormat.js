const AMOUNT = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

export function formatExportAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) < 0.005) return "-";
  const abs = Math.abs(n).toLocaleString("en-CA", AMOUNT);
  return n < 0 ? `(${abs})` : abs;
}

export function csvCell(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function csvRow(cells) {
  return (cells || []).map(csvCell).join(",");
}

export function csvDocument(rows) {
  return rows.map((row) => csvRow(row)).join("\n");
}

export function downloadCsv(filename, rows) {
  const blob = new Blob([csvDocument(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
