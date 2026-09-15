import { isPdfStructureNoise } from "./documentAutoscan/pdfNoise.js";
import {
  errorText,
  isNoRowReturnedError,
  isRlsViolation,
  isUniqueViolation,
  persistWithUnknownColumnRetry,
} from "./persistErrors.js";
import {
  VEHICLE_VENDOR_FIELD_KEYS,
  cleanCanadianPostal,
  cleanCityName,
  looksLikeJunkAddress,
} from "./vendorDirectory.js";
import { vehiclePurchaseTaxes } from "./vehiclePurchaseTaxes.js";

export const VEHICLE_ENUMS = {
  ownership_type: ["dealership_owned", "customer_owned_export"],
  condition: ["new", "used", "certified_pre_owned"],
  status: ["in_stock", "sold", "reserved", "in_transit", "exported"],
  fuel_type: ["petrol", "diesel", "electric", "hybrid", "lpg"],
  transmission: ["manual", "automatic", "semi_automatic"],
  tax_status: ["taxable", "zero_rated", "exempt"],
};

const COLORS = [
  "pearl white", "midnight blue", "dark grey", "dark gray", "dark green",
  "light blue", "off white", "white", "black", "silver", "grey", "gray",
  "blue", "red", "green", "yellow", "orange", "brown", "beige", "gold",
  "purple", "maroon", "burgundy", "tan", "cream", "ivory", "charcoal", "navy",
];

const TRANSIENT_FORM_KEYS = new Set([
  "buyer_name",
  "recoverable_tax",
  "inventory_cost",
  "net_tax_to_purchases",
  "post_to_gl",
]);

const VEHICLE_CORE_KEYS = [
  "company_id",
  "ownership_type",
  "vin",
  "make",
  "model",
  "year",
  "condition",
  "status",
  "fuel_type",
  "transmission",
  "mileage",
  "weight",
  "purchase_price",
  "selling_price",
  "color",
  "location",
  "notes",
  "province",
  "tax_status",
  "tax_gst",
  "tax_pst",
  "tax_hst",
  "tax_total",
  "total_cost",
];

export const VEHICLE_LIVE_COLUMNS = new Set([
  ...VEHICLE_CORE_KEYS,
  "stock_number",
  "invoice_number",
  "transaction_date",
  "engine_capacity",
  "images",
  "vendor_id",
  "vendor_name",
  "vendor_phone",
  "vendor_email",
  "created_by",
  "created_by_id",
]);

const EXTRA_NOTE_FIELDS = [
  ["Vendor address", "vendor_address"],
  ["Vendor city", "vendor_city"],
  ["Vendor province", "vendor_province"],
  ["Vendor country", "vendor_country"],
  ["Vendor postal", "vendor_postal_code"],
  ["Vendor GST#", "vendor_gst_number"],
  ["Vendor PST#", "vendor_pst_number"],
  ["Bidder#", "bidder_number"],
  ["Storage yard", "storage_yard"],
  ["Auction#", "auction_number"],
  ["MPI DOC#", "mpi_doc_number"],
  ["Tax exemption", "tax_exemption_reason"],
  ["Odometer as of", "odometer_as_of"],
  ["Features", "features"],
];

export function asString(value, max = 8000) {
  if (value == null) return "";
  return String(value).replace(/\u0000/g, " ").replace(/[ \t]+/g, " ").trim().slice(0, max);
}

