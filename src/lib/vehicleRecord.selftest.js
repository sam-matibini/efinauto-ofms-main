import { parseMpiSalvageBillOfSale } from "./documentAutoscan/parseMpiBillOfSale.js";
import {
  buildVehiclePersistPayload,
  cleanVehicleModel,
  liveVehiclePayload,
  missingVehicleSaveFields,
  persistVehicleRecord,
  sanitizeVehicleForm,
  selectValue,
  vehicleFormCanSave,
  ensureVehicleSaveDefaults,
} from "./vehicleRecord.js";

const mpiText = `
Manitoba Public Insurance / Société d'assurance publique du Manitoba
1981 Plessis Rd
Winnipeg, MB R2C 5C7
Phone: (204) 9857844
Email: MPISalvage@mpi.mb.ca
GST #: R122001191 PST #: 556568-5
BILL OF SALE
Invoice #              148734
Date                   Jul 29, 2026
Regular Auction #      6621
Bidder #:              AA7724
Storage Yard
Location:              Winnipeg
Sold To:
Oluspe Auto Sales and Parts inc
Stock # 20266247 7/29/2026 2-287 2018 CHEVROLET CRUZE LT TURBO White 1G1BE5SM0J7226676
Vehicle Ownership is branded: MB-SALVAGEABLE
Sold as is. No refunds. MPI DOC # 51901903.
CHARGE AMOUNT HST/GST PST/QST TOTAL
Sale Amount $1550.00 $77.50 $0.00 $1627.50
Buy Fee $300.00 $15.00 $0.00 $315.00
AuctionNow Fee $89.00 $4.45 $0.00 $93.45
Total: $1,939.00 $96.95 $0.00 $2,035.95
* Tax Exemption Reason: Manitoba RST Stock # Sale Date Item Year Make Model Colour VIN
* Repair Estimate: 14008.18
* As of 7/23/2026 the Odometer was 162929Km.
`;

const checks = [];
const model = cleanVehicleModel(
  "CRUZE LT TURBO White 1G1BE5SM0J7226676 Vehicle Ownership is branded",
  "1G1BE5SM0J7226676"
);
checks.push(["clean model", model === "CRUZE LT TURBO"]);
checks.push(["select empty", selectValue("", ["MB"]) === undefined]);
checks.push(["select valid", selectValue("MB", ["MB", "ON"]) === "MB"]);
checks.push(["select invalid", selectValue("salvage", ["used", "new"]) === undefined]);

const mpi = parseMpiSalvageBillOfSale(mpiText);
const scanned = sanitizeVehicleForm({
  vin: "",
  make: "",
  model: "",
  year: 2026,
  color: "",
  mileage: 0,
  weight: 0,
  condition: "used",
  status: "in_stock",
  purchase_price: 0,
  selling_price: 0,
  fuel_type: "petrol",
  transmission: "manual",
  engine_capacity: "",
  features: "",
  location: "",
  images: [],
  notes: "",
  purchase_documents: [],
  vendor_name: "",
  province: "",
  tax_status: "taxable",
  pst_exempt: false,
  tax_gst: 0,
  tax_pst: 0,
  tax_hst: 0,
  ownership_type: "dealership_owned",
  ...mpi,
});

checks.push(["can save after scan", vehicleFormCanSave(scanned) === true]);
checks.push(["vin string", typeof scanned.vin === "string" && scanned.vin.includes("1G1BE5SM")]);
checks.push(["make string", typeof scanned.make === "string" && /chevrolet/i.test(scanned.make)]);
checks.push(["model cleaned", /cruze/i.test(scanned.model) && !/1G1|ownership/i.test(scanned.model)]);
checks.push(["year number", scanned.year === 2018]);
checks.push(["fuel default", scanned.fuel_type === "petrol"]);
checks.push(["condition default", scanned.condition === "used"]);
const clamped = sanitizeVehicleForm({ ...scanned, fuel_type: "gas", condition: "salvage" });
checks.push(["fuel clamped", clamped.fuel_type === "petrol"]);
checks.push(["condition clamped", clamped.condition === "used"]);
checks.push(["no buyer_name on form", scanned.buyer_name == null]);

