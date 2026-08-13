import {
  defaultEntityToTable,
  makeConnectors,
  makeEntitiesProxy,
  makeFunctions,
  parseOrderBy,
  resolveEntityMapping
} from "./chunk-3AZOMN5C.js";
import {
  makeIntegrations
} from "./chunk-E2KG6ZL4.js";

// src/index.ts
import { createClient as createSupabase } from "@supabase/supabase-js";

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
  const supabase = options.client ?? createSupabase(options.supabaseUrl, options.supabaseAnonKey);
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
          serviceClient = createSupabase(options.supabaseUrl, options.supabaseServiceRoleKey);
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
export {
  createClient,
  defaultEntityToTable,
  parseOrderBy,
  resolveEntityMapping
};
//# sourceMappingURL=index.js.map