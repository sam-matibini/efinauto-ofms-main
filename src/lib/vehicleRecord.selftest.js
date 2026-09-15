import { parseMpiSalvageBillOfSale } from "./documentAutoscan/parseMpiBillOfSale.js";
import {
  buildVehiclePersistPayload,
  cleanVehicleModel,
  persistVehicleRecord,
  sanitizeVehicleForm,
  selectValue,
  vehicleFormCanSave,
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
  make: "Chevrolet",
  model: "CRUZE LT TURBO White 1G1BE5SM0J7226676 Vehicle Ownership is branded",
  year: 2018,
  fuel_type: "gas",
  condition: "salvage",
  buyer_name: "Oluspe Auto Sales",
});

checks.push(["can save after scan", vehicleFormCanSave(scanned) === true]);
checks.push(["vin string", typeof scanned.vin === "string" && scanned.vin.includes("1G1BE5SM")]);
checks.push(["make string", typeof scanned.make === "string" && /chevrolet/i.test(scanned.make)]);
checks.push(["model cleaned", /cruze/i.test(scanned.model) && !/ownership/i.test(scanned.model)]);
checks.push(["year number", scanned.year === 2018]);
checks.push(["fuel clamped", scanned.fuel_type === "petrol"]);
checks.push(["condition clamped", scanned.condition === "used"]);
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

const sanitized = sanitizeVehicleForm({ vin: 11, make: "Chevrolet", model: "CRUZE", year: "2018" });
checks.push(["non-string vin becomes string", typeof sanitized.vin === "string"]);
checks.push(["mpi exemption not a table dump", (mpi.tax_exemption_reason || "").length < 80]);
checks.push(["mpi exemption has RST", /manitoba rst/i.test(mpi.tax_exemption_reason || "")]);

let created;
const fakeSupabase = {
  entities: {
    Vehicle: {
      create: async (data) => {
        if ("pst_exempt" in data) {
          throw new Error("Could not find the 'pst_exempt' column of 'vehicles' in the schema cache");
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
  form: { ...scanned, company_id: "co-1" },
});
checks.push(["persist retry omitted unknown", created && created.pst_exempt == null && saved.id === "veh-1"]);

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("FAILED", failed.map(([name]) => name));
  console.error(JSON.stringify({ model, scanned, payload, mpiExemption: mpi.tax_exemption_reason }, null, 2));
  process.exit(1);
}
console.log("vehicle record checks passed", checks.length);
