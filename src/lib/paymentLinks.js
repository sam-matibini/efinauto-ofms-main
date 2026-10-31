import { supabase } from "@/api/supabaseClient";

/**
 * functions-js throws a generic "Edge Function returned a non-2xx status
 * code" message; the real reason lives in the response body on
 * `error.context` (the Response, still unread at that point). Parse it so
 * callers can show the function's own error text (e.g. the "connect
 * eFinMoney" guidance). Falls back to the original error.
 */
async function extractError(error) {
  try {
    const res = error?.context;
    if (res && typeof res.json === "function") {
      const body = await res.json();
      if (body && typeof body.error === "string") {
        const e = new Error(body.error);
        if (body.code) e.code = body.code;
        if (typeof res.status === "number") e.status = res.status;
        return e;
      }
    }
  } catch {
    /* body already consumed or not JSON — keep the original error */
  }
  return error;
}

async function invokeJson(name, payload) {
  try {
    return await supabase.functions.invoke(name, payload);
  } catch (error) {
    throw await extractError(error);
  }
}

/** payment_links statuses a payer can still pay. */
export const ACTIVE_LINK_STATUSES = ["created", "pending", "awaiting_payment"];

/**
 * Create (or reuse) an eFinMoney payment link for an invoice. The payer pays
 * on eFinMoney's hosted page (card, Interac or bank transfer, depending on
 * currency) and the money lands in the company's eFinMoney wallet.
 *
 * Requires the company to have connected eFinMoney with the payment links
 * permission (Settings → Payments); otherwise rejects with the function's
 * guidance (`code`: connect_required | reconnect_required | scope_missing).
 *
 * @param {"sales_invoice"|"repair_invoice"} sourceType
 * @param {string} sourceId invoice record id
 * @param {{ force?: boolean }} [options] force=true cancels any open link
 *   and creates a fresh one
 * @returns {Promise<{ ok: boolean, reused?: boolean, id: string, url: string,
 *   status: string, amount: number, currency: string }>}
 */
export async function createPaymentLink(sourceType, sourceId, options = {}) {
  return invokeJson("create-payment-link", {
    source_type: sourceType,
    source_id: sourceId,
    force: !!options.force,
  });
}

/**
 * Total already collected online through paid eFinMoney links for a record.
 * The webhook posts its own ledger entry for each of these, so manual
 * "mark as paid" postings must only cover what's left.
 *
 * @param {"sales_invoice"|"repair_invoice"|"sale"} sourceType
 * @param {string} sourceId
 */
