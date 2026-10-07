/**
 * Double-entry books for the dealership statements.
 *
 * Every business event is posted as a journal entry whose debits equal its
 * credits. The balance sheet, income statement, cash flow, retained earnings,
 * and trial balance are all views of that one ledger, so they stay in balance
 * together. Inventory is never dropped into retained earnings to force a tie.
 *
 * Accrual: unpaid sales debit accounts receivable; dealer vehicles with no
 * purchase document credit accounts payable (the obligation to the vendor).
 * Cash basis: only the collected or paid portion is recognized.
 */

const CHART = [
  { code: "1000", name: "Cash and Bank", type: "asset" },
  { code: "1050", name: "Undeposited Funds", type: "asset" },
  { code: "1100", name: "Accounts Receivable", type: "asset" },
  { code: "1150", name: "GST/HST Receivable (ITC)", type: "asset" },
  { code: "1200", name: "Vehicle Inventory", type: "asset" },
  { code: "1210", name: "Parts Inventory", type: "asset" },
  { code: "1220", name: "Product Inventory", type: "asset" },
  { code: "1500", name: "Fixed Assets", type: "asset" },
  { code: "1590", name: "Accumulated Depreciation", type: "asset" },
  { code: "2000", name: "Accounts Payable", type: "liability" },
  { code: "2100", name: "GST Payable", type: "liability" },
  { code: "2110", name: "PST/QST Payable", type: "liability" },
  { code: "2120", name: "HST Payable", type: "liability" },
  { code: "2200", name: "Short-term Debt", type: "liability" },
  { code: "2300", name: "Wages Payable", type: "liability" },
  { code: "2400", name: "Payroll Liabilities", type: "liability" },
  { code: "2500", name: "Long-term Debt", type: "liability" },
  { code: "3000", name: "Owner's Equity", type: "equity" },
  { code: "3100", name: "Retained Earnings", type: "equity" },
  { code: "3200", name: "Owner Draws", type: "equity" },
  { code: "4000", name: "Vehicle Sales Revenue", type: "revenue" },
  { code: "4100", name: "Service Revenue", type: "revenue" },
  { code: "4200", name: "Freight Service Revenue", type: "revenue" },
  { code: "4300", name: "Parts Revenue", type: "revenue" },
  { code: "4900", name: "Other Revenue", type: "revenue" },
  { code: "5000", name: "Cost of Vehicles Sold", type: "expense" },
  { code: "5100", name: "Cost of Parts Sold", type: "expense" },
  { code: "5200", name: "Labor Expense", type: "expense" },
  { code: "6000", name: "Operating Expenses", type: "expense" },
  { code: "6100", name: "Wages & Salaries Expense", type: "expense" },
];

const SUBLEDGER_REFS = new Set(["sale", "repairorder", "purchase", "vehicle", "expense", "part"]);
const DUPLICATE_GL_TYPES = new Set([
  "sale_revenue",
  "service_revenue",
  "vehicle_purchase",
  "parts_purchase",
  "payment_received",
  "payment_made",
  "labor_expense",
]);

export function cents(value) {
  const n = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100);
}

export function dollars(centsValue) {
  return (centsValue || 0) / 100;
}

export function dayKey(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const text = String(value);
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return dayKey(parsed);
}

export function inRange(value, from, to) {
  const day = dayKey(value);
  if (!day) return false;
  const start = from ? dayKey(from) : null;
  const end = to ? dayKey(to) : null;
  if (start && day < start) return false;
  if (end && day > end) return false;
  return true;
}

