import { findMatchingVendor, fillMissingVendorFields, vendorToVehicleFields } from "./vendorDirectory.js";

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

const checks = [
  ["match gst", byGst?.id === "v-mpi"],
  ["match name", byName?.id === "v-mpi"],
  ["match email", byEmail?.id === "v-mpi"],
  ["no match", none == null],
  ["keep invoice", filled.invoice_number === "148734"],
  ["fill address", filled.vendor_address === "1981 Plessis Rd"],
  ["set vendor id", filled.vendor_id === "v-mpi"],
  ["map gst", vendorToVehicleFields(mpi).vendor_gst_number === "R122001191"],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("FAILED", failed.map(([name]) => name), { byGst, byName, filled });
  process.exit(1);
}
console.log("vendor directory checks passed", checks.length);
