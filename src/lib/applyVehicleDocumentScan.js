import { mergeDocumentFields } from "@/lib/documentAutoscan";
import { fillMissingVendorFields, findMatchingVendor } from "@/lib/vendorDirectory";
import { vehiclePurchaseTaxes } from "@/lib/vehiclePurchaseTaxes";
import { sanitizeVehicleForm } from "@/lib/vehicleRecord";

export function applyVehicleDocumentScan(prev, fields, { vendors = [], companyRates } = {}) {
  const merged = mergeDocumentFields(prev, fields);
  const match = findMatchingVendor(vendors, merged);
  const withVendor = match ? fillMissingVendorFields(merged, match) : merged;
  const hasScannedTax = fields?.tax_gst != null || fields?.tax_pst != null || fields?.tax_hst != null;
  const taxes = vehiclePurchaseTaxes({
    pretax: withVendor.purchase_price,
    tax_gst: withVendor.tax_gst,
    tax_pst: withVendor.tax_pst,
    tax_hst: withVendor.tax_hst,
    province: withVendor.province,
    tax_status: withVendor.tax_status,
    pst_exempt: withVendor.pst_exempt,
    companyRates,
    useRates: !hasScannedTax,
  });
  return sanitizeVehicleForm({
    ...withVendor,
    ...taxes,
    post_to_gl: prev?.post_to_gl,
    gl_posted: prev?.gl_posted,
    purchase_id: prev?.purchase_id,
  });
}