export function formatStatementDate(value) {
  const day = dayKey(value);
  if (!day) return "";
  const [year, month, date] = day.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(month) - 1]} ${Number(date)}, ${year}`;
}

export function formatAccounting(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  const abs = Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `-$${abs}` : `$${abs}`;
}

function inferType(code, explicit) {
  if (explicit) return explicit;
  const n = parseInt(code, 10);
  if (!Number.isFinite(n)) return "asset";
  if (n < 2000) return "asset";
  if (n < 3000) return "liability";
  if (n < 4000) return "equity";
  if (n < 5000) return "revenue";
  return "expense";
}

export function bucketOf(account) {
  const code = String(account?.code || "");
  const name = String(account?.name || "").toLowerCase();
  const type = account?.type || inferType(code);
  if (type === "asset") {
    if (name.includes("accumul") || (name.includes("depreciation") && !name.includes("expense"))) return "accumDep";
    if (code.startsWith("10") || name.includes("undeposited") || name.includes("cash") || (name.includes("bank") && !name.includes("charge"))) return "cash";
    if (code.startsWith("115") || name.includes("itc") || (name.includes("receivable") && (name.includes("gst") || name.includes("hst")))) return "taxReceivable";
    if (code.startsWith("110") || code.startsWith("111") || name.includes("accounts receivable")) return "ar";
    if (code.startsWith("120") || name.includes("vehicle inventory")) return "vehicleInventory";
    if (code.startsWith("121") || name.includes("parts inventory")) return "partsInventory";
    if (code.startsWith("12") || name.includes("inventory")) return "otherInventory";
    if (code.startsWith("15") || code.startsWith("16") || code.startsWith("17") || code.startsWith("18") || name.includes("fixed") || name.includes("equipment")) return "fixedAssets";
    return "otherAssets";
  }
  if (type === "liability") {
    if (code === "2100" || code === "2110" || code === "2120" || name.includes("gst payable") || name.includes("hst payable") || name.includes("pst") || name.includes("qst") || name.includes("tax payable") || name.includes("sales tax")) return "taxPayable";
    if (code.startsWith("200") || name.includes("accounts payable")) return "ap";
    if (code.startsWith("230") || code.startsWith("240") || name.includes("payroll") || name.includes("wages payable")) return "payroll";
    if (code.startsWith("25") || code.startsWith("26") || name.includes("long-term") || name.includes("long term")) return "longTermDebt";
    if (code.startsWith("21") || code.startsWith("22") || name.includes("short-term") || name.includes("short term") || name.includes("note payable")) return "shortTermDebt";
    return "otherLiabilities";
  }
  if (type === "equity") {
    if (code === "3100" || code === "3900" || name.includes("retained")) return "retainedEarnings";
    if (code === "3200" || code === "3300" || name.includes("dividend") || name.includes("draw")) return "dividends";
    return "ownerEquity";
  }
  if (type === "revenue") {
    if (code === "4000" || name.includes("vehicle sales")) return "vehicleSales";
    if (code === "4100" || name.includes("service revenue")) return "serviceRevenue";
    if (code === "4300" || name.includes("parts revenue")) return "partsRevenue";
    return "otherRevenue";
  }
  if (code.startsWith("500") || name.includes("cost of vehicles") || name.includes("cost of goods")) return "cogsVehicles";
  if (code.startsWith("510") || name.includes("cost of parts") || name.includes("parts expense")) return "cogsParts";
  if (code.startsWith("520") || code.startsWith("610") || name.includes("labor") || name.includes("wages") || name.includes("payroll") || name.includes("salar")) return "payrollExpense";
  return "operatingExpense";
}

function vehicleCostCents(vehicle) {
  return cents(vehicle?.total_cost || vehicle?.purchase_price || 0);
}

function isDealerVehicle(vehicle) {
  return !!vehicle && vehicle.ownership_type !== "customer_owned_export";
}

function isVoidSale(sale) {
  return sale?.bos_status === "voided" || sale?.status === "voided" || sale?.status === "cancelled";
}

function isActivePurchase(purchase) {
  return purchase && purchase.status !== "cancelled";
}

function documentDate(...values) {
  for (const value of values) {
    const day = dayKey(value);
    if (day) return day;
  }
  return null;
}

function cashSplit(totalCents, paidDollars, status) {
  const bill = Math.max(0, totalCents);
  let paid = Math.max(0, cents(paidDollars));
  if (status === "paid") paid = bill;
  if (status === "pending" && !(Number(paidDollars) > 0)) paid = 0;
  paid = Math.min(paid, bill);
  return { bill, cash: paid, credit: bill - paid };
}

function allocateCents(total, weights) {
  const clean = weights.filter((weight) => weight > 0);
  const sum = clean.reduce((totalWeight, weight) => totalWeight + weight, 0);
  if (total === 0 || sum === 0) return weights.map(() => 0);
  let used = 0;
  let remainingIndexes = [];
  const amounts = weights.map((weight, index) => {
    if (weight <= 0) return 0;
    remainingIndexes.push(index);
    return 0;
  });
  remainingIndexes.forEach((index, position) => {
    const amount = position === remainingIndexes.length - 1
      ? total - used
      : Math.round((weights[index] * total) / sum);
    amounts[index] = amount;
    used += amount;
  });
  return amounts;
}

function saleFigures(sale) {
  const gst = Math.max(0, cents(sale.tax_gst));
  const pst = Math.max(0, cents(sale.tax_pst));
  const hst = Math.max(0, cents(sale.tax_hst));
  let tax = Math.max(0, cents(sale.tax_total));
  if (tax === 0) tax = gst + pst + hst;
  const price = sale.sale_price == null ? null : cents(sale.sale_price);
  const grand = sale.grand_total == null ? null : cents(sale.grand_total);
  let gross = grand != null ? grand : (price || 0) + tax;
  if (gross < 0) gross = 0;
  if (tax > gross) tax = gross;
  let gstPart = gst;
  let pstPart = pst;
  let hstPart = hst;
  const component = gst + pst + hst;
  if (component === 0) gstPart = tax;
  else if (component !== tax) gstPart += tax - component;
  const revenue = gross - (gstPart + pstPart + hstPart);
  return { gross, revenue, gst: gstPart, pst: pstPart, hst: hstPart, tax };
}

function repairBill(repair) {
  const tax = Math.max(0, cents(repair.tax_amount));
  const labor = Math.max(0, cents(repair.labor_cost));
  const parts = Math.max(0, cents(repair.parts_cost));
  let gross = Math.max(0, cents(repair.total_cost));
  if (gross === 0) gross = labor + parts + tax;
  const taxCapped = Math.min(tax, gross);
  return { gross, tax: taxCapped, revenue: gross - taxCapped, labor, parts };
}

function purchaseTotalCents(purchase) {
  const stated = cents(purchase.total_amount);
  if (stated > 0) return stated;
  const items = Array.isArray(purchase.items) ? purchase.items : [];
  const fromItems = items.reduce((sum, item) => sum + Math.max(0, cents(item?.total || (item?.unit_price || 0) * (item?.quantity || 0))), 0);
  return fromItems > 0 ? fromItems : Math.max(0, cents(purchase.subtotal) + cents(purchase.tax_amount));
}

export function compileLedger(input = {}, options = {}) {
  const basis = options.basis === "cash" ? "cash" : "accrual";
  const vehicles = input.vehicles || [];
  const sales = (input.sales || []).filter((sale) => !isVoidSale(sale));
  const purchases = (input.purchases || []).filter(isActivePurchase);
  const repairs = input.repairs || [];
  const expenses = input.expenses || [];
  const transactions = input.transactions || [];
  const chartAccounts = input.accounts || [];

  const accounts = new Map(CHART.map((account) => [account.code, { ...account }]));
  const define = (code, name, type) => {
    const key = String(code || "").trim();
    if (!key) return null;
    if (!accounts.has(key)) {
      accounts.set(key, { code: key, name: name || key, type: type || inferType(key) });
    }
    return accounts.get(key);
  };
  chartAccounts.forEach((account) => {
    if (account?.account_code) define(account.account_code, account.account_name, account.account_type);
  });

  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const covered = new Set();
  const basisCents = new Map();
  const entries = [];

  const post = ({ date, source, memo, reference, lines }) => {
    const cleaned = (lines || []).filter((line) => line && (line.debit || line.credit));
    if (!date || cleaned.length === 0) return;
    let debit = 0;
    let credit = 0;
    cleaned.forEach((line) => {
      debit += line.debit || 0;
      credit += line.credit || 0;
    });
    if (debit !== credit) {
      throw new Error(`Unbalanced journal ${source} (${memo}): debits ${debit} credits ${credit}`);
    }
    entries.push({
      date,
      source,
      memo,
      reference: reference || "",
      lines: cleaned.map((line) => ({ account: line.account, debit: line.debit || 0, credit: line.credit || 0 })),
    });
  };

  const events = [];

  purchases.forEach((purchase, index) => {
    const date = documentDate(purchase.order_date, purchase.received_date, purchase.created_date);
    events.push({ kind: "purchase", date: date || "0000-01-01", index, purchase });
  });

  vehicles.forEach((vehicle, index) => {
    if (!isDealerVehicle(vehicle)) return;
    const date = documentDate(vehicle.transaction_date, vehicle.created_date);
    events.push({ kind: "vehicle", date: date || "0000-01-01", index, vehicle });
  });

  sales.forEach((sale, index) => {
    const date = documentDate(sale.sale_date, sale.created_date);
    events.push({ kind: "sale", date: date || "0000-01-01", index, sale });
  });

  repairs.forEach((repair, index) => {
    if (repair.status !== "completed" && repair.status !== "picked_up") return;
    const date = documentDate(repair.completion_date, repair.start_date, repair.created_date);
    events.push({ kind: "repair", date: date || "0000-01-01", index, repair });
  });

  expenses.forEach((expense, index) => {
    if (expense.status === "cancelled") return;
    const date = documentDate(expense.expense_date, expense.created_date);
    events.push({ kind: "expense", date: date || "0000-01-01", index, expense });
  });

  const journalEvents = balancedJournals(transactions, chartAccounts, define);
  journalEvents.forEach((journal, index) => {
    events.push({ kind: "journal", date: journal.date || "0000-01-01", index, journal });
  });

  // Purchases that name a vehicle, or a same-day vehicle bill for the same cost, fund that vehicle.
  const explicitCover = new Set();
  purchases.forEach((purchase) => {
    (purchase.items || []).forEach((item) => {
      if (item?.vehicle_id) explicitCover.add(item.vehicle_id);
    });
  });

  let partsOnHand = 0;
  const soldVehicles = new Set();
  const fundedByPurchase = new Set();
  planCapitalizedCosts();

  events.sort((a, b) => a.date.localeCompare(b.date) || a.index - b.index);

  for (const event of events) {
    if (event.kind === "purchase") postPurchase(event);
    else if (event.kind === "vehicle") postVehicle(event);
    else if (event.kind === "sale") postSale(event);
    else if (event.kind === "repair") postRepair(event);
    else if (event.kind === "expense") postExpense(event);
    else if (event.kind === "journal") {
      post({
        date: event.journal.date,
        source: "journal",
        memo: event.journal.memo,
        reference: event.journal.reference,
        lines: event.journal.lines,
      });
    }
  }

  return {
    basis,
    entries,
    accounts,
    accountList: [...accounts.values()].sort((a, b) => a.code.localeCompare(b.code)),
  };

  function planCapitalizedCosts() {
    purchases.forEach((purchase) => {
      const total = resolvedPurchaseTotal(purchase);
      const tax = Math.min(Math.max(0, cents(purchase.tax_amount)), total);
      const net = Math.max(0, total - tax);
      const split = cashSplit(total, purchase.amount_paid, purchase.payment_status);
      const recognized = basis === "cash" ? split.cash : split.bill;
      const linked = (purchase.items || []).filter((item) => item?.vehicle_id);
      if (recognized <= 0 || net <= 0) {
        linked.forEach((item) => fundedByPurchase.add(item.vehicle_id));
        return;
      }
      const shares = [];
      let vehicleNet = 0;
      if (linked.length > 0) {
        linked.forEach((item) => {
          const vehicle = vehicleById.get(item.vehicle_id);
          const line = Math.max(0, cents(item.total || (item.unit_price || 0) * (item.quantity || 0)) || vehicleCostCents(vehicle));
          shares.push({ id: item.vehicle_id, weight: line || vehicleCostCents(vehicle) || 1 });
          fundedByPurchase.add(item.vehicle_id);
        });
        vehicleNet = Math.min(net, shares.reduce((sum, share) => sum + share.weight, 0) || net);
      } else if (purchase.purchase_type === "vehicle") {
        const day = documentDate(purchase.order_date, purchase.received_date, purchase.created_date);
        const sameDay = vehicles.filter((vehicle) => {
          return isDealerVehicle(vehicle)
            && !explicitCover.has(vehicle.id)
            && documentDate(vehicle.transaction_date, vehicle.created_date) === day
            && vehicleCostCents(vehicle) > 0;
        });
        const sameDayCost = sameDay.reduce((sum, vehicle) => sum + vehicleCostCents(vehicle), 0);
        if (sameDay.length > 0 && Math.abs(sameDayCost - net) <= 1) {
          sameDay.forEach((vehicle) => {
            shares.push({ id: vehicle.id, weight: vehicleCostCents(vehicle) });
            fundedByPurchase.add(vehicle.id);
          });
          vehicleNet = net;
        }
      }
      if (purchase.purchase_type === "vehicle") vehicleNet = net;
      const vehicleRec = allocateCents(recognized, [vehicleNet, Math.max(0, net - vehicleNet), tax])[0];
      const amounts = allocateCents(vehicleRec, shares.map((share) => share.weight));
      shares.forEach((share, index) => {
        if (amounts[index] > 0) basisCents.set(share.id, (basisCents.get(share.id) || 0) + amounts[index]);
      });
    });

    vehicles.forEach((vehicle) => {
      if (!isDealerVehicle(vehicle) || fundedByPurchase.has(vehicle.id) || basis === "cash") return;
      const cost = vehicleCostCents(vehicle);
      if (cost > 0) basisCents.set(vehicle.id, (basisCents.get(vehicle.id) || 0) + cost);
    });
  }

  function resolvedPurchaseTotal(purchase) {
    let total = purchaseTotalCents(purchase);
    if (total > 0) return total;
    const linked = (purchase.items || []).filter((item) => item?.vehicle_id);
    total = linked.reduce((sum, item) => sum + vehicleCostCents(vehicleById.get(item.vehicle_id)), 0);
    return total;
  }

  function postPurchase(event) {
    const purchase = event.purchase;
    const total = resolvedPurchaseTotal(purchase);
    const tax = Math.min(Math.max(0, cents(purchase.tax_amount)), total);
    const net = total - tax;
    const split = cashSplit(total, purchase.amount_paid, purchase.payment_status);
    const recognized = basis === "cash" ? split.cash : split.bill;
    if (recognized <= 0 || total <= 0) {
      (purchase.items || []).forEach((item) => item?.vehicle_id && covered.add(item.vehicle_id));
      return;
    }

    const items = Array.isArray(purchase.items) ? purchase.items : [];
    const linked = items.filter((item) => item?.vehicle_id);
    let vehicleNet = 0;
    const vehicleShares = [];
    if (linked.length > 0) {
      linked.forEach((item) => {
        const vehicle = vehicleById.get(item.vehicle_id);
        const line = Math.max(0, cents(item.total || (item.unit_price || 0) * (item.quantity || 0)) || vehicleCostCents(vehicle));
        vehicleShares.push({ id: item.vehicle_id, weight: line || vehicleCostCents(vehicle) });
      });
      vehicleNet = Math.min(net, vehicleShares.reduce((sum, share) => sum + share.weight, 0) || net);
    } else if (purchase.purchase_type === "vehicle") {
      const sameDay = vehicles.filter((vehicle) => {
        return isDealerVehicle(vehicle)
          && !explicitCover.has(vehicle.id)
          && !covered.has(vehicle.id)
          && documentDate(vehicle.transaction_date, vehicle.created_date) === event.date
          && vehicleCostCents(vehicle) > 0;
      });
      const sameDayCost = sameDay.reduce((sum, vehicle) => sum + vehicleCostCents(vehicle), 0);
      if (sameDay.length > 0 && Math.abs(sameDayCost - net) <= 1) {
        sameDay.forEach((vehicle) => vehicleShares.push({ id: vehicle.id, weight: vehicleCostCents(vehicle) }));
        vehicleNet = net;
      } else {
        vehicleNet = net;
      }
    }

    const remainder = Math.max(0, net - vehicleNet);
    let partsNet = 0;
    let fixedNet = 0;
    let expenseNet = 0;
    if (purchase.purchase_type === "parts") partsNet = remainder;
    else if (purchase.purchase_type === "equipment") fixedNet = remainder;
    else if (purchase.purchase_type === "vehicle") vehicleNet += remainder;
    else expenseNet = remainder;

    const weights = [vehicleNet, partsNet, fixedNet, expenseNet, tax];
    const [vehicleRec, partsRec, fixedRec, expenseRec, taxRec] = allocateCents(recognized, weights);
    linked.forEach((item) => fundedByPurchase.add(item.vehicle_id));

    const lines = [];
    if (vehicleRec) lines.push({ account: "1200", debit: vehicleRec, credit: 0 });
    if (partsRec) {
      lines.push({ account: "1210", debit: partsRec, credit: 0 });
      partsOnHand += partsRec;
    }
    if (fixedRec) lines.push({ account: "1500", debit: fixedRec, credit: 0 });
    if (expenseRec) lines.push({ account: "6000", debit: expenseRec, credit: 0 });
    if (taxRec) lines.push({ account: "1150", debit: taxRec, credit: 0 });
    if (basis === "cash") {
      lines.push({ account: "1000", debit: 0, credit: recognized });
    } else {
      if (split.cash) lines.push({ account: "1000", debit: 0, credit: split.cash });
      if (split.credit) lines.push({ account: "2000", debit: 0, credit: split.credit });
    }
    post({
      date: event.date,
      source: "purchase",
      memo: `Purchase from ${purchase.supplier_name || "supplier"}`,
      reference: purchase.purchase_number || purchase.id || "",
      lines,
    });
  }

  function postVehicle(event) {
    const vehicle = event.vehicle;
    if (fundedByPurchase.has(vehicle.id) || basis === "cash") return;
    const cost = basisCents.get(vehicle.id) || 0;
    if (cost <= 0) return;
    const label = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle";
    post({
      date: event.date,
      source: "vehicle",
      memo: `Vehicle acquired: ${label}`,
      reference: vehicle.stock_number || vehicle.vin || vehicle.id || "",
      lines: [
        { account: "1200", debit: cost, credit: 0 },
        { account: "2000", debit: 0, credit: cost },
      ],
    });
  }

  function postSale(event) {
    const sale = event.sale;
    const figures = saleFigures(sale);
    if (figures.gross <= 0 && !sale.vehicle_id) return;
    const split = cashSplit(figures.gross, sale.total_paid, sale.payment_status);
    const recognized = basis === "cash" ? split.cash : figures.gross;
    if (recognized > 0) {
      const pieces = allocateCents(recognized, [figures.revenue, figures.gst, figures.pst, figures.hst]);
      const lines = [];
      if (basis === "cash") lines.push({ account: "1000", debit: recognized, credit: 0 });
      else {
        if (split.cash) lines.push({ account: "1000", debit: split.cash, credit: 0 });
        if (split.credit) lines.push({ account: "1100", debit: split.credit, credit: 0 });
      }
      if (pieces[0]) lines.push({ account: "4000", debit: 0, credit: pieces[0] });
      if (pieces[1]) lines.push({ account: "2100", debit: 0, credit: pieces[1] });
      if (pieces[2]) lines.push({ account: "2110", debit: 0, credit: pieces[2] });
      if (pieces[3]) lines.push({ account: "2120", debit: 0, credit: pieces[3] });
      post({
        date: event.date,
        source: "sale",
        memo: `Sale: ${sale.customer_name || "customer"}`,
        reference: sale.sale_number || sale.id || "",
        lines,
      });
    }
    if (sale.vehicle_id && !soldVehicles.has(sale.vehicle_id)) {
      soldVehicles.add(sale.vehicle_id);
      const cost = basisCents.get(sale.vehicle_id) || 0;
      if (cost > 0) {
        post({
          date: event.date,
          source: "cogs",
          memo: `Cost of vehicle sold${sale.sale_number ? `: ${sale.sale_number}` : ""}`,
          reference: sale.sale_number || sale.id || "",
          lines: [
            { account: "5000", debit: cost, credit: 0 },
            { account: "1200", debit: 0, credit: cost },
          ],
        });
      }
    }
  }

  function postRepair(event) {
    const repair = event.repair;
    const bill = repairBill(repair);
    const split = cashSplit(bill.gross, repair.amount_paid, repair.payment_status);
    const recognized = basis === "cash" ? split.cash : bill.gross;
    if (recognized > 0) {
      const pieces = allocateCents(recognized, [bill.revenue, bill.tax]);
      const lines = [];
      if (basis === "cash") lines.push({ account: "1000", debit: recognized, credit: 0 });
      else {
        if (split.cash) lines.push({ account: "1000", debit: split.cash, credit: 0 });
        if (split.credit) lines.push({ account: "1100", debit: split.credit, credit: 0 });
      }
      if (pieces[0]) lines.push({ account: "4100", debit: 0, credit: pieces[0] });
      if (pieces[1]) lines.push({ account: "2100", debit: 0, credit: pieces[1] });
      post({
        date: event.date,
        source: "repair",
        memo: `Service: ${repair.customer_name || repair.order_number || "repair"}`,
        reference: repair.order_number || repair.id || "",
        lines,
      });
    }
    if (bill.parts > 0) {
      const fromStock = Math.min(partsOnHand, bill.parts);
      const unfunded = bill.parts - fromStock;
      partsOnHand -= fromStock;
      const lines = [{ account: "5100", debit: basis === "cash" ? fromStock : bill.parts, credit: 0 }];
      if (fromStock) lines.push({ account: "1210", debit: 0, credit: fromStock });
      if (basis !== "cash" && unfunded) lines.push({ account: "2000", debit: 0, credit: unfunded });
      if (lines[0].debit > 0) {
        post({
          date: event.date,
          source: "repair-parts",
          memo: `Parts used${repair.order_number ? `: ${repair.order_number}` : ""}`,
          reference: repair.order_number || repair.id || "",
          lines,
        });
      }
    }
    if (basis !== "cash" && bill.labor > 0) {
      post({
        date: event.date,
        source: "repair-labor",
        memo: `Labor${repair.order_number ? `: ${repair.order_number}` : ""}`,
        reference: repair.order_number || repair.id || "",
        lines: [
          { account: "5200", debit: bill.labor, credit: 0 },
          { account: "2300", debit: 0, credit: bill.labor },
        ],
      });
    }
  }

  function postExpense(event) {
    const expense = event.expense;
    const tax = Math.max(0, cents(expense.tax_amount));
    const stated = cents(expense.total_amount);
    const total = stated > 0 ? stated : Math.max(0, cents(expense.amount) + tax);
    const taxCapped = Math.min(tax, total);
    const net = total - taxCapped;
    const pending = expense.status === "pending";
    const split = cashSplit(total, pending ? 0 : dollars(total), pending ? "pending" : "paid");
    const recognized = basis === "cash" ? split.cash : split.bill;
    if (recognized <= 0) return;
    const [netRec, taxRec] = allocateCents(recognized, [net, taxCapped]);
    const lines = [];
    if (netRec) lines.push({ account: "6000", debit: netRec, credit: 0 });
    if (taxRec) lines.push({ account: "1150", debit: taxRec, credit: 0 });
    if (basis === "cash") lines.push({ account: "1000", debit: 0, credit: recognized });
    else {
      if (split.cash) lines.push({ account: "1000", debit: 0, credit: split.cash });
      if (split.credit) lines.push({ account: "2000", debit: 0, credit: split.credit });
    }
    post({
      date: event.date,
      source: "expense",
      memo: expense.description || expense.category || "Operating expense",
      reference: expense.expense_number || expense.reference_number || "",
      lines,
    });
  }
}

function balancedJournals(transactions, chartAccounts, define) {
  const byId = new Map(chartAccounts.map((account) => [account.id, account]));
  const groups = new Map();
  transactions.forEach((txn, index) => {
    if (!txn || txn.status === "cancelled" || txn.status === "pending" || txn.status === "voided" || txn.status === "draft") return;
    const ref = String(txn.reference_type || "").toLowerCase();
    if (SUBLEDGER_REFS.has(ref)) return;
    if (DUPLICATE_GL_TYPES.has(txn.transaction_type)) return;
    const key = txn.transaction_number || txn.journal_id || `row-${txn.id || index}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(txn);
  });

  const journals = [];
  for (const [key, rows] of groups) {
    const lines = [];
    rows.forEach((txn) => lines.push(...journalLines(txn, byId, define)));
    const debit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const credit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
    if (debit === 0 || debit !== credit) continue;
    const date = documentDate(rows[0].transaction_date, rows[0].created_date);
    if (!date) continue;
    journals.push({
      date,
      memo: rows.map((row) => row.description).filter(Boolean)[0] || "Journal entry",
      reference: rows[0].reference_number || key,
      lines,
    });
  }
  return journals;
}

