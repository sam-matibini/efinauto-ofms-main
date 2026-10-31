import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyEfinSignature } from "../_shared/efinmoney.ts";

// eFinMoney webhook receiver. This is the SOURCE OF TRUTH for recording a
// payment: the payer's browser never comes back to eFinAuto, but eFinMoney
// always delivers (and retries) the webhook.
//
// Required secrets:
//   EFINMONEY_WEBHOOK_SECRET  (whsec_... returned once by PUT /v1/webhook)
//   SUPABASE_SERVICE_ROLE_KEY (auto-provided by Supabase)
//
// Handled events:
//   payment_link.paid       → record payment + GL posting
//   payment_link.expired    → mark link expired
//   payment_link.cancelled  → mark link cancelled
//   payment_link.failed     → mark link failed
//   webhook.test            → acknowledge

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SOURCE_TABLES: Record<string, string> = {
  sales_invoice: "sales_invoices",
  repair_invoice: "invoices",
  sale: "sales",
};

const TERMINAL_EVENTS: Record<string, string> = {
  "payment_link.expired": "expired",
  "payment_link.cancelled": "cancelled",
  "payment_link.failed": "failed",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Minimal column allowlists: only write fields the app itself proven-writes
// (see InvoicesTab.jsx / PaymentsTab.jsx) so an unknown column in a deployed
// table can never break webhook processing.
const GL_COLUMNS = [
  "company_id",
  "transaction_number",
  "transaction_type",
  "category",
  "amount",
  "account_code",
  "account_name",
  "account_type",
  "contra_account_code",
  "contra_account_name",
  "reference_type",
  "reference_id",
  "reference_number",
  "customer_name",
  "description",
  "transaction_date",
  "payment_method",
  "status",
];

const PAYMENT_COLUMNS = [
  "company_id",
  "payment_number",
  "customer_id",
  "customer_name",
  "amount",
  "payment_date",
  "payment_method",
  "reference_number",
  "applied_to_invoice",
  "invoice_number",
  "status",
  "notes",
];

function pick(row: Record<string, unknown>, keys: string[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (row[k] !== undefined) out[k] = row[k];
  }
  return out;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface EfinPaymentLink {
  id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  reference?: string;
  short_code?: string;
  payer_name?: string | null;
  paid_at?: string | null;
}

// A delivery that claimed the link this recently may still be writing its
// rows; duplicates inside this window are told to retry instead of racing.
const IN_FLIGHT_MS = 60_000;

// Revenue rows the app posts as "pending" until the document is paid. The
// Accounting overview only counts completed revenue, so they're flipped to
// completed once a payment link settles the document in full.
const REVENUE_REFS: Record<string, { refType: string; types: string[] }> = {
  sale: { refType: "Sale", types: ["sale_revenue"] },
  sales_invoice: { refType: "SalesInvoice", types: ["service_revenue"] },
  repair_invoice: { refType: "RepairOrder", types: ["service_revenue"] },
};

// deno-lint-ignore no-explicit-any
type Service = any;
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

interface PaidContext {
  amount: number;
  currency: string;
  efinRef: string;
  payerName: string | null;
  day: string;
}

function isoDay(value: string) {
  const m = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? new Date().toISOString().split("T")[0]
    : d.toISOString().split("T")[0];
}

function docNumberOf(link: Row, doc: Row) {
  return link.source_type === "sale"
    ? doc.bos_number || doc.sale_number || null
    : doc.invoice_number ?? null;
}

function isFullyPaid(link: Row, doc: Row) {
  if (link.source_type === "sale") return doc.payment_status === "paid";
  if (link.source_type === "sales_invoice") return doc.status === "paid";
  return doc.payment_status === "paid";
}

async function loadSource(service: Service, table: string, id: string) {
  const { data } = await service
    .schema("public")
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data ?? null) as Row | null;
}

async function findPayment(service: Service, companyId: string, efinRef: string) {
  const { data } = await service
    .schema("public")
    .from("payment_receiveds")
    .select("id, payment_number")
    .eq("company_id", companyId)
    .eq("reference_number", efinRef)
    .limit(1);
  return (data?.[0] ?? null) as { id: string; payment_number?: string } | null;
}

async function hasGlEntry(service: Service, companyId: string, paymentId: string) {
  const { data } = await service
    .schema("public")
    .from("transactions")
    .select("id")
    .eq("company_id", companyId)
    .eq("reference_type", "PaymentReceived")
    .eq("reference_id", paymentId)
    .limit(1);
  return !!data?.length;
}

/**
 * Idempotently record a link payment: one payment_receiveds row (keyed by
 * the eFinMoney reference) and its GL posting, Dr Cash 1000 / Cr AR 1100
 * (mirrors PaymentsTab.jsx). Safe to call on every delivery.
 */
async function recordPayment(
  service: Service,
  link: Row,
  doc: Row,
  pay: PaidContext,
): Promise<{ payment?: { id: string; payment_number?: string }; error?: string }> {
  const isSale = link.source_type === "sale";
  const docNumber = docNumberOf(link, doc);
  const paymentNumber = `PMT-${pay.efinRef.slice(-8).toUpperCase()}`;
  const fx = pay.currency !== "CAD" ? ` (${pay.currency})` : "";
  const via = `online via eFinMoney payment link ${pay.efinRef}${
    pay.payerName ? ` by ${pay.payerName}` : ""
  }`;

  let payment = await findPayment(service, doc.company_id, pay.efinRef);
  if (!payment) {
    const { data, error } = await service
      .schema("public")
      .from("payment_receiveds")
      .insert(pick({
        company_id: doc.company_id,
        payment_number: paymentNumber,
        customer_id: doc.customer_id ?? null,
        customer_name: doc.customer_name ?? null,
        amount: pay.amount,
        payment_date: pay.day,
        payment_method: "other",
        reference_number: pay.efinRef,
        applied_to_invoice: isSale ? undefined : doc.id,
        invoice_number: docNumber,
        status: "completed",
        notes: `Paid ${via}${fx}`,
      }, PAYMENT_COLUMNS))
      .select("id, payment_number")
      .single();
    if (error) {
      console.error("payment_receiveds insert failed (will retry):", error.message);
      return { error: error.message };
    }
    payment = data;
  }

  if (await hasGlEntry(service, doc.company_id, payment!.id)) return { payment: payment! };

  const number = payment!.payment_number || paymentNumber;
  const { error: glErr } = await service
    .schema("public")
    .from("transactions")
    .insert(pick({
      company_id: doc.company_id,
      transaction_number: number,
      transaction_type: "payment_received",
      category: "asset",
      amount: pay.amount,
      account_code: "1000",
      account_name: "Cash",
      account_type: "asset",
      contra_account_code: "1100",
      contra_account_name: "Accounts Receivable",
      reference_type: "PaymentReceived",
      reference_id: payment!.id,
      reference_number: number,
      customer_name: doc.customer_name ?? null,
      description: `Payment received from ${doc.customer_name ?? "customer"}${
        docNumber ? ` for ${isSale ? "Bill of Sale" : "Invoice"} ${docNumber}` : ""
      } (${via})${fx}`,
      transaction_date: pay.day,
      payment_method: "other",
      status: "completed",
    }, GL_COLUMNS));
  if (glErr) {
    console.error("GL transaction insert failed (will retry):", glErr.message);
    return { error: glErr.message };
  }
  return { payment: payment! };
}

/** Best effort: mark the document's pending revenue rows completed once paid. */
async function completeRevenue(service: Service, link: Row, doc: Row) {
  const refs = REVENUE_REFS[link.source_type];
  if (!refs || !isFullyPaid(link, doc)) return;
  const refId = link.source_type === "repair_invoice" ? doc.repair_order_id : doc.id;
  if (!refId) return;
  const { error } = await service
    .schema("public")
    .from("transactions")
    .update({ status: "completed" })
    .eq("company_id", doc.company_id)
    .eq("reference_type", refs.refType)
    .eq("reference_id", refId)
    .in("transaction_type", refs.types)
    .eq("status", "pending");
  if (error) console.warn("Could not complete revenue rows:", error.message);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const webhookSecret = Deno.env.get("EFINMONEY_WEBHOOK_SECRET");
  if (!webhookSecret) {
    return json(
      { error: "EFINMONEY_WEBHOOK_SECRET is not configured" },
      500,
    );
  }

  const payload = await req.text();
  const signature = req.headers.get("X-Efin-Signature") ?? "";
  if (!(await verifyEfinSignature(payload, signature, webhookSecret))) {
    return json({ error: "Invalid eFinMoney signature" }, 401);
  }

  let event: {
    id?: string;
    type: string;
    data?: { payment_link?: EfinPaymentLink };
  };
  try {
    event = JSON.parse(payload);
  } catch {
    return json({ error: "Invalid JSON payload" }, 400);
  }

  const eventId = event.id ?? req.headers.get("X-Efin-Delivery") ?? null;

  if (event.type === "webhook.test") {
    return json({ ok: true, test: true, event_id: eventId });
  }

  const pl = event.data?.payment_link;
  if (!pl?.id) return json({ ok: true, ignored: true });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Our own row id is sent as the eFinMoney `reference`, so fall back to it
    // if the link id was never saved (e.g. the create call timed out after
    // eFinMoney made the link).
    let { data: link } = await service
      .schema("public")
      .from("payment_links")
      .select("*")
      .eq("efinmoney_link_id", pl.id)
      .maybeSingle();
    if (!link && pl.reference && UUID_RE.test(pl.reference)) {
      ({ data: link } = await service
        .schema("public")
        .from("payment_links")
        .select("*")
        .eq("id", pl.reference)
        .maybeSingle());
    }

    // Links we never created (other integrations on the same partner
    // account): acknowledge and ignore.
    if (!link) return json({ ok: true, ignored: true });

    const terminalStatus = TERMINAL_EVENTS[event.type];
    if (terminalStatus) {
      // A paid link never moves back to an unpaid state.
      await service
        .schema("public")
        .from("payment_links")
        .update({
          status: terminalStatus,
          efinmoney_link_id: link.efinmoney_link_id ?? pl.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", link.id)
        .neq("status", "paid");
      return json({ ok: true });
    }

    if (event.type !== "payment_link.paid") {
      return json({ ok: true, ignored: true });
    }

    // --- payment_link.paid --------------------------------------------------
    const table = SOURCE_TABLES[link.source_type];
    if (!table) return json({ ok: true, ignored: true });

    const paidAt = pl.paid_at ?? new Date().toISOString();
    const pay: PaidContext = {
      amount: Number(pl.amount ?? link.amount ?? 0),
      currency: String(pl.currency ?? link.currency ?? "CAD").toUpperCase(),
      efinRef: String(pl.short_code ?? pl.id),
      payerName: pl.payer_name ?? null,
      // Book the payment on the day it was actually paid, not the day the
      // webhook happened to arrive.
      day: isoDay(paidAt),
    };

    // Atomically claim the link: eFinMoney can deliver the same event more
    // than once (even concurrently), and only one delivery may settle the
    // invoice. Recording the payment + GL rows is idempotent and is retried
    // on every later delivery until it lands.
    const previousStatus = link.status;
    const { data: claimed, error: claimErr } = await service
      .schema("public")
      .from("payment_links")
      .update({
        status: "paid",
        efinmoney_link_id: link.efinmoney_link_id ?? pl.id,
        payer_name: pl.payer_name ?? null,
        paid_at: paidAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", link.id)
      .neq("status", "paid")
      .select("id");
    if (claimErr) {
      console.error("Failed to mark link paid:", claimErr.message);
      return json({ error: claimErr.message }, 500);
    }

    if (!claimed?.length) {
      // Already claimed by an earlier (or concurrent) delivery. Make sure its
      // payment + ledger rows actually landed, and backfill them if not.
      const { data: current } = await service
        .schema("public")
        .from("payment_links")
        .select("*")
        .eq("id", link.id)
        .maybeSingle();
      const doc = await loadSource(service, table, link.source_id);
      if (!current || !doc) return json({ ok: true, duplicate: true });

      const existing = await findPayment(service, doc.company_id, pay.efinRef);
      if (existing && (await hasGlEntry(service, doc.company_id, existing.id))) {
        return json({ ok: true, duplicate: true });
      }
      const claimedAt = Date.parse(String(current.updated_at ?? ""));
      if (Number.isFinite(claimedAt) && Date.now() - claimedAt < IN_FLIGHT_MS) {
        // The claiming delivery is probably still writing; ask eFinMoney to
        // retry later instead of racing it into duplicate rows.
        return json({ error: "Payment is still being recorded; retry later" }, 503);
      }
      const result = await recordPayment(service, link, doc, pay);
      if (result.error) return json({ error: result.error }, 500);
      await completeRevenue(service, link, doc);
      return json({ ok: true, duplicate: true, backfilled: true });
    }

    // Undo the claim so eFinMoney's retry can process the event again.
    const release = () =>
      service
        .schema("public")
        .from("payment_links")
        .update({ status: previousStatus, paid_at: null })
        .eq("id", link.id);

    const invoice = await loadSource(service, table, link.source_id);
    if (!invoice) return json({ ok: true, warning: "invoice missing" });

    const isSale = link.source_type === "sale";
    const alreadyPaid = isSale
      ? invoice.payment_status === "paid"
      : (invoice.status ?? invoice.payment_status) === "paid";
    // Document as it stands after this payment (used for revenue status).
    let settled: Record<string, unknown> = invoice;

    // --- Update sale payments / balances (mirrors Sales.jsx) ---------------
    if (isSale && !alreadyPaid) {
      const grandTotal = Number(invoice.grand_total || invoice.sale_price || 0);
      const payments = [
        ...(Array.isArray(invoice.payments) ? invoice.payments : []),
        {
          date: pay.day,
          amount: pay.amount,
          method: "eFinMoney",
          reference: pay.efinRef,
          notes: `Paid online via eFinMoney payment link${
            pay.payerName ? ` by ${pay.payerName}` : ""
          }`,
        },
      ];
      const totalPaid = payments.reduce(
        (sum: number, p: { amount?: unknown }) => sum + (Number(p.amount) || 0),
        0,
      );
      const saleUpdate = {
        payments,
        total_paid: totalPaid,
        balance_due: Math.max(0, grandTotal - totalPaid),
        // Sale.payment_status enum: pending|partial|paid|refunded
        payment_status: totalPaid >= grandTotal ? "paid" : "partial",
      };
      const { error: saleErr } = await service
        .schema("public")
        .from(table)
        .update(saleUpdate)
        .eq("id", invoice.id);
      if (saleErr) {
        console.error("Failed to update sale:", saleErr.message);
        await release();
        return json({ error: saleErr.message }, 500);
      }
      settled = { ...invoice, ...saleUpdate };
    }

    // --- Update invoice balances + status ----------------------------------
    if (!isSale && !alreadyPaid) {
      const newAmountPaid = Number(invoice.amount_paid || 0) + pay.amount;
      const newBalance = Math.max(
        0,
        Number(invoice.total_amount || 0) - newAmountPaid,
      );
      const fullyPaid = newBalance <= 0;

      // The financial statements read repair revenue/cash from the repair
      // order, not its invoice, so keep the order's payment status in step.
      // Done first: it's an idempotent set, safe to repeat if we release.
      if (link.source_type === "repair_invoice" && invoice.repair_order_id) {
        const { error: roErr } = await service
          .schema("public")
          .from("repair_orders")
          .update({ payment_status: fullyPaid ? "paid" : "partial" })
          .eq("id", invoice.repair_order_id);
        if (roErr) {
          console.error("Failed to update repair order:", roErr.message);
          await release();
          return json({ error: roErr.message }, 500);
        }
      }

      const invoiceUpdate: Record<string, unknown> = {
        amount_paid: newAmountPaid,
        balance_due: newBalance,
      };
      if (link.source_type === "sales_invoice") {
        // SalesInvoice.status enum: draft|sent|paid|partial|overdue|cancelled
        invoiceUpdate.status = fullyPaid ? "paid" : "partial";
      } else {
        // Repair Invoice.payment_status enum: pending|partial|paid
        invoiceUpdate.payment_status = fullyPaid ? "paid" : "partial";
      }

      const { error: invErr } = await service
        .schema("public")
        .from(table)
        .update(invoiceUpdate)
        .eq("id", invoice.id);
      if (invErr) {
        console.error("Failed to update invoice:", invErr.message);
        await release();
        return json({ error: invErr.message }, 500);
      }
      settled = { ...invoice, ...invoiceUpdate };
    }

    // --- PaymentReceived + GL rows ------------------------------------------
    // The link stays claimed (the invoice is already settled). On failure we
    // return 500 so eFinMoney retries; the retry lands in the duplicate
    // branch above and backfills whatever is missing.
    const result = await recordPayment(service, link, invoice, pay);
    if (result.error) return json({ error: result.error }, 500);

    await completeRevenue(service, link, settled);

    // --- Audit log (best effort) --------------------------------------------
    try {
      await service.schema("public").from("audit_logs").insert({
        company_id: invoice.company_id,
        action: "payment_received_via_efinmoney",
        entity_type: link.source_type,
        entity_id: invoice.id,
        details: {
          invoice_number: docNumberOf(link, invoice),
          amount: pay.amount,
          currency: pay.currency,
          payment_number: result.payment?.payment_number,
          efinmoney_link_id: pl.id,
          efinmoney_short_code: pl.short_code ?? null,
          efinmoney_event_id: eventId,
          payer_name: pay.payerName,
        },
      });
    } catch (auditErr) {
      console.warn("audit_logs insert skipped:", auditErr);
    }

    return json({ ok: true, payment_id: result.payment?.id });
  } catch (err: unknown) {
    console.error("efinmoney-webhook failed:", err);
    return json(
      { error: (err as Error)?.message || "Unexpected server error" },
      500,
    );
  }
});
