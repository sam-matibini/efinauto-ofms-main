import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { useCompany } from "@/components/shared/CompanyContext";
import { compileLedger } from "@/lib/financialStatements";

function useEntity(key, entity, companyId) {
  return useQuery({
    queryKey: [key, companyId],
    queryFn: () => supabase.entities[entity].filter({ company_id: companyId }),
    enabled: !!companyId,
    initialData: [],
  });
}

export default function useFinancialBooks(basis = "accrual") {
  const { selectedCompanyId } = useCompany();
  const transactions = useEntity("transactions", "Transaction", selectedCompanyId);
  const accounts = useEntity("accounts", "Account", selectedCompanyId);
  const vehicles = useEntity("vehicles", "Vehicle", selectedCompanyId);
  const sales = useEntity("sales", "Sale", selectedCompanyId);
  const purchases = useEntity("purchases", "Purchase", selectedCompanyId);
  const repairs = useEntity("repairs", "RepairOrder", selectedCompanyId);
  const expenses = useEntity("expenses", "Expense", selectedCompanyId);
  const normalizedBasis = basis === "cash" ? "cash" : "accrual";

  const ledger = useMemo(() => compileLedger({
    transactions: transactions.data,
    accounts: accounts.data,
    vehicles: vehicles.data,
    sales: sales.data,
    purchases: purchases.data,
    repairs: repairs.data,
    expenses: expenses.data,
  }, { basis: normalizedBasis }), [
    transactions.data,
    accounts.data,
    vehicles.data,
    sales.data,
    purchases.data,
    repairs.data,
    expenses.data,
    normalizedBasis,
  ]);

  return { ledger, accounts: accounts.data || [] };
}