function journalLines(txn, byId, define) {
  const primary = resolveAccount(txn, byId, define, false);
  const contra = resolveAccount(txn, byId, define, true);
  if (!primary) return [];
  const debit = Math.max(0, cents(txn.debit_amount));
  const credit = Math.max(0, cents(txn.credit_amount));
  if (debit > 0 && credit === 0 && contra) {
    return [
      { account: primary.code, debit, credit: 0 },
      { account: contra.code, debit: 0, credit: debit },
    ];
  }
  if (credit > 0 && debit === 0 && contra) {
    return [
      { account: primary.code, debit: 0, credit },
      { account: contra.code, debit: credit, credit: 0 },
    ];
  }
  if (debit > 0 || credit > 0) {
    return [{ account: primary.code, debit, credit }];
  }
  const amount = Math.max(0, cents(txn.amount));
  if (!amount || !contra) return amount ? [{ account: primary.code, debit: normalDebit(primary) ? amount : 0, credit: normalDebit(primary) ? 0 : amount }] : [];
  if (normalDebit(primary)) {
    return [
      { account: primary.code, debit: amount, credit: 0 },
      { account: contra.code, debit: 0, credit: amount },
    ];
  }
  return [
    { account: primary.code, debit: 0, credit: amount },
    { account: contra.code, debit: amount, credit: 0 },
  ];
}

