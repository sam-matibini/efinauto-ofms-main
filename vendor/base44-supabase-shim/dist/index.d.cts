import { SupabaseClient, Provider } from '@supabase/supabase-js';
import * as _supabase_auth_js from '@supabase/auth-js';
import { O as OrderBy, C as ClientOptions, E as EntityMapping, a as EntitiesProxy, m as makeFunctions, b as makeConnectors, c as ConnectorsOptions } from './types-BLHXVXo0.cjs';
export { d as EntityApi, F as FilterObject, e as FilterValue, J as Json, M as MongoFilter } from './types-BLHXVXo0.cjs';
import { makeIntegrations, IntegrationsOptions } from './integrations.cjs';
import * as _supabase_storage_js from '@supabase/storage-js';

/**
 * Stub of `base44.agents.*`. Base44 hosts an "agents" concept with WhatsApp/
 * Telegram bridges that don't exist in self-host by default — this module
 * exists so migrated apps referencing `base44.agents.getWhatsAppConnectURL(...)`
 * don't `TypeError` at runtime. Default behavior returns null so <a href={...}>
 * usages render as an unclickable button (feature visibly disabled).
 *
 * If a customer wires their own WhatsApp gateway, pass per-agent URLs via
 * createClient({ agents: { whatsappUrls: { SubdomainReviewer: 'https://…' } } }).
 */
interface AgentsOptions {
    /** Per-agent WhatsApp connect URLs. Absent entries return null. */
    whatsappUrls?: Record<string, string>;
}
declare function makeAgents(opts?: AgentsOptions): {
    /**
     * Returns a WhatsApp connect URL for the given agent, or null when not
     * configured. Meant to be dropped straight into `<a href={...}>` — React
     * omits the attribute when null so the anchor becomes inert instead of
     * navigating to "null".
     */
    getWhatsAppConnectURL(agentName: string): string | null;
};

