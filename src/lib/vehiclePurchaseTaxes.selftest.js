import { vehiclePurchaseTaxes } from "./vehiclePurchaseTaxes.js";

const checks = [];

const sk = vehiclePurchaseTaxes({ pretax: 10000, province: "SK", tax_status: "taxable" });
checks.push(["SK GST", sk.tax_gst === 500]);
checks.push(["SK PST", sk.tax_pst === 600]);
checks.push(["SK RST", sk.tax_rst === 1100]);
checks.push(["SK total", sk.total_vehicle_expenditure === 11100]);
checks.push(["SK inventory includes PST", sk.inventory_cost === 10600]);
checks.push(["SK ITC is GST", sk.recoverable_tax === 500]);

const on = vehiclePurchaseTaxes({ pretax: 10000, province: "ON", tax_status: "taxable" });
checks.push(["ON HST", on.tax_hst === 1300]);
checks.push(["ON RST", on.tax_rst === 1300]);
checks.push(["ON inventory pretax only", on.inventory_cost === 10000]);
checks.push(["ON ITC is HST", on.recoverable_tax === 1300]);

const manual = vehiclePurchaseTaxes({ pretax: 2000, tax_gst: 100, tax_pst: 80, tax_hst: 0 });
checks.push(["manual RST", manual.tax_rst === 180]);
checks.push(["manual total", manual.total_vehicle_expenditure === 2180]);

const exempt = vehiclePurchaseTaxes({ pretax: 10000, province: "SK", tax_status: "exempt" });
checks.push(["exempt RST", exempt.tax_rst === 0]);
checks.push(["exempt total", exempt.total_vehicle_expenditure === 10000]);

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("FAILED", failed.map(([name]) => name), { sk, on, manual, exempt });
  process.exit(1);
}
console.log("vehicle purchase tax checks passed", checks.length);
