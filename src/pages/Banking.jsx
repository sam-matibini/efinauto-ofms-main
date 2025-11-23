import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, CreditCard, Receipt, GitCompare, Settings, Building2 } from "lucide-react";
import { toast } from "sonner";
import BankAccountDialog from "@/components/banking/BankAccountDialog";
import BankAccountsList from "@/components/banking/BankAccountsList";
import TransactionsList from "@/components/banking/TransactionsList";
import ReconciliationManager from "@/components/banking/ReconciliationManager";
import TransactionRulesManager from "@/components/banking/TransactionRulesManager";
import BankStatementImport from "@/components/banking/BankStatementImport";

export default function BankingPage() {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bankAccounts', selectedCompanyId],
    queryFn: () => base44.entities.BankAccount.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['bankTransactions', selectedCompanyId],
    queryFn: () => base44.entities.BankTransaction.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: reconciliations = [] } = useQuery({
    queryKey: ['bankReconciliations', selectedCompanyId],
    queryFn: () => base44.entities.BankReconciliation.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['transactionRules', selectedCompanyId],
    queryFn: () => base44.entities.TransactionRule.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: glAccounts = [] } = useQuery({
    queryKey: ['accounts', selectedCompanyId],
    queryFn: () => base44.entities.Account.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const createAccountMutation = useMutation({
    mutationFn: (data) => base44.entities.BankAccount.create({ ...data, company_id: selectedCompanyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
      setAccountDialogOpen(false);
      setEditingAccount(null);
      toast.success("Bank account created successfully");
    },
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BankAccount.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
      setAccountDialogOpen(false);
      setEditingAccount(null);
      toast.success("Bank account updated successfully");
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id) => base44.entities.BankAccount.delete(id),
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
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Banking & Reconciliation</h1>
            <p className="text-sm text-gray-300 mt-1">AI-powered banking and transaction management</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setImportDialogOpen(true)}
              variant="outline"
              className="bg-white"
            >
              <Receipt className="w-4 h-4 mr-2" />
              Import Statement
            </Button>
            <Button 
              onClick={() => {
                setEditingAccount(null);
                setAccountDialogOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Bank Account
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Accounts</p>
                  <h3 className="text-2xl font-bold text-blue-600">{stats.totalAccounts}</h3>
                </div>
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Accounts</p>
                  <h3 className="text-2xl font-bold text-green-600">{stats.activeAccounts}</h3>
                </div>
                <CreditCard className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm text-gray-600">Total Balance</p>
                <h3 className="text-2xl font-bold text-gray-900">${stats.totalBalance.toLocaleString()}</h3>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm text-gray-600">Pending Transactions</p>
                <h3 className="text-2xl font-bold text-orange-600">{stats.pendingTransactions}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="accounts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="accounts" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Bank Accounts
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="reconciliation" className="flex items-center gap-2">
              <GitCompare className="w-4 h-4" />
              Reconciliation
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Transaction Rules
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
        companyId={selectedCompanyId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['bankTransactions'] });
          setImportDialogOpen(false);
        }}
      />
    </div>
  );
}