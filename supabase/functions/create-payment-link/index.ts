import { createClient } from "npm:@supabase/supabase-js@2";
import { decryptToken, efinFetch, RECONNECT_CODES } from "../_shared/efinmoney.ts";

// Creates (or reuses) an eFinMoney payment link for an invoice. Money is
// collected straight into the company's own connected eFinMoney wallet;
// eFinAuto never holds tenant funds. The `efinmoney-webhook` function is the
// source of truth for recording the payment.
//
// Secrets: EFINMONEY_API_KEY, EFINMONEY_TOKEN_ENC_KEY (shared with the
// `efinmoney` function), SUPABASE_SERVICE_ROLE_KEY.

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SOURCE_TABLES: Record<string, string> = {
  sales_invoice: "sales_invoices",
  repair_invoice: "invoices",
  sale: "sales",
};

/** Label used in the payment link description shown to the payer. */
const SOURCE_LABELS: Record<string, string> = {
  sales_invoice: "Invoice",
  repair_invoice: "Repair Invoice",
  sale: "Bill of Sale",
};

/**
 * Normalise the amount/status fields that differ between invoices and
 * sales (bill of sale) records.
 */
function describeSource(sourceType: string, rec: Record<string, any>) {
  if (sourceType === "sale") {
    const total = Number(rec.grand_total || rec.sale_price || 0);
    const balance = Number(rec.balance_due || 0) > 0
      ? Number(rec.balance_due)
      : total - Number(rec.total_paid || 0);
    return {
      settled: rec.payment_status === "paid" || rec.status === "cancelled",
      due: balance > 0 ? balance : 0,
      number: rec.bos_number || rec.sale_number || null,
    };
  }
  const status = rec.status ?? rec.payment_status;
  const total = Number(rec.total_amount || 0);
  const balance = Number(rec.balance_due || 0);
  return {
    settled: status === "paid" || status === "cancelled",
    due: balance > 0 ? balance : total,
    number: rec.invoice_number ?? null,
  };
}

/** Currencies eFinMoney payment links accept, with their minimum amounts. */
const MIN_AMOUNTS: Record<string, number> = {
  CAD: 2,
  USD: 2,
  GHS: 10,
  KES: 10,
  ZMW: 10,
  NGN: 100,
};

/** Local statuses for a link the payer can still pay. */
const ACTIVE_STATUSES = ["created", "pending", "awaiting_payment"];

const LINK_EXPIRES_IN_DAYS = 7;

