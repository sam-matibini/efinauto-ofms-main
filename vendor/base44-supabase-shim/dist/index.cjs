"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  createClient: () => createClient,
  defaultEntityToTable: () => defaultEntityToTable,
  parseOrderBy: () => parseOrderBy,
  resolveEntityMapping: () => resolveEntityMapping
});
module.exports = __toCommonJS(index_exports);
var import_supabase_js = require("@supabase/supabase-js");

// src/agents.ts
function makeAgents(opts = {}) {
  return {
    /**
     * Returns a WhatsApp connect URL for the given agent, or null when not
     * configured. Meant to be dropped straight into `<a href={...}>` — React
     * omits the attribute when null so the anchor becomes inert instead of
     * navigating to "null".
     */
    getWhatsAppConnectURL(agentName) {
      return opts.whatsappUrls?.[agentName] ?? null;
    }
  };
}

// src/auth.ts
var setTokenWarned = false;
function makeAuth(client, opts = {}) {
  const loginPath = opts.loginPath ?? "/login";
  return {
    async signIn({ email, password }) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    /** Base44 alias for signIn. */
    async loginViaEmailPassword(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    async signUp({ email, password, metadata }) {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: metadata ?? {} }
      });
      if (error) throw error;
      return data;
    },
    /** Base44 alias for signUp. */
    async register({ email, password, metadata }) {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: metadata ?? {} }
      });
      if (error) throw error;
      return data;
    },
    /**
     * Base44 OAuth flow: redirects the browser to the provider's consent screen
     * and back to `returnPath` (relative to window.location.origin) on success.
     * Supabase equivalent: signInWithOAuth with an absolute redirectTo.
     */
    async loginWithProvider(provider, returnPath) {
      const redirectTo = typeof window !== "undefined" ? window.location.origin + (returnPath ?? "/") : returnPath;
      const { data, error } = await client.auth.signInWithOAuth({
        provider,
        options: redirectTo ? { redirectTo } : void 0
      });
      if (error) throw error;
      return data;
    },
    /**
     * Passwordless login for EXISTING users (magic link + email OTP code).
     *
     * Base44's hosted login offered Google + email; the self-hosted equivalent for imported users
     * (who have no password and no OAuth identity yet) is email OTP. Sends both a magic link and a
     * 6-digit code (the email template controls which the user sees):
     *   - Magic link: clicking it returns to `emailRedirectTo`, where supabase-js `detectSessionInUrl`
     *     exchanges the session automatically. Requires the origin to be in the project's redirect
     *     allowlist.
     *   - OTP code: enter it via {@link verifyLoginOtp} — needs no redirect allowlist, so it is the
     *     most robust path for previews/demos.
     *
     * `shouldCreateUser: false` keeps this login-only — a stranger's email won't silently create an
     * account. Callers that want signup should use {@link signUp}.
     */
    async sendLoginOtp(email, returnPath) {
      const emailRedirectTo = typeof window !== "undefined" ? window.location.origin + (returnPath ?? "/") : returnPath;
      const { data, error } = await client.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          ...emailRedirectTo ? { emailRedirectTo } : {}
        }
      });
      if (error) throw error;
      return data;
    },
    /**
     * Verify the 6-digit email OTP code from {@link sendLoginOtp}. Uses type 'email' (login flow) —
     * distinct from {@link verifyOtp} which is hardcoded type 'signup' for the register() flow.
     * Supabase installs the session on success.
     */
    async verifyLoginOtp(email, otpCode) {
      const { data, error } = await client.auth.verifyOtp({
        email,
        token: otpCode,
        type: "email"
      });
      if (error) throw error;
      return {
        access_token: data.session?.access_token,
        session: data.session,
        user: data.user
      };
    },
    /**
     * Base44 email OTP verification after register(). Supabase's verifyOtp
     * already sets the session on success, so setToken() is redundant afterward
     * (kept as a soft no-op for source-compat).
     */
    async verifyOtp({ email, otpCode }) {
      const { data, error } = await client.auth.verifyOtp({
        email,
        token: otpCode,
        type: "signup"
      });
      if (error) throw error;
      return {
        access_token: data.session?.access_token,
        session: data.session,
        user: data.user
      };
    },
    async resendOtp(email) {
      const { error } = await client.auth.resend({ email, type: "signup" });
      if (error) throw error;
    },
    /**
     * No-op alias kept so migrated code doesn't TypeError. Supabase's
     * verifyOtp() already installed the session — pushing the access_token in
     * again would do nothing productive (Supabase requires access + refresh to
     * setSession, and Base44 returns only access). Warns once per process.
     */
    setToken(_accessToken) {
      if (!setTokenWarned) {
        setTokenWarned = true;
        if (typeof console !== "undefined") {
          console.warn(
            "[base44-shim] auth.setToken() is a no-op \u2014 verifyOtp()/signInWithPassword() already installed the Supabase session. Safe to remove the call."
          );
        }
      }
    },
    async resetPasswordRequest(email, options) {
      const redirectTo = options?.redirectTo ?? opts.resetPasswordRedirect;
      const { error } = await client.auth.resetPasswordForEmail(
        email,
        redirectTo ? { redirectTo } : void 0
      );
      if (error) throw error;
    },
    async resetPassword({ newPassword }) {
      const { data, error } = await client.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return data;
    },
    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },
    /**
     * Base44 alias for signOut. If `returnUrl` is provided, navigates there
     * after signOut resolves so SPAs can drop users on a public route.
     */
    async logout(returnUrl) {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      if (returnUrl && typeof window !== "undefined") {
        window.location.assign(returnUrl);
      }
    },
    /**
     * Non-throwing check for whether a user is currently signed in. Use this as the guard BEFORE
     * calling `me()` / `getUser()`, which THROW when there is no session. Never throws — a
     * transient getSession error is treated as "not authenticated".
     */
    async isAuthenticated() {
      try {
        const { data } = await client.auth.getSession();
        return !!data.session;
      } catch {
        return false;
      }
    },
    async getUser() {
      const { data, error } = await client.auth.getUser();
      if (error) throw error;
      return data.user;
    },
    /**
     * Base44 alias for getUser. Returns the current user object, or THROWS if not signed in.
     * Call `isAuthenticated()` first if the caller may run for logged-out visitors.
     */
    async me() {
      const { data, error } = await client.auth.getUser();
      if (error) throw error;
      if (!data.user) throw new Error("Not authenticated");
      return data.user;
    },
    /**
     * Base44 alias for updating the current user's metadata. Accepts arbitrary
     * key/value pairs that get stored in `user_metadata`.
     */
    async updateMe(metadata) {
      const { data, error } = await client.auth.updateUser({ data: metadata });
      if (error) throw error;
      return data.user;
    },
    async getSession() {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session;
    },
    /**
     * Base44 used to redirect SPA users to its hosted login page. Self-host
     * has no hosted login, so this just navigates to the configured local
     * loginPath. Override the path via createClient({ ..., authLoginPath: '/x' }).
     */
    redirectToLogin(returnUrl) {
      if (typeof window === "undefined") return;
      if (window.location.pathname === loginPath) return;
      let safeReturn = returnUrl;
      if (safeReturn) {
        const looksCyclic = safeReturn.includes(`${loginPath}?next=`) || safeReturn.includes(`${loginPath}%3F`);
        if (looksCyclic || safeReturn.length > 1024) safeReturn = void 0;
      }
      const url = safeReturn ? `${loginPath}?next=${encodeURIComponent(safeReturn)}` : loginPath;
      window.location.assign(url);
    },
    onAuthStateChange(cb) {
      return client.auth.onAuthStateChange(cb);
    }
  };
}