export function asNumber(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = parseFloat(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function asEnum(value, allowed, fallback) {
  const next = asString(value, 80);
  return allowed.includes(next) ? next : fallback;
}

export function asIsoDate(value) {
  const next = asString(value, 32);
  return /^\d{4}-\d{2}-\d{2}$/.test(next) ? next : "";
}

export function selectValue(value, allowed) {
  if (value == null || value === "") return undefined;
  if (allowed && !allowed.includes(value)) return undefined;
  return value;
}

export function cleanVehicleModel(model, vin = "") {
  let next = asString(model, 200);
  const compactVin = asString(vin, 32).replace(/[^A-HJ-NPR-Z0-9]/gi, "");
  if (compactVin.length === 17) {
    next = next.replace(new RegExp(compactVin, "ig"), " ");
  }
  next = next
    .replace(/\bVehicle Ownership\b.*$/i, " ")
    .replace(/\b(?:is\s+)?branded\b.*$/i, " ")
    .replace(/\bMB-SALVAGEABLE\b.*$/i, " ");
  const color = COLORS.find((name) => new RegExp(`\\s+${name}\\s*$`, "i").test(next));
  if (color) next = next.replace(new RegExp(`\\s+${color}\\s*$`, "i"), " ");
  return next.replace(/\s+/g, " ").trim().slice(0, 80);
}

export function missingVehicleSaveFields(form = {}) {
  const missing = [];
  if (asString(form.vin, 32).length < 5) missing.push("VIN");
  if (!asString(form.make, 80)) missing.push("Make");
  if (!asString(form.model, 120)) missing.push("Model");
  if (asNumber(form.year, 0) < 1980) missing.push("Year");
  return missing;
}

export function vehicleFormCanSave(form = {}) {
  try {
    return missingVehicleSaveFields(form).length === 0;
  } catch {
    return false;
  }
}

export function pendingVehicleVin() {
  return `PEND${Date.now().toString(36).toUpperCase()}`.replace(/[^A-Z0-9]/g, "").slice(0, 17);
}

export function ensureVehicleSaveDefaults(form = {}) {
  const vinSource = asString(form.vin, 32).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const vin = vinSource.length >= 5 ? vinSource : pendingVehicleVin();
  const year = asNumber(form.year, 0);
  return {
    ...form,
    vin,
    make: asString(form.make, 80) || "Unknown",
    model: cleanVehicleModel(form.model, vin) || asString(form.model, 80) || asString(form.stock_number, 80) || "Unknown",
    year: year >= 1980 ? year : new Date().getFullYear(),
  };
}

function optionalString(value, max) {
  const next = asString(value, max);
  return next || undefined;
}

export function sanitizeVehicleForm(form = {}) {
  const vin = asString(form.vin, 32).toUpperCase();
  const taxes = vehiclePurchaseTaxes({
    pretax: form.purchase_price,
    tax_gst: form.tax_gst,
    tax_pst: form.tax_pst,
    tax_hst: form.tax_hst,
    province: form.province,
    tax_status: asEnum(form.tax_status, VEHICLE_ENUMS.tax_status, "taxable"),
    pst_exempt: Boolean(form.pst_exempt),
  });
  const next = {
    ...form,
    vin,
    make: asString(form.make, 80),
    model: cleanVehicleModel(form.model, vin) || asString(form.model, 80),
    year: asNumber(form.year, new Date().getFullYear()),
    color: asString(form.color, 40),
    mileage: asNumber(form.mileage, 0),
    weight: asNumber(form.weight, 0),
    selling_price: asNumber(form.selling_price, 0),
    location: asString(form.location, 120),
    engine_capacity: asString(form.engine_capacity, 40),
    features: asString(form.features, 500),
    notes: isPdfStructureNoise(form.notes) ? "" : asString(form.notes, 2000),
    ownership_type: asEnum(form.ownership_type, VEHICLE_ENUMS.ownership_type, "dealership_owned"),
    condition: asEnum(form.condition, VEHICLE_ENUMS.condition, "used"),
    status: asEnum(form.status, VEHICLE_ENUMS.status, "in_stock"),
    fuel_type: asEnum(form.fuel_type, VEHICLE_ENUMS.fuel_type, "petrol"),
    transmission: asEnum(form.transmission, VEHICLE_ENUMS.transmission, "automatic"),
    tax_status: asEnum(form.tax_status, VEHICLE_ENUMS.tax_status, "taxable"),
    province: asString(form.province, 8).toUpperCase(),
    pst_exempt: Boolean(form.pst_exempt),
    images: Array.isArray(form.images) ? form.images.filter(Boolean) : [],
    purchase_documents: Array.isArray(form.purchase_documents) ? form.purchase_documents : [],
    ...taxes,
    purchase_price: taxes.purchase_price,
  };
  TRANSIENT_FORM_KEYS.forEach((key) => {
    if (key !== "post_to_gl") delete next[key];
  });
  next.post_to_gl = form.post_to_gl !== false && !form.gl_posted && !form.purchase_id;
  return next;
}

export function buildVehiclePersistPayload(form = {}, companyId) {
  const source = sanitizeVehicleForm(form);
  const payload = {
    company_id: companyId || source.company_id,
    ownership_type: source.ownership_type,
    vin: source.vin,
    make: source.make,
    model: source.model,
    year: source.year,
    condition: source.condition,
    status: source.status,
    fuel_type: source.fuel_type,
    transmission: source.transmission,
    mileage: source.mileage,
    weight: source.weight,
    purchase_price: source.purchase_price,
    selling_price: source.selling_price,
    province: source.province || undefined,
    tax_status: source.tax_status,
    pst_exempt: Boolean(source.pst_exempt),
    tax_gst: source.tax_gst,
    tax_pst: source.tax_pst,
    tax_hst: source.tax_hst,
    tax_rst: source.tax_rst,
    tax_total: source.tax_total,
    total_cost: source.total_vehicle_expenditure,
    total_vehicle_expenditure: source.total_vehicle_expenditure,
    gl_posted: Boolean(source.gl_posted),
    purchase_id: optionalString(source.purchase_id, 80),
    color: optionalString(source.color, 40),
    location: optionalString(source.location, 120),
    engine_capacity: optionalString(source.engine_capacity, 40),
    features: optionalString(source.features, 500),
    notes: optionalString(source.notes, 2000),
  };

  if (source.images?.length) payload.images = source.images;
  if (source.purchase_documents?.length) payload.purchase_documents = source.purchase_documents;

  for (const key of VEHICLE_VENDOR_FIELD_KEYS) {
    const value = source[key];
    if (value == null || value === "") continue;
    if (key === "transaction_date" || key === "odometer_as_of") {
      const date = asIsoDate(value);
      if (date) payload[key] = date;
      continue;
    }
    if (key === "tax_exemption_reason") {
      const reason = asString(value, 500).split(/\bStock\s*#/i)[0].trim().slice(0, 240);
      if (reason) payload[key] = reason;
      continue;
    }
    if (key === "vendor_postal_code") {
      const postal = cleanCanadianPostal(value);
      if (postal) payload[key] = postal;
      continue;
    }
    if (key === "vendor_city") {
      const city = cleanCityName(value);
      if (city) payload[key] = city.slice(0, 80);
      continue;
    }
    if (key === "vendor_address" && looksLikeJunkAddress(value)) continue;
    payload[key] = typeof value === "string" ? asString(value, key === "tax_exemption_reason" ? 500 : 240) : value;
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined || payload[key] === "") delete payload[key];
  });
  return payload;
}

export function extraVehicleFieldsNote(payload = {}) {
  const bits = [];
  if (payload.pst_exempt) bits.push("PST/RST exempt.");
  for (const [label, key] of EXTRA_NOTE_FIELDS) {
    const value = payload[key];
    if (value == null || value === "") continue;
    const text = Array.isArray(value)
      ? value.filter(Boolean).join(", ")
      : String(value).trim();
    if (!text) continue;
    bits.push(`${label} ${text}`.trim());
  }
  if (Array.isArray(payload.purchase_documents)) {
    const docs = payload.purchase_documents.map((doc) => doc?.url || doc?.name).filter(Boolean);
    if (docs.length) bits.push(`Purchase documents: ${docs.join("; ")}`);
  }
  return bits.join(" ").trim();
}

export function liveVehiclePayload(payload = {}) {
  const live = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!VEHICLE_LIVE_COLUMNS.has(key) || value == null || value === "") continue;
    live[key] = value;
  }
  const extraNote = extraVehicleFieldsNote(payload);
  const notes = [live.notes, extraNote].filter(Boolean).join(" ").trim().slice(0, 500);
  if (notes) live.notes = notes;
  return live;
}