const payload = buildVehiclePersistPayload({
  ...scanned,
  buyer_name: "should not persist",
  recoverable_tax: 96.95,
  inventory_cost: 1939,
  post_to_gl: true,
  company_id: "co-1",
}, "co-1");

checks.push(["persist vin", payload.vin === scanned.vin]);
checks.push(["persist required", Boolean(payload.make && payload.model && payload.year && payload.company_id)]);
checks.push(["no buyer_name persist", payload.buyer_name == null]);
checks.push(["no recoverable_tax persist", payload.recoverable_tax == null]);
checks.push(["no post_to_gl persist", payload.post_to_gl == null]);
checks.push(["tax exemption short", String(payload.tax_exemption_reason || "").length < 200]);
checks.push(["trim-safe empty form", vehicleFormCanSave({ vin: null, make: 12, model: undefined, year: "x" }) === false]);
checks.push(["missing fields named", missingVehicleSaveFields({ vin: "", make: "", model: "", year: "" }).join(",") === "VIN,Make,Model,Year"]);

const sanitized = sanitizeVehicleForm({ vin: 11, make: "Chevrolet", model: "CRUZE", year: "2018" });
checks.push(["non-string vin becomes string", typeof sanitized.vin === "string"]);
checks.push(["mpi exemption not a table dump", (mpi.tax_exemption_reason || "").length < 80]);
checks.push(["mpi exemption has RST", /manitoba rst/i.test(mpi.tax_exemption_reason || "")]);
checks.push(["pdf notes stripped", sanitizeVehicleForm({
  ...scanned,
  notes: "%PDF-1.7\n[/PDF/Text/ImageB/ImageC/ImageI]\nendobj /Length 12",
}).notes === ""]);

let created;
const unknownColumns = new Set([
  "pst_exempt", "tax_rst", "total_vehicle_expenditure", "gl_posted", "purchase_id",
  "purchase_documents", "vendor_address", "vendor_city", "vendor_province",
  "vendor_country", "vendor_postal_code", "vendor_gst_number", "vendor_pst_number",
  "bidder_number", "storage_yard", "auction_number", "mpi_doc_number",
  "tax_exemption_reason", "odometer_as_of",
]);
let attempts = 0;
const fakeSupabase = {
  entities: {
    Vehicle: {
      create: async (data) => {
        attempts += 1;
        const unknown = Object.keys(data).find((key) => unknownColumns.has(key));
        if (unknown) {
          throw { message: `column vehicles.${unknown} does not exist`, code: "42703" };
        }
        created = data;
        return { id: "veh-1", ...data };
      },
    },
  },
};
const saved = await persistVehicleRecord({
  supabase: fakeSupabase,
  companyId: "co-1",
  form: { ...scanned, company_id: "co-1", purchase_documents: [{ name: "bos.pdf", url: "https://files.example/bos.pdf" }] },
});
const live = liveVehiclePayload(payload);
checks.push(["persist retry omitted unknown", created && created.pst_exempt == null && created.tax_rst == null && saved.id === "veh-1"]);
checks.push(["persist used live columns quickly", attempts === 1]);
checks.push(["fallback notes keep GST", /GST#\s*R122001191/i.test(created?.notes || live.notes || "")]);
checks.push(["fallback notes keep MPI doc", /51901903/.test(created?.notes || "")]);

const blank = ensureVehicleSaveDefaults({ vin: "", make: "", model: "", year: "" });
checks.push(["defaults fill vin", /^PEND/i.test(blank.vin)]);
checks.push(["defaults fill make", blank.make === "Unknown"]);
checks.push(["defaults fill model", blank.model === "Unknown"]);
checks.push(["defaults fill year", blank.year >= 1980]);

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("FAILED", failed.map(([name]) => name));
  console.error(JSON.stringify({ model, scanned, payload, mpiExemption: mpi.tax_exemption_reason }, null, 2));
  process.exit(1);
}
console.log("vehicle record checks passed", checks.length);
