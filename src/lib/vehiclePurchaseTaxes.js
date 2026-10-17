import { salesRate } from "./canadianTaxSchedule.js";

export function roundMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

export function vehiclePurchaseTaxes({
  pretax = 0,
  tax_gst,
  tax_pst,
  tax_hst,
  province,
  tax_status = "taxable",
  pst_exempt = false,
  asOf = new Date(),
} = {}) {
  const pretaxAmount = roundMoney(pretax);
  const useEnteredAmounts = tax_gst != null || tax_pst != null || tax_hst != null;

  let gst = roundMoney(tax_gst);
  let pst = roundMoney(tax_pst);
  let hst = roundMoney(tax_hst);

  if (!useEnteredAmounts) {
    const official = salesRate(province, asOf);
    if (tax_status !== "taxable" || !province || !pretaxAmount || !official) {
      gst = 0;
      pst = 0;
      hst = 0;
    } else {
      gst = roundMoney((pretaxAmount * (official.gst || 0)) / 100);
      pst = pst_exempt ? 0 : roundMoney((pretaxAmount * (official.pst || 0)) / 100);
      hst = roundMoney((pretaxAmount * (official.hst || 0)) / 100);
    }
  }

  const rst = roundMoney(gst + pst + hst);
  const total = roundMoney(pretaxAmount + rst);
  const recoverable = roundMoney(gst + hst);
  const inventoryCost = roundMoney(pretaxAmount + pst);

  return {
    purchase_price: pretaxAmount,
    tax_gst: gst,
    tax_pst: pst,
    tax_hst: hst,
    tax_rst: rst,
    tax_total: rst,
    total_cost: total,
    total_vehicle_expenditure: total,
    recoverable_tax: recoverable,
    inventory_cost: inventoryCost,
    net_tax_to_purchases: rst,
  };
}

export function vehicleTaxFieldsFromForm(form = {}) {
  return vehiclePurchaseTaxes({
    pretax: form.purchase_price,
    tax_gst: form.tax_gst,
    tax_pst: form.tax_pst,
    tax_hst: form.tax_hst,
    province: form.province,
    tax_status: form.tax_status,
    pst_exempt: form.pst_exempt,
  });
}
