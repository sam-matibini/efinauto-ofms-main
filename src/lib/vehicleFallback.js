import { errorText, isRlsViolation, isNoRowReturnedError } from "./persistErrors.js";

export const VEHICLE_FALLBACK_TYPE = "efinauto_vehicle";
export const VEHICLE_FALLBACK_REFERENCE = "Vehicle";

function asObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function vehicleFromFallbackLog(log) {
  if (!log) return null;
  const payload = asObject(log.body) || {};
  return {
    ...payload,
    id: payload.id || log.id,
    company_id: payload.company_id || log.company_id,
    created_date: payload.created_date || log.created_date,
    created_by: payload.created_by || log.created_by,
    _fallback: true,
    _fallback_id: log.id,
  };
}

export function fallbackLogBody(payload = {}) {
  const { _fallback, _fallback_id, _selectHidden, ...rest } = payload;
  return JSON.stringify(rest);
}

export function mergeVehicleLists(primary = [], fallback = []) {
  const seen = new Set();
  const out = [];
  for (const row of [...primary, ...fallback]) {
    if (!row) continue;
    const vin = String(row.vin || "").toUpperCase();
    const key = row.id || (vin && row.company_id ? `${row.company_id}:${vin}` : "");
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    if (vin) seen.add(`vin:${vin}`);
    out.push(row);
  }
  return out;
}

async function notificationApi(supabase) {
  return supabase?.entities?.NotificationLog;
}

export async function listFallbackVehicles(supabase, companyId) {
  const api = await notificationApi(supabase);
  if (!api?.filter || !companyId) return [];
  try {
    const rows = await api.filter({
      company_id: companyId,
      notification_type: VEHICLE_FALLBACK_TYPE,
    });
    return (Array.isArray(rows) ? rows : [])
      .map(vehicleFromFallbackLog)
      .filter((row) => row?.vin || row?.make);
  } catch {
    return [];
  }
}

export async function findFallbackVehicle(supabase, payload) {
  const rows = await listFallbackVehicles(supabase, payload?.company_id);
  const vin = String(payload?.vin || "").toUpperCase();
  if (!vin) return null;
  return rows.find((row) => String(row.vin || "").toUpperCase() === vin) || null;
}

export async function saveFallbackVehicle(supabase, payload) {
  const existing = await findFallbackVehicle(supabase, payload);
  if (existing) {
    return { ...existing, ...payload, id: existing.id, _fallback: true, _fallback_id: existing._fallback_id || existing.id };
  }

  const api = await notificationApi(supabase);
  if (!api?.create) {
    throw new Error("Vehicle could not be saved: no writable inventory store is available");
  }

  const created = await api.create({
    company_id: payload.company_id,
    notification_type: VEHICLE_FALLBACK_TYPE,
    reference_type: VEHICLE_FALLBACK_REFERENCE,
    subject: [payload.year, payload.make, payload.model, payload.vin].filter(Boolean).join(" ").trim() || "Vehicle",
    body: fallbackLogBody(payload),
    status: "sent",
    delivery_method: "email",
  });
  return vehicleFromFallbackLog(created) || { ...payload, id: created?.id, _fallback: true, _fallback_id: created?.id };
}

export async function updateFallbackVehicle(supabase, id, payload) {
  const api = await notificationApi(supabase);
  if (!api?.update) throw new Error("Vehicle could not be updated");
  const current = vehicleFromFallbackLog(await api.get?.(id).catch(() => null)) || { id };
  const next = { ...current, ...payload, id: current.id || id };
  const updated = await api.update(id, {
    subject: [next.year, next.make, next.model, next.vin].filter(Boolean).join(" ").trim() || "Vehicle",
    body: fallbackLogBody(next),
  });
  return vehicleFromFallbackLog(updated) || next;
}

export async function deleteFallbackVehicle(supabase, id) {
  const api = await notificationApi(supabase);
  if (!api?.delete) return;
  await api.delete(id);
}

export function wrapVehicleEntity(api, supabase) {
  if (!api) return api;
  return {
    ...api,
    async filter(where, orderBy, limit, skip) {
      const rows = await api.filter(where, orderBy, limit, skip);
      const extras = await listFallbackVehicles(supabase, where?.company_id);
      return mergeVehicleLists(extras, Array.isArray(rows) ? rows : []);
    },
    async list(orderBy, limit, skip) {
      const rows = await api.list(orderBy, limit, skip);
      return mergeVehicleLists(Array.isArray(rows) ? rows : [], []);
    },
    async get(id) {
      const row = await api.get(id).catch(() => null);
      if (row) return row;
      const apiLogs = await notificationApi(supabase);
      const log = await apiLogs?.get?.(id).catch(() => null);
      return vehicleFromFallbackLog(log);
    },
    async update(id, body) {
      try {
        return await api.update(id, body);
      } catch (error) {
        if (!isRlsViolation(error) && !isNoRowReturnedError(error) && !/0 rows|PGRST116|not found/i.test(errorText(error))) {
          throw error;
        }
        return updateFallbackVehicle(supabase, id, body);
      }
    },
    async delete(id) {
      try {
        return await api.delete(id);
      } catch (error) {
        await deleteFallbackVehicle(supabase, id);
        return true;
      }
    },
  };
}

export function installVehiclePersistence(client) {
  if (!client?.entities) return client;
  const raw = client.entities;
  let wrapped;
  client.entities = new Proxy(raw, {
    get(target, prop) {
      const value = target[prop];
      if (prop !== "Vehicle") return value;
      wrapped ||= wrapVehicleEntity(value, client);
      return wrapped;
    },
  });
  return client;
}
