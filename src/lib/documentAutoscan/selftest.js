import { parseDocumentFields, decodeVin, mergeDocumentFields } from "./index.js";

const sample = `
BILL OF SALE
Invoice Number: INV-2018-441
Date: 2018-06-12
VIN: 1G1BE5SM0J7226676
Make: CHEVROLET
Model: CRUZE LT TURBO
Year: 2018
Color: White
Mileage: 0 km
Purchase Price: $2035.95
Fuel Type: Petrol
Transmission: Automatic
Location: Lot A, Bay 5
Seller: Prairie Auto Auction
`;

const fields = parseDocumentFields(sample, "vehicle");
const vin = decodeVin(fields.vin);
const merged = mergeDocumentFields({ vin: "", make: "", purchase_price: 0 }, fields);

const checks = [
  ["vin", fields.vin === "1G1BE5SM0J7226676"],
  ["year", fields.year === 2018],
  ["make", /chevrolet/i.test(fields.make)],
  ["model", /cruze/i.test(fields.model)],
  ["color", /white/i.test(fields.color)],
  ["mileage", fields.mileage === 0],
  ["purchase_price", fields.purchase_price === 2035.95],
  ["transmission", fields.transmission === "automatic"],
  ["fuel_type", fields.fuel_type === "petrol"],
  ["invoice_number", fields.invoice_number.includes("INV-2018-441")],
  ["vin decode make", vin.make === "Chevrolet"],
  ["vin decode year", vin.year === 2018],
  ["merge", merged.vin === fields.vin],
];

const expense = parseDocumentFields(`RECEIPT
Petro Canada
Date: 2026-03-04
Invoice #: RCP-8821
Fuel: $84.20
HST: $10.95
Total: $95.15
Paid by Visa`, "expense");

checks.push(
  ["expense vendor", /petro/i.test(expense.vendor_name || "")],
  ["expense amount", expense.amount === 84.2 || expense.amount === 95.15],
  ["expense tax", expense.tax_amount === 10.95],
  ["expense category", expense.category === "fuel"],
  ["expense reference", /RCP-8821/.test(expense.reference_number || "")],
);

const failed = checks.filter(([, ok]) => !ok);
console.log(JSON.stringify({ vehicle: fields, expense }, null, 2));
if (failed.length) {
  console.error("FAILED", failed.map(([name]) => name));
  process.exit(1);
}
console.log("autoscan parser checks passed", checks.length);
