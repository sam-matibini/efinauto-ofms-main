import { parseMpiSalvageBillOfSale } from "./parseMpiBillOfSale.js";

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
Phone #:               (204) 5908387
Storage Yard
Location:              Winnipeg
Sold To:
Oluspe Auto Sales and Parts inc
1825 King edward st
Winnipeg, MB R2R 0M8
Sold on Behalf of: Manitoba Public Insurance
Stock # 20266247 7/29/2026 2-287 2018 CHEVROLET CRUZE LT TURBO White 1G1BE5SM0J7226676
Vehicle Ownership is branded: MB-SALVAGEABLE
Sold as is. No refunds. MPI DOC # 51901903.
CHARGE AMOUNT HST/GST PST/QST TOTAL
Sale Amount $1550.00 $77.50 $0.00 $1627.50
Buy Fee $300.00 $15.00 $0.00 $315.00
AuctionNow Fee $89.00 $4.45 $0.00 $93.45
Total: $1,939.00 $96.95 $0.00 $2,035.95
* Tax Exemption Reason: Manitoba RST
* Vehicle has been declared a total loss by the insurer.
* The manufacturer's warranty has been cancelled.
* Repair Estimate: 14008.18
* As of 7/23/2026 the Odometer was 162929Km.
`;

const mpi = parseMpiSalvageBillOfSale(mpiText);
const checks = [
  ["mpi vendor", mpi.vendor_name === "Manitoba Public Insurance"],
  ["mpi address", /plessis/i.test(mpi.vendor_address || "")],
  ["mpi city", mpi.vendor_city === "Winnipeg"],
  ["mpi postal", mpi.vendor_postal_code === "R2C 5C7"],
  ["mpi phone", /204/.test(mpi.vendor_phone || "")],
  ["mpi city", /winnipeg/i.test(mpi.vendor_city || "")],
  ["mpi country", mpi.vendor_country === "Canada"],
  ["mpi postal", /R2C\s?5C7/i.test(mpi.vendor_postal_code || "")],
  ["mpi gst", mpi.vendor_gst_number === "R122001191"],
  ["mpi pst", mpi.vendor_pst_number === "556568-5"],
  ["mpi email", /mpisalvage@mpi.mb.ca/i.test(mpi.vendor_email || "")],
  ["mpi phone", /204/.test(mpi.vendor_phone || "") && !/5908387/.test(mpi.vendor_phone || "")],
  ["mpi invoice", mpi.invoice_number === "148734"],
  ["mpi date", mpi.transaction_date === "2026-07-29"],
  ["mpi bidder", mpi.bidder_number === "AA7724"],
  ["mpi yard", /winnipeg/i.test(mpi.storage_yard || "")],
  ["mpi stock", mpi.stock_number === "20266247"],
  ["mpi auction", mpi.auction_number === "6621"],
  ["mpi pretax", mpi.purchase_price === 1939],
  ["mpi gst amount", mpi.tax_gst === 96.95],
  ["mpi pst amount", mpi.tax_pst === 0],
  ["mpi vin", mpi.vin === "1G1BE5SM0J7226676"],
  ["mpi year", mpi.year === 2018],
  ["mpi make", /chevrolet/i.test(mpi.make || "")],
  ["mpi model", /cruze lt turbo/i.test(mpi.model || "") && !/1G1/i.test(mpi.model || "")],
  ["mpi color", /white/i.test(mpi.color || "")],
  ["mpi mileage", mpi.mileage === 162929],
  ["mpi exemption", /manitoba rst/i.test(mpi.tax_exemption_reason || "")],
  ["mpi pst exempt", mpi.pst_exempt === true],
  ["mpi doc", mpi.mpi_doc_number === "51901903"],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("FAILED", failed.map(([name]) => name));
  console.error(JSON.stringify(mpi, null, 2));
  process.exit(1);
}
console.log("MPI bill of sale parser checks passed", checks.length);
