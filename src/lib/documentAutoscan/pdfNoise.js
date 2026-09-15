export function isPdfStructureNoise(text) {
  const source = String(text || "");
  if (!source.trim()) return false;
  if (/%PDF-\d/.test(source)) return true;
  if (/\[\/PDF\s*\/Text/i.test(source)) return true;
  if (/\/Type\s*\/(?:Catalog|XObject|Page|Font)\b/.test(source) && /\b(endobj|endstream|startxref)\b/.test(source)) {
    return true;
  }
  const ops = (source.match(/\b(endobj|endstream|startxref|\/Length|\/Filter)\b/g) || []).length;
  const words = (source.match(/\b[A-Za-z]{4,}\b/g) || []).filter((word) => (
    !/^(endobj|stream|endstream|length|filter|flatedecode|type|catalog|page|font|obj|xref|trailer|null|true|false)$/i.test(word)
  ));
  return ops >= 3 && words.length < 12;
}

export function usableDocumentText(text) {
  const source = String(text || "").trim();
  if (!source || isPdfStructureNoise(source)) return "";
  return source;
}
