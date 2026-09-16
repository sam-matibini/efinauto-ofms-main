import {
  errorText,
  isNoRowReturnedError,
  persistWithUnknownColumnRetry,
} from "./persistErrors.js";

export const SALE_LIVE_COLUMNS = new Set([
  "company_id",
  "sale_number",
  "bos_number",
  "bos_sequence",
  "bos_issued_date",
  "bos_issued_by",
  "bos_status",
  "pdf_file_url",
  "pdf_generated_at",
  "location_code",
  "sale_type",
  "export_id",
  "customer_id",
  "customer_name",
  "customer_phone",
  "customer_email",
  "customer_address",
  "customer_city",
  "customer_postal_code",
  "customer_country",
  "customer_business_phone",
  "salesman",
  "vehicle_id",
  "vehicle_vin",
  "vehicle_details",
  "vehicle_year",
  "vehicle_make_model",
  "vehicle_mileage",
  "vehicle_color",
  "sale_price",
  "province",
  "tax_status",
  "pst_exempt",
  "pst_exempt_reason",
  "pst_exempt_reference",
  "pst_exempt_by",
  "pst_exempt_timestamp",
  "pst_rate",
  "tax_gst",
  "tax_pst",
  "tax_hst",
  "tax_total",
  "grand_total",
  "deposit_amount",
  "payments",
  "total_paid",
  "balance_due",
  "financing",
  "trade_in",
  "buyer_signature_url",
  "buyer_name",
  "buyer_signed_at",
  "seller_signature_url",
  "seller_name",
  "seller_signed_at",
  "signature_method",
  "payment_status",
  "sale_date",
  "delivery_date",
  "status",
  "notes",
  "created_by",
  "created_by_id",
]);

const DATE_KEYS = new Set([
  "sale_date",
  "delivery_date",
]);

const TIMESTAMP_KEYS = new Set([
  "bos_issued_date",
  "pdf_generated_at",
  "pst_exempt_timestamp",
  "buyer_signed_at",
  "seller_signed_at",
]);

const ENUM_KEYS = new Set([
  "bos_status",
  "sale_type",
  "tax_status",
  "pst_exempt_reason",
  "signature_method",
  "payment_status",
  "status",
]);

const SALESMAN_PHONE_NOTE = /^Salesman phone:\s*(.+)$/im;
const MAX_DATA_URL = 1800;

export function asString(value, max = 8000) {
  if (value == null) return "";
  return String(value).replace(/\u0000/g, " ").replace(/[ \t]+/g, " ").trim().slice(0, max);
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isIsoDateTime(value) {
  return /^\d{4}-\d{2}-\d{2}T/.test(value);
}

function compactPayload(data = {}) {
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    out[key] = value;
  }
  return out;
}

export function salesmanPhoneFromNotes(notes) {
  return asString(notes).match(SALESMAN_PHONE_NOTE)?.[1]?.trim() || "";
}

export function withSalesmanPhoneNote(notes, phone) {
  const cleaned = asString(notes, 8000).replace(SALESMAN_PHONE_NOTE, "").trim();
  const next = asString(phone, 40);
  if (!next) return cleaned;
  return [cleaned, `Salesman phone: ${next}`].filter(Boolean).join("\n").slice(0, 8000);
}

export function hydrateSaleRecord(sale) {
  if (!sale || typeof sale !== "object") return sale;
  if (asString(sale.salesman_phone, 40)) return sale;
  const phone = salesmanPhoneFromNotes(sale.notes);
  return phone ? { ...sale, salesman_phone: phone } : sale;
}

function liveValue(key, value) {
  if (value === undefined || value === null) return undefined;
  if (value === "") return undefined;

  if (DATE_KEYS.has(key)) return isIsoDate(asString(value, 32)) ? asString(value, 32) : undefined;
  if (TIMESTAMP_KEYS.has(key)) {
    const next = asString(value, 40);
    return isIsoDateTime(next) || isIsoDate(next) ? next : undefined;
  }
  if (ENUM_KEYS.has(key)) return asString(value, 80) || undefined;
  if (key === "seller_signature_url" || key === "buyer_signature_url") {
    const next = String(value);
    if (next.startsWith("data:") && next.length > MAX_DATA_URL) return undefined;
    return next;
  }
  return value;
}

export function toLiveSalePayload(form = {}, { companyId } = {}) {
  const phone = asString(form.salesman_phone, 40);
  const notes = withSalesmanPhoneNote(form.notes, phone);
  const payload = {};

  for (const key of SALE_LIVE_COLUMNS) {
    const source = key === "notes" ? notes : form[key];
    const value = liveValue(key, source);
    if (value === undefined) continue;
    payload[key] = value;
  }

  if (companyId) payload.company_id = companyId;
  if (!payload.bos_status) payload.bos_status = "draft";
  if (!payload.sale_type) payload.sale_type = "domestic";
  if (!asString(payload.seller_name) && asString(form.salesman)) {
    payload.seller_name = asString(form.salesman, 120);
  }

  return compactPayload(payload);
}

export async function persistSaleRecord({ supabase, companyId, form, existingId }) {
  const payload = toLiveSalePayload(form, { companyId });
  if (!asString(payload.customer_name) || !asString(payload.vehicle_details) || payload.sale_price == null) {
    throw new Error("Please fill in all required fields");
  }

  const write = async (current) => {
    if (existingId) {
      const updated = await supabase.entities.Sale.update(existingId, current);
      return hydrateSaleRecord({ ...current, ...(updated || {}), id: existingId, salesman_phone: form.salesman_phone });
    }
    const created = await supabase.entities.Sale.create(current);
    if (created?.id) {
      return hydrateSaleRecord({ ...current, ...created, salesman_phone: form.salesman_phone });
    }
    if (isNoRowReturnedError(created)) {
      return hydrateSaleRecord({ ...current, id: current.sale_number, salesman_phone: form.salesman_phone });
    }
    return hydrateSaleRecord({ ...current, ...(created || {}), salesman_phone: form.salesman_phone });
  };

  try {
    return await persistWithUnknownColumnRetry({ write, data: payload });
  } catch (error) {
    const message = errorText(error) || "Could not record sale";
    const wrapped = new Error(message);
    wrapped.cause = error;
    throw wrapped;
  }
}
