import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, CreditCard, Receipt, GitCompare, Settings, Building2, Brain } from "lucide-react";
import { toast } from "sonner";
import BankAccountDialog from "@/components/banking/BankAccountDialog.jsx";
import BankAccountsList from "@/components/banking/BankAccountsList.jsx";
import TransactionsList from "@/components/banking/TransactionsList.jsx";
import ReconciliationManager from "@/components/banking/ReconciliationManager.jsx";
import TransactionRulesManager from "@/components/banking/TransactionRulesManager.jsx";
import BankStatementImport from "@/components/banking/BankStatementImport.jsx";
import AITransactionCategorizer from "@/components/accounting/AITransactionCategorizer.jsx";

export default function BankingPage() {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

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

  const stats = {
    totalAccounts: bankAccounts.length,
    activeAccounts: bankAccounts.filter(a => a.status === 'active').length,
    totalBalance: bankAccounts.reduce((sum, a) => sum + (a.current_balance || 0), 0),
    pendingTransactions: transactions.filter(t => t.status === 'pending').length,
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
                  <p className="text-xs md:text-sm text-gray-600">Active</p>
                  <h3 className="text-xl md:text-2xl font-bold text-green-600">{stats.activeAccounts}</h3>
                </div>
                <CreditCard className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div>
                <p className="text-xs md:text-sm text-gray-600">Balance</p>
                <h3 className="text-lg md:text-2xl font-bold text-gray-900">${(stats.totalBalance / 1000).toFixed(1)}K</h3>
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
        <Tabs defaultValue="accounts" className="space-y-4">
          <TabsList className="w-full overflow-x-auto flex-nowrap justify-start">
            <TabsTrigger value="accounts" className="flex items-center gap-2 text-xs md:text-sm">
              <CreditCard className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Bank Accounts</span>
              <span className="sm:hidden">Accounts</span>
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
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['bankTransactions'] });
          setImportDialogOpen(false);
        }}
      />
    </div>
  );
}