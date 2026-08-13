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

// src/server.ts
var server_exports = {};
__export(server_exports, {
  createClientFromRequest: () => createClientFromRequest
});
module.exports = __toCommonJS(server_exports);
var import_supabase_js = require("@supabase/supabase-js");

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

// src/server.ts
function createClientFromRequest(req, options) {
  if (!options.supabaseUrl) throw new Error("createClientFromRequest: supabaseUrl is required");
  if (!options.supabaseAnonKey)
    throw new Error("createClientFromRequest: supabaseAnonKey is required");
  if (!options.supabaseServiceRoleKey)
    throw new Error("createClientFromRequest: supabaseServiceRoleKey is required for server use");
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = (0, import_supabase_js.createClient)(options.supabaseUrl, options.supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const serviceClient = (0, import_supabase_js.createClient)(options.supabaseUrl, options.supabaseServiceRoleKey, {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createClientFromRequest
});
//# sourceMappingURL=server.cjs.map