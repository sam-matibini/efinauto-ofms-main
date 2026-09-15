import { supabase } from "@/api/supabaseClient";
import { createGLTransaction, GL_ACCOUNTS } from "@/components/shared/GLIntegration";
import { persistWithUnknownColumnRetry } from "@/lib/persistErrors";
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

  const purchasePayload = {
    company_id: companyId,
    purchase_number: purchaseNumber,
    supplier_name: form.vendor_name || vehicle.vendor_name || "Vehicle vendor",
    supplier_email: form.vendor_email || vehicle.vendor_email || "",
    supplier_phone: form.vendor_phone || vehicle.vendor_phone || "",
    supplier_address: [
      form.vendor_address || vehicle.vendor_address,
      form.vendor_city || vehicle.vendor_city,
      form.vendor_province || vehicle.vendor_province,
      form.vendor_postal_code || vehicle.vendor_postal_code,
      form.vendor_country || vehicle.vendor_country,
    ].filter(Boolean).join(", "),
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
      invoice ? `Invoice/BOS ${invoice}.` : "",
      form.vendor_gst_number || vehicle.vendor_gst_number
        ? `Vendor GST# ${form.vendor_gst_number || vehicle.vendor_gst_number}.`
        : "",
      form.vendor_pst_number || vehicle.vendor_pst_number
        ? `Vendor PST# ${form.vendor_pst_number || vehicle.vendor_pst_number}.`
        : "",
      form.stock_number || vehicle.stock_number
        ? `Stock# ${form.stock_number || vehicle.stock_number}.`
        : "",
      form.bidder_number || vehicle.bidder_number
        ? `Bidder# ${form.bidder_number || vehicle.bidder_number}.`
        : "",
      form.storage_yard || vehicle.storage_yard
        ? `Storage yard ${form.storage_yard || vehicle.storage_yard}.`
        : "",
      form.auction_number || vehicle.auction_number
        ? `Auction# ${form.auction_number || vehicle.auction_number}.`
        : "",
      form.mpi_doc_number || vehicle.mpi_doc_number
        ? `MPI DOC# ${form.mpi_doc_number || vehicle.mpi_doc_number}.`
        : "",
      form.tax_exemption_reason || vehicle.tax_exemption_reason
        ? `Tax exemption: ${form.tax_exemption_reason || vehicle.tax_exemption_reason}.`
        : "",
    ].filter(Boolean).join(" "),
    vehicle_id: vehicle.id,
    vehicle_vin: vin,
  };

  const purchase = await persistWithUnknownColumnRetry({
    write: (payload) => supabase.entities.Purchase.create(payload),
    data: purchasePayload,
    fallback: {
      company_id: companyId,
      purchase_number: purchaseNumber,
      supplier_name: purchasePayload.supplier_name,
      purchase_type: "vehicle",
      items: purchasePayload.items,
      subtotal: pretax,
      tax_amount: taxes.net_tax_to_purchases,
      total_amount: taxes.total_vehicle_expenditure,
      payment_status: "pending",
      status: "received",
      order_date: purchaseDate,
      notes: purchasePayload.notes,
    },
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

  const posted = await persistWithUnknownColumnRetry({
    write: (payload) => supabase.entities.Vehicle.update(vehicle.id, payload),
    data: {
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
    },
    fallback: {
      purchase_price: pretax,
      tax_gst: taxes.tax_gst,
      tax_pst: taxes.tax_pst,
      tax_hst: taxes.tax_hst,
      tax_total: taxes.tax_total,
      total_cost: taxes.total_vehicle_expenditure,
      status: vehicle.status || form.status || "in_stock",
    },
  });

  return { purchase, glEntries, vehicle: posted, taxes };
}
