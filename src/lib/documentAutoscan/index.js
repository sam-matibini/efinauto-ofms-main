import { supabase } from "@/api/supabaseClient";
import { extractDocumentText } from "./extractText";

const VIN_RE = /\b([A-HJ-NPR-Z0-9]{17})\b/i;
const MONEY_RE = /\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})|[0-9]+\.[0-9]{1,2})/;

const VEHICLE_MAKES = [
  "Mercedes-Benz", "Land Rover", "Alfa Romeo", "Aston Martin", "Rolls-Royce",
  "Chevrolet", "Chrysler", "Cadillac", "Volkswagen", "Mitsubishi", "Maserati",
  "Hyundai", "Genesis", "Lincoln", "Porsche", "Ferrari", "Lamborghini",
  "Bentley", "Bugatti", "McLaren", "Infiniti", "Nissan", "Toyota", "Lexus",
  "Honda", "Acura", "Mazda", "Subaru", "Suzuki", "Isuzu", "GMC", "Buick",
  "Dodge", "Ram", "Jeep", "Ford", "Tesla", "Volvo", "Saab", "Fiat", "Mini",
  "BMW", "Audi", "Kia", "Jaguar", "Peugeot", "Renault", "Citroen", "Opel",
  "Polestar", "Rivian", "Lucid", "Hummer", "Pontiac", "Saturn", "Oldsmobile",
  "Mercury", "Scion", "Daihatsu", "Hino",
];

const COLORS = [
  "pearl white", "midnight blue", "dark grey", "dark gray", "dark green",
  "light blue", "off white", "gun metal", "gunmetal", "white", "black",
  "silver", "grey", "gray", "blue", "red", "green", "yellow", "orange",
  "brown", "beige", "gold", "purple", "maroon", "burgundy", "tan", "cream",
  "ivory", "charcoal", "navy", "teal", "bronze", "copper", "pink",
];

const WMI_MAKES = {
  "1G1": "Chevrolet", "1GC": "Chevrolet", "1GB": "Chevrolet", "2G1": "Chevrolet", "3G1": "Chevrolet",
  "1G6": "Cadillac", "1GY": "Cadillac", "1GN": "Chevrolet",
  "1GT": "GMC", "1GK": "GMC", "2GT": "GMC",
  "1FA": "Ford", "1FB": "Ford", "1FM": "Ford", "1FT": "Ford", "1FD": "Ford", "2FA": "Ford", "3FA": "Ford",
  "1C3": "Chrysler", "1C4": "Chrysler", "1C6": "Ram", "2C3": "Chrysler", "3C4": "Chrysler",
  "1J4": "Jeep", "1J8": "Jeep",
  "1N4": "Nissan", "1N6": "Nissan", "JN1": "Nissan", "JN8": "Nissan", "5N1": "Nissan",
  "4T1": "Toyota", "4T3": "Toyota", "5TD": "Toyota", "JTD": "Toyota", "JTE": "Toyota", "JTN": "Toyota", "2T1": "Toyota",
  "JHM": "Honda", "1HG": "Honda", "2HG": "Honda", "5FN": "Honda", "19X": "Honda",
  "WBA": "BMW", "WBS": "BMW", "WBY": "BMW", "5UX": "BMW",
  "WAU": "Audi", "WA1": "Audi", "TRU": "Audi",
  "WDB": "Mercedes-Benz", "WDD": "Mercedes-Benz", "WDC": "Mercedes-Benz", "4JG": "Mercedes-Benz",
  "KM8": "Hyundai", "KMH": "Hyundai", "5NM": "Hyundai", "KNA": "Kia", "KND": "Kia",
  "JF1": "Subaru", "JF2": "Subaru", "4S3": "Subaru", "4S4": "Subaru",
  "JM1": "Mazda", "JM3": "Mazda", "3MZ": "Mazda",
  "3VW": "Volkswagen", "WVW": "Volkswagen", "WV1": "Volkswagen", "1VW": "Volkswagen",
  "SAL": "Land Rover", "SAJ": "Jaguar", "YV1": "Volvo", "YV4": "Volvo",
  "5YJ": "Tesla", "7SA": "Tesla",
};

