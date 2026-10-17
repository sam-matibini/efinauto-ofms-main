import {
  compileLedger,
  balanceSheet,
  profitAndLoss,
  cashFlowStatement,
  retainedEarningsStatement,
  trialBalance,
  statements,
} from "./financialStatements.js";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed += 1;
    return;
  }
  failed += 1;
  console.error(`FAIL ${message}`);
}

function near(actual, expected, message) {
  const ok = Math.abs(Number(actual) - Number(expected)) < 0.02;
  assert(ok, `${message}: expected ${expected}, got ${actual}`);
}

function assertBooks(ledger, period, label) {
  const pack = statements(ledger, period);
  near(pack.balanceSheet.totalAssets, pack.balanceSheet.totalLiabilitiesAndEquity, `${label} assets = liabilities + equity`);
  assert(pack.balanceSheet.inBalance, `${label} balance sheet flag`);
  near(pack.balanceSheet.imbalance, 0, `${label} imbalance`);
  near(pack.trialBalance.totalDebits, pack.trialBalance.totalCredits, `${label} trial balance`);
  near(pack.trialBalance.difference, 0, `${label} trial balance difference`);
  near(pack.cashFlow.endingCash, pack.balanceSheet.cashAndBank, `${label} ending cash = balance sheet cash`);
  near(
    pack.cashFlow.beginningCash + pack.cashFlow.netChangeInCash,
    pack.cashFlow.endingCash,
    `${label} cash rollforward`
  );
  near(pack.profitAndLoss.netProfit, pack.retainedEarnings.netIncome, `${label} net income`);
  near(pack.retainedEarnings.endingRetainedEarnings, pack.balanceSheet.retainedEarnings, `${label} retained earnings`);
  near(
    pack.retainedEarnings.beginningRetainedEarnings + pack.retainedEarnings.netIncome + pack.retainedEarnings.otherAdjustments - pack.retainedEarnings.dividends,
    pack.retainedEarnings.endingRetainedEarnings,
    `${label} retained earnings rollforward`
  );
  return pack;
}

const year = { from: "2025-01-01", to: "2025-12-31" };
const prior = { from: "2024-01-01", to: "2024-12-31" };

// Unsold inventory is an asset funded by accounts payable, not a loss.
{
  const ledger = compileLedger({
    vehicles: [{ id: "v1", ownership_type: "dealership_owned", total_cost: 1905603.34, transaction_date: "2025-06-01", year: 2024, make: "Toyota", model: "Camry" }],
  });
  const pack = assertBooks(ledger, year, "unsold inventory");
  near(pack.balanceSheet.vehicleInventory, 1905603.34, "inventory stays on the balance sheet");
  near(pack.balanceSheet.accountsPayable, 1905603.34, "vendor obligation funds the inventory");
  near(pack.balanceSheet.retainedEarnings, 0, "inventory is not charged to retained earnings");
  near(pack.profitAndLoss.netProfit, 0, "no profit before a sale");
}

// Unpaid accrual sale recognizes revenue and a receivable.
{
  const ledger = compileLedger({
    sales: [{ id: "s1", sale_date: "2025-03-01", grand_total: 48978.05, payment_status: "pending", total_paid: 0, customer_name: "Ada" }],
  });
  const pack = assertBooks(ledger, year, "unpaid sale");
  near(pack.balanceSheet.accountsReceivable, 48978.05, "receivable");
  near(pack.profitAndLoss.revenue, 48978.05, "accrual revenue");
  near(pack.balanceSheet.retainedEarnings, 48978.05, "earnings include unpaid revenue");
}