interface SignInArgs {
    email: string;
    password: string;
}
interface SignUpArgs {
    email: string;
    password: string;
    metadata?: Record<string, unknown>;
}
interface VerifyOtpArgs {
    email: string;
    otpCode: string;
}
interface ResetPasswordArgs {
    /**
     * Reset token from the email link. Ignored by this shim — Supabase already
     * exchanged the link fragment for a session before the app got here, so
     * `updateUser({password})` operates on that session. Kept in the signature
     * for source-compat with @base44/sdk callers.
     */
    resetToken?: string;
    newPassword: string;
}
interface ResetPasswordRequestOptions {
    /** URL Supabase redirects to after the user clicks the reset link. */
    redirectTo?: string;
}
interface AuthOptions {
    /**
     * Browser path the redirectToLogin() shim should send users to.
     * Default: '/login'.
     */
    loginPath?: string;
    /**
     * Default redirect URL for password-reset emails. Callers can still override
     * per-call via resetPasswordRequest(email, { redirectTo }).
     */
    resetPasswordRedirect?: string;
}
declare function makeAuth(client: SupabaseClient, opts?: AuthOptions): {
    signIn({ email, password }: SignInArgs): Promise<{
        user: _supabase_auth_js.User;
        session: _supabase_auth_js.Session;
        weakPassword?: _supabase_auth_js.WeakPassword;
    }>;
    /** Base44 alias for signIn. */
    loginViaEmailPassword(email: string, password: string): Promise<{
        user: _supabase_auth_js.User;
        session: _supabase_auth_js.Session;
        weakPassword?: _supabase_auth_js.WeakPassword;
    }>;
    signUp({ email, password, metadata }: SignUpArgs): Promise<{
        user: _supabase_auth_js.User | null;
        session: _supabase_auth_js.Session | null;
    }>;
    /** Base44 alias for signUp. */
    register({ email, password, metadata }: SignUpArgs): Promise<{
        user: _supabase_auth_js.User | null;
        session: _supabase_auth_js.Session | null;
    }>;
    /**
     * Base44 OAuth flow: redirects the browser to the provider's consent screen
     * and back to `returnPath` (relative to window.location.origin) on success.
     * Supabase equivalent: signInWithOAuth with an absolute redirectTo.
     */
    loginWithProvider(provider: Provider, returnPath?: string): Promise<{
        provider: Provider;
        url: string;
    }>;
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
    sendLoginOtp(email: string, returnPath?: string): Promise<{
        user: null;
        session: null;
        messageId?: string | null;
    }>;
    /**
     * Verify the 6-digit email OTP code from {@link sendLoginOtp}. Uses type 'email' (login flow) —
     * distinct from {@link verifyOtp} which is hardcoded type 'signup' for the register() flow.
     * Supabase installs the session on success.
     */
    verifyLoginOtp(email: string, otpCode: string): Promise<{
        access_token: string | undefined;
        session: _supabase_auth_js.Session | null;
        user: _supabase_auth_js.User | null;
    }>;
    /**
     * Base44 email OTP verification after register(). Supabase's verifyOtp
     * already sets the session on success, so setToken() is redundant afterward
     * (kept as a soft no-op for source-compat).
     */
    verifyOtp({ email, otpCode }: VerifyOtpArgs): Promise<{
        access_token: string | undefined;
        session: _supabase_auth_js.Session | null;
        user: _supabase_auth_js.User | null;
    }>;
    resendOtp(email: string): Promise<void>;
    /**
     * No-op alias kept so migrated code doesn't TypeError. Supabase's
     * verifyOtp() already installed the session — pushing the access_token in
     * again would do nothing productive (Supabase requires access + refresh to
     * setSession, and Base44 returns only access). Warns once per process.
     */
    setToken(_accessToken: string): void;
    resetPasswordRequest(email: string, options?: ResetPasswordRequestOptions): Promise<void>;
    resetPassword({ newPassword }: ResetPasswordArgs): Promise<{
        user: _supabase_auth_js.User;
    }>;
    signOut(): Promise<void>;
    /**
     * Base44 alias for signOut. If `returnUrl` is provided, navigates there
     * after signOut resolves so SPAs can drop users on a public route.
     */
    logout(returnUrl?: string): Promise<void>;
    /**
     * Non-throwing check for whether a user is currently signed in. Use this as the guard BEFORE
     * calling `me()` / `getUser()`, which THROW when there is no session. Never throws — a
     * transient getSession error is treated as "not authenticated".
     */
    isAuthenticated(): Promise<boolean>;
    getUser(): Promise<_supabase_auth_js.User>;
    /**
     * Base44 alias for getUser. Returns the current user object, or THROWS if not signed in.
     * Call `isAuthenticated()` first if the caller may run for logged-out visitors.
     */
    me(): Promise<_supabase_auth_js.User>;
    /**
     * Base44 alias for updating the current user's metadata. Accepts arbitrary
     * key/value pairs that get stored in `user_metadata`.
     */
    updateMe(metadata: Record<string, unknown>): Promise<_supabase_auth_js.User>;
    getSession(): Promise<_supabase_auth_js.Session | null>;
    /**
     * Base44 used to redirect SPA users to its hosted login page. Self-host
     * has no hosted login, so this just navigates to the configured local
     * loginPath. Override the path via createClient({ ..., authLoginPath: '/x' }).
     */
    redirectToLogin(returnUrl?: string): void;
    onAuthStateChange(cb: Parameters<SupabaseClient["auth"]["onAuthStateChange"]>[0]): {
        data: {
            subscription: _supabase_auth_js.Subscription;
        };
    };
};

/**
 * Stub for `base44.appLogs` — Base44 cloud's per-page activity tracker.
 * Writes a row to core.audit_log if the table exists, otherwise silently
 * succeeds. App code wraps this in .catch(() => {}) anyway, so any failure
 * is non-fatal.
 */
declare function makeAppLogs(client: SupabaseClient, app: string): {
    logUserInApp(pageName: string): Promise<void>;
};
/**
 * Stub for `base44.users` — admin-only user management. Self-host equivalent
 * uses Supabase Auth admin API but requires a service_role key, which the
 * browser client doesn't have. So inviteUser here logs a warning and returns
 * a benign error so callers can show a "not supported" message.
 */
declare function makeUsers(): {
    inviteUser(_args: {
        email: string;
        [key: string]: unknown;
    }): Promise<never>;
};

