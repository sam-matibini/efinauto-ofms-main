import { createClient } from "npm:@supabase/supabase-js@2";

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
};

/** Label used in the Stripe Checkout line item description. */
const SOURCE_LABELS: Record<string, string> = {
  sales_invoice: "Invoice",
  repair_invoice: "Repair Invoice",
};

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
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeSecretKey) {
      return json(
        {
          error:
            "Stripe is not configured. Set STRIPE_SECRET_KEY in your Supabase Edge Function secrets.",
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
            "source_type (sales_invoice | repair_invoice) and source_id are required",
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

    const invoiceStatus = invoice.status ?? invoice.payment_status;
    if (invoiceStatus === "paid" || invoiceStatus === "cancelled") {
      return json(
        { error: "This invoice is already paid or cancelled" },
        400,
      );
    }

    const total = Number(invoice.total_amount || 0);
    const balance = Number(invoice.balance_due || 0);
    const amount = Math.round((balance > 0 ? balance : total) * 100) / 100;
    if (amount <= 0) {
      return json({ error: "This invoice has nothing due" }, 400);
    }

    const currency = (invoice.currency || "CAD").toLowerCase();
    const customerEmail = (invoice.customer_email ?? "").trim();
    if (!/^\S+@\S+\.\S+$/.test(customerEmail)) {
      return json(
        {
          error:
            "This invoice has no valid customer email, so a payment link cannot be created",
        },
        400,
      );
    }

    // --- 4b. Require a connected, charges-enabled Stripe account -------------
    // Direct charges: the session is created AS the dealership's connected
    // account, so the dealership is the merchant of record, bears the Stripe
    // fee, and receives the payout directly.
    const { data: connectAccount } = await service
      .schema("public")
      .from("stripe_connect_accounts")
      .select("stripe_account_id, charges_enabled, payouts_enabled")
      .eq("company_id", companyId)
      .maybeSingle();

    if (!connectAccount?.stripe_account_id || !connectAccount.charges_enabled) {
      return json(
        {
          error:
            "This company has not finished Stripe onboarding. Go to Settings → Payments and complete \"Connect with Stripe\" before creating payment links.",
          code: "connect_required",
        },
        400,
      );
    }
    const stripeAccountId = connectAccount.stripe_account_id;

    // --- 5. Reuse an active link (idempotent) --------------------------------
    if (!body.force) {
      const { data: existing } = await service
        .schema("public")
        .from("payment_links")
        .select("id, url, status, amount, currency, created_at")
        .eq("company_id", companyId)
        .eq("source_type", sourceType)
        .eq("source_id", sourceId)
        .in("status", ["created", "pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Stripe Checkout sessions expire after 24h; only reuse links younger
      // than 24h. Older ones get a fresh session.
      const fresh =
        existing &&
        Date.now() - new Date(existing.created_at).getTime() < 24 * 3600 * 1000;
      if (fresh && existing.url) {
        return json({
          ok: true,
          reused: true,
          id: existing.id,
          url: existing.url,
          status: existing.status,
          amount: existing.amount,
          currency: existing.currency,
        });
      }
    }

    // --- 6. Create Stripe Checkout Session -----------------------------------
    const baseUrl = (Deno.env.get("PAYMENT_RETURN_BASE_URL") ??
      req.headers.get("Origin") ??
      "")
      .replace(/\/+$/, "");
    if (!baseUrl) {
      return json(
        {
          error:
            "Set PAYMENT_RETURN_BASE_URL (or send an Origin header) so Stripe knows where to send the customer",
        },
        500,
      );
    }

    const unitAmount = Math.round(amount * 100); // Stripe minor units
    const description = `${SOURCE_LABELS[sourceType]} ${invoice.invoice_number ?? ""}`.trim();

    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.set("line_items[0][quantity]", "1");
    form.set("line_items[0][price_data][currency]", currency);
    form.set("line_items[0][price_data][unit_amount]", String(unitAmount));
    form.set("line_items[0][price_data][product_data][name]", description.slice(0, 128));
    form.set("customer_email", customerEmail);
    form.set("client_reference_id", `${sourceType}:${sourceId}`);
    form.set("metadata[company_id]", companyId);
    form.set("metadata[source_type]", sourceType);
    form.set("metadata[source_id]", sourceId);
    form.set("metadata[invoice_number]", invoice.invoice_number ?? "");
    form.set("success_url", `${baseUrl}/pay/success?session_id={CHECKOUT_SESSION_ID}`);
    form.set("cancel_url", `${baseUrl}/pay/cancelled`);
    // Sessions expire after 24h so stale links stop accepting money.
    form.set("expires_at", String(Math.floor(Date.now() / 1000) + 24 * 3600));

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        // Direct charge: create the session AS the connected account so the
        // dealership is the merchant of record and receives the payout.
        "Stripe-Account": stripeAccountId,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const session = await stripeRes.json();

    if (!stripeRes.ok || !session.id) {
      console.error("Stripe error:", JSON.stringify(session));
      return json(
        { error: session?.error?.message || "Failed to create Stripe session" },
        502,
      );
    }

    // --- 7. Persist the link -------------------------------------------------
    const { data: link, error: insertErr } = await service
      .schema("public")
      .from("payment_links")
      .insert({
        company_id: companyId,
        source_type: sourceType,
        source_id: sourceId,
        invoice_number: invoice.invoice_number ?? null,
        stripe_session_id: session.id,
        url: session.url,
        amount,
        currency: currency.toUpperCase(),
        status: "created",
        created_by: caller.email ?? caller.id,
      })
      .select("id, url, status, amount, currency")
      .single();

    if (insertErr) {
      console.error("payment_links insert failed:", insertErr.message);
      return json(
        { error: "Payment link was created in Stripe but could not be saved" },
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
