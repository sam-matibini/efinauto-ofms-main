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

async function extractPdfText(file) {
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

  return parts
    .join("\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
    onProgress?.(15);
    const text = await extractPdfText(file);
    onProgress?.(100);
    return text;
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
