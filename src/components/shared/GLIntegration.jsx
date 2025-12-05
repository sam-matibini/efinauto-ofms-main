import { base44 } from "@/api/base44Client";

/**
 * GLIntegration - Centralized General Ledger integration service
 * Ensures all module actions properly create Transaction records that flow to GL
 */

// Standard account codes (should match Chart of Accounts)
export const GL_ACCOUNTS = {
  // Assets (1000-1999)
  CASH: { code: '1000', name: 'Cash', type: 'asset' },
  ACCOUNTS_RECEIVABLE: { code: '1100', name: 'Accounts Receivable', type: 'asset' },
  INVENTORY_VEHICLES: { code: '1200', name: 'Vehicle Inventory', type: 'asset' },
  INVENTORY_PARTS: { code: '1210', name: 'Parts Inventory', type: 'asset' },
  
  // Liabilities (2000-2999)
  ACCOUNTS_PAYABLE: { code: '2000', name: 'Accounts Payable', type: 'liability' },
  GST_PAYABLE: { code: '2100', name: 'GST Payable', type: 'liability' },
  PST_PAYABLE: { code: '2110', name: 'PST Payable', type: 'liability' },
  HST_PAYABLE: { code: '2120', name: 'HST Payable', type: 'liability' },
  
  // Revenue (4000-4999)
  VEHICLE_SALES: { code: '4000', name: 'Vehicle Sales Revenue', type: 'revenue' },
  PARTS_SALES: { code: '4100', name: 'Parts Sales Revenue', type: 'revenue' },
  SERVICE_REVENUE: { code: '4200', name: 'Service Revenue', type: 'revenue' },
  SHIPPING_REVENUE: { code: '4300', name: 'Shipping Revenue', type: 'revenue' },
  SALVAGE_REVENUE: { code: '4400', name: 'Salvage Revenue', type: 'revenue' },
  
  // Cost of Goods Sold (5000-5999)
  COGS_VEHICLES: { code: '5000', name: 'Cost of Vehicles Sold', type: 'expense' },
  COGS_PARTS: { code: '5100', name: 'Cost of Parts Sold', type: 'expense' },
  SHIPPING_EXPENSE: { code: '5200', name: 'Shipping & Freight Expense', type: 'expense' },
  CUSTOMS_EXPENSE: { code: '5210', name: 'Customs & Duties Expense', type: 'expense' },
  
  // Operating Expenses (6000-6999)
  LABOR_EXPENSE: { code: '6000', name: 'Labor Expense', type: 'expense' },
  PAYROLL_EXPENSE: { code: '6100', name: 'Payroll Expense', type: 'expense' },
  INSURANCE_EXPENSE: { code: '6200', name: 'Insurance Expense', type: 'expense' },
  SCRAP_WRITEOFF: { code: '6300', name: 'Scrap Write-off', type: 'expense' },
};

/**
 * Create a GL transaction entry
 */
export const createGLTransaction = async ({
  companyId,
  transactionType,
  category,
  amount,
  debitAccount,
  creditAccount,
  referenceType,
  referenceId,
  referenceNumber,
  customerName = null,
  description,
  transactionDate = new Date().toISOString().split('T')[0],
  paymentMethod = 'other',
  status = 'completed',
  taxGst = 0,
  taxPst = 0,
  taxHst = 0,
  province = null
}) => {
  try {
    const transaction = await base44.entities.Transaction.create({
      company_id: companyId,
      transaction_number: `TXN-${Date.now()}`,
      transaction_type: transactionType,
      category,
      amount,
      debit_amount: amount,
      credit_amount: amount,
      account_id: debitAccount?.id,
      account_code: debitAccount?.code,
      account_name: debitAccount?.name,
      account_type: debitAccount?.type,
      contra_account_id: creditAccount?.id,
      contra_account_code: creditAccount?.code,
      contra_account_name: creditAccount?.name,
      reference_type: referenceType,
      reference_id: referenceId,
      reference_number: referenceNumber,
      customer_name: customerName,
      description,
      transaction_date: transactionDate,
      payment_method: paymentMethod,
      status,
      tax_gst: taxGst,
      tax_pst: taxPst,
      tax_hst: taxHst,
      tax_amount: taxGst + taxPst + taxHst,
      province
    });
    return transaction;
  } catch (error) {
    console.error('[GL Integration Error]', error);
    throw error;
  }
};

/**
 * Record a vehicle sale transaction
 */
