import { SupabaseClient } from '@supabase/supabase-js';

/** Mirror of base44.functions — Supabase Edge Functions invoke wrapper.
 *
 *  Returns the raw body. On HTTP error, throws an Error with the response body attached.
 */
declare function makeFunctions(client: SupabaseClient): {
    /** Invoke an edge function by name, passing JSON body. Returns parsed JSON. */
    invoke<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
    /** Lower-level: invoke and return Response so caller can handle non-JSON. */
    fetch(name: string, init?: RequestInit): Promise<Response>;
};

interface ConnectorConnection {
    accessToken: string;
    connectionConfig: Record<string, unknown>;
}
interface ConnectorsOptions {
    /**
     * Pre-configured connector tokens keyed by integration type (e.g. 'outlook', 'slackbot').
     * Only use this for testing; in deployed Edge Functions, tokens come from Supabase secrets
     * (STATICBOT_CONNECTOR_<type>). Lower priority than env vars.
     */
    [integrationType: string]: string | ConnectorConnection | undefined;
}
/**
 * Creates the Connectors module matching `base44.asServiceRole.connectors.*`.
 *
 * Token resolution order:
 * 1. Deno.env.get('STATICBOT_CONNECTOR_{type}') — set by Supabase secrets (preview or production)
 * 2. options[integrationType] — for local testing / direct injection
 * 3. Throw with a descriptive error listing which connectors are configured
 */
declare function makeConnectors(opts: ConnectorsOptions | undefined): {
    /**
     * Retrieve OAuth credentials for a connector integration type.
     * Returns { accessToken, connectionConfig }. Matches the Base44 SDK's
     * `base44.asServiceRole.connectors.getConnection(integrationType)`.
     */
    getConnection(integrationType: string): Promise<ConnectorConnection>;
    /**
     * Deprecated alias for getConnection — returns only the accessToken string.
     * @deprecated Use getConnection(integrationType) instead.
     */
    getAccessToken(integrationType: string): Promise<string>;
};

type Json = string | number | boolean | null | Json[] | {
    [key: string]: Json;
};
interface EntityMapping {
    schema: string;
    table: string;
}
interface ClientOptions {
    /** Supabase project URL, e.g. https://api.erp.local */
    supabaseUrl: string;
    /** anon public key for browser use */
    supabaseAnonKey: string;
    /** service_role key — only set in trusted server contexts */
    supabaseServiceRoleKey?: string;
    /**
     * Postgres schema for app-specific entities.
     * E.g. 'propertyflow' / 'fms' / 'finance' / 'construction'.
     */
    schemaPrefix: string;
    /**
     * Postgres schema for shared entities (Customer, Company, User, Role...).
     * Default: 'core'.
     */
    sharedSchema?: string;
    /**
     * List of entity names that live in `sharedSchema` instead of `schemaPrefix`.
     * Default: ['Customer', 'Company', 'User', 'Role', 'Department', 'Notification', 'AuditLog'].
     */
    sharedEntities?: string[];
    /**
     * Explicit per-entity mapping overrides. Use this if the auto-derived
     * snake_case+pluralize naming doesn't match the actual table name.
     */
    entityMap?: Record<string, EntityMapping>;
    /**
     * Optional pre-built supabase client. If omitted, one is created from the keys.
     * Useful in tests / when you already have a client elsewhere.
     */
    client?: SupabaseClient;
}
interface OrderBy {
    /** Field name. Prefix with '-' for descending (Base44 convention). */
    field: string;
    ascending?: boolean;
}
/** Where-clause filter object as used by Base44.
 *
 * Three accepted shapes per field, all translated to PostgREST:
 *
 *   1. Equality / array shorthand:   `{ status: 'active', id: ['a','b'] }`
 *   2. Base44 SDK Mongo operators:   `{ price: { $gte: 10, $lt: 100 }, status: { $in: ['a','b'] } }`
 *   3. Legacy {op,value} form:       `{ amount: { op: 'gt', value: 100 } }`
 *
 * Shape (2) is what `@base44/sdk` emits — its `entities.X.filter(q, ...)`
 * forwards `q` to Base44's REST as URL-encoded JSON with $-prefixed ops.
 * Apps that ran against Base44's managed backend pass these exact shapes.
 */
type MongoFilter = {
    $eq?: unknown;
    $ne?: unknown;
    $gt?: unknown;
    $gte?: unknown;
    $lt?: unknown;
    $lte?: unknown;
    $in?: unknown[];
    $nin?: unknown[];
    $like?: string;
    $ilike?: string;
};
type FilterValue = string | number | boolean | null | string[] | number[] | MongoFilter | {
    op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in';
    value: unknown;
};
type FilterObject = Record<string, FilterValue>;
interface EntityApi<T = Record<string, unknown>> {
    list(orderBy?: string | OrderBy, limit?: number, skip?: number): Promise<T[]>;
    filter(where: FilterObject, orderBy?: string | OrderBy, limit?: number, skip?: number): Promise<T[]>;
    get(id: string): Promise<T | null>;
    /** Alias for get() — Base44 SDK exposes both names. */
    read(id: string): Promise<T | null>;
    create(body: Partial<T>): Promise<T>;
    /** Insert multiple rows in one call. */
    bulkCreate(rows: Array<Partial<T>>): Promise<T[]>;
    /** Update many rows by id; each row must contain its own `id`. */
    bulkUpdate(rows: Array<Partial<T> & {
        id: string;
    }>): Promise<T[]>;
    update(id: string, body: Partial<T>): Promise<T>;
    /**
     * Apply the same patch to every row matching `where`. Accepts either a flat
     * patch or a MongoDB-style `{ $set: {...} }` envelope (the Base44 SDK form).
     */
    updateMany(where: FilterObject, update: Partial<T> | {
        $set?: Partial<T>;
    }): Promise<T[]>;
    delete(id: string): Promise<void>;
    /** Delete every row matching `where`. */
    deleteMany(where: FilterObject): Promise<void>;
    /**
     * Subscribe to row changes via Supabase Realtime.
     * Returns an unsubscribe function (matches Base44 convention).
     */
    subscribe(callback: (event: {
        type: 'insert' | 'update' | 'delete';
        new?: T;
        old?: T;
    }) => void): () => void;
}
type EntitiesProxy = {
    [entityName: string]: EntityApi;
};

export { type ClientOptions as C, type EntityMapping as E, type FilterObject as F, type Json as J, type MongoFilter as M, type OrderBy as O, type EntitiesProxy as a, makeConnectors as b, type ConnectorsOptions as c, type EntityApi as d, type FilterValue as e, makeFunctions as m };
