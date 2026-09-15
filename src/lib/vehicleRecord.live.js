import { readFileSync } from "node:fs";
import { persistVehicleRecord } from "./vehicleRecord.js";
import { VEHICLE_FALLBACK_TYPE } from "./vehicleFallback.js";

function loadEnv() {
  const text = readFileSync(new URL("../../.env", import.meta.url), "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const companyId = "691d0f2ba44178d346970f28";
const vin = `T${Date.now().toString(36).toUpperCase()}LIVEVEH`.replace(/[^A-Z0-9]/g, "").slice(0, 17);

async function rest(path, { method = "GET", body } = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) {
    const error = json && typeof json === "object" ? json : { message: text, status: res.status };
    error.status = res.status;
    throw error;
  }
  return json;
}

const liveSupabase = {
  auth: { getSession: async () => null },
  entities: {
    Vehicle: {
      create: async () => {
        throw { code: "42501", message: 'new row violates row-level security policy for table "vehicles"' };
      },
      filter: async () => [],
    },
    NotificationLog: {
      async filter(where) {
        const params = new URLSearchParams();
        Object.entries(where || {}).forEach(([field, value]) => params.set(field, `eq.${value}`));
        params.set("select", "*");
        return rest(`notification_logs?${params.toString()}`);
      },
      async create(data) {
        const rows = await rest("notification_logs", { method: "POST", body: data });
        return Array.isArray(rows) ? rows[0] : rows;
      },
      async delete(id) {
        await rest(`notification_logs?id=eq.${id}`, { method: "DELETE" });
      },
    },
  },
};

const saved = await persistVehicleRecord({
  supabase: liveSupabase,
  companyId,
  form: {
    company_id: companyId,
    vin,
    make: "Chevrolet",
    model: "Cruze",
    year: 2018,
    purchase_price: 1939,
    tax_gst: 96.95,
    vendor_name: "Manitoba Public Insurance",
    condition: "used",
    status: "in_stock",
  },
});

if (!saved?.id) throw new Error("live persist returned no id");
if (!saved._fallback) throw new Error("live persist did not use fallback store");
if (String(saved.vin).toUpperCase() !== vin) throw new Error(`live persist vin mismatch: ${saved.vin}`);

const listed = await liveSupabase.entities.NotificationLog.filter({
  company_id: companyId,
  notification_type: VEHICLE_FALLBACK_TYPE,
});
const found = (listed || []).some((row) => row.id === saved.id || (row.body || "").includes(vin));
if (!found) throw new Error("saved vehicle was not listed from notification_logs");

await liveSupabase.entities.NotificationLog.delete(saved.id);
console.log("live vehicle persist passed", saved.id, saved.vin);