// src/entities.ts
var DEFAULT_SHARED_ENTITIES = [
  // Auth/identity (option C: shared)
  "User",
  "Role",
  "UserRole",
  // 'finance.user_roles' was 404 — UserRole belongs in shared
  "Department",
  // Org (option C: shared)
  "Company",
  // Cross-app entities exposed by core schema
  "AuditLog"
  // Note: Customer is intentionally NOT shared — each app's Customer schema
  // differs significantly (CRM vs Facility vs Construction).
];
function defaultEntityToTable(entityName) {
  const snake = entityName.replace(
    /([A-Z])/g,
    (m, c, i) => i === 0 ? c.toLowerCase() : "_" + c.toLowerCase()
  );
  if (snake.endsWith("y") && !/[aeiou]y$/.test(snake)) return snake.slice(0, -1) + "ies";
  if (/(s|x|z|ch|sh)$/.test(snake)) return snake + "es";
  return snake + "s";
}
function resolveEntityMapping(entityName, opts) {
  if (opts.entityMap?.[entityName]) return opts.entityMap[entityName];
  const sharedEntities = opts.sharedEntities ?? DEFAULT_SHARED_ENTITIES;
  const sharedSchema = opts.sharedSchema ?? "core";
  const schema = sharedEntities.includes(entityName) ? sharedSchema : opts.schemaPrefix;
  return { schema, table: defaultEntityToTable(entityName) };
}
function parseOrderBy(input) {
  if (!input) return void 0;
  if (typeof input === "object") return input;
  if (input.startsWith("-")) return { field: input.slice(1), ascending: false };
  return { field: input, ascending: true };
}
var MONGO_OPS = [
  "$eq",
  "$ne",
  "$gt",
  "$gte",
  "$lt",
  "$lte",
  "$in",
  "$nin",
  "$like",
  "$ilike"
];
function isMongoFilter(v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  return Object.keys(v).some(
    (k) => MONGO_OPS.includes(k)
  );
}
function applyMongoOps(query, field, ops) {
  for (const [op, value] of Object.entries(ops)) {
    switch (op) {
      case "$eq":
        query = query.eq(field, value);
        break;
      case "$ne":
        query = query.neq(field, value);
        break;
      case "$gt":
        query = query.gt(field, value);
        break;
      case "$gte":
        query = query.gte(field, value);
        break;
      case "$lt":
        query = query.lt(field, value);
        break;
      case "$lte":
        query = query.lte(field, value);
        break;
      case "$in":
        query = query.in(field, value);
        break;
      case "$nin":
        query = query.not("in", `(${value.map((v) => JSON.stringify(v)).join(",")})`);
        break;
      case "$like":
        query = query.like(field, value);
        break;
      case "$ilike":
        query = query.ilike(field, value);
        break;
    }
  }
  return query;
}
function applyFilter(query, where) {
  for (const [field, raw] of Object.entries(where)) {
    const v = raw;
    if (v === null) {
      query = query.is(field, null);
    } else if (isMongoFilter(v)) {
      query = applyMongoOps(query, field, v);
    } else if (typeof v === "object" && !Array.isArray(v) && "op" in v) {
      const { op, value } = v;
      query = applyMongoOps(query, field, { [`$${op}`]: value });
    } else if (Array.isArray(v)) {
      query = query.in(field, v);
    } else {
      query = query.eq(field, v);
    }
  }
  return query;
}
function applyRange(query, limit, skip) {
  if (typeof skip === "number" && typeof limit === "number") {
    return query.range(skip, skip + limit - 1);
  }
  if (typeof limit === "number") return query.limit(limit);
  return query;
}
function makeEntityApi(client, mapping) {
  const from = () => client.schema(mapping.schema).from(mapping.table);
  const isMissingTableError = (e) => {
    if (!e || typeof e !== "object") return false;
    const code = e.code;
    const status = e.status;
    return code === "PGRST205" || code === "42P01" || status === 404;
  };
  const warnedTables = /* @__PURE__ */ new Set();
  const warnMissing = () => {
    const key = `${mapping.schema}.${mapping.table}`;
    if (warnedTables.has(key)) return;
    warnedTables.add(key);
    if (typeof console !== "undefined") console.warn(`[base44-shim] table ${key} not found \u2014 returning empty result`);
  };
  return {
    async list(orderBy, limit, skip) {
      let q = from().select("*");
      const ob = parseOrderBy(orderBy);
      if (ob) q = q.order(ob.field, { ascending: ob.ascending ?? true });
      q = applyRange(q, limit, skip);
      const { data, error } = await q;
      if (error) {
        if (isMissingTableError(error)) {
          warnMissing();
          return [];
        }
        throw error;
      }
      return data ?? [];
    },
    async filter(where, orderBy, limit, skip) {
      let q = from().select("*");
      q = applyFilter(q, where);
      const ob = parseOrderBy(orderBy);
      if (ob) q = q.order(ob.field, { ascending: ob.ascending ?? true });
      q = applyRange(q, limit, skip);
      const { data, error } = await q;
      if (error) {
        if (isMissingTableError(error)) {
          warnMissing();
          return [];
        }
        throw error;
      }
      return data ?? [];
    },
    async get(id) {
      const { data, error } = await from().select("*").eq("id", id).maybeSingle();
      if (error) {
        if (isMissingTableError(error)) {
          warnMissing();
          return null;
        }
        throw error;
      }
      return data ?? null;
    },
    async read(id) {
      const { data, error } = await from().select("*").eq("id", id).maybeSingle();
      if (error) {
        if (isMissingTableError(error)) {
          warnMissing();
          return null;
        }
        throw error;
      }
      return data ?? null;
    },
    async create(body) {
      const { data, error } = await from().insert(body).select().single();
      if (error) throw error;
      return data;
    },
    async bulkCreate(rows) {
      if (!rows.length) return [];
      const { data, error } = await from().insert(rows).select();
      if (error) throw error;
      return data ?? [];
    },
    async update(id, body) {
      const { data, error } = await from().update(body).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    async bulkUpdate(rows) {
      if (!rows.length) return [];
      const results = await Promise.all(
        rows.map(
          ({ id, ...patch }) => from().update(patch).eq("id", id).select().single()
        )
      );
      const errors = results.map((r) => r.error).filter(Boolean);
      if (errors.length) throw errors[0];
      return results.map((r) => r.data);
    },
    async updateMany(where, update) {
      const patch = update?.$set ?? update;
      let q = from().update(patch);
      q = applyFilter(q, where);
      const { data, error } = await q.select();
      if (error) throw error;
      return data ?? [];
    },
    async delete(id) {
      const { error } = await from().delete().eq("id", id);
      if (error) throw error;
    },
    async deleteMany(where) {
      let q = from().delete();
      q = applyFilter(q, where);
      const { error } = await q;
      if (error) throw error;
    },
    subscribe(callback) {
      const channel = client.channel(`${mapping.schema}.${mapping.table}.${Math.random().toString(36).slice(2, 8)}`).on(
        "postgres_changes",
        { event: "*", schema: mapping.schema, table: mapping.table },
        (payload) => {
          const type = payload.eventType.toLowerCase();
          callback({ type, new: payload.new, old: payload.old });
        }
      ).subscribe();
      return () => {
        void client.removeChannel(channel);
      };
    }
  };
}
function makeEntitiesProxy(client, opts) {
  const cache = {};
  return new Proxy({}, {
    get(_target, prop) {
      if (typeof prop !== "string") return void 0;
      if (!cache[prop]) {
        const mapping = resolveEntityMapping(prop, opts);
        cache[prop] = makeEntityApi(client, mapping);
      }
      return cache[prop];
    }
  });
}

// src/functions.ts
function makeFunctions(client) {
  return {
    /** Invoke an edge function by name, passing JSON body. Returns parsed JSON. */
    async invoke(name, payload) {
      const { data, error } = await client.functions.invoke(name, {
        body: payload
      });
      if (error) throw error;
      return data;
    },
    /** Lower-level: invoke and return Response so caller can handle non-JSON. */
    async fetch(name, init) {
      const url = `${client.supabaseUrl}/functions/v1/${name}`;
      const headers = new Headers(init?.headers);
      const session = await client.auth.getSession();
      const token = session.data.session?.access_token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      headers.set("apikey", client.supabaseKey);
      return fetch(url, { ...init, headers });
    }
  };
}

// src/integrations.ts
function makeIntegrations(client, opts) {
  const Core = {
    async UploadFile({
      file,
      bucket,
      path,
      contentType
    }) {
      const b = bucket ?? opts.defaultBucket;
      const p = path ?? `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file?.name ?? "file"}`;
      const { error } = await client.storage.from(b).upload(p, file, {
        contentType: contentType ?? file?.type,
        upsert: false
      });
      if (error) throw error;
      const { data } = client.storage.from(b).getPublicUrl(p);
      return { url: data.publicUrl, path: p };
    },
    async SendEmail(payload) {
      if (!opts.sendEmailFunction) {
        throw new Error(
          "SendEmail not configured. Set integrations.sendEmailFunction in createClient() and deploy a corresponding Supabase Edge Function (e.g. send-email)."
        );
      }
      const { error } = await client.functions.invoke(opts.sendEmailFunction, { body: payload });
      if (error) throw error;
      return { ok: true };
    },
    async InvokeLLM(payload) {
      if (!opts.invokeLlmFunction) {
        throw new Error(
          "InvokeLLM not configured. AI features are disabled in this self-host build. Set integrations.invokeLlmFunction in createClient() and deploy an edge function that proxies to your LLM endpoint (Ollama / internal gateway)."
        );
      }
      const { data, error } = await client.functions.invoke(opts.invokeLlmFunction, {
        body: payload
      });
      if (error) throw error;
      return data;
    },
    async GenerateImage(payload) {
      if (!opts.generateImageFunction) {
        throw new Error(
          "GenerateImage not configured. Image-gen features are disabled in this self-host build. Set integrations.generateImageFunction in createClient() and deploy an edge function that proxies to your image endpoint (SDXL / DALL\xB7E gateway)."
        );
      }
      const { data, error } = await client.functions.invoke(opts.generateImageFunction, {
        body: payload
      });
      if (error) throw error;
      return data;
    }
  };
  return { Core };
}

// src/connectors.ts
function makeConnectors(opts) {
  function resolveToken(integrationType) {
    try {
      const envKey = `STATICBOT_CONNECTOR_${integrationType}`;
      if (typeof Deno !== "undefined" && Deno.env) {
        const raw = Deno.env.get(envKey);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed.accessToken) return parsed;
          } catch {
            return { accessToken: raw, connectionConfig: {} };
          }
        }
      }
    } catch {
    }
    if (opts) {
      const val = opts[integrationType];
      if (typeof val === "string") {
        return { accessToken: val, connectionConfig: {} };
      }
      if (val && typeof val === "object" && "accessToken" in val) {
        return val;
      }
    }
    const available = [];
    try {
      if (typeof Deno !== "undefined" && Deno.env) {
        for (const [k] of Object.entries(Deno.env.toObject())) {
          if (k.startsWith("STATICBOT_CONNECTOR_")) {
            available.push(k.slice("STATICBOT_CONNECTOR_".length));
          }
        }
      }
    } catch {
    }
    if (opts) {
      for (const k of Object.keys(opts)) {
        if (!available.includes(k)) available.push(k);
      }
    }
    const hint = available.length > 0 ? ` Available connectors: ${available.join(", ")}.` : " No connector tokens are configured.";
    throw new Error(
      `Connector '${integrationType}' not found. Set a Supabase function secret named STATICBOT_CONNECTOR_${integrationType} with the OAuth token JSON (or pass the token via createClient({ connectors: { ${integrationType}: "..." } })).` + hint
    );
  }
  return {
    /**
     * Retrieve OAuth credentials for a connector integration type.
     * Returns { accessToken, connectionConfig }. Matches the Base44 SDK's
     * `base44.asServiceRole.connectors.getConnection(integrationType)`.
     */
    async getConnection(integrationType) {
      if (!integrationType || typeof integrationType !== "string") {
        throw new Error("Integration type is required and must be a string");
      }
      return resolveToken(integrationType);
    },
    /**
     * Deprecated alias for getConnection — returns only the accessToken string.
     * @deprecated Use getConnection(integrationType) instead.
     */
    async getAccessToken(integrationType) {
      if (!integrationType || typeof integrationType !== "string") {
        throw new Error("Integration type is required and must be a string");
      }
      return resolveToken(integrationType).accessToken;
    }
  };
}

