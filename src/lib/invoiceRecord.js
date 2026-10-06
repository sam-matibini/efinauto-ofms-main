import {
  errorText,
  isNoRowReturnedError,
  persistWithUnknownColumnRetry,
} from "./persistErrors.js";

export const INVOICE_LIVE_COLUMNS = new Set([
  "company_id",
  "invoice_number",
  "customer_id",
  "customer_name",
  "customer_email",
  "customer_phone",
  "customer_address",
  "currency",
  "line_items",
  "subtotal",
  "tax_rate",
  "tax_amount",
  "total_amount",
  "amount_paid",
  "balance_due",
  "invoice_date",
  "due_date",
  "status",
  "payment_terms",
  "notes",
  "reference_type",
  "reference_id",
]);

const DATE_KEYS = new Set(["invoice_date", "due_date"]);
const NUMBER_KEYS = new Set([
  "subtotal",
  "tax_rate",
  "tax_amount",
  "total_amount",
  "amount_paid",
  "balance_due",
]);

export function asInvoiceString(value, max = 8000) {
  if (value == null) return "";
  return String(value).replace(/\u0000/g, " ").trim().slice(0, max);
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function invoicePaymentTerms(form = {}) {
  return asInvoiceString(form.payment_terms || form.terms, 500);
}

export function toLiveInvoicePayload(form = {}, { companyId } = {}) {
  const source = { ...form, payment_terms: invoicePaymentTerms(form) };
  const payload = {};

  for (const key of INVOICE_LIVE_COLUMNS) {
    let value = source[key];
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;

    if (DATE_KEYS.has(key)) {
      const next = asInvoiceString(value, 32).slice(0, 10);
      if (!isIsoDate(next)) continue;
      value = next;
    } else if (NUMBER_KEYS.has(key)) {
      const amount = Number(value);
      if (!Number.isFinite(amount)) continue;
      value = amount;
    } else if (key === "line_items") {
      if (!Array.isArray(value) || value.length === 0) continue;
      value = value.map((item) => {
        const row = {
          description: asInvoiceString(item?.description, 500),
          quantity: Number(item?.quantity) || 0,
          unit_price: Number(item?.unit_price) || 0,
          total: Number(item?.total) || 0,
        };
        if (item?.service_id) row.service_id = item.service_id;
        return row;
      });
    } else if (typeof value === "string") {
      value = asInvoiceString(value, key === "notes" ? 8000 : 500);
      if (!value) continue;
    }

    payload[key] = value;
  }

  if (companyId) payload.company_id = companyId;
  if (!payload.status) payload.status = "draft";
  if (!payload.currency) payload.currency = "CAD";
  if (!payload.payment_terms) payload.payment_terms = "Payment due upon receipt";
  return payload;
}

export function hydrateInvoiceRecord(invoice) {
  if (!invoice || typeof invoice !== "object") return invoice;
  const terms = invoicePaymentTerms(invoice);
  return terms ? { ...invoice, terms, payment_terms: terms } : invoice;
}

export async function persistInvoiceRecord({ supabase, companyId, form, existingId }) {
  const payload = toLiveInvoicePayload(form, { companyId });
  if (!asInvoiceString(payload.customer_name)) {
    throw new Error("Please select or enter a customer");
  }
  if (!Array.isArray(payload.line_items) || payload.line_items.length === 0) {
    throw new Error("Please add at least one line item");
  }

  const write = async (current) => {
    if (existingId) {
      const updated = await supabase.entities.SalesInvoice.update(existingId, current);
      return hydrateInvoiceRecord({ ...current, ...(updated || {}), id: existingId });
    }
    const created = await supabase.entities.SalesInvoice.create(current);
    if (created?.id) return hydrateInvoiceRecord({ ...current, ...created });
    if (isNoRowReturnedError(created)) {
      return hydrateInvoiceRecord({ ...current, id: current.invoice_number });
    }
    return hydrateInvoiceRecord({ ...current, ...(created || {}) });
  };

  try {
    return await persistWithUnknownColumnRetry({ write, data: payload });
  } catch (error) {
    const message = errorText(error) || "Could not save invoice";
    const wrapped = new Error(message);
    wrapped.cause = error;
    throw wrapped;
  }
}