const YEAR_CODES = {
  A: 2010, B: 2011, C: 2012, D: 2013, E: 2014, F: 2015, G: 2016, H: 2017,
  J: 2018, K: 2019, L: 2020, M: 2021, N: 2022, P: 2023, R: 2024, S: 2025,
  T: 2026, V: 2027, W: 2028, X: 2029, Y: 2030,
  1: 2001, 2: 2002, 3: 2003, 4: 2004, 5: 2005, 6: 2006, 7: 2007, 8: 2008, 9: 2009,
};

export const AUTOSCAN_PROFILES = {
  vehicle: {
    title: "invoice, bill of sale, or vehicle document",
    fields: [
      "vin", "year", "make", "model", "color", "mileage", "purchase_price", "selling_price",
      "fuel_type", "transmission", "condition", "status", "location", "notes",
      "invoice_number", "stock_number", "transaction_date", "vendor_name",
      "vendor_phone", "vendor_email", "engine_capacity", "features", "weight",
    ],
  },
  expense: {
    title: "receipt, invoice, or expense document",
    fields: [
      "vendor_name", "category", "description", "amount", "tax_amount",
      "expense_date", "payment_method", "reference_number", "notes",
    ],
  },
  bill: {
    title: "vendor bill or supplier invoice",
    fields: [
      "bill_number", "vendor_name", "bill_date", "due_date", "tax_amount",
      "notes", "payment_terms", "amount_paid", "line_items",
    ],
  },
  purchase: {
    title: "purchase order, packing slip, or supplier invoice",
    fields: [
      "purchase_number", "supplier_name", "supplier_email", "supplier_phone",
      "supplier_address", "order_date", "expected_delivery", "tracking_number",
      "notes", "tax_rate", "shipping_cost", "items",
    ],
  },
  invoice: {
    title: "customer invoice or bill of sale",
    fields: [
      "invoice_number", "customer_name", "customer_email", "customer_phone",
      "customer_address", "invoice_date", "due_date", "notes", "tax_rate",
      "line_items", "amount_paid", "terms", "currency",
    ],
  },
  repair: {
    title: "repair order, work order, or inspection sheet",
    fields: [
      "customer_name", "customer_phone", "vehicle_make", "vehicle_model",
      "vehicle_year", "vehicle_vin", "vehicle_plate", "mileage", "description",
      "diagnosis", "notes", "service_type",
    ],
  },
  part: {
    title: "parts invoice or packing slip",
    fields: [
      "part_number", "name", "description", "category", "quantity", "cost_price",
      "selling_price", "supplier", "vendor_name", "location", "invoice_number",
      "purchase_date",
    ],
  },
  customer: {
    title: "ID, registration, or customer document",
    fields: [
      "full_name", "email", "phone", "address", "city", "province",
      "postal_code", "country", "tax_id", "customer_type",
    ],
  },
  sale: {
    title: "bill of sale, invoice, or purchase agreement",
    fields: [
      "customer_name", "customer_phone", "customer_email", "customer_address",
      "customer_city", "customer_postal_code", "customer_country", "vehicle_vin",
      "vehicle_year", "vehicle_make_model", "vehicle_mileage", "vehicle_color",
      "vehicle_details", "sale_price", "sale_date", "notes", "province",
    ],
  },
};

const FIELD_LABELS = {
  vin: "VIN", year: "Year", make: "Make", model: "Model", color: "Color",
  mileage: "Mileage", purchase_price: "Purchase price", selling_price: "Selling price",
  fuel_type: "Fuel type", transmission: "Transmission", condition: "Condition",
  status: "Status", location: "Location", notes: "Notes", invoice_number: "Invoice #",
  stock_number: "Stock #", transaction_date: "Transaction date", vendor_name: "Vendor",
  vendor_phone: "Vendor phone", vendor_email: "Vendor email", engine_capacity: "Engine",
  features: "Features", weight: "Weight", category: "Category", description: "Description",
  amount: "Amount", tax_amount: "Tax", expense_date: "Expense date",
  payment_method: "Payment method", reference_number: "Reference #",
  bill_number: "Bill #", bill_date: "Bill date", due_date: "Due date",
  payment_terms: "Payment terms", amount_paid: "Amount paid", line_items: "Line items",
  purchase_number: "PO #", supplier_name: "Supplier", supplier_email: "Supplier email",
  supplier_phone: "Supplier phone", supplier_address: "Supplier address",
  order_date: "Order date", expected_delivery: "Expected delivery",
  tracking_number: "Tracking #", tax_rate: "Tax rate", shipping_cost: "Shipping",
  items: "Items", customer_name: "Customer", customer_email: "Customer email",
  customer_phone: "Customer phone", customer_address: "Customer address",
  invoice_date: "Invoice date", terms: "Terms", currency: "Currency",
  vehicle_make: "Make", vehicle_model: "Model", vehicle_year: "Year",
  vehicle_vin: "VIN", vehicle_plate: "Plate", diagnosis: "Diagnosis",
  service_type: "Service type", part_number: "Part #", name: "Name",
  quantity: "Qty", cost_price: "Cost", supplier: "Supplier", purchase_date: "Purchase date",
  full_name: "Name", email: "Email", phone: "Phone", address: "Address",
  city: "City", province: "Province", postal_code: "Postal code", country: "Country",
  tax_id: "Tax ID", customer_type: "Customer type", customer_city: "City",
  customer_postal_code: "Postal code", customer_country: "Country",
  vehicle_make_model: "Vehicle", vehicle_mileage: "Mileage", vehicle_color: "Color",
  vehicle_details: "Vehicle details", sale_price: "Sale price", sale_date: "Sale date",
};

