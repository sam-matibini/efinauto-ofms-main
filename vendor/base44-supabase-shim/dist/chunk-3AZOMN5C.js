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

export {
  defaultEntityToTable,
  resolveEntityMapping,
  parseOrderBy,
  makeEntitiesProxy,
  makeFunctions,
  makeConnectors
};
//# sourceMappingURL=chunk-3AZOMN5C.js.map