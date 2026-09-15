import {
  errorText,
  omitSystemEntityKeys,
  persistWithUnknownColumnRetry,
} from "./persistErrors.js";

export const VENDOR_TYPES = ["supplier", "service_provider", "contractor", "other"];
export const VENDOR_STATUSES = ["active", "inactive"];

export function asVendorString(value, max = 500) {
  if (value == null) return "";
  return String(value).replace(/\u0000/g, " ").replace(/[ \t]+/g, " ").trim().slice(0, max);
}

export function cleanCityName(value) {
  return asVendorString(value, 80).replace(/,+$/g, "").trim();
}

export function cleanCanadianPostal(value) {
  const source = String(value || "").toUpperCase();
  const match = source.match(/\b([A-CEGHJ-NPR-TVXY]\d[A-CEGHJ-NPR-TV-Z]\s?\d[A-CEGHJ-NPR-TV-Z]\d)\b/);
  if (!match) return "";
  const compact = match[1].replace(/\s/g, "");
  return `${compact.slice(0, 3)} ${compact.slice(3)}`;
}

export function looksLikeJunkAddress(value) {
  return /hewlett|packard|endobj|\/type\s*\/|%pdf-|flatedecode|\[\/pdf\/text/i.test(String(value || ""));
}

export const VEHICLE_VENDOR_FIELD_KEYS = [
  "vendor_id",
  "vendor_name",
  "vendor_address",
  "vendor_city",
  "vendor_province",
  "vendor_country",
  "vendor_postal_code",
  "vendor_gst_number",
  "vendor_pst_number",
  "vendor_phone",
  "vendor_email",
  "invoice_number",
  "transaction_date",
  "stock_number",
  "bidder_number",
  "storage_yard",
  "auction_number",
  "mpi_doc_number",
  "tax_exemption_reason",
  "odometer_as_of",
];

export function emptyVehicleVendorFields() {
  return {
    vendor_id: "",
    vendor_name: "",
    vendor_address: "",
    vendor_city: "",
    vendor_province: "",
    vendor_country: "",
    vendor_postal_code: "",
    vendor_gst_number: "",
    vendor_pst_number: "",
    vendor_phone: "",
    vendor_email: "",
    invoice_number: "",
    transaction_date: "",
    stock_number: "",
    bidder_number: "",
    storage_yard: "",
    auction_number: "",
    mpi_doc_number: "",
    tax_exemption_reason: "",
    odometer_as_of: "",
  };
}

export function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/soci[eé]t[eé] d['’]assurance publique du manitoba/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(inc|ltd|llc|corp|corporation|limited|the)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeGst(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normalizePst(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function vendorEmail(vendor) {
  return vendor?.email || vendor?.contact_email || "";
}

function vendorPhone(vendor) {
  return vendor?.phone || vendor?.contact_phone || vendor?.vendor_phone || "";
}

function vendorGst(vendor) {
  return vendor?.gst_number || vendor?.tax_id || vendor?.vendor_gst_number || "";
}

function vendorPst(vendor) {
  return vendor?.pst_number || vendor?.vendor_pst_number || "";
}

export function vendorToVehicleFields(vendor = {}) {
  return {
    vendor_id: vendor.id || "",
    vendor_name: vendor.vendor_name || "",
    vendor_address: vendor.address || "",
    vendor_city: vendor.city || "",
    vendor_province: vendor.province || "",
    vendor_country: vendor.country || "",
    vendor_postal_code: vendor.postal_code || "",
    vendor_gst_number: vendorGst(vendor),
    vendor_pst_number: vendorPst(vendor),
    vendor_phone: vendorPhone(vendor),
    vendor_email: vendorEmail(vendor),
  };
}

export function fillMissingVendorFields(form = {}, vendor) {
  if (!vendor) return form;
  const mapped = vendorToVehicleFields(vendor);
  const next = { ...form, vendor_id: vendor.id || form.vendor_id || "" };
  for (const [key, value] of Object.entries(mapped)) {
    if (key === "vendor_id") continue;
    if (!String(form[key] || "").trim() && value) next[key] = value;
  }
  return next;
}

export function findMatchingVendor(vendors = [], fields = {}) {
  const list = Array.isArray(vendors) ? vendors : [];
  const gst = normalizeGst(fields.vendor_gst_number || fields.gst_number);
  const pst = normalizePst(fields.vendor_pst_number || fields.pst_number);
  const email = normalizeEmail(fields.vendor_email || fields.email);
  const phone = normalizePhone(fields.vendor_phone || fields.phone);
  const name = normalizeName(fields.vendor_name);

  if (gst) {
    const byGst = list.find((vendor) => normalizeGst(vendorGst(vendor)) === gst);
    if (byGst) return byGst;
  }
  if (pst) {
    const byPst = list.find((vendor) => normalizePst(vendorPst(vendor)) === pst);
    if (byPst) return byPst;
  }
  if (email) {
    const byEmail = list.find((vendor) => normalizeEmail(vendorEmail(vendor)) === email);
    if (byEmail) return byEmail;
  }
  if (phone && phone.length === 10) {
    const byPhone = list.find((vendor) => normalizePhone(vendorPhone(vendor)) === phone);
    if (byPhone) return byPhone;
  }
  if (name) {
    const exact = list.find((vendor) => normalizeName(vendor.vendor_name) === name);
    if (exact) return exact;
    const contained = list.find((vendor) => {
      const vendorName = normalizeName(vendor.vendor_name);
      return vendorName && (vendorName.includes(name) || name.includes(vendorName));
    });
    if (contained) return contained;
  }
  return null;
}

export function vehicleFieldsToVendorPayload(form = {}, companyId) {
  const gst = asVendorString(form.vendor_gst_number || form.gst_number, 40);
  const pst = asVendorString(form.vendor_pst_number || form.pst_number, 40);
  return {
    company_id: companyId,
    vendor_name: asVendorString(form.vendor_name, 160),
    contact_person: asVendorString(form.contact_person, 120),
    email: asVendorString(form.vendor_email || form.email, 160),
    phone: asVendorString(form.vendor_phone || form.phone, 40),
    address: looksLikeJunkAddress(form.vendor_address || form.address)
      ? ""
      : asVendorString(form.vendor_address || form.address, 200),
    city: cleanCityName(form.vendor_city || form.city),
    province: asVendorString(form.vendor_province || form.province, 8).toUpperCase(),
    postal_code: cleanCanadianPostal(form.vendor_postal_code || form.postal_code),
    country: asVendorString(form.vendor_country || form.country, 80) || "Canada",
    gst_number: gst,
    pst_number: pst,
    tax_id: gst || asVendorString(form.tax_id, 40),
    vendor_type: VENDOR_TYPES.includes(form.vendor_type) ? form.vendor_type : "supplier",
    payment_terms: asVendorString(form.payment_terms, 80) || "Due on receipt",
    status: VENDOR_STATUSES.includes(form.status) ? form.status : "active",
    notes: [
      pst ? `PST#: ${pst}` : "",
      "Created from a vehicle bill of sale / tax invoice.",
    ].filter(Boolean).join(" "),
  };
}

function leftoverPostalNotes(notes) {
  const next = asVendorString(notes, 2000);
  if (!next) return "";
  const postal = cleanCanadianPostal(next);
  if (postal && next.replace(/[^A-Z0-9]/gi, "").length <= 12) return "";
  return next;
}

export function buildVendorPersistPayload(form = {}, companyId) {
  const source = omitSystemEntityKeys(form);
  const gst = asVendorString(source.gst_number || source.tax_id, 40);
  const pst = asVendorString(source.pst_number, 40);
  const postal = cleanCanadianPostal(source.postal_code)
    || cleanCanadianPostal(source.notes);
  const notes = leftoverPostalNotes(source.notes);
  const payload = {
    company_id: companyId || source.company_id,
    vendor_name: asVendorString(source.vendor_name, 160),
    contact_person: asVendorString(source.contact_person, 120) || undefined,
    email: asVendorString(source.email, 160) || undefined,
    phone: asVendorString(source.phone, 40) || undefined,
    address: looksLikeJunkAddress(source.address) ? undefined : asVendorString(source.address, 200) || undefined,
    city: cleanCityName(source.city) || undefined,
    province: asVendorString(source.province, 8).toUpperCase() || undefined,
    postal_code: postal || undefined,
    country: asVendorString(source.country, 80) || "Canada",
    vendor_type: VENDOR_TYPES.includes(source.vendor_type) ? source.vendor_type : "supplier",
    payment_terms: asVendorString(source.payment_terms, 80) || "Net 30",
    tax_id: gst || undefined,
    gst_number: gst || undefined,
    pst_number: pst || undefined,
    notes: notes || undefined,
    status: VENDOR_STATUSES.includes(source.status) ? source.status : "active",
  };
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined || payload[key] === "") delete payload[key];
  });
  return payload;
}

