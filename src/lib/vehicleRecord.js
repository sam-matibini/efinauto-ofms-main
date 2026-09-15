import { VEHICLE_VENDOR_FIELD_KEYS } from "./vendorDirectory.js";
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

const UNKNOWN_COLUMN_RE = /Could not find the '([^']+)' column/i;

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

export function vehicleFormCanSave(form = {}) {
  try {
    return asString(form.vin, 32).length >= 5
      && asString(form.make, 80).length > 0
      && asString(form.model, 120).length > 0
      && asNumber(form.year, 0) >= 1980;
  } catch {
    return false;
  }
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
    notes: asString(form.notes, 8000),
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
    notes: optionalString(source.notes, 8000),
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
    payload[key] = typeof value === "string" ? asString(value, key === "tax_exemption_reason" ? 500 : 240) : value;
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined || payload[key] === "") delete payload[key];
  });
  return payload;
}

export async function persistVehicleRecord({
  supabase,
  companyId,
  form,
  existingId,
}) {
  let data = buildVehiclePersistPayload(form, companyId);
  if (!data.company_id) {
    throw new Error("Please select a company first");
  }
  if (!vehicleFormCanSave(data)) {
    throw new Error("Please fill in all required fields (VIN, Make, Model, Year)");
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      if (existingId) return await supabase.entities.Vehicle.update(existingId, data);
      return await supabase.entities.Vehicle.create(data);
    } catch (error) {
      const match = String(error?.message || error).match(UNKNOWN_COLUMN_RE);
      if (!match || !(match[1] in data)) throw error;
      const { [match[1]]: _dropped, ...rest } = data;
      data = rest;
    }
  }
  throw new Error("Vehicle could not be saved");
}
