import {
  makeConnectors,
  makeEntitiesProxy,
  makeFunctions
} from "./chunk-3AZOMN5C.js";
import {
  makeIntegrations
} from "./chunk-E2KG6ZL4.js";

// src/server.ts
import { createClient as createSupabase } from "@supabase/supabase-js";
function createClientFromRequest(req, options) {
  if (!options.supabaseUrl) throw new Error("createClientFromRequest: supabaseUrl is required");
  if (!options.supabaseAnonKey)
    throw new Error("createClientFromRequest: supabaseAnonKey is required");
  if (!options.supabaseServiceRoleKey)
    throw new Error("createClientFromRequest: supabaseServiceRoleKey is required for server use");
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createSupabase(options.supabaseUrl, options.supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const serviceClient = createSupabase(options.supabaseUrl, options.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const mappingOpts = {
    schemaPrefix: options.schemaPrefix,
    sharedSchema: options.sharedSchema,
    sharedEntities: options.sharedEntities,
    entityMap: options.entityMap
  };
  const integrationsOpts = {
    defaultBucket: options.integrations?.defaultBucket ?? options.schemaPrefix,
    sendEmailFunction: options.integrations?.sendEmailFunction,
    invokeLlmFunction: options.integrations?.invokeLlmFunction,
    generateImageFunction: options.integrations?.generateImageFunction
  };
  const connectors = makeConnectors(options.connectors);
  return {
    supabase: userClient,
    entities: makeEntitiesProxy(userClient, mappingOpts),
    functions: makeFunctions(userClient),
    integrations: makeIntegrations(userClient, integrationsOpts),
    connectors,
    asServiceRole: {
      entities: makeEntitiesProxy(serviceClient, mappingOpts),
      functions: makeFunctions(serviceClient),
      integrations: makeIntegrations(serviceClient, integrationsOpts),
      connectors
    }
  };
}
export {
  createClientFromRequest
};
//# sourceMappingURL=server.js.map