export function fieldLabel(key) {
  return FIELD_LABELS[key] || key.replace(/_/g, " ");
}

function normalizeWhitespace(text) {
  return (text || "").replace(/\u0000/g, " ").replace(/[ \t]+/g, " ").trim();
}

function labeledValue(text, labels) {
  for (const label of labels) {
    const pattern = new RegExp(
      `(?:^|\\n)\\s*${label}\\s*[:#\\-]\\s*([^\\n]{1,80})`,
      "i"
    );
    const match = text.match(pattern);
    if (match) {
      const value = normalizeWhitespace(match[1]).replace(/\s{2,}.*/, "").trim();
      if (value && !/^[:#-]+$/.test(value)) return value;
    }
  }
  return "";
}

function parseMoney(value) {
  if (value == null || value === "") return undefined;
  const match = String(value).replace(/CAD|USD|CA\$/gi, "").match(MONEY_RE) || String(value).match(/([0-9]+(?:\.[0-9]{1,2})?)/);
  if (!match) return undefined;
  const amount = parseFloat(match[1].replace(/,/g, ""));
  return Number.isFinite(amount) ? amount : undefined;
}

function parseInteger(value) {
  if (value == null || value === "") return undefined;
  const amount = parseInt(String(value).replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(amount) ? amount : undefined;
}

function toIsoDate(value) {
  if (!value) return "";
  const raw = String(value).trim();
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const dmy = raw.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
  if (dmy) {
    let year = parseInt(dmy[3], 10);
    if (year < 100) year += year > 50 ? 1900 : 2000;
    const first = parseInt(dmy[1], 10);
    const second = parseInt(dmy[2], 10);
    const month = first > 12 ? second : first;
    const day = first > 12 ? first : second;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  return "";
}

function findVin(text) {
  const labeled = labeledValue(text, ["VIN", "Vehicle Identification Number", "Serial Number"]);
  const fromLabel = labeled.match(VIN_RE);
  if (fromLabel) return fromLabel[1].toUpperCase();
  const match = text.match(VIN_RE);
  return match ? match[1].toUpperCase() : "";
}

export function decodeVin(vin) {
  if (!vin || vin.length !== 17) return {};
  const wmi = vin.slice(0, 3).toUpperCase();
  const yearCode = vin.charAt(9).toUpperCase();
  return {
    make: WMI_MAKES[wmi] || "",
    year: YEAR_CODES[yearCode] || undefined,
  };
}

function findMake(text) {
  const labeled = labeledValue(text, ["Make", "Manufacturer", "Marque"]);
  if (labeled) {
    const found = VEHICLE_MAKES.find((make) => labeled.toLowerCase().includes(make.toLowerCase()));
    if (found) return found;
    if (labeled.length <= 24) return labeled.toUpperCase();
  }
  const upper = text.toUpperCase();
  const found = VEHICLE_MAKES.find((make) => new RegExp(`\\b${make}\\b`, "i").test(upper));
  return found || "";
}

function findModel(text, make) {
  const labeled = labeledValue(text, ["Model", "Modèle", "Series"]);
  if (labeled) {
    return labeled.replace(new RegExp(`^${make}\\s+`, "i"), "").split(/VIN|YEAR|COLOR|MILE/i)[0].trim();
  }
  if (!make) return "";
  const match = text.match(new RegExp(`${make}\\s+([A-Z0-9][A-Z0-9 \\-]+)`, "i"));
  if (!match) return "";
  return match[1].split(/\s{2,}|VIN|YEAR|COLOR/)[0].trim();
}

function findColor(text) {
  const labeled = labeledValue(text, ["Color", "Colour", "Ext\\. Color", "Exterior Color"]);
  if (labeled) {
    const found = COLORS.find((color) => labeled.toLowerCase().includes(color));
    if (found) return found.replace(/\b\w/g, (c) => c.toUpperCase());
    return labeled.split(/[^a-z ]/i)[0].trim();
  }
  const lower = text.toLowerCase();
  const found = COLORS.find((color) => new RegExp(`\\b${color}\\b`, "i").test(lower));
  return found ? found.replace(/\b\w/g, (c) => c.toUpperCase()) : "";
}

function findMileage(text) {
  const labeled = labeledValue(text, ["Mileage", "Odometer", "KM", "Kilometers", "Miles"]);
  if (labeled) {
    const value = parseInteger(labeled);
    if (value != null) return value;
  }
  const match = text.match(/(\d{1,3}(?:,\d{3})+|\d+)\s*(km|kms|kilometers|kilometres|miles|mi)\b/i);
  return match ? parseInteger(match[1]) : undefined;
}

function findMoneyNear(text, labels) {
  for (const label of labels) {
    const pattern = new RegExp(`${label}[^\\n$0-9]{0,20}${MONEY_RE.source}`, "i");
    const match = text.match(pattern);
    if (match) return parseMoney(match[0]);
  }
  return undefined;
}

function mapFuel(text) {
  const labeled = labeledValue(text, ["Fuel", "Fuel Type", "Fuel type"]);
  const source = `${labeled} ${text}`.toLowerCase();
  if (/\belectric\b|\bev\b/.test(source)) return "electric";
  if (/\bhybrid\b/.test(source)) return "hybrid";
  if (/\bdiesel\b/.test(source)) return "diesel";
  if (/\blpg\b|\bpropane\b/.test(source)) return "lpg";
  if (/\bpetrol\b|\bgasoline\b|\bgas\b/.test(source)) return "petrol";
  return "";
}

function mapTransmission(text) {
  const labeled = labeledValue(text, ["Transmission", "Trans"]);
  const source = `${labeled} ${text}`.toLowerCase();
  if (/\bmanual\b|\bstd\b|\b5.?speed\b|\b6.?speed\b/.test(source) && !/automatic/.test(source)) return "manual";
  if (/\bsemi[-\s]?automatic\b|\bamt\b/.test(source)) return "semi_automatic";
  if (/\bautomatic\b|\bauto\b|\bcvt\b/.test(source)) return "automatic";
  return "";
}

function mapCondition(text) {
  const source = text.toLowerCase();
  if (/certified pre[-\s]?owned|\bcpo\b/.test(source)) return "certified_pre_owned";
  if (/\bnew\b/.test(source) && !/\bused\b/.test(source)) return "new";
  if (/\bused\b|\bpre[-\s]?owned\b/.test(source)) return "used";
  return "";
}

function mapExpenseCategory(text) {
  const source = text.toLowerCase();
  if (/\bfuel\b|\bgas\b|\bpetrol\b/.test(source)) return "fuel";
  if (/\binsurance\b/.test(source)) return "insurance";
  if (/\brent\b|\blease\b/.test(source)) return "rent";
  if (/\butility\b|\belectric\b|\bhydro\b|\bgas bill\b/.test(source)) return "utilities";
  if (/\badvertis|\bmarketing\b/.test(source)) return "advertising";
  if (/\bmeal\b|\brestaurant\b|\bdining\b/.test(source)) return "meals";
  if (/\btravel\b|\bhotel\b|\bairfare\b/.test(source)) return "travel";
  if (/\bmaintenance\b|\brepair\b/.test(source)) return "maintenance";
  if (/\boffice\b|\bstaples\b|\bpaper\b/.test(source)) return "office_supplies";
  return "";
}

function mapPaymentMethod(text) {
  const source = text.toLowerCase();
  if (/credit card|\bvisa\b|\bmastercard\b|\bamex\b/.test(source)) return "credit_card";
  if (/debit/.test(source)) return "debit_card";
  if (/\bcheque\b|\bcheck\b/.test(source)) return "check";
  if (/e[-\s]?transfer|bank transfer|wire|ach/.test(source)) return "bank_transfer";
  if (/\bcash\b/.test(source)) return "cash";
  return "";
}

function findEmail(text) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : "";
}

function findPhone(text) {
  const match = text.match(/(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}/);
  return match ? match[0] : "";
}

function detectDocumentType(text) {
  const source = text.toLowerCase();
  if (/bill of sale|\bbos\b/.test(source)) return "Bill of Sale";
  if (/registration|ownership|permit/.test(source)) return "Registration";
  if (/\breceipt\b/.test(source)) return "Receipt";
  if (/\bpurchase order\b|\bpacking slip\b/.test(source)) return "Purchase Order";
  if (/\bwork order\b|\brepair order\b/.test(source)) return "Repair Order";
  if (/\binvoice\b/.test(source)) return "Invoice";
  if (/\bbill\b/.test(source)) return "Bill";
  return "Document";
}

function parseLineItems(text) {
  const items = [];
  const lines = text.split(/\n+/);
  for (const line of lines) {
    const match = line.match(/(.{8,60}?)\s+(\d+(?:\.\d+)?)\s+(?:x\s*)?\$?\s*([0-9,]+\.\d{2})\s+\$?\s*([0-9,]+\.\d{2})/i);
    if (match) {
      items.push({
        description: normalizeWhitespace(match[1]),
        quantity: parseFloat(match[2]),
        unit_price: parseFloat(match[3].replace(/,/g, "")),
        total: parseFloat(match[4].replace(/,/g, "")),
      });
    }
  }
  return items.slice(0, 12);
}

function compact(fields) {
  const result = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    result[key] = value;
  }
  return result;
}

function parseVehicleFields(text) {
  const vin = findVin(text);
  const decoded = decodeVin(vin);
  const make = findMake(text) || decoded.make || "";
  const year = parseInteger(labeledValue(text, ["Year", "Model Year"])) || decoded.year;
  const purchase = findMoneyNear(text, ["Purchase Price", "Purchase Amount", "Cost", "Amount Paid", "Total Price", "Invoice Total", "Total"]);
  const selling = findMoneyNear(text, ["Selling Price", "List Price", "Asking Price", "Sale Price", "Retail"]);
  return compact({
    vin,
    year: year && year >= 1980 && year <= new Date().getFullYear() + 1 ? year : decoded.year,
    make,
    model: findModel(text, make),
    color: findColor(text),
    mileage: findMileage(text),
    purchase_price: purchase,
    selling_price: selling,
    fuel_type: mapFuel(text),
    transmission: mapTransmission(text),
    condition: mapCondition(text),
    invoice_number: labeledValue(text, ["Invoice Number", "Invoice No\\.", "Invoice No", "Invoice #", "Inv #"]),
    stock_number: labeledValue(text, ["Stock Number", "Stock #", "Stock No", "Stock"]),
    transaction_date: toIsoDate(labeledValue(text, ["Date", "Invoice Date", "Purchase Date", "Transaction Date", "Sale Date"])),
    vendor_name: labeledValue(text, ["Vendor", "Seller", "Sold By", "Dealer", "Supplier", "From"]),
    vendor_phone: findPhone(text),
    vendor_email: findEmail(text),
    location: labeledValue(text, ["Location", "Lot", "Yard"]),
    engine_capacity: labeledValue(text, ["Engine", "Displacement", "Engine Size"]),
    notes: "",
  });
}

function parseExpenseFields(text) {
  const total = findMoneyNear(text, ["Total", "Amount Due", "Grand Total", "Amount"])
    ?? parseMoney(labeledValue(text, ["Total", "Amount"]));
  const tax = findMoneyNear(text, ["HST", "GST", "PST", "Tax", "VAT"]);
  const amount = tax != null && total != null ? Math.max(0, +(total - tax).toFixed(2)) : total;
  const vendor = labeledValue(text, ["Vendor", "Merchant", "Store", "From", "Sold By", "Supplier"])
    || text.split("\n").map((line) => line.trim()).find((line) => line.length > 2 && line.length < 40 && !/\d{5,}/.test(line));
  return compact({
    vendor_name: vendor,
    category: mapExpenseCategory(text) || "other",
    description: labeledValue(text, ["Description", "Memo", "Details"]) || detectDocumentType(text),
    amount,
    tax_amount: tax,
    expense_date: toIsoDate(labeledValue(text, ["Date", "Invoice Date", "Receipt Date", "Transaction Date"])),
    payment_method: mapPaymentMethod(text),
    reference_number: labeledValue(text, ["Invoice Number", "Invoice #", "Receipt #", "Reference", "Ref #", "Confirmation"]),
    notes: "",
  });
}

function parseBillFields(text) {
  const items = parseLineItems(text);
  return compact({
    bill_number: labeledValue(text, ["Bill Number", "Invoice Number", "Invoice #", "Bill #"]),
    vendor_name: labeledValue(text, ["Vendor", "From", "Supplier", "Billed From"]),
    bill_date: toIsoDate(labeledValue(text, ["Bill Date", "Invoice Date", "Date"])),
    due_date: toIsoDate(labeledValue(text, ["Due Date", "Payment Due"])),
    tax_amount: findMoneyNear(text, ["HST", "GST", "Tax"]),
    amount_paid: findMoneyNear(text, ["Amount Paid", "Paid"]),
    payment_terms: labeledValue(text, ["Terms", "Payment Terms"]),
    notes: labeledValue(text, ["Notes", "Memo"]),
    line_items: items,
  });
}

function parsePurchaseFields(text) {
  const items = parseLineItems(text).map((item) => ({
    item_name: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total: item.total,
  }));
  return compact({
    purchase_number: labeledValue(text, ["PO Number", "Purchase Order", "PO #", "Order Number"]),
    supplier_name: labeledValue(text, ["Supplier", "Vendor", "From", "Sold By"]),
    supplier_email: findEmail(text),
    supplier_phone: findPhone(text),
    supplier_address: labeledValue(text, ["Address", "Ship From"]),
    order_date: toIsoDate(labeledValue(text, ["Order Date", "Date", "Invoice Date"])),
    expected_delivery: toIsoDate(labeledValue(text, ["ETA", "Expected Delivery", "Delivery Date"])),
    tracking_number: labeledValue(text, ["Tracking", "Tracking Number", "Waybill"]),
    tax_rate: parseInteger(labeledValue(text, ["Tax Rate", "HST", "GST"])) || undefined,
    shipping_cost: findMoneyNear(text, ["Shipping", "Freight", "Delivery"]),
    notes: labeledValue(text, ["Notes", "Memo"]),
    items,
  });
}

function parseInvoiceFields(text) {
  return compact({
    invoice_number: labeledValue(text, ["Invoice Number", "Invoice #", "Invoice No"]),
    customer_name: labeledValue(text, ["Bill To", "Customer", "Sold To", "Client"]),
    customer_email: findEmail(text),
    customer_phone: findPhone(text),
    customer_address: labeledValue(text, ["Address", "Billing Address"]),
    invoice_date: toIsoDate(labeledValue(text, ["Invoice Date", "Date"])),
    due_date: toIsoDate(labeledValue(text, ["Due Date"])),
    tax_rate: parseInteger(labeledValue(text, ["Tax Rate"])) || undefined,
    amount_paid: findMoneyNear(text, ["Amount Paid", "Paid"]),
    currency: /USD/.test(text) ? "USD" : /NGN|₦/.test(text) ? "NGN" : "CAD",
    terms: labeledValue(text, ["Terms", "Payment Terms"]),
    notes: labeledValue(text, ["Notes", "Memo"]),
    line_items: parseLineItems(text),
  });
}

function parseRepairFields(text) {
  const vehicle = parseVehicleFields(text);
  return compact({
    customer_name: labeledValue(text, ["Customer", "Owner", "Name", "Bill To"]),
    customer_phone: findPhone(text),
    vehicle_make: vehicle.make,
    vehicle_model: vehicle.model,
    vehicle_year: vehicle.year,
    vehicle_vin: vehicle.vin,
    vehicle_plate: labeledValue(text, ["Plate", "License", "Licence Plate", "Tag"]),
    mileage: vehicle.mileage,
    description: labeledValue(text, ["Service", "Work Requested", "Complaint", "Description"]),
    diagnosis: labeledValue(text, ["Diagnosis", "Findings"]),
    service_type: /oil/.test(text.toLowerCase()) ? "routine_maintenance" : undefined,
    notes: labeledValue(text, ["Notes", "Comments"]),
  });
}

function parsePartFields(text) {
  return compact({
    part_number: labeledValue(text, ["Part Number", "Part #", "SKU", "Item #", "P/N"]),
    name: labeledValue(text, ["Description", "Item", "Part Name", "Product"]),
    description: labeledValue(text, ["Details", "Notes"]),
    quantity: parseInteger(labeledValue(text, ["Qty", "Quantity"])) || undefined,
    cost_price: findMoneyNear(text, ["Cost", "Unit Price", "Price", "Amount"]),
    selling_price: findMoneyNear(text, ["Retail", "Selling Price", "List"]),
    supplier: labeledValue(text, ["Supplier", "Vendor", "From"]),
    vendor_name: labeledValue(text, ["Vendor", "Supplier", "From"]),
    location: labeledValue(text, ["Bin", "Location", "Shelf"]),
    invoice_number: labeledValue(text, ["Invoice Number", "Invoice #", "PO #"]),
    purchase_date: toIsoDate(labeledValue(text, ["Date", "Invoice Date", "Purchase Date"])),
  });
}

function parseCustomerFields(text) {
  const name = labeledValue(text, ["Name", "Full Name", "Customer", "Sold To", "Bill To"]);
  return compact({
    full_name: name,
    email: findEmail(text),
    phone: findPhone(text),
    address: labeledValue(text, ["Address", "Street", "Street Address"]),
    city: labeledValue(text, ["City"]),
    province: labeledValue(text, ["Province", "State"]),
    postal_code: labeledValue(text, ["Postal Code", "Zip", "ZIP"]),
    country: labeledValue(text, ["Country"]) || (/canada/i.test(text) ? "Canada" : ""),
    tax_id: labeledValue(text, ["Tax ID", "GST", "HST Number", "BN"]),
  });
}

function parseSaleFields(text) {
  const vehicle = parseVehicleFields(text);
  const makeModel = [vehicle.make, vehicle.model].filter(Boolean).join(" ");
  return compact({
    customer_name: labeledValue(text, ["Buyer", "Purchaser", "Customer", "Sold To", "Bill To"]),
    customer_phone: findPhone(text),
    customer_email: findEmail(text),
    customer_address: labeledValue(text, ["Address", "Buyer Address"]),
    customer_city: labeledValue(text, ["City"]),
    customer_postal_code: labeledValue(text, ["Postal Code", "Zip"]),
    customer_country: labeledValue(text, ["Country"]) || (/canada/i.test(text) ? "Canada" : ""),
    vehicle_vin: vehicle.vin,
    vehicle_year: vehicle.year,
    vehicle_make_model: makeModel,
    vehicle_mileage: vehicle.mileage,
    vehicle_color: vehicle.color,
    vehicle_details: makeModel ? `${vehicle.year || ""} ${makeModel}`.trim() : "",
    sale_price: findMoneyNear(text, ["Sale Price", "Selling Price", "Purchase Price", "Total", "Amount"]),
    sale_date: toIsoDate(labeledValue(text, ["Sale Date", "Date", "Invoice Date"])),
    province: labeledValue(text, ["Province", "State"]),
    notes: labeledValue(text, ["Notes", "Conditions"]),
  });
}

const PARSERS = {
  vehicle: parseVehicleFields,
  expense: parseExpenseFields,
  bill: parseBillFields,
  purchase: parsePurchaseFields,
  invoice: parseInvoiceFields,
  repair: parseRepairFields,
  part: parsePartFields,
  customer: parseCustomerFields,
  sale: parseSaleFields,
};

export function parseDocumentFields(text, profile) {
  const parser = PARSERS[profile] || parseVehicleFields;
  return parser(text);
}

export function summarizeExtraction(text, fields, profile) {
  const type = detectDocumentType(text);
  const filled = Object.keys(fields);
  const highlights = filled.slice(0, 6).map((key) => {
    const value = Array.isArray(fields[key]) ? `${fields[key].length} items` : fields[key];
    return `${fieldLabel(key)}: ${value}`;
  });
  const oneLinerParts = [];
  if (fields.year && (fields.make || fields.vehicle_make)) {
    oneLinerParts.push(`${fields.year} ${fields.make || fields.vehicle_make} ${fields.model || fields.vehicle_model || ""}`.trim());
  } else if (fields.vehicle_make_model) {
    oneLinerParts.push(`${fields.vehicle_year || ""} ${fields.vehicle_make_model}`.trim());
  } else if (fields.vendor_name || fields.supplier_name) {
    oneLinerParts.push(fields.vendor_name || fields.supplier_name);
  } else if (fields.customer_name || fields.full_name) {
    oneLinerParts.push(fields.customer_name || fields.full_name);
  }
  const amount = fields.purchase_price ?? fields.sale_price ?? fields.amount ?? fields.cost_price;
  if (amount != null) oneLinerParts.push(`$${Number(amount).toLocaleString("en-CA", { minimumFractionDigits: 2 })}`);
  return {
    document_type: type,
    one_liner: oneLinerParts.filter(Boolean).join(" · ") || `${type} ready to apply to the ${profile} form`,
    highlights,
    field_count: filled.length,
  };
}

export function mergeDocumentFields(current, extracted) {
  const next = { ...current };
  Object.entries(extracted || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      if (value.length) next[key] = value;
      return;
    }
    next[key] = value;
  });
  return next;
}