function normalDebit(account) {
  return account.type === "asset" || account.type === "expense";
}

function resolveAccount(txn, byId, define, contra) {
  const code = contra ? txn.contra_account_code : txn.account_code;
  const id = contra ? txn.contra_account_id : txn.account_id;
  const name = contra ? txn.contra_account_name : txn.account_name;
  const linked = id ? byId.get(id) : null;
  const resolvedCode = code || linked?.account_code;
  if (!resolvedCode && !linked) return null;
  const finalCode = resolvedCode || linked.account_code;
  return define(finalCode, name || linked?.account_name, contra ? linked?.account_type : (txn.account_type || linked?.account_type));
}

function signedBalances(ledger, from, to) {
  const totals = new Map();
  const start = from ? dayKey(from) : null;
  const end = to ? dayKey(to) : null;
  for (const entry of ledger.entries) {
    if (start && entry.date < start) continue;
    if (end && entry.date > end) continue;
    for (const line of entry.lines) {
      totals.set(line.account, (totals.get(line.account) || 0) + line.debit - line.credit);
    }
  }
  return totals;
}

function bucketTotals(ledger, from, to) {
  const signed = signedBalances(ledger, from, to);
  const buckets = {};
  for (const [code, amount] of signed) {
    const account = ledger.accounts.get(code) || { code, name: code, type: inferType(code) };
    const bucket = bucketOf(account);
    buckets[bucket] = (buckets[bucket] || 0) + amount;
  }
  return buckets;
}

