import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorker;

const THIN_TEXT_CHARS = 80;

async function inflateBytes(bytes) {
  const attempts = ["deflate", "deflate-raw"];
  for (const format of attempts) {
    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch {
      // try the next compression wrapper
    }
  }
  return null;
}

function bytesToLatin1(bytes) {
  return new TextDecoder("latin1").decode(bytes);
}

function printableLines(bytes) {
  const lines = [];
  let buffer = "";
  for (let i = 0; i < bytes.length; i += 1) {
    const code = bytes[i];
    if (code >= 32 && code < 127) {
      buffer += String.fromCharCode(code);
    } else if (code === 10 || code === 13 || buffer.length > 80) {
      if (buffer.trim().length >= 3) lines.push(buffer.trim());
      buffer = "";
    } else {
      if (buffer.trim().length >= 3) lines.push(buffer.trim());
      buffer = "";
    }
  }
  if (buffer.trim().length >= 3) lines.push(buffer.trim());
  return lines.join("\n");
}

function decodePdfLiteral(value) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\(\d{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

function extractPdfOperators(text) {
  const chunks = [];
  const tj = /\((?:\\.|[^\\)])*\)\s*Tj/g;
  const tjArray = /\[(.*?)\]\s*TJ/gs;
  let match;
  while ((match = tj.exec(text))) {
    const inner = match[0].slice(1, match[0].lastIndexOf(")"));
    chunks.push(decodePdfLiteral(inner));
  }
  while ((match = tjArray.exec(text))) {
    const parts = [...match[1].matchAll(/\((?:\\.|[^\\)])*\)/g)].map((item) =>
      decodePdfLiteral(item[0].slice(1, -1))
    );
    if (parts.length) chunks.push(parts.join(""));
  }
  return chunks.join("\n");
}

function cleanupText(text) {
  return (text || "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function meaningfulLength(text) {
  return (text || "").replace(/[^A-Za-z0-9]/g, "").length;
}

async function extractPdfTextLegacy(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const raw = bytesToLatin1(bytes);
  const inflated = [];
  const streamPattern = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  while ((match = streamPattern.exec(raw))) {
    const dictStart = raw.lastIndexOf("<<", match.index);
    const dict = dictStart >= 0 ? raw.slice(dictStart, match.index) : "";
    if (!/\/FlateDecode/.test(dict)) continue;
    const payload = bytes.subarray(match.index + (raw[match.index + 6] === "\r" ? 8 : 7), match.index + match[0].length - 10);
    const decoded = await inflateBytes(payload);
    if (decoded) inflated.push(decoded);
  }

  const parts = [extractPdfOperators(raw), printableLines(bytes)];
  for (const chunk of inflated) {
    const latin1 = bytesToLatin1(chunk);
    parts.push(extractPdfOperators(latin1), printableLines(chunk));
  }

  return cleanupText(parts.join("\n"));
}

async function extractPdfTextLayer(file) {
  const data = await file.arrayBuffer();
  const pdf = await getDocument({ data, disableWorker: false }).promise;
  const parts = [];
  const maxPages = Math.min(pdf.numPages, 8);
  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    if (pageText.trim()) parts.push(pageText);
  }
  return { pdf, text: cleanupText(parts.join("\n")) };
}

async function ocrCanvas(canvas, onProgress) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (message) => {
      if (message.status === "recognizing text" && typeof message.progress === "number") {
        onProgress?.(Math.round(message.progress * 100));
      }
    },
  });
  try {
    const { data } = await worker.recognize(canvas);
    return (data?.text || "").trim();
  } finally {
    await worker.terminate();
  }
}

async function extractPdfWithOcr(pdf, onProgress) {
  if (typeof document === "undefined") return "";
  const maxPages = Math.min(pdf.numPages, 3);
  const texts = [];
  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, canvas, viewport }).promise;
    onProgress?.(40 + Math.round((pageNumber / maxPages) * 50));
    texts.push(await ocrCanvas(canvas, onProgress));
  }
  return cleanupText(texts.join("\n"));
}

async function extractPdfText(file, onProgress) {
  onProgress?.(15);
  const legacy = await extractPdfTextLegacy(file);
  let pdfJsText = "";
  let pdf = null;
  try {
    const layered = await extractPdfTextLayer(file);
    pdfJsText = layered.text;
    pdf = layered.pdf;
  } catch (error) {
    console.warn("PDF.js text extraction failed, using fallback parser", error);
  }

  const combined = cleanupText([legacy, pdfJsText].filter(Boolean).join("\n"));
  if (meaningfulLength(combined) >= THIN_TEXT_CHARS) {
    onProgress?.(100);
    return combined;
  }

  if (pdf) {
    try {
      onProgress?.(40);
      const ocrText = await extractPdfWithOcr(pdf, onProgress);
      const withOcr = cleanupText([combined, ocrText].filter(Boolean).join("\n"));
      onProgress?.(100);
      return withOcr || combined;
    } catch (error) {
      console.warn("PDF OCR fallback failed", error);
    }
  }

  onProgress?.(100);
  return combined;
}

async function extractImageText(file, onProgress) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (message) => {
      if (message.status === "recognizing text" && typeof message.progress === "number") {
        onProgress?.(Math.round(message.progress * 100));
      }
    },
  });
  try {
    const { data } = await worker.recognize(file);
    return (data?.text || "").trim();
  } finally {
    await worker.terminate();
  }
}

export async function extractDocumentText(file, { onProgress } = {}) {
  if (!file) return "";
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();

  if (type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".csv")) {
    return (await file.text()).trim();
  }

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return extractPdfText(file, onProgress);
  }

  if (type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|tiff?)$/i.test(name)) {
    return extractImageText(file, onProgress);
  }

  try {
    return (await file.text()).trim();
  } catch {
    return "";
  }
}
