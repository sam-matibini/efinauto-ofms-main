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
  const gst = String(form.vendor_gst_number || "").trim();
  const pst = String(form.vendor_pst_number || "").trim();
  return {
    company_id: companyId,
    vendor_name: String(form.vendor_name || "").trim(),
    email: String(form.vendor_email || "").trim(),
    phone: String(form.vendor_phone || "").trim(),
    address: String(form.vendor_address || "").trim(),
    city: String(form.vendor_city || "").trim(),
    province: String(form.vendor_province || form.province || "").trim(),
    postal_code: String(form.vendor_postal_code || "").trim(),
    country: String(form.vendor_country || "").trim() || "Canada",
    gst_number: gst,
    pst_number: pst,
    tax_id: gst,
    vendor_type: "supplier",
    payment_terms: "Due on receipt",
    status: "active",
    notes: [
      pst ? `PST#: ${pst}` : "",
      "Created from a vehicle bill of sale / tax invoice.",
    ].filter(Boolean).join(" "),
  };
}

async function createVendorRecord(payload) {
  const { supabase } = await import("@/api/supabaseClient");
  try {
    return await supabase.entities.Vendor.create(payload);
  } catch (error) {
    const { gst_number, pst_number, ...legacy } = payload;
    legacy.tax_id = gst_number || legacy.tax_id;
    legacy.notes = [legacy.notes, pst_number ? `PST#: ${pst_number}` : ""].filter(Boolean).join(" ");
    try {
      return await supabase.entities.Vendor.create(legacy);
    } catch {
      throw error;
    }
  }
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