// A vehicle bill already in accounts payable is not posted a second time.
{
  const ledger = compileLedger({
    vehicles: [{ id: "v2", total_cost: 20000, transaction_date: "2025-02-01" }],
    purchases: [{
      id: "p1",
      purchase_type: "vehicle",
      order_date: "2025-02-01",
      total_amount: 20000,
      payment_status: "pending",
      supplier_name: "Auction",
      items: [{ vehicle_id: "v2", total: 20000 }],
    }],
    sales: [{ id: "s2", sale_date: "2025-08-01", vehicle_id: "v2", grand_total: 30000, payment_status: "paid", total_paid: 30000 }],
  });
  const pack = assertBooks(ledger, year, "linked purchase");
  near(pack.balanceSheet.vehicleInventory, 0, "sold vehicle leaves inventory");
  near(pack.balanceSheet.accountsPayable, 20000, "payable is the purchase, not the purchase plus the vehicle");
  near(pack.balanceSheet.cashAndBank, 30000, "customer cash");
  near(pack.profitAndLoss.vehicleCogs, 20000, "cost of the sold vehicle");
  near(pack.profitAndLoss.netProfit, 10000, "margin");
  near(pack.balanceSheet.totalAssets, 30000, "assets are the cash");
}

// Same-day vehicle purchase without a line id still capitalizes once.
{
  const ledger = compileLedger({
    vehicles: [{ id: "v3", total_cost: 15000, transaction_date: "2025-04-04" }],
    purchases: [{ id: "p2", purchase_type: "vehicle", order_date: "2025-04-04", total_amount: 15000, payment_status: "paid", amount_paid: 15000, items: [] }],
  });
  const pack = assertBooks(ledger, year, "same-day purchase");
  near(pack.balanceSheet.vehicleInventory, 15000, "inventory once");
  near(pack.balanceSheet.accountsPayable, 0, "paid bill has no payable");
  near(pack.balanceSheet.cashAndBank, -15000, "cash paid for inventory");
  near(pack.cashFlow.vehicleInventoryPurchases, 15000, "inventory purchase is operating, not also a supplier payment");
  near(pack.cashFlow.cashPaidToSuppliers, 0, "supplier line does not double count the vehicle");
}

// Tax and a partial payment stay balanced.
{
  const ledger = compileLedger({
    sales: [{
      id: "s3",
      sale_date: "2025-05-01",
      grand_total: 11300,
      tax_gst: 1300,
      tax_total: 1300,
      total_paid: 5000,
      payment_status: "partial",
    }],
  });
  const pack = assertBooks(ledger, year, "partial taxed sale");
  near(pack.balanceSheet.cashAndBank, 5000, "cash collected");
  near(pack.balanceSheet.accountsReceivable, 6300, "remaining receivable");
  near(pack.profitAndLoss.revenue, 10000, "revenue excludes sales tax");
  near(pack.balanceSheet.taxPayable, 1300, "tax collected is a liability");
}

// Service work records revenue, parts, and wages without plugging equity.
{
  const ledger = compileLedger({
    repairs: [{
      id: "r1",
      status: "completed",
      completion_date: "2025-07-01",
      total_cost: 1130,
      tax_amount: 130,
      parts_cost: 400,
      labor_cost: 500,
      payment_status: "paid",
      amount_paid: 1130,
      customer_name: "Sam",
    }],
  });
  const pack = assertBooks(ledger, year, "repair");
  near(pack.profitAndLoss.serviceRevenue, 1000, "service revenue");
  near(pack.profitAndLoss.otherCogs, 400, "parts cost");
  near(pack.profitAndLoss.payrollExpenses, 500, "labor");
  near(pack.profitAndLoss.netProfit, 100, "service margin");
  near(pack.balanceSheet.accountsPayable, 400, "unvouchered parts");
  near(pack.balanceSheet.payrollLiabilities, 500, "wages payable");
  near(pack.balanceSheet.taxPayable, 130, "repair tax");
}

// Prior-year cash purchase rolls into the next balance sheet and cash flow.
{
  const ledger = compileLedger({
    purchases: [{ id: "p3", purchase_type: "vehicle", order_date: "2024-06-01", total_amount: 1000, payment_status: "paid", amount_paid: 1000 }],
    sales: [{ id: "s4", sale_date: "2025-03-01", grand_total: 2500, payment_status: "paid", total_paid: 2500 }],
  });
  const priorPack = assertBooks(ledger, prior, "prior year");
  near(priorPack.balanceSheet.cashAndBank, -1000, "prior cash");
  near(priorPack.balanceSheet.vehicleInventory, 1000, "unsold prior inventory");
  near(priorPack.balanceSheet.retainedEarnings, 0, "no earnings yet");
  const current = assertBooks(ledger, year, "current year after prior purchase");
  near(current.cashFlow.beginningCash, -1000, "opening cash");
  near(current.balanceSheet.cashAndBank, 1500, "ending cash");
  near(current.profitAndLoss.netProfit, 2500, "sale with no matching cost");
  near(current.retainedEarnings.beginningRetainedEarnings, 0, "opening earnings");
}

