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
    // Atomically claim the link: eFinMoney can deliver the same event more
    // than once (even concurrently), and only one delivery may post money.
    const previousStatus = link.status;
    const paidAt = pl.paid_at ?? new Date().toISOString();
    const today = new Date().toISOString().split("T")[0];
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
    if (!claimed?.length) return json({ ok: true, duplicate: true });

    // Undo the claim so eFinMoney's retry can process the event again.
    const release = () =>
      service
        .schema("public")
        .from("payment_links")
        .update({ status: previousStatus, paid_at: null })
        .eq("id", link.id);

    const amountPaid = Number(pl.amount ?? link.amount ?? 0);
    const currency = String(pl.currency ?? link.currency ?? "CAD").toUpperCase();
    const efinRef = pl.short_code ?? pl.id;

    const table = SOURCE_TABLES[link.source_type];
    if (!table) return json({ ok: true, ignored: true });

    const { data: invoice } = await service
      .schema("public")
      .from(table)
      .select("*")
      .eq("id", link.source_id)
      .maybeSingle();

    if (!invoice) return json({ ok: true, warning: "invoice missing" });

    const isSale = link.source_type === "sale";
    const docNumber = isSale
      ? invoice.bos_number || invoice.sale_number || null
      : invoice.invoice_number ?? null;
    const alreadyPaid = isSale
      ? invoice.payment_status === "paid"
      : (invoice.status ?? invoice.payment_status) === "paid";

    // --- Update sale payments / balances (mirrors Sales.jsx) ---------------
    if (isSale && !alreadyPaid) {
      const grandTotal = Number(invoice.grand_total || invoice.sale_price || 0);
      const payments = [
        ...(Array.isArray(invoice.payments) ? invoice.payments : []),
        {
          date: today,
          amount: amountPaid,
          method: "eFinMoney",
          reference: efinRef,
          notes: `Paid online via eFinMoney payment link${
            pl.payer_name ? ` by ${pl.payer_name}` : ""
          }`,
        },
      ];
      const totalPaid = payments.reduce(
        (sum: number, p: { amount?: unknown }) => sum + (Number(p.amount) || 0),
        0,
      );
      const { error: saleErr } = await service
        .schema("public")
        .from(table)
        .update({
          payments,
          total_paid: totalPaid,
          balance_due: Math.max(0, grandTotal - totalPaid),
          // Sale.payment_status enum: pending|partial|paid|refunded
          payment_status: totalPaid >= grandTotal ? "paid" : "partial",
        })
        .eq("id", invoice.id);
      if (saleErr) {
        console.error("Failed to update sale:", saleErr.message);
        await release();
        return json({ error: saleErr.message }, 500);
      }
    }

    // --- Update invoice balances + status ----------------------------------
    if (!isSale && !alreadyPaid) {
      const newAmountPaid = Number(invoice.amount_paid || 0) + amountPaid;
      const newBalance = Math.max(
        0,
        Number(invoice.total_amount || 0) - newAmountPaid,
      );
      const fullyPaid = newBalance <= 0;

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
    }

    // --- PaymentReceived row (mirrors PaymentsTab.jsx) ---------------------
    const paymentNumber = `PMT-${String(efinRef).slice(-8).toUpperCase()}`;

    const paymentRow = pick(
      {
        company_id: invoice.company_id,
        payment_number: paymentNumber,
        customer_id: invoice.customer_id ?? null,
        customer_name: invoice.customer_name ?? null,
        amount: amountPaid,
        payment_date: today,
        payment_method: "other",
        reference_number: efinRef,
        applied_to_invoice: isSale ? undefined : invoice.id,
        invoice_number: docNumber,
        status: "completed",
        notes: `Paid online via eFinMoney payment link ${efinRef}${
          pl.payer_name ? ` by ${pl.payer_name}` : ""
        }`,
      },
      PAYMENT_COLUMNS,
    );

    const { data: payment, error: payErr } = await service
      .schema("public")
      .from("payment_receiveds")
      .insert(paymentRow)
      .select("id, payment_number")
      .single();

    if (payErr) {
      // Do not fail the webhook: the link is already marked paid and the
      // invoice updated. Log loudly so the row can be backfilled.
      console.error(
        "payment_receiveds insert failed (backfill needed):",
        payErr.message,
      );
      return json({ ok: true, warning: payErr.message });
    }

    // --- GL posting: Dr Cash 1000 / Cr AR 1100 (mirrors PaymentsTab) -------
    const glRow = pick(
      {
        company_id: invoice.company_id,
        transaction_number: payment?.payment_number || paymentNumber,
        transaction_type: "payment_received",
        category: "asset",
        amount: amountPaid,
        account_code: "1000",
        account_name: "Cash",
        account_type: "asset",
        contra_account_code: "1100",
        contra_account_name: "Accounts Receivable",
        reference_type: "PaymentReceived",
        reference_id: payment?.id,
        reference_number: payment?.payment_number || paymentNumber,
        customer_name: invoice.customer_name ?? null,
        description: `Payment received from ${
          invoice.customer_name ?? "customer"
        }${
          docNumber
            ? ` for ${isSale ? "Bill of Sale" : "Invoice"} ${docNumber}`
            : ""
        } (online via eFinMoney)`,
        transaction_date: today,
        payment_method: "other",
        status: "completed",
      },
      GL_COLUMNS,
    );

    const { error: glErr } = await service
      .schema("public")
      .from("transactions")
      .insert(glRow);
    if (glErr) {
      console.error(
        "GL transaction insert failed (backfill needed):",
        glErr.message,
      );
      return json({ ok: true, warning: glErr.message });
    }

    // --- Audit log (best effort) --------------------------------------------
    try {
      await service.schema("public").from("audit_logs").insert({
        company_id: invoice.company_id,
        action: "payment_received_via_efinmoney",
        entity_type: link.source_type,
        entity_id: invoice.id,
        details: {
          invoice_number: docNumber,
          amount: amountPaid,
          currency,
          payment_number: payment?.payment_number || paymentNumber,
          efinmoney_link_id: pl.id,
          efinmoney_short_code: pl.short_code ?? null,
          efinmoney_event_id: eventId,
          payer_name: pl.payer_name ?? null,
        },
      });
    } catch (auditErr) {
      console.warn("audit_logs insert skipped:", auditErr);
    }

    return json({ ok: true, payment_id: payment?.id });
  } catch (err: unknown) {
    console.error("efinmoney-webhook failed:", err);
    return json(
      { error: (err as Error)?.message || "Unexpected server error" },
      500,
    );
  }
});
