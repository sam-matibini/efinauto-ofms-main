import { jsPDF } from "jspdf";
import { formatSignedAt } from "./accountantSignature.js";
import { chunkNotes } from "./accountantsReport.js";

function stampPages(doc, footer) {
  const total = doc.getNumberOfPages();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80);
    doc.text(footer, 36, height - 28);
    doc.text(`Page ${page} of ${total}`, width - 36, height - 28, { align: "right" });
    doc.setTextColor(0);
  }
}

function pageHeader(doc, company, title, subtitle) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(company || "", 36, 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(title || "", 36, 50);
  doc.text(subtitle || "", width - 36, 36, { align: "right" });
  doc.setDrawColor(180);
  doc.line(36, 58, width - 36, 58);
  doc.setDrawColor(0);
  return 74;
}

function writeAmountRow(doc, y, label, amounts, bold, indent = 0) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(9);
  doc.text(String(label || ""), 36 + indent * 10, y);
  (amounts || []).forEach((amount, index) => {
    doc.text(String(amount), width - 36 - index * 90, y, { align: "right" });
  });
  return y + 14;
}

function writeWrapped(doc, y, text, size, bold) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(String(text || ""), width - 72);
  lines.forEach((line) => {
    if (y > 730) {
      doc.addPage();
      y = 74;
    }
    doc.text(line, 36, y);
    y += size + 3;
  });
  return y + 4;
}

function writeCursiveName(doc, signer, y) {
  try {
    doc.setFont("times", "italic");
  } catch {
    doc.setFont("helvetica", "italic");
  }
  doc.setFontSize(18);
  doc.text(signer, 36, y + 18);
  return y + 28;
}

function drawSignature(doc, y, signature) {
  const signer = signature.name || "Accountant";
  if (signature.image) {
    try {
      doc.addImage(signature.image, "PNG", 36, y, 180, 52);
      y += 60;
    } catch {
      y = writeCursiveName(doc, signer, y);
    }
  } else {
    y = writeCursiveName(doc, signer, y);
  }
  doc.setDrawColor(20);
  doc.line(36, y, 230, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(signer, 36, y + 14);
  doc.setFont("helvetica", "normal");
  doc.text(signature.designation || "Accountant", 36, y + 28);
  doc.setFontSize(8);
  const signed = formatSignedAt(signature.signedAt);
  doc.text(signed ? `Signed ${signed}` : "", 36, y + 40);
  return y + 52;
}

export function buildAccountantsPdf(pack, signature = {}) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const subtitle = pack.periodText || "";
  let y = pageHeader(doc, pack.companyName, "Accountant's Report", subtitle);
  y = writeWrapped(doc, y, pack.title, 14, true);
  pack.preface.forEach((paragraph) => {
    y = writeWrapped(doc, y, paragraph, 10, false);
  });
  y += 18;
  if (y > 640) {
    doc.addPage();
    y = pageHeader(doc, pack.companyName, "Accountant's Report", subtitle);
  }
  drawSignature(doc, y, signature);

  pack.sections.forEach((section) => {
    doc.addPage();
    let rowY = pageHeader(doc, pack.companyName, section.title, subtitle);
    rowY = writeAmountRow(doc, rowY, "", pack.columns.map((column) => column.label), true);
    section.rows.forEach((row) => {
      if (rowY > 730) {
        doc.addPage();
        rowY = pageHeader(doc, pack.companyName, section.title, subtitle);
      }
      rowY = writeAmountRow(doc, rowY, row.label, row.amounts, row.total, row.indent || 0);
    });
  });

  chunkNotes(pack.notes).forEach((notes, index) => {
    doc.addPage();
    let noteY = pageHeader(doc, pack.companyName, index === 0 ? "Notes to the Financial Statements" : "Notes to the Financial Statements (continued)", subtitle);
    notes.forEach((note) => {
      noteY = writeWrapped(doc, noteY, `${note.number}. ${note.title}`, 11, true);
      note.paragraphs.forEach((paragraph) => {
        noteY = writeWrapped(doc, noteY, paragraph, 9, false);
      });
    });
  });

  stampPages(doc, pack.basis === "cash" ? "Cash basis — special purpose report" : "Prepared under ASPE — unaudited");
  return doc;
}

export function downloadAccountantsPdf(pack, signature = {}) {
  buildAccountantsPdf(pack, signature).save(`accountants-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function writeLines(doc, lines, startY) {
  const width = doc.internal.pageSize.getWidth();
  let y = startY;
  const ensure = (size) => {
    if (y > 740) {
      doc.addPage();
      y = 48;
    }
    return size;
  };
  lines.forEach((line) => {
    const size = line.size || 10;
    ensure(size);
    doc.setFont("helvetica", line.bold ? "bold" : "normal");
    doc.setFontSize(size);
    if (line.amounts?.length) {
      doc.text(String(line.text || ""), 36, y);
      line.amounts.forEach((amount, index) => {
        doc.text(String(amount), width - 36 - index * 100, y, { align: "right" });
      });
      y += size + 6;
      return;
    }
    const wrapped = doc.splitTextToSize(String(line.text || ""), width - 72);
    wrapped.forEach((part) => {
      ensure(size);
      doc.text(part, 36, y);
      y += size + 4;
    });
    y += line.gap || 0;
  });
}

export function downloadReportPdf({ filename, title, company, subtitle, paragraphs = [], sections = [] }) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const lines = [
    { text: title, size: 16, bold: true, gap: 4 },
    { text: company || "", size: 12, bold: true },
    { text: subtitle || "", size: 10, gap: 8 },
  ];
  paragraphs.forEach((paragraph) => lines.push({ text: paragraph, size: 10, gap: 4 }));
  sections.forEach((section) => {
    lines.push({ text: section.title, size: 13, bold: true, gap: 4 });
    if (section.columns?.length) lines.push({ text: "Account", bold: true, amounts: section.columns });
    section.rows.forEach((row) => {
      lines.push({ text: row.label, bold: row.total, amounts: row.amounts });
    });
    lines.push({ text: "", gap: 8 });
  });
  writeLines(doc, lines, 48);
  doc.save(filename);
}
