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

/**
 * Creates (or reuses) a Stripe Connect STANDARD account for the caller's
 * company and returns a Stripe-hosted onboarding link. The dealership
 * completes KYC/payouts on Stripe's page; eFinAuto only stores the acct id
 * + status. No tenant secret keys are ever handled.
 *
 * Secrets: STRIPE_SECRET_KEY (platform), SUPABASE_SERVICE_ROLE_KEY, and
 * PAYMENT_RETURN_BASE_URL (or an Origin header) for the redirect targets.
 */
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

    // --- 2. Resolve caller profile → company_id (core → public fallback) ----
    let profile: { company_id: string | null } | null = null;
    for (const schema of ["core", "public"]) {
      const byId = await service
        .schema(schema)
        .from("users")
        .select("id, company_id, email")
        .eq("id", caller.id)
        .maybeSingle();
      if (byId.data) {
        profile = byId.data;
        break;
      }
      const byEmail = await service
        .schema(schema)
        .from("users")
        .select("id, company_id, email")
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

    // --- 3. Load the company (for display + account email) -------------------
    const { data: company } = await service
      .schema("public")
      .from("companies")
      .select("id, name, email")
      .eq("id", companyId)
      .maybeSingle();

    // --- 4. Reuse or create the Connect account -----------------------------
    const { data: existing } = await service
      .schema("public")
      .from("stripe_connect_accounts")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle();

    let accountId = existing?.stripe_account_id ?? null;

    if (!accountId) {
      const accountForm = new URLSearchParams();
      accountForm.set("type", "standard");
      accountForm.set("metadata[company_id]", companyId);
      const accountEmail =
        company?.email?.trim() || profile.email?.trim() || caller.email;
      if (accountEmail) accountForm.set("email", accountEmail);
      if (company?.name?.trim()) {
        accountForm.set("business_profile[name]", company.name.trim());
      }

      const accountRes = await fetch("https://api.stripe.com/v1/accounts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: accountForm.toString(),
      });
      const account = await accountRes.json();

      if (!accountRes.ok || !account.id) {
        console.error("Stripe account create error:", JSON.stringify(account));
        return json(
          {
            error:
              account?.error?.message || "Failed to create Stripe account",
          },
          502,
        );
      }
      accountId = account.id;

      const { error: insertErr } = await service
        .schema("public")
        .from("stripe_connect_accounts")
        .upsert(
          {
            company_id: companyId,
            stripe_account_id: accountId,
            account_type: "standard",
            business_name: company?.name?.trim() || null,
            details_submitted: !!account.details_submitted,
            charges_enabled: !!account.charges_enabled,
            payouts_enabled: !!account.payouts_enabled,
            requirements_status:
              account.requirements?.disabled_reason ?? null,
            default_currency:
              (account.default_currency ?? "CAD").toUpperCase(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "company_id" },
        );

      if (insertErr) {
        console.error("stripe_connect_accounts insert failed:", insertErr.message);
        return json(
          {
            error:
              "Stripe account created but could not be saved: " + insertErr.message,
          },
          500,
        );
      }
    }

    // --- 5. Create the hosted onboarding link --------------------------------
    const baseUrl = (Deno.env.get("PAYMENT_RETURN_BASE_URL") ??
      req.headers.get("Origin") ??
      "")
      .replace(/\/+$/, "");
    if (!baseUrl) {
      return json(
        {
          error:
            "Set PAYMENT_RETURN_BASE_URL (or send an Origin header) so Stripe knows where to send the user",
        },
        500,
      );
    }

    const linkForm = new URLSearchParams();
    linkForm.set("account", accountId);
    linkForm.set("type", "account_onboarding");
    linkForm.set("refresh_url", `${baseUrl}/settings?stripe=refresh`);
    linkForm.set("return_url", `${baseUrl}/settings?stripe=return`);

    const linkRes = await fetch("https://api.stripe.com/v1/account_links", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: linkForm.toString(),
    });
    const link = await linkRes.json();

    if (!linkRes.ok || !link.url) {
      console.error("Stripe account_link error:", JSON.stringify(link));
      return json(
        {
          error:
            link?.error?.message || "Failed to create onboarding link",
        },
        502,
      );
    }

    // --- 6. Return current status alongside the link -------------------------
    const { data: refreshed } = await service
      .schema("public")
      .from("stripe_connect_accounts")
      .select("charges_enabled, payouts_enabled, details_submitted")
      .eq("company_id", companyId)
      .maybeSingle();

    return json({
      ok: true,
      url: link.url,
      stripe_account_id: accountId,
      charges_enabled: !!refreshed?.charges_enabled,
      payouts_enabled: !!refreshed?.payouts_enabled,
      details_submitted: !!refreshed?.details_submitted,
    });
  } catch (err: unknown) {
    console.error("create-connect-onboarding failed:", err);
    return json(
      { error: (err as Error)?.message || "Unexpected server error" },
      500,
    );
  }
});
