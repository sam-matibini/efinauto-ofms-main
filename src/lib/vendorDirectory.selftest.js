import {
  findMatchingVendor,
  fillMissingVendorFields,
  vendorToVehicleFields,
  persistVendorRecord,
  buildVendorPersistPayload,
  cleanCanadianPostal,
  cleanCityName,
} from "./vendorDirectory.js";

const mpi = {
  id: "v-mpi",
  vendor_name: "Manitoba Public Insurance",
  email: "MPISalvage@mpi.mb.ca",
  phone: "(204) 985-7844",
  address: "1981 Plessis Rd",
  city: "Winnipeg",
  province: "MB",
  postal_code: "R2C 5C7",
  country: "Canada",
  gst_number: "R122001191",
  pst_number: "556568-5",
};

const vendors = [mpi, { id: "v-2", vendor_name: "Prairie Auto Auction", email: "parts@example.com" }];

const byGst = findMatchingVendor(vendors, { vendor_gst_number: "R122001191", vendor_name: "Unknown" });
const byName = findMatchingVendor(vendors, { vendor_name: "Manitoba Public Insurance / Société d'assurance publique du Manitoba" });
const byEmail = findMatchingVendor(vendors, { vendor_email: "mpisalvage@mpi.mb.ca" });
const none = findMatchingVendor(vendors, { vendor_name: "Brand New Salvage Co" });

const filled = fillMissingVendorFields(
  { vendor_name: "Manitoba Public Insurance", vendor_gst_number: "R122001191", invoice_number: "148734" },
  mpi
);

const dirty = buildVendorPersistPayload({
  id: "v-mpi",
  created_date: "2026-01-01",
  created_by: "someone",
  vendor_name: "Manitoba Public Insurance",
  city: "Winnipeg,",
  postal_code: "R2C 5C7",
  notes: "MB R3W 1S3",
  gst_number: "R122001191",
  pst_number: "556568-5",
  vendor_type: "salvage",
  company_id: "co-1",
}, "co-1");

let savedVendor;
const fakeSupabase = {
  entities: {
    Vendor: {
      update: async (id, data) => {
        if ("gst_number" in data) {
          throw { message: "Could not find the 'gst_number' column of 'vendors' in the schema cache" };
        }
        if ("pst_number" in data) {
          throw { message: "Could not find the 'pst_number' column of 'vendors' in the schema cache" };
        }
        savedVendor = { id, ...data };
        return savedVendor;
      },
    },
  },
};

const updated = await persistVendorRecord({
  supabase: fakeSupabase,
  companyId: "co-1",
  form: {
    id: "v-mpi",
    created_date: "2026-01-01",
    vendor_name: "Manitoba Public Insurance",
    city: "Winnipeg,",
    postal_code: "R2C 5C7",
    notes: "MB R3W 1S3",
    gst_number: "R122001191",
    vendor_type: "",
  },
  existingId: "v-mpi",
});

const checks = [
  ["match gst", byGst?.id === "v-mpi"],
  ["match name", byName?.id === "v-mpi"],
  ["match email", byEmail?.id === "v-mpi"],
  ["no match", none == null],
  ["keep invoice", filled.invoice_number === "148734"],
  ["fill address", filled.vendor_address === "1981 Plessis Rd"],
  ["set vendor id", filled.vendor_id === "v-mpi"],
  ["map gst", vendorToVehicleFields(mpi).vendor_gst_number === "R122001191"],
  ["clean city", cleanCityName("Winnipeg,") === "Winnipeg"],
  ["valid postal", cleanCanadianPostal("R2C5C7") === "R2C 5C7"],
  ["reject postal I", cleanCanadianPostal("R9L8I1") === ""],
  ["persist no id", dirty.id == null && dirty.created_date == null],
  ["persist city", dirty.city === "Winnipeg"],
  ["persist notes not leftover postal", dirty.notes !== "MB R3W 1S3"],
  ["persist vendor type clamped", dirty.vendor_type === "supplier"],
  ["update dropped gst column", savedVendor && savedVendor.gst_number == null && updated.id === "v-mpi"],
  ["update kept name", savedVendor?.vendor_name === "Manitoba Public Insurance"],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("FAILED", failed.map(([name]) => name), { byGst, byName, filled });
  process.exit(1);
}
console.log("vendor directory checks passed", checks.length);
