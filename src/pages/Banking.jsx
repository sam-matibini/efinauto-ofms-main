import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, CreditCard, Receipt, GitCompare, Settings, Building2, Brain, Landmark } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import BankAccountDialog from "@/components/banking/BankAccountDialog.jsx";
import BankAccountsList from "@/components/banking/BankAccountsList.jsx";
import TransactionsList from "@/components/banking/TransactionsList.jsx";
import ReconciliationManager from "@/components/banking/ReconciliationManager.jsx";
import TransactionRulesManager from "@/components/banking/TransactionRulesManager.jsx";
import BankStatementImport from "@/components/banking/BankStatementImport.jsx";
import AITransactionCategorizer from "@/components/accounting/AITransactionCategorizer.jsx";
import EfinMoneyTab from "@/components/efinmoney/EfinMoneyTab";
import { efinMoneyApi } from "@/api/efinmoney";

export default function BankingPage() {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'accounts';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const formatCompactCurrency = (amount, currency = "USD", locale = "en-US") => {
    const value = Number(amount) || 0;
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value);
    } catch {
      return `${currency} ${value.toFixed(2)}`;
    }
  };

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bankAccounts', selectedCompanyId],
    queryFn: () => supabase.entities.BankAccount.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['bankTransactions', selectedCompanyId],
    queryFn: () => supabase.entities.BankTransaction.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: reconciliations = [] } = useQuery({
    queryKey: ['bankReconciliations', selectedCompanyId],
    queryFn: () => supabase.entities.BankReconciliation.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['transactionRules', selectedCompanyId],
    queryFn: () => supabase.entities.TransactionRule.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: glAccounts = [] } = useQuery({
    queryKey: ['accounts', selectedCompanyId],
    queryFn: () => supabase.entities.Account.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: company } = useQuery({
    queryKey: ['company', selectedCompanyId],
    queryFn: () => supabase.entities.Company.get(selectedCompanyId),
    enabled: !!selectedCompanyId,
  });

  const getCurrencyFromCountry = (country) => {
    if (!country) return null;
    const c = country.toLowerCase();
    if (c.includes('canada')) return 'CAD';
    if (c.includes('nigeria')) return 'NGN';
    if (c.includes('ghana')) return 'GHS';
    if (c.includes('kenya')) return 'KES';
    if (c.includes('united states') || c.includes('usa') || c === 'us') return 'USD';
    if (c.includes('united kingdom') || c.includes('uk')) return 'GBP';
    if (c.includes('euro') || c.includes('france') || c.includes('germany')) return 'EUR';
    return null;
  };

  const { data: efinStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['efinmoney', 'status', selectedCompanyId],
    queryFn: () => efinMoneyApi.status(selectedCompanyId),
    enabled: !!selectedCompanyId,
    staleTime: 30000,
  });

  const efinAccountsConnected = efinStatus?.status === 'connected';

  const { data: efinAccounts = [], isLoading: accountsLoading, refetch: refetchAccounts } = useQuery({
    queryKey: ['efinmoney', 'accounts', selectedCompanyId],
    queryFn: () => efinMoneyApi.accounts(selectedCompanyId),
    enabled: !!selectedCompanyId && efinAccountsConnected,
    staleTime: 30000,
    refetchInterval: efinAccountsConnected ? 60000 : false,
    refetchOnWindowFocus: efinAccountsConnected,
  });

   const { data: efinBalances = [], isLoading: balancesLoading, refetch: refetchBalances } = useQuery({
    queryKey: ['efinmoney', 'balances', selectedCompanyId],
    queryFn: () => efinMoneyApi.balances(selectedCompanyId),
    enabled: !!selectedCompanyId && efinAccountsConnected,
    staleTime: 30000,
    refetchInterval: efinAccountsConnected ? 60000 : false,
    refetchOnWindowFocus: efinAccountsConnected,
  });

  const createAccountMutation = useMutation({
    mutationFn: (data) => supabase.entities.BankAccount.create({ ...data, company_id: selectedCompanyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
      setAccountDialogOpen(false);
      setEditingAccount(null);
      toast.success("Bank account created successfully");
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, data }) => supabase.entities.BankAccount.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
      setAccountDialogOpen(false);
      setEditingAccount(null);
      toast.success("Bank account updated successfully");
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id) => supabase.entities.BankAccount.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
      toast.success("Bank account deleted successfully");
    },
  });

  const handleSaveAccount = (data) => {
    if (editingAccount) {
      updateAccountMutation.mutate({ id: editingAccount.id, data });
    } else {
      createAccountMutation.mutate(data);
    }
  };

  const totalAccountsCount = bankAccounts.length + (efinStatus?.status === 'connected' ? (efinAccounts?.length + 1 || 0) : 0);
  const activeEfinCount = efinStatus?.status === 'connected' ? (efinAccounts?.filter((a) => a.status === 'active')?.length + efinBalances?.length || 0) : 0;

  // Calculate balances by currency
  const balanceByCurrency = {};
  
  bankAccounts.forEach((a) => {
    const currency = a.currency || 'USD';
    const amount = Number(a.current_balance || 0);
    if (!balanceByCurrency[currency]) balanceByCurrency[currency] = 0;
    balanceByCurrency[currency] += amount;
  });

  if (efinStatus?.status === 'connected') {
    efinAccounts?.forEach((a) => {
      const currency = a.currency || 'USD';
      let amount = 0;
      if (a.balance && typeof a.balance === 'object') {
        amount = Number(a.balance.amount) || 0;
      } else if (typeof a.balance === 'number') {
        amount = a.balance;
      }
      if (!balanceByCurrency[currency]) balanceByCurrency[currency] = 0;
      balanceByCurrency[currency] += amount;
    });

    efinBalances?.forEach((b) => {
      const currency = b.currency || b.currency_code || 'USD';
      const amount = Number(b.balance || b.available_balance || 0);
      if (!balanceByCurrency[currency]) balanceByCurrency[currency] = 0;
      balanceByCurrency[currency] += amount;
    });
  }

  const currencies = Object.keys(balanceByCurrency);
  const baseCurrency = company?.currency || getCurrencyFromCountry(company?.country) || bankAccounts[0]?.currency || 'CAD';
  const symbolsToConvert = currencies.filter(c => c !== baseCurrency);

  const { data: ratesData, isLoading: ratesLoading } = useQuery({
    queryKey: ['efinmoney', 'rates', selectedCompanyId, baseCurrency, symbolsToConvert.join(',')],
    queryFn: () => efinMoneyApi.rates(selectedCompanyId, baseCurrency, symbolsToConvert),
    enabled: !!selectedCompanyId && symbolsToConvert.length > 0 && efinAccountsConnected,
    staleTime: 300000,
  });

  const rates = ratesData?.rates || ratesData || {};
  const rateMap = {};
  if (Array.isArray(rates)) {
    rates.forEach((r) => {
      if (r && r.to) {
        rateMap[r.to] = r.rate || r.mid_rate || 1;
      }
    });
  } else if (typeof rates === 'object') {
    Object.keys(rates).forEach((k) => {
      const v = rates[k];
      if (typeof v === 'object' && v !== null) {
        rateMap[k] = v.rate || v.mid_rate || 1;
      } else {
        rateMap[k] = v;
      }
    });
  }

  const needsRates = symbolsToConvert.length > 0 && efinAccountsConnected;
  const ratesReady = !needsRates || (!ratesLoading && Object.keys(rateMap).length > 0);

  let totalBalanceInBase = 0;
  if (ratesReady) {
    currencies.forEach((c) => {
      const amount = balanceByCurrency[c];
      if (c === baseCurrency) {
        totalBalanceInBase += amount;
      } else {
        const rate = rateMap[c] || 1;
        if (rate && rate > 0) {
          totalBalanceInBase += amount / rate;
        } else {
          totalBalanceInBase += amount;
        }
      }
    });
  } else {
    // While rates are loading, don't show converted total - keep as 0 or sum unconverted as fallback
    // But better to sum in base currency only what we can, rest stays 0 to avoid wrong display
    currencies.forEach((c) => {
      if (c === baseCurrency) {
        totalBalanceInBase += balanceByCurrency[c];
      }
      // Don't add foreign currency amounts until rates are ready
    });
  }

  const stats = {
    totalAccounts: totalAccountsCount,
    activeAccounts: bankAccounts.filter(a => a.status === 'active').length + activeEfinCount,
    totalBalance: totalBalanceInBase,
    balanceByCurrency,
    baseCurrency,
    pendingTransactions: transactions.filter(t => t.status === 'pending').length,
    balanceLoading: needsRates && !ratesReady,
  };

  if (!selectedCompanyId) {
    return (
      <div className="p-6">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <p className="text-yellow-800">Please select a company to manage banking.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 md:px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Banking & Reconciliation</h1>
            <p className="text-xs md:text-sm text-gray-300 mt-1">AI-powered banking and transaction management</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={() => setImportDialogOpen(true)}
              variant="outline"
              className="bg-white text-sm"
              size="sm"
            >
              <Receipt className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Import Statement</span>
              <span className="sm:hidden">Import</span>
            </Button>
            <Button 
              onClick={() => {
                setEditingAccount(null);
                setAccountDialogOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-sm"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Add Bank Account</span>
              <span className="sm:hidden">Add Account</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Total Accounts</p>
                  <h3 className="text-xl md:text-2xl font-bold text-blue-600">{stats.totalAccounts}</h3>
                </div>
                <Building2 className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Active Accounts/Wallets</p>
                  <h3 className="text-xl md:text-2xl font-bold text-green-600">{stats.activeAccounts}</h3>
                </div>
                <CreditCard className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div>
                <p className="text-xs md:text-sm text-gray-600">Total Balance</p>
                <h3 className="text-lg md:text-2xl font-bold text-gray-900">
                  {stats.balanceLoading ? '...' : formatCompactCurrency(stats.totalBalance, stats.baseCurrency || 'CAD')}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div>
                <p className="text-xs md:text-sm text-gray-600">Pending</p>
                <h3 className="text-xl md:text-2xl font-bold text-orange-600">{stats.pendingTransactions}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full overflow-x-auto flex-nowrap justify-start">
            <TabsTrigger value="accounts" className="flex items-center gap-2 text-xs md:text-sm">
              <CreditCard className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Bank Accounts</span>
              <span className="sm:hidden">Accounts</span>
            </TabsTrigger>
            <TabsTrigger value="efinmoney" className="flex items-center gap-2 text-xs md:text-sm">
              <Landmark className="w-3 h-3 md:w-4 md:h-4" />
              <span>eFinMoney</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2 text-xs md:text-sm">
              <Receipt className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Transactions</span>
              <span className="sm:hidden">Trans.</span>
            </TabsTrigger>
            <TabsTrigger value="reconciliation" className="flex items-center gap-2 text-xs md:text-sm">
              <GitCompare className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Reconciliation</span>
              <span className="sm:hidden">Recon.</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2 text-xs md:text-sm">
              <Settings className="w-3 h-3 md:w-4 md:h-4" />
              Rules
            </TabsTrigger>
            <TabsTrigger value="ai-categorize" className="flex items-center gap-2 text-xs md:text-sm">
              <Brain className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">AI Categorizer</span>
              <span className="sm:hidden">AI</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accounts">
            <BankAccountsList
              accounts={bankAccounts}
              onEdit={(account) => {
                setEditingAccount(account);
                setAccountDialogOpen(true);
              }}
              onDelete={(id) => {
                if (confirm('Are you sure you want to delete this account?')) {
                  deleteAccountMutation.mutate(id);
                }
              }}
            />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionsList
              transactions={transactions}
              bankAccounts={bankAccounts}
              glAccounts={glAccounts}
              rules={rules}
              companyId={selectedCompanyId}
            />
          </TabsContent>

          <TabsContent value="reconciliation">
            <ReconciliationManager
              bankAccounts={bankAccounts}
              transactions={transactions}
              reconciliations={reconciliations}
              companyId={selectedCompanyId}
            />
          </TabsContent>

          <TabsContent value="rules">
            <TransactionRulesManager
              rules={rules}
              glAccounts={glAccounts}
              companyId={selectedCompanyId}
            />
          </TabsContent>

          <TabsContent value="ai-categorize">
            <AITransactionCategorizer
              uncategorizedTransactions={transactions.filter(t => !t.account_id && t.status !== 'matched')}
              onCategorize={async (transactionId, data) => {
                await supabase.entities.BankTransaction.update(transactionId, data);
                queryClient.invalidateQueries({ queryKey: ['bankTransactions'] });
              }}
            />
          </TabsContent>

          <TabsContent value="efinmoney">
            <EfinMoneyTab 
              companyId={selectedCompanyId} 
              status={efinStatus} 
              accounts={efinAccounts}
              balances={efinBalances}
              statusLoading={statusLoading}
              accountsLoading={accountsLoading}
              balancesLoading={balancesLoading}
              refetchAccounts={refetchAccounts}
              refetchBalances={refetchBalances}
              connected={efinAccountsConnected}
             />
          </TabsContent>
        </Tabs>
      </div>

      <BankAccountDialog
        open={accountDialogOpen}
        onClose={() => {
          setAccountDialogOpen(false);
          setEditingAccount(null);
        }}
        account={editingAccount}
        onSave={handleSaveAccount}
        glAccounts={glAccounts}
        isLoading={createAccountMutation.isPending || updateAccountMutation.isPending}
      />

      <BankStatementImport
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        bankAccounts={bankAccounts}
        glAccounts={glAccounts}
        companyId={selectedCompanyId}
        transactions={transactions}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['bankTransactions'] });
          setImportDialogOpen(false);
        }}
      />
    </div>
  );
}