const VENDOR_CORE_KEYS = [
  "company_id",
  "vendor_name",
  "email",
  "phone",
  "address",
  "city",
  "province",
  "postal_code",
  "country",
  "vendor_type",
  "payment_terms",
  "tax_id",
  "notes",
  "status",
];

export async function persistVendorRecord({
  supabase,
  companyId,
  form,
  existingId,
}) {
  const data = buildVendorPersistPayload(form, companyId);
  if (!data.company_id) {
    throw new Error("Please select a company first");
  }
  if (!data.vendor_name) {
    throw new Error("Enter a vendor name");
  }
  const core = {};
  for (const key of VENDOR_CORE_KEYS) {
    if (data[key] != null && data[key] !== "") core[key] = data[key];
  }
  try {
    return await persistWithUnknownColumnRetry({
      write: (payload) => (
        existingId
          ? supabase.entities.Vendor.update(existingId, payload)
          : supabase.entities.Vendor.create(payload)
      ),
      data,
      fallback: core,
    });
  } catch (error) {
    const detail = errorText(error) || "Unknown error";
    const wrapped = new Error(`Vendor could not be saved: ${detail}`);
    wrapped.cause = error;
    throw wrapped;
  }
}

async function createVendorRecord(payload) {
  const { supabase } = await import("@/api/supabaseClient");
  return persistVendorRecord({
    supabase,
    companyId: payload.company_id,
    form: payload,
  });
}

