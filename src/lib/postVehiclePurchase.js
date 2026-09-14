import { supabase } from "@/api/supabaseClient";
import { createGLTransaction, GL_ACCOUNTS } from "@/components/shared/GLIntegration";
import { vehiclePurchaseTaxes, roundMoney } from "@/lib/vehiclePurchaseTaxes";

function today() {
  return new Date().toISOString().split("T")[0];
}

function describeVehicle(form = {}, vehicle = {}) {
  const year = form.year || vehicle.year || "";
  const make = form.make || vehicle.make || "";
  const model = form.model || vehicle.model || "";
  return `${year} ${make} ${model}`.trim() || "Vehicle";
}

/**
 * Create a received vehicle purchase (net tax on the PO) and post inventory + GST/PST to the GL.
 * Inventory is valued at pretax + non-recoverable PST. GST/HST is posted to ITC (1150).
 */
export async function postVehiclePurchaseAccounting({
  companyId,
  vehicle,
  form,
}) {
  if (!companyId || !vehicle?.id) {
    throw new Error("Vehicle must be saved before posting to the general ledger");
  }
  if (vehicle.gl_posted || vehicle.purchase_id) {
    return { skipped: true, reason: "already_posted", vehicle };
  }

  const taxes = vehiclePurchaseTaxes({
    pretax: form.purchase_price ?? vehicle.purchase_price,
    tax_gst: form.tax_gst ?? vehicle.tax_gst,
    tax_pst: form.tax_pst ?? vehicle.tax_pst,
    tax_hst: form.tax_hst ?? vehicle.tax_hst,
    province: form.province ?? vehicle.province,
    tax_status: form.tax_status ?? vehicle.tax_status,
    pst_exempt: form.pst_exempt ?? vehicle.pst_exempt,
  });

  const pretax = taxes.purchase_price;
  const details = describeVehicle(form, vehicle);
  const vin = form.vin || vehicle.vin || "";
  const invoice = form.invoice_number || vehicle.invoice_number || "";
  const purchaseDate = form.transaction_date || vehicle.transaction_date || today();
  const purchaseNumber = `VEH-${(vin || vehicle.id).toString().slice(-8).toUpperCase()}-${Date.now().toString().slice(-4)}`;

  const purchase = await supabase.entities.Purchase.create({
    company_id: companyId,
    purchase_number: purchaseNumber,
    supplier_name: form.vendor_name || vehicle.vendor_name || "Vehicle vendor",
    supplier_email: form.vendor_email || vehicle.vendor_email || "",
    supplier_phone: form.vendor_phone || vehicle.vendor_phone || "",
    purchase_type: "vehicle",
    items: [
      {
        description: details,
        vin,
        quantity: 1,
        unit_price: pretax,
        total: pretax,
      },
    ],
    subtotal: pretax,
    tax_rate: pretax ? roundMoney((taxes.net_tax_to_purchases / pretax) * 100) : 0,
    tax_amount: taxes.net_tax_to_purchases,
    tax_gst: taxes.tax_gst,
    tax_pst: taxes.tax_pst,
    tax_hst: taxes.tax_hst,
    tax_rst: taxes.tax_rst,
    shipping_cost: 0,
    total_amount: taxes.total_vehicle_expenditure,
    payment_status: "pending",
    payment_method: "account",
    amount_paid: 0,
    status: "received",
    order_date: purchaseDate,
    received_date: purchaseDate,
    notes: [
      `Vehicle inventory ${vin || details}.`,
      `Pretax ${pretax.toFixed(2)}. RST (sales tax paid) ${taxes.tax_rst.toFixed(2)}.`,
      `GST ${taxes.tax_gst.toFixed(2)}, PST ${taxes.tax_pst.toFixed(2)}, HST ${taxes.tax_hst.toFixed(2)}.`,
      invoice ? `Invoice ${invoice}.` : "",
    ].filter(Boolean).join(" "),
    vehicle_id: vehicle.id,
    vehicle_vin: vin,
  });

  const glEntries = [];

  if (taxes.inventory_cost > 0) {
    glEntries.push(
      await createGLTransaction({
        companyId,
        transactionType: "vehicle_purchase",
        category: "asset",
        amount: taxes.inventory_cost,
        debitAccount: GL_ACCOUNTS.INVENTORY_VEHICLES,
        creditAccount: GL_ACCOUNTS.ACCOUNTS_PAYABLE,
        referenceType: "Purchase",
        referenceId: purchase.id,
        referenceNumber: purchaseNumber,
        customerName: form.vendor_name || vehicle.vendor_name || "",
        description: `Vehicle inventory ${details}${vin ? ` (${vin})` : ""} — pretax plus PST/RST`,
        transactionDate: purchaseDate,
        taxGst: 0,
        taxPst: taxes.tax_pst,
        taxHst: 0,
        province: form.province || vehicle.province || null,
      })
    );
  }

  if (taxes.recoverable_tax > 0) {
    glEntries.push(
      await createGLTransaction({
        companyId,
        transactionType: "tax_asset",
        category: "asset",
        amount: taxes.recoverable_tax,
        debitAccount: GL_ACCOUNTS.GST_RECEIVABLE,
        creditAccount: GL_ACCOUNTS.ACCOUNTS_PAYABLE,
        referenceType: "Purchase",
        referenceId: purchase.id,
        referenceNumber: purchaseNumber,
        customerName: form.vendor_name || vehicle.vendor_name || "",
        description: `GST/HST paid (ITC) on ${details}`,
        transactionDate: purchaseDate,
        taxGst: taxes.tax_gst,
        taxPst: 0,
        taxHst: taxes.tax_hst,
        province: form.province || vehicle.province || null,
      })
    );
  }

  const posted = await supabase.entities.Vehicle.update(vehicle.id, {
    purchase_price: pretax,
    tax_gst: taxes.tax_gst,
    tax_pst: taxes.tax_pst,
    tax_hst: taxes.tax_hst,
    tax_rst: taxes.tax_rst,
    tax_total: taxes.tax_total,
    total_cost: taxes.total_vehicle_expenditure,
    total_vehicle_expenditure: taxes.total_vehicle_expenditure,
    purchase_id: purchase.id,
    gl_posted: true,
    status: vehicle.status || form.status || "in_stock",
  });

  return { purchase, glEntries, vehicle: posted, taxes };
}
