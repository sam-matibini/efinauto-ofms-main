import { SupabaseClient } from '@supabase/supabase-js';
import { C as ClientOptions, c as ConnectorsOptions, a as EntitiesProxy, m as makeFunctions, b as makeConnectors } from './types-BLHXVXo0.js';
export { d as EntityApi, E as EntityMapping, F as FilterObject, e as FilterValue, J as Json, M as MongoFilter, O as OrderBy } from './types-BLHXVXo0.js';
import { IntegrationsOptions, makeIntegrations } from './integrations.js';

interface ServerClient {
    supabase: SupabaseClient;
    entities: EntitiesProxy;
    functions: ReturnType<typeof makeFunctions>;
    integrations: ReturnType<typeof makeIntegrations>;
    connectors: ReturnType<typeof makeConnectors>;
    asServiceRole: {
        entities: EntitiesProxy;
        functions: ReturnType<typeof makeFunctions>;
        integrations: ReturnType<typeof makeIntegrations>;
        connectors: ReturnType<typeof makeConnectors>;
    };
}
interface CreateServerClientOptions extends Omit<ClientOptions, 'client'> {
    supabaseServiceRoleKey: string;
    /** Integration stub config (edge function names for SendEmail / InvokeLLM / GenerateImage). */
    integrations?: Partial<IntegrationsOptions>;
    /** Connector OAuth tokens keyed by integration type (e.g. 'outlook', 'slackbot'). */
    connectors?: ConnectorsOptions;
}
/**
 * Create a Base44-style client from an incoming HTTP Request, intended for
 * Supabase Edge Functions (Deno) or any server runtime that has fetch Request.
 *
 * Honors the caller's Authorization header so RLS applies as the end user.
 * `asServiceRole` uses the configured service_role key (bypasses RLS) for
 * privileged operations — analogous to base44.asServiceRole.
 *
 * Both the user and service-role sides expose `entities`, `functions`, and
 * `integrations.Core` so ported edge functions can call whichever surface they
 * used against Base44's managed backend.
 */
declare function createClientFromRequest(req: Request, options: CreateServerClientOptions): ServerClient;

export { ClientOptions, type CreateServerClientOptions, EntitiesProxy, type ServerClient, createClientFromRequest };
