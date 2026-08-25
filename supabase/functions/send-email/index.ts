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

interface EmailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // --- Verify caller JWT ---------------------------------------------------
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const anon = createClient(supabaseUrl, anonKey);
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Missing authorization token" }, 401);

    const { data: callerData, error: callerErr } =
      await anon.auth.getUser(token);
    if (callerErr || !callerData.user) {
      return json({ error: "Invalid or expired session" }, 401);
    }

    // --- Validate SMTP config ------------------------------------------------
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");
    const smtpFrom = Deno.env.get("SMTP_FROM");

    if (!smtpHost || !smtpUser || !smtpPass) {
      return json(
        {
          error:
            "SMTP not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your Supabase Edge Function secrets.",
        },
        500,
      );
    }

    // --- Parse + validate payload -------------------------------------------
    const payload: EmailPayload = await req.json();
    const to = payload.to?.trim();
    const subject = payload.subject?.trim();

    if (!to || !/^\S+@\S+\.\S+$/.test(to)) {
      return json({ error: "A valid recipient email is required" }, 400);
    }
    if (!subject) {
      return json({ error: "Subject is required" }, 400);
    }
    if (!payload.html && !payload.text) {
      return json({ error: "Either html or text body is required" }, 400);
    }

    const from = payload.from?.trim() || smtpFrom;

    // --- Send via nodemailer ------------------------------------------------
    const nodemailer = await import("npm:nodemailer@6");
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: Number(Deno.env.get("SMTP_PORT") ?? 587),
      secure: Deno.env.get("SMTP_SECURE") === "true",
      auth: { user: smtpUser, pass: smtpPass },
      connectionTimeout: 10_000,
    });

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html: payload.html,
      text: payload.text,
    });

    return json({ ok: true, messageId: info.messageId });
  } catch (err: unknown) {
    console.error("send-email failed:", err);
    return json(
      { error: (err as Error)?.message || "Failed to send email" },
      500,
    );
  }
});
