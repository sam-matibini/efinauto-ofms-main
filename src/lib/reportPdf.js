import jsPDF from "jspdf";

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
