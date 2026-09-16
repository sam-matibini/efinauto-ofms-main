import { readFileSync } from "node:fs";
import { persistSaleRecord } from "./saleRecord.js";

function loadEnv() {
  for (const file of [".env", ".env.local", ".env.production"]) {
    try {
      const text = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
        const eq = trimmed.indexOf("=");
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim();
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {
      /* optional env files */
    }
  }
}

loadEnv();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const companyId = "691d0f2ba44178d346970f28";

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
  entities: {
    Sale: {
      async create(data) {
        const rows = await rest("sales", { method: "POST", body: data });
        return Array.isArray(rows) ? rows[0] : rows;
      },
      async delete(id) {
        await rest(`sales?id=eq.${id}`, { method: "DELETE" });
      },
    },
  },
};

const saved = await persistSaleRecord({
  supabase: liveSupabase,
  companyId,
  form: {
    customer_name: "Record Sale Probe",
    customer_phone: "2045550100",
    vehicle_details: "2018 Chevrolet Cruze",
    vehicle_vin: "1G1BE5SM0J7226676",
    sale_price: 2500,
    province: "ON",
    tax_status: "taxable",
    tax_hst: 325,
    tax_total: 325,
    grand_total: 2825,
    salesman: "sam",
    salesman_phone: "(204) 555-0142",
    seller_name: "sam",
    seller_signed_at: "",
    delivery_date: "",
    pst_exempt_reason: "",
    notes: "Live persist check",
    sale_date: new Date().toISOString().split("T")[0],
  },
});

if (!saved?.id) throw new Error("live sale persist returned no id");
if (saved.customer_name !== "Record Sale Probe") throw new Error("customer_name mismatch");
if (!/Salesman phone: \(204\) 555-0142/.test(saved.notes || "")) {
  throw new Error("salesman phone was not packed into notes");
}

const listed = await rest(`sales?id=eq.${saved.id}&select=id,customer_name,notes,salesman,sale_price`);
const row = Array.isArray(listed) ? listed[0] : listed;
if (!row?.id) throw new Error("saved sale was not readable after insert");

await liveSupabase.entities.Sale.delete(saved.id);
console.log("live sale persist passed", saved.id);
