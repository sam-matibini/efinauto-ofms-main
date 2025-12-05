import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import AccountDialog from "./AccountDialog";

export default function ChartOfAccounts() {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts', selectedCompanyId],
    queryFn: () => base44.entities.Account.filter({ company_id: selectedCompanyId }, 'account_code'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (accountId) => base44.entities.Account.delete(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success("Account deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete account");
    }
  });

  const handleEdit = (account) => {
    setEditingAccount(account);
    setDialogOpen(true);
  };

  const handleDelete = (accountId) => {
    if (confirm("Are you sure you want to delete this account?")) {
      deleteAccountMutation.mutate(accountId);
    }
  };

  const getTypeBadge = (type) => {
    const colors = {
      asset: 'bg-blue-100 text-blue-700',
      liability: 'bg-orange-100 text-orange-700',
      equity: 'bg-purple-100 text-purple-700',
      revenue: 'bg-green-100 text-green-700',
      expense: 'bg-red-100 text-red-700',
      cogs: 'bg-amber-100 text-amber-700',
      bank: 'bg-teal-100 text-teal-700',
      credit_card: 'bg-pink-100 text-pink-700',
      inventory: 'bg-emerald-100 text-emerald-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  // Standard Chart of Accounts Reference
  const standardChartOfAccounts = [
    // Assets (1000-1999)
    { code: '1000', name: 'Cash / Bank Account', type: 'asset', category: 'Current Assets' },
    { code: '1050', name: 'Undeposited Funds', type: 'asset', category: 'Current Assets' },
    { code: '1100', name: 'Accounts Receivable', type: 'asset', category: 'Current Assets' },
    { code: '1150', name: 'GST/HST Receivable (ITC)', type: 'asset', category: 'Current Assets' },
    { code: '1200', name: 'Vehicle Inventory', type: 'asset', category: 'Inventory' },
    { code: '1210', name: 'Parts Inventory', type: 'asset', category: 'Inventory' },
    { code: '1220', name: 'Product Inventory', type: 'asset', category: 'Inventory' },
    { code: '1300', name: 'Prepaid Expenses', type: 'asset', category: 'Current Assets' },
    { code: '1400', name: 'Fixed Assets', type: 'asset', category: 'Fixed Assets' },
    { code: '1410', name: 'Accumulated Depreciation', type: 'asset', category: 'Fixed Assets' },
    // Liabilities (2000-2999)
    { code: '2000', name: 'Accounts Payable', type: 'liability', category: 'Current Liabilities' },
    { code: '2100', name: 'GST Payable', type: 'liability', category: 'Tax Liabilities' },
    { code: '2110', name: 'PST/QST Payable', type: 'liability', category: 'Tax Liabilities' },
    { code: '2120', name: 'HST Payable', type: 'liability', category: 'Tax Liabilities' },
    { code: '2300', name: 'Wages Payable', type: 'liability', category: 'Current Liabilities' },
    { code: '2400', name: 'Payroll Liabilities', type: 'liability', category: 'Current Liabilities' },
    // Equity (3000-3999)
    { code: '3000', name: "Owner's Equity", type: 'equity', category: 'Equity' },
    { code: '3100', name: 'Retained Earnings', type: 'equity', category: 'Equity' },
    // Revenue (4000-4999)
    { code: '4000', name: 'Vehicle Sales Revenue', type: 'revenue', category: 'Sales' },
    { code: '4100', name: 'Service Revenue', type: 'revenue', category: 'Sales' },
    { code: '4200', name: 'Freight Service Revenue', type: 'revenue', category: 'Sales' },
    { code: '4400', name: 'Salvage Revenue', type: 'revenue', category: 'Other Income' },
    { code: '4500', name: 'Interest Income', type: 'revenue', category: 'Other Income' },
    { code: '4600', name: 'Foreign Exchange Gain', type: 'revenue', category: 'Other Income' },
    { code: '4700', name: 'Inventory Adjustment Gain', type: 'revenue', category: 'Other Income' },
    // COGS (5000-5499)
    { code: '5000', name: 'Cost of Vehicles Sold', type: 'expense', category: 'Cost of Goods Sold' },
    { code: '5100', name: 'Cost of Parts Sold', type: 'expense', category: 'Cost of Goods Sold' },
    { code: '5200', name: 'Labor Expense', type: 'expense', category: 'Cost of Goods Sold' },
    { code: '5400', name: 'Shipping & Freight Expense', type: 'expense', category: 'Cost of Goods Sold' },
    { code: '5500', name: 'Inventory Shrinkage', type: 'expense', category: 'Cost of Goods Sold' },
    { code: '5510', name: 'Inventory Write-Off', type: 'expense', category: 'Cost of Goods Sold' },
    // Operating Expenses (6000-6999)
    { code: '6100', name: 'Wages & Salaries Expense', type: 'expense', category: 'Operating Expenses' },
    { code: '6110', name: 'CPP Expense', type: 'expense', category: 'Operating Expenses' },
    { code: '6120', name: 'EI Expense', type: 'expense', category: 'Operating Expenses' },
    { code: '6200', name: 'Bank Charges & Fees', type: 'expense', category: 'Operating Expenses' },
    { code: '6300', name: 'Foreign Exchange Loss', type: 'expense', category: 'Operating Expenses' },
    { code: '6400', name: 'Depreciation Expense', type: 'expense', category: 'Operating Expenses' },
  ];

  // Organize accounts into hierarchical structure
  const groupedAccounts = accounts.reduce((groups, account) => {
    const type = account.account_type;
    if (!groups[type]) groups[type] = [];
    
    // Only add top-level accounts here (those without parent_account_id)
    if (!account.parent_account_id) {
      // Find all sub-accounts for this account
      const subAccounts = accounts.filter(acc => acc.parent_account_id === account.id);
      groups[type].push({ ...account, subAccounts });
    }
    return groups;
  }, {});

  const exportToCSV = () => {
    const headers = ['Account Code', 'Account Name', 'Type', 'Category', 'Balance', 'Description'];
    const rows = accounts.map(acc => [
      acc.account_code,
      acc.account_name,
      acc.account_type,
      acc.account_category,
      acc.balance || 0,
      acc.description || ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chart-of-accounts-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Chart of Accounts</h2>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button onClick={() => { setEditingAccount(null); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Account
          </Button>
        </div>
      </div>

      {accounts.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-xl font-semibold mb-2">No accounts yet</p>
            <p className="text-gray-500 mb-4">Add accounts manually using the button above</p>
          </CardContent>
        </Card>
      )}

      {Object.entries(groupedAccounts).map(([type, typeAccounts]) => (
        <Card key={type}>
          <CardHeader>
            <CardTitle className="capitalize flex items-center gap-2">
              {type}
              <Badge className={getTypeBadge(type)}>{typeAccounts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {typeAccounts.map(account => (
                <div key={account.id}>
                  {/* Parent Account */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <span className="font-mono text-sm font-semibold text-gray-600 w-20">
                        {account.account_code}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold">{account.account_name}</p>
                        {account.description && (
                          <p className="text-sm text-gray-600">{account.description}</p>
                        )}
                      </div>
                      <Badge variant="outline">{account.account_category}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg w-32 text-right">
                        ${account.balance?.toLocaleString() || '0'}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(account)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(account.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Sub-Accounts */}
                  {account.subAccounts?.length > 0 && (
                    <div className="ml-8 mt-2 space-y-2">
                      {account.subAccounts.map(subAccount => (
                        <div
                          key={subAccount.id}
                          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <span className="font-mono text-sm text-gray-500 w-20">
                              {subAccount.account_code}
                            </span>
                            <div className="flex-1">
                              <p className="font-medium text-gray-700">{subAccount.account_name}</p>
                              {subAccount.description && (
                                <p className="text-xs text-gray-500">{subAccount.description}</p>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs">{subAccount.account_category}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700 w-32 text-right">
                              ${subAccount.balance?.toLocaleString() || '0'}
                            </span>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(subAccount)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDelete(subAccount.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {dialogOpen && (
        <AccountDialog
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setEditingAccount(null); }}
          account={editingAccount}
          accounts={accounts}
        />
      )}
    </div>
  );
}