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

interface SmsPayload {
  to: string;
  message: string;
  company_id?: string;
}

interface SmsSettings {
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_phone_number?: string;
  vonage_api_key?: string;
  vonage_api_secret?: string;
  vonage_from_number?: string;
}

// ── Twilio ──────────────────────────────────────────────────────────────────

async function sendViaTwilio(
  to: string,
  message: string,
  settings: SmsSettings,
): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const { twilio_account_sid, twilio_auth_token, twilio_phone_number } =
    settings;

  if (!twilio_account_sid || !twilio_auth_token || !twilio_phone_number) {
    return { ok: false, error: "Twilio credentials are incomplete" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${twilio_account_sid}/Messages.json`;
  const body = new URLSearchParams({
    To: to,
    From: twilio_phone_number,
    Body: message,
  });

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + btoa(`${twilio_account_sid}:${twilio_auth_token}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await resp.json();

  if (!resp.ok) {
    return {
      ok: false,
      error: data.message || `Twilio error (HTTP ${resp.status})`,
    };
  }

  return { ok: true, sid: data.sid };
}

// ── Vonage (Nexmo) ─────────────────────────────────────────────────────────

async function sendViaVonage(
  to: string,
  message: string,
  settings: SmsSettings,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { vonage_api_key, vonage_api_secret, vonage_from_number } = settings;

  if (!vonage_api_key || !vonage_api_secret || !vonage_from_number) {
    return { ok: false, error: "Vonage credentials are incomplete" };
  }

  const body = new URLSearchParams({
    api_key: vonage_api_key,
    api_secret: vonage_api_secret,
    to,
    from: vonage_from_number,
    text: message,
  });

  const resp = await fetch("https://rest.nexmo.com/sms/json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await resp.json();

  if (!resp.ok) {
    return {
      ok: false,
      error: data.error_text || `Vonage error (HTTP ${resp.status})`,
    };
  }

  // Vonage returns an array; check each message status
  const msg = data.messages?.[0];
  if (msg?.status !== "0") {
    return { ok: false, error: msg?.["error-text"] ?? "Vonage send failed" };
  }

  return { ok: true, id: msg["message-id"] };
}

// ── Handler ─────────────────────────────────────────────────────────────────

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

    const anon = createClient(supabaseUrl, anonKey);
    const service = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // --- Verify caller JWT ---------------------------------------------------
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Missing authorization token" }, 401);

    const { data: callerData, error: callerErr } =
      await anon.auth.getUser(token);
    if (callerErr || !callerData.user) {
      return json({ error: "Invalid or expired session" }, 401);
    }
    const caller = callerData.user;

    // --- Parse payload -------------------------------------------------------
    const payload: SmsPayload = await req.json();
    const to = payload.to?.trim();
    const message = payload.message?.trim();

    if (!to) return json({ error: "Recipient phone number is required" }, 400);
    if (!message) return json({ error: "Message body is required" }, 400);

    // --- Resolve company SMS config ------------------------------------------
    let companyId = payload.company_id;

    // If not provided, look up from caller's profile
    if (!companyId) {
      const { data: callerProfile } = await service
        .schema("core")
        .from("users")
        .select("id, data")
        .eq("id", caller.id)
        .maybeSingle();

      if (!callerProfile) {
        const { data: byEmail } = await service
          .schema("core")
          .from("users")
          .select("id, data")
          .ilike("email", caller.email ?? "")
          .maybeSingle();
        companyId = byEmail?.data?.company_id;
      } else {
        companyId = callerProfile.data?.company_id;
      }
    }

    if (!companyId) {
      return json(
        { error: "No company assigned. Set a company in your profile or pass company_id." },
        400,
      );
    }

    const { data: company, error: companyErr } = await service
      .schema("public")
      .from("companies")
      .select("sms_provider, sms_settings")
      .eq("id", companyId)
      .maybeSingle();

    if (companyErr || !company) {
      return json({ error: "Could not load company SMS configuration" }, 404);
    }

    const provider = company.sms_provider;
    const settings: SmsSettings = company.sms_settings ?? {};

    if (!provider || provider === "none") {
      return json(
        { error: "No SMS provider configured. Go to Settings → SMS Provider to set one up." },
        400,
      );
    }

    // --- Dispatch ------------------------------------------------------------
    let result: { ok: boolean; error?: string };

    if (provider === "twilio") {
      result = await sendViaTwilio(to, message, settings);
    } else if (provider === "vonage") {
      result = await sendViaVonage(to, message, settings);
    } else {
      return json({ error: `Unknown SMS provider: ${provider}` }, 400);
    }

    if (!result.ok) {
      return json({ error: result.error }, 502);
    }

    return json({ ok: true, provider, messageId: result.sid ?? result.id });
  } catch (err: unknown) {
    console.error("sms-send failed:", err);
    return json(
      { error: (err as Error)?.message || "Failed to send SMS" },
      500,
    );
  }
});