interface CreateLinkPayload {
  source_type?: string;
  source_id?: string;
  force?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!Deno.env.get("EFINMONEY_API_KEY")) {
      return json(
        {
          error:
            "eFinMoney is not configured. Set EFINMONEY_API_KEY in your Supabase Edge Function secrets.",
        },
        500,
      );
    }

    const anon = createClient(supabaseUrl, anonKey);
    const service = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // --- 1. Verify caller JWT ------------------------------------------------
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Missing authorization token" }, 401);

    const { data: callerData, error: callerErr } =
      await anon.auth.getUser(token);
    if (callerErr || !callerData.user) {
      return json({ error: "Invalid or expired session" }, 401);
    }
    const caller = callerData.user;

    // --- 2. Resolve caller profile → company_id -----------------------------
    // The users/profile table lives in the shared `core` schema; fall back to
    // public.users for deployments that keep profiles in the public schema.
    let profile: { company_id: string | null } | null = null;
    for (const schema of ["core", "public"]) {
      const byId = await service
        .schema(schema)
        .from("users")
        .select("id, company_id")
        .eq("id", caller.id)
        .maybeSingle();
      if (byId.data) {
        profile = byId.data;
        break;
      }
      const byEmail = await service
        .schema(schema)
        .from("users")
        .select("id, company_id")
        .ilike("email", caller.email ?? "")
        .maybeSingle();
      if (byEmail.data) {
        profile = byEmail.data;
        break;
      }
    }

    if (!profile?.company_id) {
      return json(
        { error: "Your user profile is not linked to a company" },
        403,
      );
    }
    const companyId = profile.company_id;

    // --- 3. Validate payload -------------------------------------------------
    const body: CreateLinkPayload = await req.json();
    const sourceType = body.source_type?.trim();
    const sourceId = body.source_id?.trim();
    const table = sourceType ? SOURCE_TABLES[sourceType] : undefined;

    if (!table || !sourceId) {
      return json(
        {
          error:
            "source_type (sales_invoice | repair_invoice | sale) and source_id are required",
        },
        400,
      );
    }

    // --- 4. Load invoice (multi-tenant guard) --------------------------------
    const { data: invoice, error: invoiceErr } = await service
      .schema("public")
      .from(table)
      .select("*")
      .eq("id", sourceId)
      .maybeSingle();

    if (invoiceErr || !invoice) {
      return json({ error: "Invoice not found" }, 404);
    }
    if (invoice.company_id !== companyId) {
      return json({ error: "Not authorized for this invoice" }, 403);
    }

    const source = describeSource(sourceType, invoice);
    if (source.settled) {
      return json(
        { error: `This ${sourceType === "sale" ? "sale" : "invoice"} is already paid or cancelled` },
        400,
      );
    }

    const amount = Math.round(source.due * 100) / 100;
    if (amount <= 0) {
      return json({ error: "This invoice has nothing due" }, 400);
    }

    const currency = String(invoice.currency || "CAD").toUpperCase();
    const minAmount = MIN_AMOUNTS[currency];
    if (minAmount === undefined) {
      return json(
        {
          error: `eFinMoney payment links don't support ${currency}. Supported currencies: ${Object.keys(MIN_AMOUNTS).join(", ")}.`,
          code: "invalid_currency",
        },
        400,
      );
    }
    if (amount < minAmount) {
      return json(
        {
          error: `The minimum payment link amount for ${currency} is ${minAmount}.`,
          code: "invalid_amount",
        },
        400,
      );
    }

    // --- 4b. Require a connected eFinMoney account ---------------------------
    // The company's link token (from the Banking → eFinMoney connect flow)
    // authorises creating payment links on its account.
    const { data: efinLink } = await service
      .from("efinmoney_links")
      .select("status, access_token_enc")
      .eq("company_id", companyId)
      .maybeSingle();

    if (efinLink?.status !== "connected" || !efinLink.access_token_enc) {
      return json(
        {
          error:
            "This company has not connected eFinMoney. An admin needs to go to Settings → Payments and click \"Connect eFinMoney\" before creating payment links.",
          code: "connect_required",
        },
        400,
      );
    }
    const linkToken = await decryptToken(efinLink.access_token_enc);

    // --- 5. Reuse an active link (idempotent) --------------------------------
    const { data: activeLinks } = await service
      .schema("public")
      .from("payment_links")
      .select("id, efinmoney_link_id, url, status, amount, currency, expires_at")
      .eq("company_id", companyId)
      .eq("source_type", sourceType)
      .eq("source_id", sourceId)
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: false });

    const now = Date.now();
    const reusable = (activeLinks ?? []).find(
      (l) =>
        l.url &&
        Number(l.amount) === amount &&
        l.currency === currency &&
        (!l.expires_at || new Date(l.expires_at).getTime() > now),
    );
    if (reusable && !body.force) {
      return json({
        ok: true,
        reused: true,
        id: reusable.id,
        url: reusable.url,
        status: reusable.status,
        amount: reusable.amount,
        currency: reusable.currency,
      });
    }

    // Any other still-open link for this invoice is stale (forced refresh,
    // or the amount changed since it was made). Cancel it at eFinMoney so
    // the payer can't pay an outdated amount. Best effort.
    for (const stale of activeLinks ?? []) {
      if (stale.efinmoney_link_id) {
        const { body: cBody } = await efinFetch(
          `/v1/payment-links/${encodeURIComponent(stale.efinmoney_link_id)}/cancel`,
          { method: "POST" },
          linkToken,
        ).catch(() => ({ body: null }));
        // `not_cancellable` means it already ended (maybe paid); leave the
        // row for the webhook to settle.
        if (cBody && !cBody.success && cBody.code === "not_cancellable") continue;
      }
      await service
        .schema("public")
        .from("payment_links")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", stale.id)
        .in("status", ACTIVE_STATUSES);
    }

    // --- 6. Reserve a local row; its id is the eFinMoney `reference` --------
    // eFinMoney treats a repeated reference as an idempotent replay, so each
    // link attempt gets its own unique reference.
    const { data: row, error: insertErr } = await service
      .schema("public")
      .from("payment_links")
      .insert({
        company_id: companyId,
        source_type: sourceType,
        source_id: sourceId,
        invoice_number: source.number,
        amount,
        currency,
        status: "created",
        created_by: caller.email ?? caller.id,
      })
      .select("id")
      .single();

    if (insertErr || !row) {
      console.error("payment_links insert failed:", insertErr?.message);
      return json({ error: "Could not save the payment link" }, 500);
    }

    // --- 7. Create the eFinMoney payment link --------------------------------
    const description = `${SOURCE_LABELS[sourceType]} ${source.number ?? ""}`.trim();
    const { res: efinRes, body: efinBody } = await efinFetch(
      "/v1/payment-links",
      {
        method: "POST",
        body: JSON.stringify({
          amount,
          currency,
          reference: row.id,
          description: description.slice(0, 280),
          customer_name: invoice.customer_name || undefined,
          expires_in_days: LINK_EXPIRES_IN_DAYS,
        }),
      },
      linkToken,
    );

    if (!efinBody?.success || !efinBody.data?.url) {
      await service.schema("public").from("payment_links").delete().eq("id", row.id);
      console.error("eFinMoney error:", JSON.stringify(efinBody));
      const code = efinBody?.code as string | undefined;

      if (code && RECONNECT_CODES.has(code)) {
        await service
          .from("efinmoney_links")
          .update({
            status: "disconnected",
            access_token_enc: null,
            disconnected_at: new Date().toISOString(),
          })
          .eq("company_id", companyId);
        return json(
          {
            error:
              "The eFinMoney connection is no longer valid. An admin needs to reconnect eFinMoney in Settings → Payments.",
            code: "reconnect_required",
          },
          401,
        );
      }
      if (code === "scope_missing") {
        return json(
          {
            error:
              "This eFinMoney connection doesn't allow payment links yet. An admin needs to reconnect eFinMoney once in Settings → Payments and approve payment links.",
            code,
          },
          403,
        );
      }
      if (code === "no_wallet") {
        return json(
          {
            error: `Your eFinMoney account has no active ${currency} wallet, so it can't collect ${currency} payments.`,
            code,
          },
          400,
        );
      }
      return json(
        {
          error: efinBody?.error || "Failed to create eFinMoney payment link",
          code,
          request_id: efinBody?.request_id,
        },
        efinRes.status === 429 ? 429 : efinRes.status >= 500 ? 502 : 400,
      );
    }

    // --- 8. Persist the eFinMoney link details ------------------------------
    const efin = efinBody.data;
    const { data: link, error: updateErr } = await service
      .schema("public")
      .from("payment_links")
      .update({
        efinmoney_link_id: efin.id,
        short_code: efin.short_code ?? null,
        reference: efin.reference ?? row.id,
        url: efin.url,
        status: efin.status ?? "pending",
        expires_at: efin.expires_at ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .select("id, url, status, amount, currency")
      .single();

    if (updateErr) {
      console.error("payment_links update failed:", updateErr.message);
      return json(
        { error: "Payment link was created in eFinMoney but could not be saved" },
        500,
      );
    }

    return json({ ok: true, reused: false, ...link });
  } catch (err: unknown) {
    console.error("create-payment-link failed:", err);
    return json(
      { error: (err as Error)?.message || "Unexpected server error" },
      500,
    );
  }
});
