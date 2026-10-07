import { jsPDF } from "jspdf";
import { formatSignedAt } from "./accountantSignature.js";
import { chunkNotes } from "./accountantsReport.js";

const NAVY = [10, 31, 68];
const MUTED = [100, 116, 139];
const RULE = [203, 213, 225];
const MARGIN = 48;
const BOTTOM = 718;

export function amountColumnPositions(pageWidth, count) {
  const columns = Math.max(count, 1);
  const right = pageWidth - MARGIN;
  const content = pageWidth - MARGIN * 2;
  const columnWidth = Math.min(96, Math.max(40, (content - 168) / columns));
  return Array.from({ length: columns }, (_, index) => right - (columns - 1 - index) * columnWidth);
}

function setFill(doc, color) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function rule(doc, y, color = RULE) {
  const width = doc.internal.pageSize.getWidth();
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, width - MARGIN, y);
}

function stampPages(doc, footer) {
  const total = doc.getNumberOfPages();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    rule(doc, height - 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setFill(doc, MUTED);
    doc.text(footer, MARGIN, height - 26);
    doc.text(`Page ${page} of ${total}`, width - MARGIN, height - 26, { align: "right" });
    setFill(doc, NAVY);
  }
}

function drawMast(doc, company, title, subtitle) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setFill(doc, MUTED);
  doc.text(String(company || "").toUpperCase(), MARGIN, 46);
  doc.text(String(subtitle || "").toUpperCase(), width - MARGIN, 46, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setFill(doc, NAVY);
  doc.text(title || "", width / 2, 68, { align: "center" });
  rule(doc, 78);
  return 96;
}

function drawColumnHeader(doc, y, columns) {
  const width = doc.internal.pageSize.getWidth();
  const positions = amountColumnPositions(width, columns.length);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setFill(doc, NAVY);
  doc.text("Account", MARGIN, y);
  columns.forEach((label, index) => {
    doc.text(String(label), positions[index], y, { align: "right" });
  });
  rule(doc, y + 5);
  return y + 18;
}

function drawAmountRow(doc, y, row, count) {
  const width = doc.internal.pageSize.getWidth();
  const positions = amountColumnPositions(width, count);
  if (row.total) rule(doc, y - 9);
  doc.setFont("helvetica", row.total ? "bold" : "normal");
  doc.setFontSize(9);
  setFill(doc, NAVY);
  doc.text(String(row.label || ""), MARGIN + (row.indent || 0) * 10, y);
  (row.amounts || []).forEach((amount, index) => {
    if (index < positions.length) doc.text(String(amount), positions[index], y, { align: "right" });
  });
  return y + (row.total ? 16 : 13);
}

function paintStatement(doc, { company, title, subtitle, columns, rows }) {
  let y = drawMast(doc, company, title, subtitle);
  const labels = columns || [];
  if (labels.length) y = drawColumnHeader(doc, y, labels);
  (rows || []).forEach((row) => {
    if (y > BOTTOM) {
      doc.addPage();
      y = drawMast(doc, company, title, subtitle);
      if (labels.length) y = drawColumnHeader(doc, y, labels);
    }
    y = drawAmountRow(doc, y, row, labels.length);
  });
  return y;
}