interface UploadFileArgs {
    /** Supabase Storage bucket name. Defaults to schemaPrefix from client options. */
    bucket?: string;
    /** Object path within the bucket (e.g. 'invoices/2026/inv-001.pdf'). */
    path: string;
    /** File contents. */
    file: Blob | File | ArrayBuffer | Uint8Array;
    /** Content-Type. Inferred from File if omitted. */
    contentType?: string;
    /** Overwrite existing object at path. Default false. */
    upsert?: boolean;
}
declare function makeStorage(client: SupabaseClient, defaultBucket: string): {
    /** Upload a file to a bucket. Returns the public URL. */
    uploadFile({ bucket, path, file, contentType, upsert, }: UploadFileArgs): Promise<{
        path: string;
        url: string;
    }>;
    /** Get a public URL for a stored object. */
    getPublicUrl(path: string, bucket?: string): string;
    /** Generate a time-limited signed URL for private buckets. */
    createSignedUrl(path: string, expiresInSec?: number, bucket?: string): Promise<string>;
    /** Delete one or more objects. */
    remove(paths: string | string[], bucket?: string): Promise<void>;
    /** List objects in a bucket prefix. */
    list(prefix?: string, bucket?: string): Promise<_supabase_storage_js.FileObject[]>;
};

/** PascalCase → snake_case + naive pluralization (s, ies, es). */
declare function defaultEntityToTable(entityName: string): string;
declare function resolveEntityMapping(entityName: string, opts: Required<Pick<ClientOptions, 'schemaPrefix'>> & Pick<ClientOptions, 'sharedSchema' | 'sharedEntities' | 'entityMap'>): EntityMapping;
/**
 * Parse Base44-style orderBy:
 *   - string '-created_date' → { field: 'created_date', ascending: false }
 *   - string 'name' → { field: 'name', ascending: true }
 *   - object passes through.
 */
declare function parseOrderBy(input: string | OrderBy | undefined): OrderBy | undefined;

interface ExtendedClientOptions extends ClientOptions {
    /** Auth-related options (login redirect path, etc). */
    authOptions?: AuthOptions;
    /** Integration stub configuration (storage default bucket, edge function names). */
    integrations?: Partial<IntegrationsOptions>;
    /** Agents stub configuration (per-agent WhatsApp connect URLs, etc.). */
    agents?: AgentsOptions;
    /**
     * Connector OAuth tokens keyed by integration type (e.g. 'outlook', 'slackbot').
     * Only use this for testing; in deployed Edge Functions, tokens come from Supabase
     * secrets (STATICBOT_CONNECTOR_<type>). Lower priority than env vars.
     */
    connectors?: ConnectorsOptions;
}
interface Base44Client {
    /** Underlying Supabase client (anon key). */
    supabase: SupabaseClient;
    entities: EntitiesProxy;
    auth: ReturnType<typeof makeAuth>;
    functions: ReturnType<typeof makeFunctions>;
    storage: ReturnType<typeof makeStorage>;
    integrations: ReturnType<typeof makeIntegrations>;
    /** Per-page activity logger. Writes to core.audit_log; errors are swallowed. */
    appLogs: ReturnType<typeof makeAppLogs>;
    /** Admin user management; browser-side calls throw (use Studio instead). */
    users: ReturnType<typeof makeUsers>;
    /** Empty placeholder for base44.app property access. */
    app: Record<string, unknown>;
    /** Base44 agents stub — WhatsApp/Telegram bridges disabled by default. */
    agents: ReturnType<typeof makeAgents>;
    /** Connector OAuth token brokering (outlook, slackbot, etc.). */
    connectors: ReturnType<typeof makeConnectors>;
    /** Service-role-scoped namespace for trusted server contexts. Throws if no service key supplied. */
    asServiceRole: {
        entities: EntitiesProxy;
        connectors: ReturnType<typeof makeConnectors>;
    };
}
/** Create a Base44-compatible client backed by Supabase. */
declare function createClient(options: ExtendedClientOptions): Base44Client;

export { type AgentsOptions, type Base44Client, ClientOptions, EntitiesProxy, EntityMapping, type ExtendedClientOptions, OrderBy, createClient, defaultEntityToTable, parseOrderBy, resolveEntityMapping };
