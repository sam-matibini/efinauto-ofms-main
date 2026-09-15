const VIN_RE = /\b([A-HJ-NPR-Z0-9]{17})\b/i;
const MONEY = /\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+\.[0-9]{2})/;
const POSTAL_RE = /\b([A-Z]\d[A-Z]\s?\d[A-Z]\d)\b/i;

function money(value) {
  if (value == null) return undefined;
  const amount = parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(amount) ? amount : undefined;
}

function compact(fields) {
  const result = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === "") continue;
    result[key] = value;
  }
  return result;
}

function toIsoDate(value) {
  if (!value) return "";
  const raw = String(value).trim();
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const us = raw.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
  if (us) {
    let year = parseInt(us[3], 10);
    if (year < 100) year += year > 50 ? 1900 : 2000;
    const month = parseInt(us[1], 10);
    const day = parseInt(us[2], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  return "";
}

function capture(text, pattern) {
  const match = text.match(pattern);
  return match ? String(match[1]).trim() : "";
}

function firstPhone(text) {
  const match = String(text || "").match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  return match ? match[0] : "";
}

function firstEmail(text) {
  const match = String(text || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : "";
}

export function isMpiOrSalvageBillOfSale(text) {
  const source = String(text || "");
  return /manitoba public insurance|soci[eé]t[eé] d['’]assurance publique|mpisalvage@mpi|regular auction|storage yard|mpi doc\s*#|mb-salvageable/i.test(source);
}

export function parseMpiSalvageBillOfSale(text) {
  const source = String(text || "");
  if (!isMpiOrSalvageBillOfSale(source)) return {};

  const header = source.split(/Sold To/i)[0] || source;
  const afterSoldTo = source.split(/Sold To/i)[1] || "";

  const totals = source.match(
    /\bTotal:\s*\$?\s*([0-9,]+\.\d{2})\s+\$?\s*([0-9,]+\.\d{2})\s+\$?\s*([0-9,]+\.\d{2})\s+\$?\s*([0-9,]+\.\d{2})/i
  );
  const saleAmount = money(capture(source, /Sale Amount\s+\$?\s*([0-9,]+\.\d{2})/i));
  const buyFee = money(capture(source, /Buy Fee\s+\$?\s*([0-9,]+\.\d{2})/i));
  const auctionNowFee = money(capture(source, /AuctionNow Fee\s+\$?\s*([0-9,]+\.\d{2})/i));
  const pretaxFromFees = [saleAmount, buyFee, auctionNowFee].every((n) => n != null)
    ? Math.round((saleAmount + buyFee + auctionNowFee) * 100) / 100
    : undefined;

  const taxGst = totals
    ? money(totals[2])
    : money(capture(source, /\b(?:HST\/GST|GST)\s+\$?\s*([0-9,]+\.\d{2})/i));
  const taxPst = totals
    ? money(totals[3])
    : money(capture(source, /\b(?:PST\/QST|PST)\s+\$?\s*([0-9,]+\.\d{2})/i));

  const postalMatch = header.match(POSTAL_RE) || source.match(POSTAL_RE);
  const postal = postalMatch ? postalMatch[1].toUpperCase().replace(/\s+/, " ") : "";
  const cityProvince = header.match(/([A-Za-z][A-Za-z .]+),\s*(MB|Manitoba)\b/i);
  const street = capture(
    header,
    /(\d+\s+[A-Za-z0-9][A-Za-z0-9 .'-]+(?:Rd|Road|St|Street|Ave|Avenue|Blvd|Dr|Drive|Way|Cres|Crescent|Hwy|Highway)\.?)/i
  );

  const exemption = capture(source, /Tax Exemption Reason:\s*([^\n]+)/i);
  const salvageBrand = capture(source, /(?:Vehicle Ownership is branded|branded):\s*([^\n]+)/i);
  const mpiDoc = capture(source, /MPI DOC\s*#\s*([0-9]+)/i);
  const repairEstimate = capture(source, /Repair Estimate:\s*([0-9,]+\.?\d*)/i);
  const odometerAsOf = toIsoDate(capture(source, /As of\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i));
  const odometer = capture(source, /Odometer was\s+([0-9,]+)\s*(?:Km|KM|km)/i)
    || capture(source, /([0-9,]+)\s*Km/i);

  const notes = [
    salvageBrand ? `Branded title: ${salvageBrand.replace(/\s+/g, " ").trim()}.` : "",
    /total loss/i.test(source) ? "Vehicle declared a total loss by the insurer." : "",
    /warranty has been cancelled/i.test(source) ? "Manufacturer warranty cancelled." : "",
    /sold as is/i.test(source) ? "Sold as is. No refunds." : "",
    mpiDoc ? `MPI DOC # ${mpiDoc}.` : "",
    repairEstimate ? `Repair estimate: ${repairEstimate}.` : "",
    exemption ? `Tax exemption: ${exemption}.` : "",
  ].filter(Boolean).join(" ");

  const vinMatch = source.match(VIN_RE);

  return compact({
    vendor_name: "Manitoba Public Insurance",
    vendor_address: street,
    vendor_city: cityProvince ? cityProvince[1].trim() : "Winnipeg",
    vendor_province: "MB",
    vendor_country: "Canada",
    vendor_postal_code: postal,
    vendor_gst_number: capture(source, /\bGST\s*#\s*[:#]?\s*(R?\d[\dA-Z]{5,})/i),
    vendor_pst_number: capture(source, /\bPST\s*#\s*[:#]?\s*([\d][\d-]{2,})/i),
    vendor_phone: firstPhone(header) || firstPhone(source),
    vendor_email: firstEmail(header) || firstEmail(source),
    invoice_number: capture(source, /\bInvoice\s*#\s*[:#]?\s*([A-Z0-9-]{3,20})\b/i),
    transaction_date: toIsoDate(
      capture(header, /\bDate\s+([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})/i)
        || capture(source, /\bDate\s+([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})/i)
        || capture(source, /\bSale Date\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i)
    ),
    auction_number: capture(source, /(?:Regular\s+)?Auction\s*#\s*[:#]?\s*([A-Z0-9-]+)/i),
    bidder_number: capture(source, /\bBidder\s*#\s*[:#]?\s*([A-Z0-9-]+)/i),
    storage_yard: capture(source, /Storage Yard(?:\s+Location)?\s*:?\s*([A-Za-z][A-Za-z .]+)/i)
      .replace(/^(?:Location|Phone)\b/i, "")
      .trim()
      || capture(source, /Storage Yard[\s\S]{0,80}?Location:\s*([A-Za-z][A-Za-z .]+)/i),
    stock_number: capture(source, /\bStock\s*#\s*[:#]?\s*(\d{5,12})\b/i),
    mpi_doc_number: mpiDoc,
    tax_exemption_reason: exemption,
    odometer_as_of: odometerAsOf,
    mileage: odometer ? parseInt(odometer.replace(/,/g, ""), 10) : undefined,
    vin: vinMatch ? vinMatch[1].toUpperCase() : "",
    province: "MB",
    pst_exempt: Boolean(exemption) || taxPst === 0,
    purchase_price: totals ? money(totals[1]) : pretaxFromFees,
    tax_gst: taxGst,
    tax_pst: taxPst,
    tax_hst: 0,
    location: capture(source, /Storage Yard(?:\s+Location)?\s*:?\s*([A-Za-z][A-Za-z .]+)/i)
      || capture(source, /Storage Yard[\s\S]{0,80}?Location:\s*([A-Za-z][A-Za-z .]+)/i)
      || "Winnipeg",
    notes,
    buyer_name: capture(afterSoldTo, /^\s*([A-Za-z0-9][^\n]{3,80})/m),
  });
}