function value(buckets, name) {
  return dollars(buckets[name] || 0);
}

function incomeCents(buckets) {
  const revenue = -(buckets.vehicleSales || 0) - (buckets.serviceRevenue || 0) - (buckets.partsRevenue || 0) - (buckets.otherRevenue || 0);
  const expenses = (buckets.cogsVehicles || 0) + (buckets.cogsParts || 0) + (buckets.payrollExpense || 0) + (buckets.operatingExpense || 0);
  return revenue - expenses;
}

export function balanceSheet(ledger, asOf) {
  const buckets = bucketTotals(ledger, null, asOf);
  const cashAndBank = value(buckets, "cash");
  const accountsReceivable = value(buckets, "ar");
  const vehicleInventory = value(buckets, "vehicleInventory");
  const partsInventory = value(buckets, "partsInventory");
  const productInventory = value(buckets, "otherInventory");
  const otherInventory = dollars((buckets.partsInventory || 0) + (buckets.otherInventory || 0));
  const taxReceivable = value(buckets, "taxReceivable");
  const otherAssets = value(buckets, "otherAssets");
  const fixedAssets = value(buckets, "fixedAssets");
  const accumulatedDepreciation = dollars(-(buckets.accumDep || 0));
  const netFixedAssets = dollars((buckets.fixedAssets || 0) + (buckets.accumDep || 0));
  const totalCurrentAssets = dollars(
    (buckets.cash || 0) + (buckets.ar || 0) + (buckets.vehicleInventory || 0) + (buckets.partsInventory || 0)
    + (buckets.otherInventory || 0) + (buckets.taxReceivable || 0) + (buckets.otherAssets || 0)
  );
  const totalAssets = dollars(cents(totalCurrentAssets) + cents(netFixedAssets));

  const accountsPayable = dollars(-(buckets.ap || 0));
  const taxPayable = dollars(-(buckets.taxPayable || 0));
  const payrollLiabilities = dollars(-(buckets.payroll || 0));
  const shortTermDebt = dollars(-(buckets.shortTermDebt || 0));
  const longTermDebt = dollars(-(buckets.longTermDebt || 0));
  const otherLiabilities = dollars(-(buckets.otherLiabilities || 0));
  const totalCurrentLiabilities = dollars(cents(accountsPayable) + cents(taxPayable) + cents(payrollLiabilities) + cents(shortTermDebt) + cents(otherLiabilities));
  const totalLiabilities = dollars(cents(totalCurrentLiabilities) + cents(longTermDebt));

  const ownerEquity = dollars(-(buckets.ownerEquity || 0));
  const retainedEarnings = dollars(
    incomeCents(buckets) - (buckets.retainedEarnings || 0) - (buckets.dividends || 0)
  );
  const totalEquity = dollars(cents(ownerEquity) + cents(retainedEarnings));
  const totalLiabilitiesAndEquity = dollars(cents(totalLiabilities) + cents(totalEquity));
  const imbalance = dollars(cents(totalAssets) - cents(totalLiabilitiesAndEquity));

  return {
    basis: ledger.basis,
    asOf: dayKey(asOf),
    cashAndBank,
    accountsReceivable,
    vehicleInventory,
    partsInventory,
    productInventory,
    otherInventory,
    taxReceivable,
    otherAssets,
    totalCurrentAssets,
    fixedAssets,
    accumulatedDepreciation,
    netFixedAssets,
    totalAssets,
    accountsPayable,
    taxPayable,
    payrollLiabilities,
    shortTermDebt,
    otherLiabilities,
    totalCurrentLiabilities,
    longTermDebt,
    totalLiabilities,
    ownerEquity,
    retainedEarnings,
    totalEquity,
    totalLiabilitiesAndEquity,
    imbalance,
    inBalance: Math.abs(imbalance) < 0.001,
  };
}