// src/misc.ts
function makeAppLogs(client, app2) {
  return {
    async logUserInApp(pageName) {
      try {
        await client.schema("core").from("audit_logs").insert({
          app: app2,
          action: "page_view",
          module: pageName
        });
      } catch {
      }
    }
  };
}
function makeUsers() {
  return {
    async inviteUser(_args) {
      throw new Error(
        "inviteUser is admin-only and not exposed to the browser shim. Use the Studio dashboard or an edge function with service_role to invite users."
      );
    }
  };
}
var app = {};

// src/storage.ts
function makeStorage(client, defaultBucket) {
  return {
    /** Upload a file to a bucket. Returns the public URL. */
    async uploadFile({
      bucket,
      path,
      file,
      contentType,
      upsert = false
    }) {
      const b = bucket ?? defaultBucket;
      const { error } = await client.storage.from(b).upload(path, file, {
        contentType,
        upsert
      });
      if (error) throw error;
      const { data } = client.storage.from(b).getPublicUrl(path);
      return { path, url: data.publicUrl };
    },
    /** Get a public URL for a stored object. */
    getPublicUrl(path, bucket) {
      const b = bucket ?? defaultBucket;
      const { data } = client.storage.from(b).getPublicUrl(path);
      return data.publicUrl;
    },
    /** Generate a time-limited signed URL for private buckets. */
    async createSignedUrl(path, expiresInSec = 3600, bucket) {
      const b = bucket ?? defaultBucket;
      const { data, error } = await client.storage.from(b).createSignedUrl(path, expiresInSec);
      if (error) throw error;
      return data.signedUrl;
    },
    /** Delete one or more objects. */
    async remove(paths, bucket) {
      const b = bucket ?? defaultBucket;
      const list = Array.isArray(paths) ? paths : [paths];
      const { error } = await client.storage.from(b).remove(list);
      if (error) throw error;
    },
    /** List objects in a bucket prefix. */
    async list(prefix, bucket) {
      const b = bucket ?? defaultBucket;
      const { data, error } = await client.storage.from(b).list(prefix);
      if (error) throw error;
      return data ?? [];
    }
  };
}

