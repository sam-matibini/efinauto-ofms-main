export function inferPurchaseDocumentType(file, analysis) {
  const label = `${analysis?.summary?.document_type || ""} ${file?.name || ""}`.toLowerCase();
  if (/bill[\s_-]*of[\s_-]*sale|\bbos\b/.test(label)) return "bill_of_sale";
  if (/invoice/.test(label)) return "invoice";
  if (/receipt/.test(label)) return "receipt";
  if (/registration/.test(label)) return "registration";
  return "purchase_document";
}

export function documentTypeLabel(type) {
  return {
    bill_of_sale: "Bill of sale",
    invoice: "Invoice",
    receipt: "Receipt",
    registration: "Registration",
    purchase_document: "Purchase document",
  }[type] || "Purchase document";
}

export function addPurchaseDocument(list, doc) {
  const next = Array.isArray(list) ? [...list] : [];
  if (!doc?.url && !doc?.name) return next;
  const duplicate = next.some((item) => (
    (doc.url && item.url === doc.url)
    || (doc.name && item.name === doc.name && doc.size && item.size === doc.size)
  ));
  if (duplicate) return next;
  return [...next, doc];
}

export function removePurchaseDocument(list, idOrUrl) {
  return (Array.isArray(list) ? list : []).filter((item) => item.id !== idOrUrl && item.url !== idOrUrl);
}

export async function uploadVehiclePurchaseDocument(file, { analysis } = {}) {
  if (!file) throw new Error("Choose a bill of sale or invoice to attach");
  const { supabase } = await import("@/api/supabaseClient");
  const uploaded = await supabase.integrations.Core.UploadFile({ file });
  const url = uploaded?.file_url || uploaded?.url;
  if (!url) throw new Error("Upload did not return a file URL");
  return {
    id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `doc-${Date.now()}`,
    name: file.name || "Purchase document",
    url,
    mime_type: file.type || "application/octet-stream",
    size: Number(file.size) || 0,
    document_type: inferPurchaseDocumentType(file, analysis),
    attached_at: new Date().toISOString(),
  };
}

export function textFileFromPaste(text, analysis) {
  const type = inferPurchaseDocumentType({ name: analysis?.summary?.document_type || "bill-of-sale.txt" }, analysis);
  const stamp = new Date().toISOString().slice(0, 10);
  const name = `${type.replace(/_/g, "-")}-${stamp}.txt`;
  return new File([text], name, { type: "text/plain" });
}