export const recordVehicleSale = async (companyId, sale, vehicle) => {
  // Revenue entry
  await createGLTransaction({
    companyId,
    transactionType: 'sale_revenue',
    category: 'revenue',
    amount: sale.sale_price || 0,
    debitAccount: GL_ACCOUNTS.ACCOUNTS_RECEIVABLE,
    creditAccount: GL_ACCOUNTS.VEHICLE_SALES,
    referenceType: 'Sale',
    referenceId: sale.id,
    referenceNumber: sale.sale_number,
    customerName: sale.customer_name,
    description: `Vehicle sale: ${sale.vehicle_details}`,
    transactionDate: sale.sale_date,
    taxGst: sale.tax_gst || 0,
    taxPst: sale.tax_pst || 0,
    taxHst: sale.tax_hst || 0,
    province: sale.province
  });

  // COGS entry (if vehicle has purchase price)
  if (vehicle?.purchase_price > 0) {
    await createGLTransaction({
      companyId,
      transactionType: 'other_expense',
      category: 'expense',
      amount: vehicle.purchase_price,
      debitAccount: GL_ACCOUNTS.COGS_VEHICLES,
      creditAccount: GL_ACCOUNTS.INVENTORY_VEHICLES,
      referenceType: 'Sale',
      referenceId: sale.id,
      referenceNumber: sale.sale_number,
      description: `COGS for vehicle: ${sale.vehicle_details}`
    });
  }
};

/**
 * Record parts usage in repair (COGS + Inventory update)
 */
export const recordPartsUsage = async (companyId, repairOrder, partsUsed) => {
  if (!partsUsed || partsUsed.length === 0) return;

  const totalPartsCost = partsUsed.reduce((sum, p) => sum + (p.total_cost || p.unit_cost * p.quantity || 0), 0);

  if (totalPartsCost > 0) {
    // COGS entry for parts
    await createGLTransaction({
      companyId,
      transactionType: 'parts_revenue',
      category: 'expense',
      amount: totalPartsCost,
      debitAccount: GL_ACCOUNTS.COGS_PARTS,
      creditAccount: GL_ACCOUNTS.INVENTORY_PARTS,
      referenceType: 'RepairOrder',
      referenceId: repairOrder.id,
      referenceNumber: repairOrder.order_number,
      customerName: repairOrder.customer_name,
      description: `Parts used in repair: ${partsUsed.map(p => p.part_name).join(', ')}`
    });
  }
};

/**
 * Record repair service revenue
 */
export const recordRepairRevenue = async (companyId, repairOrder) => {
  // Labor revenue
  if (repairOrder.labor_cost > 0) {
    await createGLTransaction({
      companyId,
      transactionType: 'service_revenue',
      category: 'revenue',
      amount: repairOrder.labor_cost,
      debitAccount: GL_ACCOUNTS.ACCOUNTS_RECEIVABLE,
      creditAccount: GL_ACCOUNTS.SERVICE_REVENUE,
      referenceType: 'RepairOrder',
      referenceId: repairOrder.id,
      referenceNumber: repairOrder.order_number,
      customerName: repairOrder.customer_name,
      description: `Labor for repair: ${repairOrder.vehicle_make} ${repairOrder.vehicle_model}`,
      transactionDate: repairOrder.completion_date
    });
  }

  // Parts revenue (if charged to customer)
  if (repairOrder.parts_cost > 0) {
    await createGLTransaction({
      companyId,
      transactionType: 'parts_revenue',
      category: 'revenue',
      amount: repairOrder.parts_cost,
      debitAccount: GL_ACCOUNTS.ACCOUNTS_RECEIVABLE,
      creditAccount: GL_ACCOUNTS.PARTS_SALES,
      referenceType: 'RepairOrder',
      referenceId: repairOrder.id,
      referenceNumber: repairOrder.order_number,
      customerName: repairOrder.customer_name,
      description: `Parts for repair: ${repairOrder.vehicle_make} ${repairOrder.vehicle_model}`,
      transactionDate: repairOrder.completion_date
    });
  }
};

/**
 * Record shipping/freight transaction
 */
export const recordShippingFees = async (companyId, shipment) => {
  const totalFees = (shipment.freight_cost || 0) + 
                    (shipment.handling_fees || 0) + 
                    (shipment.customs_fees || 0) + 
                    (shipment.insurance_cost || 0);

  if (totalFees <= 0) return;

  // Shipping expense
  if (shipment.freight_cost > 0) {
    await createGLTransaction({
      companyId,
      transactionType: 'other_expense',
      category: 'expense',
      amount: shipment.freight_cost,
      debitAccount: GL_ACCOUNTS.SHIPPING_EXPENSE,
      creditAccount: GL_ACCOUNTS.ACCOUNTS_PAYABLE,
      referenceType: 'FreightShipment',
      referenceId: shipment.id,
      referenceNumber: shipment.shipment_number,
      customerName: shipment.customer_name,
      description: `Freight charges: ${shipment.origin_country} → ${shipment.destination_country}`
    });
  }

  // Customs expense
  if (shipment.customs_fees > 0) {
    await createGLTransaction({
      companyId,
      transactionType: 'other_expense',
      category: 'expense',
      amount: shipment.customs_fees,
      debitAccount: GL_ACCOUNTS.CUSTOMS_EXPENSE,
      creditAccount: GL_ACCOUNTS.ACCOUNTS_PAYABLE,
      referenceType: 'FreightShipment',
      referenceId: shipment.id,
      referenceNumber: shipment.shipment_number,
      customerName: shipment.customer_name,
      description: `Customs & duties: ${shipment.shipment_number}`
    });
  }

  // Insurance expense
  if (shipment.insurance_cost > 0) {
    await createGLTransaction({
      companyId,
      transactionType: 'other_expense',
      category: 'expense',
      amount: shipment.insurance_cost,
      debitAccount: GL_ACCOUNTS.INSURANCE_EXPENSE,
      creditAccount: GL_ACCOUNTS.ACCOUNTS_PAYABLE,
      referenceType: 'FreightShipment',
      referenceId: shipment.id,
      referenceNumber: shipment.shipment_number,
      description: `Shipping insurance: ${shipment.shipment_number}`
    });
  }
};

