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