function llmSchema(profile) {
  const properties = {};
  (AUTOSCAN_PROFILES[profile]?.fields || []).forEach((field) => {
    if (field === "line_items" || field === "items") {
      properties[field] = {
        type: "array",
        items: {
          type: "object",
          properties: {
            description: { type: "string" },
            item_name: { type: "string" },
            quantity: { type: "number" },
            unit_price: { type: "number" },
            total: { type: "number" },
          },
        },
      };
    } else if (/price|amount|mileage|year|quantity|weight|rate|cost/.test(field)) {
      properties[field] = { type: "number" };
    } else {
      properties[field] = { type: "string" };
    }
  });
  return {
    type: "object",
    properties: {
      document_type: { type: "string" },
      summary: { type: "string" },
      highlights: { type: "array", items: { type: "string" } },
      fields: { type: "object", properties },
    },
  };
}

async function analyzeWithLlm(file, profile) {
  const uploaded = await supabase.integrations.Core.UploadFile({ file });
  const fileUrl = uploaded?.file_url || uploaded?.url;
  if (!fileUrl) throw new Error("Upload did not return a file URL");
  const spec = AUTOSCAN_PROFILES[profile] || AUTOSCAN_PROFILES.vehicle;
  const result = await supabase.integrations.Core.InvokeLLM({
    prompt: `You are extracting data to fill an automotive operations form (${profile}).
Analyze this ${spec.title}. Return only values clearly present on the document.
Normalize dates to YYYY-MM-DD. Normalize fuel_type to petrol|diesel|electric|hybrid|lpg.
Normalize transmission to manual|automatic|semi_automatic. Normalize condition to new|used|certified_pre_owned.
Use VIN to infer year/make when the document does not list them. Currency amounts should be numbers without symbols.`,
    file_urls: [fileUrl],
    response_json_schema: llmSchema(profile),
  });
  if (!result) throw new Error("Empty LLM response");
  return {
    fields: compact(result.fields || {}),
    summary: {
      document_type: result.document_type || "Document",
      one_liner: result.summary || "",
      highlights: result.highlights || [],
      field_count: Object.keys(result.fields || {}).length,
    },
    source: "ai",
  };
}

export async function analyzeDocument({ file, pastedText, profile = "vehicle", onProgress } = {}) {
  let llmError = null;
  if (file) {
    try {
      onProgress?.(8);
      const llm = await analyzeWithLlm(file, profile);
      if (llm.fields && Object.keys(llm.fields).length) return { ...llm, text: "" };
    } catch (error) {
      llmError = error;
    }
  }

  onProgress?.(20);
  const text = (pastedText || "").trim() || (file ? await extractDocumentText(file, { onProgress }) : "");
  if (!text) {
    const reason = llmError?.message ? `AI scan unavailable (${llmError.message}).` : "No readable text found.";
    throw new Error(`${reason} Upload a clearer photo/PDF or paste the document text.`);
  }

  const fields = parseDocumentFields(text, profile);
  const summary = summarizeExtraction(text, fields, profile);
  return { fields, summary, text, source: "local", llmError: llmError?.message };
}
