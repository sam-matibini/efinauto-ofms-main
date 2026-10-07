const storageKey = (companyId) => `efinauto.reportLogo.${companyId || "local"}`;

export function loadReportLogo(companyId) {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(companyId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return { image: parsed.image || "", hidden: Boolean(parsed.hidden) };
  } catch {
    return null;
  }
}

export function saveReportLogo(companyId, record) {
  const next = { image: record?.image || "", hidden: Boolean(record?.hidden) };
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(storageKey(companyId), JSON.stringify(next));
  }
  return next;
}

export function resolveReportLogo(companyId, companyLogoUrl = "") {
  const saved = loadReportLogo(companyId);
  if (saved?.hidden) return "";
  return saved?.image || companyLogoUrl || "";
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("logo"));
    image.src = src;
  });
}

function imageToPng(image) {
  const max = 640;
  const scale = Math.min(1, max / image.width, max / image.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export function readLogoFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(imageToPng(image));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("logo"));
    };
    image.src = url;
  });
}

export async function prepareLogoForPdf(src) {
  if (!src) return "";
  if (String(src).startsWith("data:image/")) return src;
  if (typeof document === "undefined") return "";
  const image = await loadImage(src);
  return imageToPng(image);
}