function writeWrapped(doc, y, text, size, bold, restart) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(size);
  setFill(doc, NAVY);
  const lines = doc.splitTextToSize(String(text || ""), width - MARGIN * 2);
  lines.forEach((line) => {
    if (y > BOTTOM) {
      doc.addPage();
      y = restart ? restart() : 96;
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      setFill(doc, NAVY);
    }
    doc.text(line, MARGIN, y);
    y += size + 4;
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
  setFill(doc, NAVY);
  doc.text(signer, MARGIN, y + 18);
  return y + 28;
}

function imageFormat(dataUrl) {
  if (/image\/jpe?g/i.test(dataUrl)) return "JPEG";
  if (/image\/webp/i.test(dataUrl)) return "WEBP";
  return "PNG";
}

function drawLogo(doc, dataUrl, centerX, top, maxWidth, maxHeight) {
  const props = doc.getImageProperties(dataUrl);
  const scale = Math.min(maxWidth / props.width, maxHeight / props.height);
  const width = props.width * scale;
  const height = props.height * scale;
  doc.addImage(dataUrl, imageFormat(dataUrl), centerX - width / 2, top, width, height);
  return height;
}

function drawCover(doc, pack, logo) {
  const width = doc.internal.pageSize.getWidth();
  let y = 250;
  if (logo) {
    try {
      const height = drawLogo(doc, logo, width / 2, y - 80, 200, 72);
      y += height - 48;
    } catch {
      y = 250;
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  setFill(doc, NAVY);
  const nameLines = doc.splitTextToSize(String(pack.companyName || "").toUpperCase(), width - 120);
  nameLines.forEach((line) => {
    doc.text(line, width / 2, y, { align: "center" });
    y += 24;
  });
  y += 4;
  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setLineWidth(1);
  doc.line(width / 2 - 40, y, width / 2 + 40, y);
  y += 28;
  doc.setFontSize(14);
  doc.text(pack.title || "Financial Statements", width / 2, y, { align: "center" });
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setFill(doc, MUTED);
  doc.text(String(pack.periodText || "").toUpperCase(), width / 2, y, { align: "center" });
}

function drawSignature(doc, y, signature) {
  const signer = signature.name || "Accountant";
  if (signature.image) {
    try {
      doc.addImage(signature.image, imageFormat(signature.image), MARGIN, y, 160, 46);
      y += 54;
    } catch {
      y = writeCursiveName(doc, signer, y);
    }
  } else {
    y = writeCursiveName(doc, signer, y);
  }
  doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y, 240, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setFill(doc, NAVY);
  doc.text(signer, MARGIN, y + 14);
  doc.setFont("helvetica", "normal");
  doc.text(signature.designation || "Accountant", MARGIN, y + 28);
  doc.setFontSize(8);
  setFill(doc, MUTED);
  const signed = formatSignedAt(signature.signedAt);
  if (signed) doc.text(`Signed ${signed}`, MARGIN, y + 40);
  setFill(doc, NAVY);
  return y + 52;
}

function drawLetter(doc, pack, signature) {
  const restart = () => drawMast(doc, pack.companyName, "Accountant's Report", pack.periodText);
  let y = restart();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  setFill(doc, NAVY);
  doc.text(pack.title || "", doc.internal.pageSize.getWidth() / 2, y, { align: "center" });
  y += 22;
  (pack.preface || []).forEach((paragraph) => {
    y = writeWrapped(doc, y, paragraph, 10, false, restart);
  });
  y += 16;
  if (y > 620) {
    doc.addPage();
    y = restart();
  }
  drawSignature(doc, y, signature);
}

export function buildAccountantsPdf(pack, signature = {}, options = {}) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  drawCover(doc, pack, options.logo || "");
  doc.addPage();
  drawLetter(doc, pack, signature);
  (pack.sections || []).forEach((section) => {
    doc.addPage();
    paintStatement(doc, {
      company: pack.companyName,
      title: section.title,
      subtitle: pack.periodText,
      columns: (pack.columns || []).map((column) => column.label),
      rows: section.rows,
    });
  });
  chunkNotes(pack.notes).forEach((notes, index) => {
    doc.addPage();
    const title = index === 0 ? "Notes to the Financial Statements" : "Notes to the Financial Statements (continued)";
    const restart = () => drawMast(doc, pack.companyName, title, pack.periodText);
    let y = restart();
    notes.forEach((note) => {
      y = writeWrapped(doc, y, `${note.number}. ${note.title}`, 11, true, restart);
      note.paragraphs.forEach((paragraph) => {
        y = writeWrapped(doc, y, paragraph, 9, false, restart);
      });
    });
  });
  stampPages(doc, pack.basis === "cash" ? "Cash basis — special purpose report" : "Prepared under ASPE — unaudited");
  return doc;
}

export function downloadAccountantsPdf(pack, signature = {}, options = {}) {
  buildAccountantsPdf(pack, signature, options).save(`accountants-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function buildStatementPdf({ company, title, subtitle, columns = [], rows = [], footer = "" }) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  paintStatement(doc, { company, title, subtitle, columns, rows });
  stampPages(doc, footer);
  return doc;
}

export function downloadReportPdf({
  filename,
  title,
  company,
  subtitle,
  footer = "",
  paragraphs = [],
  sections = [],
}) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pages = sections.length ? sections : [{ title, columns: [], rows: [] }];
  pages.forEach((section, index) => {
    if (index > 0) doc.addPage();
    const pageTitle = section.title || title;
    if (index === 0 && paragraphs.length && !section.rows?.length) {
      let y = drawMast(doc, company, pageTitle, subtitle);
      paragraphs.forEach((paragraph) => {
        y = writeWrapped(doc, y, paragraph, 10, false, () => drawMast(doc, company, pageTitle, subtitle));
      });
      return;
    }
    const intro = index === 0 ? paragraphs : [];
    if (intro.length) {
      let y = drawMast(doc, company, pageTitle, subtitle);
      intro.forEach((paragraph) => {
        y = writeWrapped(doc, y, paragraph, 10, false, () => drawMast(doc, company, pageTitle, subtitle));
      });
      if (section.columns?.length) y = drawColumnHeader(doc, y + 6, section.columns);
      (section.rows || []).forEach((row) => {
        if (y > BOTTOM) {
          doc.addPage();
          y = drawMast(doc, company, pageTitle, subtitle);
          if (section.columns?.length) y = drawColumnHeader(doc, y, section.columns);
        }
        y = drawAmountRow(doc, y, row, section.columns?.length || 0);
      });
      return;
    }
    paintStatement(doc, {
      company,
      title: pageTitle,
      subtitle,
      columns: section.columns || [],
      rows: section.rows || [],
    });
  });
  stampPages(doc, footer);
  doc.save(filename);
}