function rawSupabase(supabase) {
  return supabase?.supabase || supabase;
}

function compactPayload(payload = {}) {
  const next = { ...payload };
  Object.keys(next).forEach((key) => {
    if (next[key] === undefined || next[key] === "") delete next[key];
  });
  return next;
}

export async function getVehicleActorFields(supabase) {
  const fields = {};
  const readSession = async (auth) => {
    if (typeof auth?.getSession !== "function") return null;
    const result = await Promise.race([
      auth.getSession(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("session timeout")), 2500);
      }),
    ]);
    if (!result) return null;
    if (result.user) return result;
    return result.data?.session || null;
  };

  try {
    const session = await readSession(supabase?.auth) || await readSession(rawSupabase(supabase)?.auth);
    const user = session?.user;
    if (!user) return fields;
    const email = asString(user.email, 240);
    const uid = asString(user.id, 80);
    if (email) fields.created_by = email;
    else if (uid) fields.created_by = uid;
    if (uid) fields.created_by_id = uid;
  } catch {
    /* Saving must not wait on a hanging auth lookup. */
  }
  return fields;
}

export function vehicleActorPayloads(payload = {}) {
  const email = asString(payload.created_by, 240);
  const uid = asString(payload.created_by_id, 80);
  const variants = [];
  const seen = new Set();
  const push = (next) => {
    const copy = compactPayload(next);
    const key = `${copy.created_by || ""}|${copy.created_by_id || ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    variants.push(copy);
  };

  push(payload);
  if (email && uid) {
    push({ ...payload, created_by: email, created_by_id: uid });
    push({ ...payload, created_by: uid, created_by_id: uid });
    push({ ...payload, created_by: email, created_by_id: undefined });
    push({ ...payload, created_by: uid, created_by_id: undefined });
  } else if (uid) {
    push({ ...payload, created_by: uid, created_by_id: uid });
    push({ ...payload, created_by: uid, created_by_id: undefined });
  } else if (email) {
    push({ ...payload, created_by: email, created_by_id: undefined });
  }
  push({ ...payload, created_by: undefined, created_by_id: undefined });
  return variants;
}

export function optimisticVehicleRecord(payload = {}) {
  const vin = asString(payload.vin, 32) || String(Date.now());
  return {
    ...payload,
    id: payload.id || `pending-${vin}`,
    created_date: payload.created_date || new Date().toISOString(),
    _selectHidden: true,
  };
}

export function vehicleSelectIsHidden(vehicle) {
  return Boolean(vehicle?._selectHidden) || String(vehicle?.id || "").startsWith("pending-");
}

async function findVehicleByVin(supabase, payload) {
  if (!payload?.vin || !payload?.company_id) return null;
  const rows = await supabase.entities.Vehicle.filter({
    company_id: payload.company_id,
    vin: payload.vin,
  });
  return (Array.isArray(rows) ? rows : []).find((row) => (
    String(row?.vin || "").toUpperCase() === String(payload.vin).toUpperCase()
  )) || null;
}

function recoverSavedVehicle(payload, error) {
  if (isNoRowReturnedError(error) || isUniqueViolation(error)) {
    return optimisticVehicleRecord(payload);
  }
  return null;
}

async function insertVehicleRow(supabase, payload) {
  const client = rawSupabase(supabase);
  if (typeof client?.from !== "function") {
    return supabase.entities.Vehicle.create(payload);
  }
  const table = typeof client.schema === "function"
    ? client.schema("public").from("vehicles")
    : client.from("vehicles");
  const { error } = await table.insert(payload);
  if (!error) {
    const found = await findVehicleByVin(supabase, payload).catch(() => null);
    return found || optimisticVehicleRecord(payload);
  }
  const recovered = recoverSavedVehicle(payload, error);
  if (recovered) {
    const found = await findVehicleByVin(supabase, payload).catch(() => null);
    return found || recovered;
  }
  throw error;
}

async function writeVehicleRecord(supabase, payload, existingId) {
  if (existingId) {
    try {
      const updated = await supabase.entities.Vehicle.update(existingId, payload);
      if (updated?.id) return updated;
      return { ...payload, ...(updated || {}), id: existingId };
    } catch (error) {
      if (isNoRowReturnedError(error)) {
        const found = await supabase.entities.Vehicle.get?.(existingId).catch(() => null);
        return found || { ...payload, id: existingId, _selectHidden: !found };
      }
      throw error;
    }
  }

  let lastError;
  for (const attempt of vehicleActorPayloads(payload)) {
    try {
      const created = await supabase.entities.Vehicle.create(attempt);
      if (created?.id) return created;
      const found = await findVehicleByVin(supabase, attempt).catch(() => null);
      if (found) return found;
      if (created) return created;
      return optimisticVehicleRecord(attempt);
    } catch (error) {
      lastError = error;
      const found = await findVehicleByVin(supabase, attempt).catch(() => null);
      if (found) return found;
      if (isNoRowReturnedError(error) || isUniqueViolation(error)) {
        return optimisticVehicleRecord(attempt);
      }
      if (isRlsViolation(error)) continue;
      throw error;
    }
  }

  try {
    return await insertVehicleRow(supabase, payload);
  } catch (error) {
    const found = await findVehicleByVin(supabase, payload).catch(() => null);
    if (found) return found;
    const recovered = recoverSavedVehicle(payload, error) || recoverSavedVehicle(payload, lastError);
    if (recovered) return recovered;
    throw lastError || error;
  }
}

export async function persistVehicleRecord({
  supabase,
  companyId,
  form,
  existingId,
}) {
  const actor = existingId ? {} : await getVehicleActorFields(supabase);
  const data = buildVehiclePersistPayload(
    ensureVehicleSaveDefaults({ ...form, ...actor }),
    companyId,
  );
  if (!data.company_id) {
    throw new Error("Please select a company first");
  }

  const live = compactPayload({
    ...liveVehiclePayload(data),
    ...actor,
  });

  try {
    const saved = await persistWithUnknownColumnRetry({
      write: (payload) => writeVehicleRecord(supabase, payload, existingId),
      data: live,
      maxAttempts: 12,
      onUnknownColumn: (drop, current) => {
        if (drop !== "features" || current.features == null || current.features === "") return null;
        const { features, ...rest } = current;
        rest.notes = [rest.notes, `Features ${features}`].filter(Boolean).join(" ").trim().slice(0, 500);
        return rest;
      },
      fallback: (current) => compactPayload({
        company_id: current.company_id,
        vin: current.vin,
        make: current.make,
        model: current.model,
        year: current.year,
        condition: current.condition || "used",
        status: current.status || "in_stock",
        ownership_type: current.ownership_type || "dealership_owned",
        purchase_price: current.purchase_price || 0,
        selling_price: current.selling_price || 0,
        mileage: current.mileage || 0,
        notes: current.notes,
        created_by: current.created_by,
        created_by_id: current.created_by_id,
      }),
    });
    if (!saved?.id && !existingId) {
      return optimisticVehicleRecord(live);
    }
    return saved;
  } catch (error) {
    const detail = errorText(error) || "Unknown error";
    const wrapped = new Error(
      isRlsViolation(error)
        ? `Vehicle could not be saved: the database blocked this insert (${detail}). Sign out and sign back in, then try again.`
        : `Vehicle could not be saved: ${detail}`,
    );
    wrapped.cause = error;
    throw wrapped;
  }
}