export async function createVendorFromVehicleForm({ form, companyId, queryClient }) {
  const vendorName = String(form?.vendor_name || "").trim();
  if (!vendorName) {
    throw new Error("Enter a vendor name before adding the vendor");
  }
  if (!companyId) {
    throw new Error("Select a company before adding a vendor");
  }
  const vendor = await createVendorRecord(vehicleFieldsToVendorPayload(form, companyId));
  queryClient?.invalidateQueries?.({ queryKey: ["vendors"] });
  queryClient?.invalidateQueries?.({ queryKey: ["vendors", companyId] });
  return vendor;
}

export async function resolveVehicleVendor({ form, vendors, companyId, queryClient }) {
  const vendorName = String(form?.vendor_name || "").trim();
  if (!vendorName) return form;

  if (form.vendor_id) {
    const selected = vendors?.find((vendor) => vendor.id === form.vendor_id);
    return selected ? fillMissingVendorFields(form, selected) : form;
  }

  const match = findMatchingVendor(vendors, form);
  if (match) {
    return fillMissingVendorFields(form, match);
  }

  const created = await createVendorFromVehicleForm({ form, companyId, queryClient });
  return { ...form, ...vendorToVehicleFields(created) };
}

export function pickVehicleVendorPersistFields(formData = {}) {
  const out = {};
  for (const key of VEHICLE_VENDOR_FIELD_KEYS) {
    const value = formData[key];
    if (value == null || value === "") continue;
    out[key] = typeof value === "string" ? value.trim() : value;
  }
  return out;
}