export function profitAndLoss(ledger, from, to) {
  const buckets = bucketTotals(ledger, from, to);
  const vehicleSalesRevenue = dollars(-(buckets.vehicleSales || 0));
  const serviceRevenue = dollars(-(buckets.serviceRevenue || 0));
  const partsRevenue = dollars(-(buckets.partsRevenue || 0));
  const otherRevenue = dollars(-(buckets.otherRevenue || 0));
  const revenue = dollars(cents(vehicleSalesRevenue) + cents(serviceRevenue) + cents(partsRevenue) + cents(otherRevenue));
  const vehicleCogs = value(buckets, "cogsVehicles");
  const otherCogs = value(buckets, "cogsParts");
  const cogs = dollars(cents(vehicleCogs) + cents(otherCogs));
  const grossProfit = dollars(cents(revenue) - cents(cogs));
  const operatingExpenses = value(buckets, "operatingExpense");
  const payrollExpenses = value(buckets, "payrollExpense");
  const netProfit = dollars(cents(grossProfit) - cents(operatingExpenses) - cents(payrollExpenses));
  return {
    vehicleSalesRevenue,
    serviceRevenue,
    partsRevenue,
    otherRevenue,
    revenue,
    vehicleCogs,
    otherCogs,
    cogs,
    grossProfit,
    operatingExpenses,
    payrollExpenses,
    netProfit,
  };
}

