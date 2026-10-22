import { createClient } from "npm:@supabase/supabase-js@2";

// Stripe webhook receiver. This is the SOURCE OF TRUTH for recording a
// payment: the customer's browser may close before the success redirect
// lands, but Stripe always delivers the webhook.
//
// Required secrets:
//   STRIPE_WEBHOOK_SECRET   (whsec_... from the Stripe dashboard endpoint)
//   SUPABASE_SERVICE_ROLE_KEY (auto-provided by Supabase)
//
// Handled events:
//   checkout.session.completed        → record payment + GL posting
//   checkout.session.async_payment_failed → mark link failed
//   checkout.session.expired          → mark link expired
//   account.updated                   → sync Stripe Connect onboarding status

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SOURCE_TABLES: Record<string, string> = {
  sales_invoice: "sales_invoices",
  repair_invoice: "invoices",
};

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

/** Verify a Stripe-Signature header (HMAC-SHA256 over `${t}.${payload}`). */
async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
  toleranceSec = 300,
): Promise<boolean> {
  const parts = Object.create(null) as Record<string, string[]>;
  for (const kv of header.split(",")) {
    const [k, v] = kv.split("=", 2);
    if (!k || !v) continue;
    (parts[k.trim()] ??= []).push(v.trim());
  }
  const timestamp = parts["t"]?.[0];
  const signatures = parts["v1"] ?? [];
  if (!timestamp || signatures.length === 0) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSec) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}.${payload}`),
  );
  const expected = [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time-ish comparison.
  let mismatch = expected.length !== signatures[0].length ? 1 : 0;
  for (let i = 0; i < Math.min(expected.length, signatures[0].length); i++) {
    mismatch |= expected.charCodeAt(i) !== signatures[0].charCodeAt(i) ? 1 : 0;
  }
  if (mismatch === 0) return true;

  // Fall back to a length-insensitive check across all v1 signatures.
  for (const sig of signatures) {
    if (sig.length === expected.length) {
      let m = 0;
      for (let i = 0; i < expected.length; i++) {
        m |= expected.charCodeAt(i) !== sig.charCodeAt(i) ? 1 : 0;
      }
      if (m === 0) return true;
    }
  }
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    return json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured" },
      500,
    );
  }

  const payload = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";
  if (!(await verifyStripeSignature(payload, signature, webhookSecret))) {
    return json({ error: "Invalid Stripe signature" }, 400);
  }

  let event: {
    type: string;
    data: { object: Record<string, unknown> };
  };
  try {
    event = JSON.parse(payload);
  } catch {
    return json({ error: "Invalid JSON payload" }, 400);
  }

  const obj = event.data?.object as
    | (Record<string, unknown> & { id?: string })
    | undefined;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // --- Connect account status sync -----------------------------------------
    // Keeps the Settings → Payments status card accurate. The onboarding
    // flow only sees the account as it was at link-creation time; Stripe
    // pushes the authoritative charges/payouts flags here.
    if (event.type === "account.updated") {
      const acct = obj as Record<string, unknown> & { id?: string };
      if (!acct?.id || !acct.id.startsWith("acct_")) {
        return json({ ok: true, ignored: true });
      }

      const { error: acctErr } = await service
        .schema("public")
        .from("stripe_connect_accounts")
        .update({
          details_submitted: !!acct.details_submitted,
          charges_enabled: !!acct.charges_enabled,
          payouts_enabled: !!acct.payouts_enabled,
          requirements_status:
            (acct.requirements as { disabled_reason?: string } | undefined)
              ?.disabled_reason ?? null,
          business_type:
            typeof acct.business_type === "string" ? acct.business_type : null,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_account_id", acct.id);

      if (acctErr) {
        // Loud: without this the status card can go stale/wrong.
        console.error(
          "stripe_connect_accounts update failed:",
          acctErr.message,
        );
        return json({ error: acctErr.message }, 500);
      }
      return json({ ok: true, account: acct.id });
    }

    const sessionId = obj?.id;
    if (!sessionId) return json({ ok: true, ignored: true });

    const { data: link } = await service
      .schema("public")
      .from("payment_links")
      .select("*")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    // Events for sessions we never created (e.g. other products on the same
    // Stripe account) — acknowledge and ignore.
    if (!link) return json({ ok: true, ignored: true });

    switch (event.type) {
      case "checkout.session.completed": {
        // Idempotent: Stripe retries deliveries, so a paid link is a no-op.
        if (link.status === "paid") return json({ ok: true, duplicate: true });

        const amountTotal = Number(obj!.amount_total ?? 0) / 100;
        const currency = String(obj!.currency ?? link.currency ?? "CAD").toUpperCase();
        const paymentIntentId =
          typeof obj!.payment_intent === "string"
            ? obj!.payment_intent
            : null;
        const paidAt = new Date().toISOString();
        const today = paidAt.split("T")[0];

        const { error: linkErr } = await service
          .schema("public")
          .from("payment_links")
          .update({
            status: "paid",
            stripe_payment_intent_id: paymentIntentId,
            paid_at: paidAt,
            updated_at: paidAt,
          })
          .eq("id", link.id);
        if (linkErr) {
          console.error("Failed to mark link paid:", linkErr.message);
          return json({ error: linkErr.message }, 500);
        }

        const table = SOURCE_TABLES[link.source_type];
        if (!table) return json({ ok: true, ignored: true });

        const { data: invoice } = await service
          .schema("public")
          .from(table)
          .select("*")
          .eq("id", link.source_id)
          .maybeSingle();

        if (!invoice) return json({ ok: true, warning: "invoice missing" });

        const alreadyPaid =
          (invoice.status ?? invoice.payment_status) === "paid";

        // --- Update invoice balances + status --------------------------------
        if (!alreadyPaid) {
          const newAmountPaid =
            Number(invoice.amount_paid || 0) + amountTotal;
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
            return json({ error: invErr.message }, 500);
          }
        }

        // --- PaymentReceived row (mirrors PaymentsTab.jsx) -------------------
        const paymentNumber = paymentIntentId
          ? `PMT-${paymentIntentId.slice(-8).toUpperCase()}`
          : `PMT-${Date.now()}`;

        const paymentRow = pick(
          {
            company_id: invoice.company_id,
            payment_number: paymentNumber,
            customer_id: invoice.customer_id ?? null,
            customer_name: invoice.customer_name ?? null,
            amount: amountTotal,
            payment_date: today,
            payment_method: "credit_card",
            reference_number: paymentIntentId,
            applied_to_invoice: invoice.id,
            invoice_number: invoice.invoice_number ?? null,
            status: "completed",
            notes: `Paid online via Stripe Checkout (session ${sessionId})`,
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

        // --- GL posting: Dr Cash 1000 / Cr AR 1100 (mirrors PaymentsTab) -----
        const glRow = pick(
          {
            company_id: invoice.company_id,
            transaction_number: payment?.payment_number || paymentNumber,
            transaction_type: "payment_received",
            category: "asset",
            amount: amountTotal,
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
              invoice.invoice_number
                ? ` for Invoice ${invoice.invoice_number}`
                : ""
            } (online via Stripe)`,
            transaction_date: today,
            payment_method: "credit_card",
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

        // --- Audit log (best effort) ------------------------------------------
        try {
          await service.schema("public").from("audit_logs").insert({
            company_id: invoice.company_id,
            action: "payment_received_via_stripe",
            entity_type: link.source_type,
            entity_id: invoice.id,
            details: {
              invoice_number: invoice.invoice_number ?? null,
              amount: amountTotal,
              currency,
              payment_number: payment?.payment_number || paymentNumber,
              stripe_session_id: sessionId,
              stripe_payment_intent_id: paymentIntentId,
            },
          });
        } catch (auditErr) {
          console.warn("audit_logs insert skipped:", auditErr);
        }

        return json({ ok: true, payment_id: payment?.id });
      }

      case "checkout.session.async_payment_failed": {
        if (link.status === "paid") return json({ ok: true, duplicate: true });
        await service
          .schema("public")
          .from("payment_links")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", link.id);
        return json({ ok: true });
      }

      case "checkout.session.expired": {
        if (link.status === "paid") return json({ ok: true, duplicate: true });
        await service
          .schema("public")
          .from("payment_links")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("id", link.id);
        return json({ ok: true });
      }

      default:
        return json({ ok: true, ignored: true });
    }
  } catch (err: unknown) {
    console.error("stripe-webhook failed:", err);
    return json(
      { error: (err as Error)?.message || "Unexpected server error" },
      500,
    );
  }
});
