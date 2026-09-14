const FALLBACK_RATES = {
  AB: { gst: 5, pst: 0, hst: 0 },
  BC: { gst: 5, pst: 7, hst: 0 },
  MB: { gst: 5, pst: 7, hst: 0 },
  NB: { gst: 0, pst: 0, hst: 15 },
  NL: { gst: 0, pst: 0, hst: 15 },
  NT: { gst: 5, pst: 0, hst: 0 },
  NS: { gst: 0, pst: 0, hst: 15 },
  NU: { gst: 5, pst: 0, hst: 0 },
  ON: { gst: 0, pst: 0, hst: 13 },
  PE: { gst: 0, pst: 0, hst: 15 },
  QC: { gst: 5, pst: 9.975, hst: 0 },
  SK: { gst: 5, pst: 6, hst: 0 },
  YT: { gst: 5, pst: 0, hst: 0 },
};

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
  companyRates,
  useRates = false,
} = {}) {
  const pretaxAmount = roundMoney(pretax);
  const useEnteredAmounts = !useRates && (tax_gst != null || tax_pst != null || tax_hst != null);

  let gst = roundMoney(tax_gst);
  let pst = roundMoney(tax_pst);
  let hst = roundMoney(tax_hst);

  if (!useEnteredAmounts) {
    const fromCompany = companyRates?.[province];
    if (tax_status !== "taxable" || !province || !pretaxAmount) {
      gst = 0;
      pst = 0;
      hst = 0;
    } else if (fromCompany) {
      gst = roundMoney((pretaxAmount * (fromCompany.gst || 0)) / 100);
      pst = pst_exempt ? 0 : roundMoney((pretaxAmount * (fromCompany.pst || 0)) / 100);
      hst = roundMoney((pretaxAmount * (fromCompany.hst || 0)) / 100);
    } else {
      const rates = FALLBACK_RATES[province] || { gst: 0, pst: 0, hst: 0 };
      gst = roundMoney((pretaxAmount * (rates.gst || 0)) / 100);
      pst = pst_exempt ? 0 : roundMoney((pretaxAmount * (rates.pst || 0)) / 100);
      hst = roundMoney((pretaxAmount * (rates.hst || 0)) / 100);
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