// Voided sales and customer-owned vehicles stay off the dealer books.
{
  const ledger = compileLedger({
    vehicles: [
      { id: "own", ownership_type: "customer_owned_export", total_cost: 8000, transaction_date: "2025-01-02" },
      { id: "stock", total_cost: 4000, transaction_date: "2025-01-03" },
    ],
    sales: [
      { id: "void", bos_status: "voided", sale_date: "2025-02-01", grand_total: 9000, payment_status: "paid", vehicle_id: "stock" },
      { id: "export", sale_date: "2025-02-02", grand_total: 500, payment_status: "paid", vehicle_id: "own" },
    ],
  });
  const pack = assertBooks(ledger, year, "void and customer owned");
  near(pack.balanceSheet.vehicleInventory, 4000, "stock remains and customer vehicle is excluded");
  near(pack.profitAndLoss.revenue, 500, "voided sale is excluded");
  near(pack.profitAndLoss.vehicleCogs, 0, "customer vehicle has no dealer cost");
}

// A balanced journal is kept. A one-sided equity memo is not used as a plug.
{
  const ledger = compileLedger({
    transactions: [
      { transaction_number: "JE-1", transaction_type: "journal_entry", transaction_date: "2025-01-15", status: "completed", debit_amount: 100, account_code: "1000", account_name: "Cash", account_type: "asset", description: "Owner investment" },
      { transaction_number: "JE-1", transaction_type: "journal_entry", transaction_date: "2025-01-15", status: "completed", credit_amount: 100, account_code: "3000", account_name: "Owner's Equity", account_type: "equity", description: "Owner investment" },
      { id: "lone", transaction_type: "journal_entry", transaction_date: "2025-01-16", status: "completed", amount: 999, account_code: "3000", account_type: "equity", category: "equity", description: "One sided" },
    ],
  });
  const pack = assertBooks(ledger, year, "journals");
  near(pack.balanceSheet.ownerEquity, 100, "balanced contribution");
  near(pack.balanceSheet.cashAndBank, 100, "contribution cash");
  near(pack.balanceSheet.retainedEarnings, 0, "one-sided memo is not earnings");
}

// Cash basis omits unpaid inventory and unpaid revenue, and still balances.
{
  const accrual = compileLedger({
    vehicles: [{ id: "v9", total_cost: 5000, transaction_date: "2025-01-10" }],
    sales: [{ id: "s9", sale_date: "2025-02-01", grand_total: 700, payment_status: "pending" }],
  });
  const cash = compileLedger({
    vehicles: [{ id: "v9", total_cost: 5000, transaction_date: "2025-01-10" }],
    sales: [{ id: "s9", sale_date: "2025-02-01", grand_total: 700, payment_status: "pending" }],
  }, { basis: "cash" });
  assertBooks(accrual, year, "accrual control");
  const pack = assertBooks(cash, year, "cash basis");
  near(pack.balanceSheet.vehicleInventory, 0, "unpaid inventory is off the cash basis");
  near(pack.balanceSheet.accountsPayable, 0, "no payable on the cash basis");
  near(pack.profitAndLoss.revenue, 0, "uncollected revenue is off the cash basis");
  near(balanceSheet(accrual, year.to).vehicleInventory, 5000, "accrual still shows the vehicle");
}