// src/index.ts
function createClient(options) {
  if (!options.supabaseUrl) throw new Error("createClient: supabaseUrl is required");
  if (!options.supabaseAnonKey) throw new Error("createClient: supabaseAnonKey is required");
  if (!options.schemaPrefix) throw new Error("createClient: schemaPrefix is required");
  const supabase = options.client ?? (0, import_supabase_js.createClient)(options.supabaseUrl, options.supabaseAnonKey);
  const entities = makeEntitiesProxy(supabase, {
    schemaPrefix: options.schemaPrefix,
    sharedSchema: options.sharedSchema,
    sharedEntities: options.sharedEntities,
    entityMap: options.entityMap
  });
  const connectors = makeConnectors(options.connectors);
  const asServiceRole = /* @__PURE__ */ (() => {
    let serviceClient = null;
    let serviceEntities = null;
    return {
      get entities() {
        if (!options.supabaseServiceRoleKey) {
          throw new Error(
            "asServiceRole.entities accessed but supabaseServiceRoleKey was not provided. Only set this in trusted server contexts (edge functions, scripts)."
          );
        }
        if (!serviceClient) {
          serviceClient = (0, import_supabase_js.createClient)(options.supabaseUrl, options.supabaseServiceRoleKey);
        }
        if (!serviceEntities) {
          serviceEntities = makeEntitiesProxy(serviceClient, {
            schemaPrefix: options.schemaPrefix,
            sharedSchema: options.sharedSchema,
            sharedEntities: options.sharedEntities,
            entityMap: options.entityMap
          });
        }
        return serviceEntities;
      },
      connectors
    };
  })();
  return {
    supabase,
    entities,
    connectors,
    auth: makeAuth(supabase, options.authOptions),
    functions: makeFunctions(supabase),
    storage: makeStorage(supabase, options.schemaPrefix),
    integrations: makeIntegrations(supabase, {
      defaultBucket: options.integrations?.defaultBucket ?? options.schemaPrefix,
      sendEmailFunction: options.integrations?.sendEmailFunction,
      invokeLlmFunction: options.integrations?.invokeLlmFunction
    }),
    appLogs: makeAppLogs(supabase, options.schemaPrefix),
    users: makeUsers(),
    app,
    agents: makeAgents(options.agents),
    asServiceRole
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createClient,
  defaultEntityToTable,
  parseOrderBy,
  resolveEntityMapping
});
//# sourceMappingURL=index.cjs.map