/**
 * Record salvage/scrap transaction
 */
export const recordSalvageTransaction = async (companyId, salvageVehicle, type = 'purchase') => {
  if (type === 'purchase' && salvageVehicle.purchase_price > 0) {
    // Asset acquisition
    await createGLTransaction({
      companyId,
      transactionType: 'vehicle_purchase',
      category: 'asset',
      amount: salvageVehicle.purchase_price,
      debitAccount: GL_ACCOUNTS.INVENTORY_VEHICLES,
      creditAccount: GL_ACCOUNTS.ACCOUNTS_PAYABLE,
      referenceType: 'SalvageVehicle',
      referenceId: salvageVehicle.id,
      referenceNumber: salvageVehicle.salvage_number,
      description: `Salvage vehicle acquisition: ${salvageVehicle.year} ${salvageVehicle.make} ${salvageVehicle.model}`
    });
  }

  if (type === 'scrap' && salvageVehicle.scrap_weights?.scrap_value > 0) {
    // Scrap revenue
    await createGLTransaction({
      companyId,
      transactionType: 'other_income',
      category: 'revenue',
      amount: salvageVehicle.scrap_weights.scrap_value,
      debitAccount: GL_ACCOUNTS.CASH,
      creditAccount: GL_ACCOUNTS.SALVAGE_REVENUE,
      referenceType: 'SalvageVehicle',
      referenceId: salvageVehicle.id,
      referenceNumber: salvageVehicle.salvage_number,
      description: `Scrap metal sale: ${salvageVehicle.scrap_weights.total_weight_kg}kg`
    });
  }
};

/**
 * Record payroll transaction
 */
export const recordPayrollTransaction = async (companyId, payrollRun, totalAmount) => {
  await createGLTransaction({
    companyId,
    transactionType: 'payroll_expense',
    category: 'expense',
    amount: totalAmount,
    debitAccount: GL_ACCOUNTS.PAYROLL_EXPENSE,
    creditAccount: GL_ACCOUNTS.CASH,
    referenceType: 'PayrollRun',
    referenceId: payrollRun.id,
    referenceNumber: payrollRun.payroll_number,
    description: `Payroll run: ${payrollRun.pay_period_start} to ${payrollRun.pay_period_end}`,
    transactionDate: payrollRun.payment_date
  });
};

/**
 * Record parts extraction from salvage to inventory
 */
export const recordPartsExtraction = async (companyId, salvageVehicle, part) => {
  // Move value from vehicle to parts inventory
  if (part.cost_price > 0) {
    await createGLTransaction({
      companyId,
      transactionType: 'journal_entry',
      category: 'asset',
      amount: part.cost_price,
      debitAccount: GL_ACCOUNTS.INVENTORY_PARTS,
      creditAccount: GL_ACCOUNTS.INVENTORY_VEHICLES,
      referenceType: 'Part',
      referenceId: part.id,
      referenceNumber: part.part_number,
      description: `Part extracted from salvage: ${part.name} from ${salvageVehicle.vin}`
    });
  }
};

/**
 * Update parts inventory quantity
 */
export const updatePartsInventory = async (partId, quantityChange) => {
  try {
    const part = await base44.entities.Part.filter({ id: partId });
    if (part && part.length > 0) {
      const currentPart = part[0];
      const newQuantity = Math.max(0, (currentPart.quantity || 0) + quantityChange);
      await base44.entities.Part.update(partId, { quantity: newQuantity });
    }
  } catch (error) {
    console.error('[Inventory Update Error]', error);
  }
};

export default {
  createGLTransaction,
  recordVehicleSale,
  recordPartsUsage,
  recordRepairRevenue,
  recordShippingFees,
  recordSalvageTransaction,
  recordPayrollTransaction,
  recordPartsExtraction,
  updatePartsInventory,
  GL_ACCOUNTS
};