// Paid expense and equipment purchase classify cash without breaking the tie to the balance sheet.
{
  const ledger = compileLedger({
    expenses: [{ id: "e1", expense_date: "2025-03-03", total_amount: 200, status: "paid", description: "Utilities" }],
    purchases: [{ id: "eq", purchase_type: "equipment", order_date: "2025-04-01", total_amount: 800, payment_status: "paid", amount_paid: 800 }],
    sales: [{ id: "s5", sale_date: "2025-05-01", grand_total: 1000, payment_status: "paid", total_paid: 1000 }],
  });
  const pack = assertBooks(ledger, year, "expense and equipment");
  near(pack.profitAndLoss.operatingExpenses, 200, "utilities");
  near(pack.balanceSheet.fixedAssets, 800, "equipment");
  near(pack.cashFlow.equipmentPurchases, 800, "investing outflow");
  near(pack.cashFlow.operatingExpenses, 200, "operating outflow");
  near(pack.balanceSheet.cashAndBank, 0, "1000 in, 1000 out");
  near(pack.profitAndLoss.netProfit, 800, "revenue minus utilities");
}

// Parts purchased and then used relieve inventory instead of going negative.
{
  const ledger = compileLedger({
    purchases: [{ id: "parts", purchase_type: "parts", order_date: "2025-01-05", total_amount: 300, payment_status: "paid", amount_paid: 300 }],
    repairs: [{ id: "r2", status: "completed", completion_date: "2025-02-01", total_cost: 300, parts_cost: 450, labor_cost: 0, payment_status: "pending" }],
  });
  const pack = assertBooks(ledger, year, "parts relief");
  near(pack.balanceSheet.partsInventory, 0, "stock is consumed");
  near(pack.balanceSheet.accountsPayable, 150, "only the unfunded parts are payable");
  near(pack.profitAndLoss.otherCogs, 450, "full parts cost");
  near(pack.balanceSheet.accountsReceivable, 300, "unpaid service bill");
}

// Screenshot-shaped mix: inventory, unpaid receivable, paid expense, contribution, and a small bill.
{
  const ledger = compileLedger({
    vehicles: [{ id: "lot", total_cost: 1905603.34, transaction_date: "2025-01-20" }],
    sales: [{ id: "open", sale_date: "2025-06-15", grand_total: 48978.05, payment_status: "pending", total_paid: 0 }],
    expenses: [{ id: "bank", expense_date: "2025-07-01", total_amount: 1349.89, status: "paid", description: "Bank charges" }],
    purchases: [{ id: "sup", purchase_type: "supplies", order_date: "2025-08-01", total_amount: 4702.04, payment_status: "pending" }],
    transactions: [
      { transaction_number: "OPEN", transaction_type: "journal_entry", transaction_date: "2025-01-02", status: "completed", debit_amount: 100, account_code: "1000", account_type: "asset" },
      { transaction_number: "OPEN", transaction_type: "journal_entry", transaction_date: "2025-01-02", status: "completed", credit_amount: 100, account_code: "3000", account_type: "equity", account_name: "Owner's Equity" },
      { transaction_number: "NOTE", transaction_type: "journal_entry", transaction_date: "2025-03-01", status: "completed", debit_amount: 3258.95, account_code: "1000", account_type: "asset" },
      { transaction_number: "NOTE", transaction_type: "journal_entry", transaction_date: "2025-03-01", status: "completed", credit_amount: 3258.95, account_code: "2200", account_type: "liability", account_name: "Short-term Debt" },
    ],
  });
  const pack = assertBooks(ledger, year, "dealership mix");
  near(pack.balanceSheet.vehicleInventory, 1905603.34, "lot inventory");
  near(pack.balanceSheet.accountsReceivable, 48978.05, "open sale");
  near(pack.balanceSheet.ownerEquity, 100, "owner contribution");
  near(pack.balanceSheet.shortTermDebt, 3258.95, "note");
  near(pack.trialBalance.difference, 0, "mix still ties");
  const priorEmpty = balanceSheet(ledger, prior.to);
  near(priorEmpty.totalAssets, priorEmpty.totalLiabilitiesAndEquity, "prior year of this mix also ties");
}

// Empty books are balanced.
{
  const pack = assertBooks(compileLedger({}), year, "empty");
  near(pack.balanceSheet.totalAssets, 0, "empty assets");
}

console.log(`${passed} checks passed, ${failed} failed`);
if (failed > 0) process.exit(1);