export function cashFlowStatement(ledger, from, to) {
  const start = from ? dayKey(from) : null;
  const end = to ? dayKey(to) : null;
  const beginning = start ? balanceSheet(ledger, shiftDay(start, -1)).cashAndBank : 0;
  let cashFromSales = 0;
  let cashPaidToSuppliers = 0;
  let vehicleInventoryPurchases = 0;
  let operatingExpenses = 0;
  let equipmentPurchases = 0;
  let financing = 0;

  for (const entry of ledger.entries) {
    if (start && entry.date < start) continue;
    if (end && entry.date > end) continue;
    const net = entry.lines.reduce((sum, line) => {
      const account = ledger.accounts.get(line.account);
      return bucketOf(account || { code: line.account }) === "cash" ? sum + line.debit - line.credit : sum;
    }, 0);
    if (net === 0) continue;
    const shares = cashShares(entry, ledger, net);
    const allocated = allocateCents(net, shares.map((share) => share.weight));
    shares.forEach((share, index) => {
      const amount = allocated[index];
      if (share.kind === "customer") cashFromSales += amount;
      else if (share.kind === "supplier") cashPaidToSuppliers -= amount;
      else if (share.kind === "vehicle") vehicleInventoryPurchases -= amount;
      else if (share.kind === "equipment") equipmentPurchases -= amount;
      else if (share.kind === "financing") financing += amount;
      else operatingExpenses -= amount;
    });
  }

  const toDollars = (amount) => dollars(amount);
  const result = {
    cashFromSales: toDollars(cashFromSales),
    cashPaidToSuppliers: toDollars(cashPaidToSuppliers),
    vehicleInventoryPurchases: toDollars(vehicleInventoryPurchases),
    operatingExpenses: toDollars(operatingExpenses),
    equipmentPurchases: toDollars(equipmentPurchases),
    netCashFromOperating: toDollars(cashFromSales - cashPaidToSuppliers - vehicleInventoryPurchases - operatingExpenses),
    netCashFromInvesting: toDollars(-equipmentPurchases),
    netCashFromFinancing: toDollars(financing),
    beginningCash: beginning,
  };
  result.netChangeInCash = dollars(
    cents(result.netCashFromOperating) + cents(result.netCashFromInvesting) + cents(result.netCashFromFinancing)
  );
  result.endingCash = dollars(cents(result.beginningCash) + cents(result.netChangeInCash));
  return result;
}