export async function onlinePaidAmount(sourceType, sourceId) {
  const rows = await supabase.entities.PaymentLink.filter({
    source_type: sourceType,
    source_id: sourceId,
    status: "paid",
  });
  return (rows || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
}

/**
 * Revenue rows are posted as "pending" while a document is unpaid, and the
 * Accounting overview only counts completed revenue. Call this once the
 * document is fully paid to mark its pending revenue rows completed (the
 * eFinMoney webhook does the same for link payments).
 *
 * @param {"Sale"|"SalesInvoice"|"RepairOrder"} referenceType
 * @param {string} referenceId
 * @param {string} transactionType e.g. "sale_revenue" | "service_revenue"
 */
export async function completePendingRevenue(referenceType, referenceId, transactionType) {
  const rows = await supabase.entities.Transaction.filter({
    reference_type: referenceType,
    reference_id: referenceId,
    transaction_type: transactionType,
    status: "pending",
  });
  await Promise.all((rows || []).map((row) =>
    supabase.entities.Transaction.update(row.id, { status: "completed" })
  ));
}

/** Copy text to the clipboard; resolves true on success, false otherwise. */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * HTML snippet for an invoice email: a "Pay now" button plus the raw link
 * underneath (for clients that strip buttons).
 */
export function payButtonHtml(url, amountLabel) {
  return `
    <div style="margin:24px 0;padding:20px;border:1px solid #e5e7eb;border-radius:12px;background:#f8fafc;text-align:center;font-family:Arial,Helvetica,sans-serif;">
      <p style="margin:0 0 4px;font-size:14px;color:#475569;">Amount due</p>
      <p style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#0f172a;">${escapeHtml(amountLabel)}</p>
      <a href="${escapeHtml(url)}"
         style="display:inline-block;padding:12px 28px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;">
        Pay Now
      </a>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">
        Secure payment powered by eFinMoney.<br>
        If the button does not work, copy and paste this link:<br>
        <span style="word-break:break-all;">${escapeHtml(url)}</span>
      </p>
    </div>`;
}

/** Amount still owed on a bill of sale (public.sales row). */
export function saleBalanceDue(sale) {
  if (!sale) return 0;
  if (Number(sale.balance_due || 0) > 0) return Number(sale.balance_due);
  return (sale.grand_total || sale.sale_price || 0) - (sale.total_paid || 0);
}

/** Whether a bill of sale can still take a payment. */
export function canTakeSalePayment(sale) {
  return !!sale && sale.payment_status !== "paid" && sale.status !== "cancelled" && saleBalanceDue(sale) > 0;
}

/**
 * The newest open (payable, unexpired) payment link for a record, or null.
 * For code outside React (PDF templates); components should use
 * useActivePaymentLink instead.
 */
export async function getActivePaymentLink(sourceType, sourceId) {
  if (!sourceId) return null;
  const rows = await supabase.entities.PaymentLink.filter(
    { source_type: sourceType, source_id: sourceId, status: ACTIVE_LINK_STATUSES },
    "-created_at",
    10,
  );
  const now = Date.now();
  return (
    (rows || []).find(
      (r) => r.url && !(r.expires_at && new Date(r.expires_at).getTime() <= now),
    ) || null
  );
}

/**
 * The link to print on a document, or null. A link whose amount no longer
 * matches the balance is left off so the customer isn't sent to pay the
 * wrong amount (staff see a "regenerate" warning in the app instead).
 */
export function documentPaymentLink(link, amountDue, canTakePayment = true) {
  if (!link?.url || !canTakePayment || !(Number(amountDue) > 0)) return null;
  if (Math.abs(Number(link.amount || 0) - Number(amountDue || 0)) > 0.005) return null;
  return link;
}

/**
 * "Pay online" block for the document itself (printed page, PDF, preview).
 * Inline styles only, because these documents are copied into print windows
 * and html2canvas without the app's CSS. Returns "" when there's no link.
 */
export function paymentLinkDocumentHtml(link) {
  if (!link?.url) return "";
  const amount = `${Number(link.amount || 0).toFixed(2)} ${link.currency || ""}`.trim();
  const expires = link.expires_at ? new Date(link.expires_at) : null;
  const expiresLabel =
    expires && !Number.isNaN(expires.getTime()) ? ` &middot; Link expires ${escapeHtml(expires.toLocaleDateString())}` : "";
  return `
    <div style="margin:16px 0;padding:10px 14px;border:1px solid #93c5fd;border-left:4px solid #2563eb;border-radius:6px;background:#eff6ff;font-family:Arial,Helvetica,sans-serif;page-break-inside:avoid;">
      <div style="font-size:10px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;color:#1e40af;">Pay online</div>
      <div style="margin-top:4px;font-size:12px;color:#0f172a;">
        Amount: <strong>${escapeHtml(amount)}</strong>${expiresLabel}
      </div>
      <a href="${escapeHtml(link.url)}" style="display:block;margin-top:4px;font-size:12px;color:#1d4ed8;word-break:break-all;text-decoration:underline;">${escapeHtml(link.url)}</a>
      <div style="margin-top:4px;font-size:9.5px;color:#64748b;">Secure payment powered by eFinMoney (card, Interac or bank transfer).</div>
    </div>`;
}

/**
 * Fetch + filter in one step for non-React document builders. Never throws:
 * a failed lookup just leaves the link off the document.
 */
export async function getDocumentPaymentLink(sourceType, sourceId, amountDue, canTakePayment = true) {
  try {
    return documentPaymentLink(await getActivePaymentLink(sourceType, sourceId), amountDue, canTakePayment);
  } catch (error) {
    console.warn("Payment link lookup failed; leaving it off the document:", error);
    return null;
  }
}

/** Open payment link to put on a bill of sale, or null. */
export function getSaleDocumentPaymentLink(sale) {
  if (!sale?.id) return Promise.resolve(null);
  return getDocumentPaymentLink("sale", sale.id, saleBalanceDue(sale), canTakeSalePayment(sale));
}
