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

const VALID_ROLES = new Set([
  "admin",
  "manager",
  "sales",
  "technician",
  "inventory_manager",
  "accountant",
  "user",
]);

interface InvitePayload {
  email?: string;
  full_name?: string;
  role?: string;
  company_id?: string | null;
  department?: string;
  employee_id?: string;
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

    // --- 2. Verify caller is an admin ---------------------------------------
    const { data: callerProfile } = await service
      .schema("core")
      .from("users")
      .select("id, role")
      .eq("id", caller.id)
      .maybeSingle();

    const adminRole =
      callerProfile?.role ??
      (
        await service
          .schema("core")
          .from("users")
          .select("id, role")
          .ilike("email", caller.email ?? "")
          .maybeSingle()
      ).data?.role;

    if (adminRole !== "admin") {
      return json({ error: "Only administrators can invite users." }, 403);
    }

    // --- 3. Validate payload -------------------------------------------------
    const body: InvitePayload = await req.json();
    const email = body.email?.trim().toLowerCase();
    const fullName = body.full_name?.trim();
    const role = body.role || "user";

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return json({ error: "A valid email address is required" }, 400);
    }
    if (!fullName) {
      return json({ error: "Full name is required" }, 400);
    }
    if (!VALID_ROLES.has(role)) {
      return json({ error: "Invalid role" }, 400);
    }

    // --- 4. Duplicate guard --------------------------------------------------
    const { data: existing } = await service
      .schema("core")
      .from("users")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (existing) {
      return json(
        { error: `A user with the email ${email} already exists` },
        409,
      );
    }

    // --- 5. Send GoTrue invite email -----------------------------------------
    const siteUrl = Deno.env.get("SITE_URL")?.replace(/\/+$/, "");

    const { data: invited, error: inviteErr } =
      await service.auth.admin.inviteUserByEmail(email, {
        ...(siteUrl ? { redirectTo: `${siteUrl}/reset-password` } : {}),
        data: { full_name: fullName, role },
      });

    if (inviteErr) {
      const duplicateMatch =
        /already/i.test(inviteErr.message ?? "") ||
        /registered/i.test(inviteErr.message ?? "");
      return json(
        {
          error: duplicateMatch
            ? `A user with the email ${email} already exists`
            : inviteErr.message,
        },
        duplicateMatch ? 409 : 400,
      );
    }

    // --- 6. Upsert profile row in core.users --------------------------------
    const authUserId = invited?.user?.id;

    const profileRow: Record<string, unknown> = {
      ...(authUserId ? { id: authUserId } : {}),
      email,
      full_name: fullName,
      role,
      department: body.department?.trim() || null,
      employee_id: body.employee_id?.trim() || null,
      data: { company_id: body.company_id || null, accessible_modules: [] },
    };

    const { data: profile, error: profileErr } = await service
      .schema("core")
      .from("users")
      .upsert(profileRow)
      .select()
      .single();

    if (profileErr) {
      return json(
        {
          error: `Invitation sent, but creating the user profile failed: ${profileErr.message}`,
          partial: true,
        },
        500,
      );
    }

    return json({ ok: true, user: profile });
  } catch (err: unknown) {
    console.error("invite-user failed:", err);
    return json(
      { error: (err as Error)?.message || "Unexpected server error" },
      500,
    );
  }
});