function cashShares(entry, ledger, net) {
  const hasVehicle = entry.lines.some((line) => bucketOf(ledger.accounts.get(line.account) || { code: line.account }) === "vehicleInventory");
  const hasEquipment = entry.lines.some((line) => bucketOf(ledger.accounts.get(line.account) || { code: line.account }) === "fixedAssets");
  const shares = [];
  for (const line of entry.lines) {
    const account = ledger.accounts.get(line.account) || { code: line.account, type: inferType(line.account) };
    if (bucketOf(account) === "cash") continue;
    const weight = net > 0 ? line.credit : line.debit;
    if (weight <= 0) continue;
    shares.push({ kind: cashKind(bucketOf(account), net > 0, hasVehicle, hasEquipment), weight });
  }
  if (shares.length === 0) shares.push({ kind: net > 0 ? "customer" : "expense", weight: Math.abs(net) });
  return shares;
}

function cashKind(bucket, inflow, hasVehicle, hasEquipment) {
  if (["ownerEquity", "dividends", "shortTermDebt", "longTermDebt", "retainedEarnings"].includes(bucket)) return "financing";
  if (inflow) {
    if (["vehicleSales", "serviceRevenue", "partsRevenue", "otherRevenue", "ar", "taxPayable"].includes(bucket)) return "customer";
    return "customer";
  }
  if (bucket === "vehicleInventory") return "vehicle";
  if (bucket === "fixedAssets") return "equipment";
  if (bucket === "taxReceivable") {
    if (hasVehicle) return "vehicle";
    if (hasEquipment) return "equipment";
    return "supplier";
  }
  if (["partsInventory", "otherInventory", "ap"].includes(bucket)) return "supplier";
  return "expense";
}

function shiftDay(day, days) {
  const [year, month, date] = day.split("-").map(Number);
  const stamp = new Date(Date.UTC(year, month - 1, date));
  stamp.setUTCDate(stamp.getUTCDate() + days);
  return stamp.toISOString().slice(0, 10);
}

export function retainedEarningsStatement(ledger, from, to) {
  const start = from ? dayKey(from) : null;
  const beginningRetainedEarnings = start ? balanceSheet(ledger, shiftDay(start, -1)).retainedEarnings : 0;
  const earnings = profitAndLoss(ledger, from, to);
  const movement = bucketTotals(ledger, from, to);
  const dividends = dollars(movement.dividends || 0);
  const otherAdjustments = dollars(-(movement.retainedEarnings || 0));
  const netIncome = earnings.netProfit;
  const endingRetainedEarnings = dollars(
    cents(beginningRetainedEarnings) + cents(netIncome) + cents(otherAdjustments) - cents(dividends)
  );
  return { beginningRetainedEarnings, netIncome, dividends, otherAdjustments, endingRetainedEarnings };
}

export function trialBalance(ledger, asOf) {
  const signed = signedBalances(ledger, null, asOf);
  const rows = [];
  for (const [code, amount] of signed) {
    if (amount === 0) continue;
    const account = ledger.accounts.get(code) || { code, name: code, type: inferType(code) };
    rows.push({
      code: account.code,
      name: account.name,
      type: account.type,
      group: groupName(account.type),
      debit: amount > 0 ? dollars(amount) : 0,
      credit: amount < 0 ? dollars(-amount) : 0,
    });
  }
  rows.sort((a, b) => a.code.localeCompare(b.code));
  const totalDebits = dollars(rows.reduce((sum, row) => sum + cents(row.debit), 0));
  const totalCredits = dollars(rows.reduce((sum, row) => sum + cents(row.credit), 0));
  return {
    accounts: rows,
    totalDebits,
    totalCredits,
    difference: dollars(cents(totalDebits) - cents(totalCredits)),
  };
}

function groupName(type) {
  if (type === "asset") return "Assets";
  if (type === "liability") return "Liabilities";
  if (type === "equity") return "Equity";
  if (type === "revenue") return "Revenue";
  return "Expenses";
}

export function accountActivity(ledger, codes, { from, to, normal = "debit" } = {}) {
  const wanted = new Set(codes);
  const start = from ? dayKey(from) : null;
  const end = to ? dayKey(to) : null;
  const items = [];
  for (const entry of ledger.entries) {
    if (start && entry.date < start) continue;
    if (end && entry.date > end) continue;
    for (const line of entry.lines) {
      if (!wanted.has(line.account)) continue;
      const raw = line.debit - line.credit;
      const amount = normal === "credit" ? -raw : raw;
      if (amount === 0) continue;
      items.push({
        date: entry.date,
        description: entry.memo,
        reference: entry.reference,
        amount: dollars(amount),
      });
    }
  }
  return items;
}

export function generalLedgerRows(ledger) {
  const rows = [];
  ledger.entries.forEach((entry, entryIndex) => {
    entry.lines.forEach((line, lineIndex) => {
      const account = ledger.accounts.get(line.account) || { code: line.account, name: line.account, type: "asset" };
      rows.push({
        id: `${entry.source}-${entryIndex}-${lineIndex}`,
        transaction_date: entry.date,
        account_code: account.code,
        account_name: account.name,
        account_type: account.type,
        category: account.type,
        debit_amount: dollars(line.debit),
        credit_amount: dollars(line.credit),
        amount: dollars(line.debit || line.credit),
        description: entry.memo,
        reference_number: entry.reference,
        reference_type: entry.source,
        transaction_number: entry.reference || entry.source,
      });
    });
  });
  return rows;
}

export function statements(ledger, period = {}) {
  return {
    balanceSheet: balanceSheet(ledger, period.to),
    profitAndLoss: profitAndLoss(ledger, period.from, period.to),
    cashFlow: cashFlowStatement(ledger, period.from, period.to),
    retainedEarnings: retainedEarningsStatement(ledger, period.from, period.to),
    trialBalance: trialBalance(ledger, period.to),
  };
}
