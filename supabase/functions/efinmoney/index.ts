import { createClient } from "npm:@supabase/supabase-js@2";
import { decryptToken, efinFetch, encryptToken } from "../_shared/efinmoney.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getAllowedOrigins(): string[] {
  const raw = Deno.env.get("EFINMONEY_ALLOWED_ORIGINS") || Deno.env.get("EFINMONEY_REDIRECT_URI") || "";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function deriveRedirectUri(req: Request): string {
  const allowed = getAllowedOrigins();
  const origin = req.headers.get("origin") || "";
  if (allowed.length > 0 && origin && allowed.includes(origin)) {
    return `${origin.replace(/\/$/, "")}/settings/efinmoney/callback`;
  }
  if (allowed.length > 0) {
    // prefer first allowed origin
    return `${allowed[0].replace(/\/$/, "")}/settings/efinmoney/callback`;
  }
  // fallback to origin if present
  if (origin) return `${origin.replace(/\/$/, "")}/settings/efinmoney/callback`;
  throw new Error("invalid_redirect_uri");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anon = createClient(supabaseUrl, anonKey);
    const service = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ success: false, error: "Missing authorization token" }, 401);
    const { data: callerData, error: callerErr } = await anon.auth.getUser(token);
    if (callerErr || !callerData.user) return json({ success: false, error: "Invalid or expired session" }, 401);
    const caller = callerData.user;

    const { data: callerProfile } = await service
      .schema("core")
      .from("users")
      .select("id, role, company_id, email")
      .eq("id", caller.id)
      .maybeSingle();

    const payload = await req.json().catch(() => ({}));
    const body = payload.body || payload;
    const action = body.action as string;

    const assertCompanyAccess = (companyId: string, requireAdmin = false) => {
      if (!companyId) throw new Error("company_id required");
      if (requireAdmin && callerProfile?.role !== "admin") throw new Error("forbidden");
      if (callerProfile?.role === "admin") return;
      if (callerProfile?.company_id && callerProfile.company_id === companyId) return;
      throw new Error("forbidden");
    };

    if (action === "start") {
      const company_id = body.company_id;
      assertCompanyAccess(company_id, true);
      const state = crypto.randomUUID();
      const redirect_uri = deriveRedirectUri(req);
      const expires_at = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      await service.from("efinmoney_link_states").insert({
        state,
        company_id,
        user_id: caller.id,
        redirect_uri,
        expires_at,
      });

      const { res, body: sBody } = await efinFetch("/v1/links/sessions", {
        method: "POST",
        body: JSON.stringify({ redirect_uri, state, external_ref: company_id }),
      });
      if (!sBody?.success) {
        return json({ success: false, code: sBody?.code, error: sBody?.error || "failed_to_start" }, res.status || 400);
      }
      return json({ success: true, data: { link_url: sBody.data.link_url, session_id: sBody.data.session_id, expires_at: sBody.data.expires_at } });
    }

    if (action === "complete") {
      const { state, session_id, code } = body;
      if (!state || !session_id || !code) return json({ success: false, error: "invalid_request" }, 400);
      const { data: st } = await service.from("efinmoney_link_states").select("*").eq("state", state).maybeSingle();
      if (!st) return json({ success: false, error: "invalid_state" }, 400);
      if (st.user_id && st.user_id !== caller.id) return json({ success: false, error: "forbidden" }, 403);
      if (new Date(st.expires_at).getTime() < Date.now()) {
        await service.from("efinmoney_link_states").delete().eq("state", state);
        return json({ success: false, error: "state_expired" }, 400);
      }
      assertCompanyAccess(st.company_id, true);

      const { res, body: tBody } = await efinFetch("/v1/links/token", {
        method: "POST",
        body: JSON.stringify({ session_id, code }),
      });
      if (!tBody?.success) {
        await service.from("efinmoney_link_states").delete().eq("state", state);
        return json({ success: false, code: tBody?.code, error: tBody?.error || "invalid_grant" }, res.status || 400);
      }
      const data = tBody.data;
      const access_token = data.access_token;
      const enc = await encryptToken(access_token);

      await service.from("efinmoney_links").upsert({
        company_id: st.company_id,
        user_id: caller.id,
        external_ref: st.company_id,
        link_id: data.link_id,
        access_token_enc: enc,
        scopes: data.scopes || ["accounts:read", "balances:read"],
        account_type: data.account?.type || null,
        account_name: data.account?.name || null,
        account_legal_name: data.account?.legal_name || null,
        account_country: data.account?.country || null,
        status: "connected",
        connected_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
        disconnected_at: null,
      }, { onConflict: "company_id" });

      await service.from("efinmoney_link_states").delete().eq("state", state);
      return json({ success: true, data: { status: "connected", account: data.account } });
    }

    if (action === "cancel") {
      const { state } = body;
      if (state) {
        const { data: st } = await service.from("efinmoney_link_states").select("*").eq("state", state).maybeSingle();
        if (st && (!st.user_id || st.user_id === caller.id)) {
          await service.from("efinmoney_link_states").delete().eq("state", state);
        }
      }
      return json({ success: true });
    }

    if (action === "status") {
      const company_id = body.company_id;
      assertCompanyAccess(company_id, false);
      const { data: link } = await service.from("efinmoney_links").select("*").eq("company_id", company_id).maybeSingle();
      if (!link || link.status !== "connected" || !link.access_token_enc) {
        return json({ success: true, data: { status: "disconnected" } });
      }
      try {
        const token = await decryptToken(link.access_token_enc);
        const { res, body: mBody } = await efinFetch("/v1/links/me", {}, token);
        if (!mBody?.success) {
          if (mBody?.code === "link_revoked" || mBody?.code === "invalid_link_token") {
            await service.from("efinmoney_links").update({ status: "disconnected", access_token_enc: null, disconnected_at: new Date().toISOString() }).eq("company_id", company_id);
            return json({ success: true, data: { status: "disconnected", reconnect_required: true } });
          }
          return json({ success: false, code: mBody?.code, error: mBody?.error }, res.status || 400);
        }
        await service.from("efinmoney_links").update({ last_synced_at: new Date().toISOString() }).eq("company_id", company_id);
        return json({ success: true, data: { status: "connected", link_id: link.link_id, account: { type: link.account_type, name: link.account_name, legal_name: link.account_legal_name, country: link.account_country }, connected_at: link.connected_at } });
      } catch (e) {
        return json({ success: false, error: (e as Error).message }, 500);
      }
    }

    if (action === "accounts") {
      const company_id = body.company_id;
      assertCompanyAccess(company_id, false);
      const { data: link } = await service.from("efinmoney_links").select("*").eq("company_id", company_id).maybeSingle();
      if (!link || link.status !== "connected" || !link.access_token_enc) return json({ success: false, error: "not_connected" }, 400);
      const token = await decryptToken(link.access_token_enc);
      const { res, body: aBody } = await efinFetch("/v1/accounts", {}, token);
      if (!aBody?.success) {
        if (aBody?.code === "link_revoked" || aBody?.code === "invalid_link_token") {
          await service.from("efinmoney_links").update({ status: "disconnected", access_token_enc: null, disconnected_at: new Date().toISOString() }).eq("company_id", company_id);
          return json({ success: false, error: "reconnect_required", code: "reconnect_required" }, 401);
        }
        return json({ success: false, code: aBody?.code, error: aBody?.error }, res.status || 400);
      }
      await service.from("efinmoney_links").update({ last_synced_at: new Date().toISOString() }).eq("company_id", company_id);
      return json({ success: true, data: aBody.data });
    }

    if (action === "balances") {
      const company_id = body.company_id;
      assertCompanyAccess(company_id, false);
      const { data: link } = await service.from("efinmoney_links").select("*").eq("company_id", company_id).maybeSingle();
      if (!link || link.status !== "connected" || !link.access_token_enc) return json({ success: false, error: "not_connected" }, 400);
      const token = await decryptToken(link.access_token_enc);
      const { res, body: bBody } = await efinFetch("/v1/balances", {}, token);
      if (!bBody?.success) {
        if (bBody?.code === "link_revoked" || bBody?.code === "invalid_link_token") {
          await service.from("efinmoney_links").update({ status: "disconnected", access_token_enc: null, disconnected_at: new Date().toISOString() }).eq("company_id", company_id);
          return json({ success: false, error: "reconnect_required", code: "reconnect_required" }, 401);
        }
        return json({ success: false, code: bBody?.code, error: bBody?.error }, res.status || 400);
      }
      await service.from("efinmoney_links").update({ last_synced_at: new Date().toISOString() }).eq("company_id", company_id);
      return json({ success: true, data: bBody.data });
    }

    if (action === "disconnect") {
      const company_id = body.company_id;
      assertCompanyAccess(company_id, true);
      const { data: link } = await service.from("efinmoney_links").select("*").eq("company_id", company_id).maybeSingle();
      if (link?.access_token_enc && link?.status === "connected") {
        try {
          const token = await decryptToken(link.access_token_enc);
          await efinFetch("/v1/links/me", { method: "DELETE" }, token);
        } catch (_) {
          // best effort
        }
      }
      await service.from("efinmoney_links").update({ status: "disconnected", access_token_enc: null, disconnected_at: new Date().toISOString() }).eq("company_id", company_id);
      return json({ success: true });
    }

    if (action === "rates") {
      const company_id = body.company_id;
      assertCompanyAccess(company_id, false);
      const base = body.base as string;
      const symbols = body.symbols as string[] | string;
      if (!base) return json({ success: false, error: "base_required" }, 400);
      
      let symbolsParam = "";
      if (Array.isArray(symbols)) {
        symbolsParam = symbols.join(",");
      } else if (typeof symbols === "string") {
        symbolsParam = symbols;
      }
      
      // Try to get rates - may need auth or be public
      const { data: link } = await service.from("efinmoney_links").select("*").eq("company_id", company_id).maybeSingle();
      let token: string | undefined;
      if (link?.access_token_enc && link?.status === "connected") {
        try {
          token = await decryptToken(link.access_token_enc);
        } catch (_) {
          token = undefined;
        }
      }
      
      // Try different endpoints
      let res, rBody;
      if (symbolsParam) {
        res = (await efinFetch(`/v1/rates?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(symbolsParam)}`, {}, token)).res;
        rBody = (await efinFetch(`/v1/rates?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(symbolsParam)}`, {}, token)).body;
      } else {
        res = (await efinFetch(`/v1/rates/${encodeURIComponent(base)}`, {}, token)).res;
        rBody = (await efinFetch(`/v1/rates/${encodeURIComponent(base)}`, {}, token)).body;
      }
      
      if (!rBody?.success && rBody) {
        // If not wrapped in success, return as-is
        return json({ success: true, data: rBody.data || rBody.rates || rBody });
      }
      if (!rBody?.success) {
        return json({ success: false, code: rBody?.code, error: rBody?.error || "failed_to_fetch_rates" }, res?.status || 400);
      }
      return json({ success: true, data: rBody.data || rBody.rates });
    }

    return json({ success: false, error: "unknown_action" }, 400);
  } catch (err: unknown) {
    console.error("efinmoney error:", err);
    const msg = (err as Error)?.message || "Unexpected server error";
    if (msg === "forbidden") return json({ success: false, error: "forbidden" }, 403);
    if (msg === "company_id required") return json({ success: false, error: "invalid_request" }, 400);
    return json({ success: false, error: msg }, 500);
  }
});
