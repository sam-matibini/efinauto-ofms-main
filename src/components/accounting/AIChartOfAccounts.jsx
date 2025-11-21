import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Download, Printer, Sparkles, Loader2, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import AccountDialog from "./AccountDialog";
import ImportAccountsWizard from "./ImportAccountsWizard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AIChartOfAccounts() {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [businessDescription, setBusinessDescription] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: company } = useQuery({
    queryKey: ['company', selectedCompanyId],
    queryFn: () => base44.entities.Company.filter({ id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    select: (data) => data[0]
  });

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

  const generateAccountsMutation = useMutation({
    mutationFn: async (description) => {
      const prompt = `Generate a comprehensive chart of accounts for this business: ${description || company?.name + ' - automotive dealership with sales, service, parts, and export operations'}.

Create accounts for:
- Assets (cash, AR, inventory, vehicles, parts, equipment)
- Liabilities (AP, loans, payroll liabilities, sales tax payable)
- Equity (owner's equity, retained earnings)
- Revenue (vehicle sales, service revenue, parts sales, export revenue)
- Expenses (COGS, wages, rent, utilities, marketing, depreciation, payroll taxes)

Return ONLY a JSON array with this structure:
[
  {
    "account_code": "1000",
    "account_name": "Cash",
    "account_type": "asset",
    "account_category": "cash",
    "balance": 0,
    "description": "Operating cash account"
  }
]

Include 40-50 essential accounts. Use standard account codes (1000s=Assets, 2000s=Liabilities, 3000s=Equity, 4000s=Revenue, 5000s=Expenses).`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      // Parse the result - it should be a JSON string or object
      let accountsArray = [];
      if (typeof result === 'string') {
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          accountsArray = JSON.parse(jsonMatch[0]);
        }
      } else if (Array.isArray(result)) {
        accountsArray = result;
      } else if (result.accounts) {
        accountsArray = result.accounts;
      }

      return accountsArray;
    },
    onSuccess: async (generatedAccounts) => {
      try {
        // Create accounts in batches
        let created = 0;
        for (const account of generatedAccounts) {
          try {
            await base44.entities.Account.create({
              company_id: selectedCompanyId,
              account_code: account.account_code,
              account_name: account.account_name,
              account_type: account.account_type,
              account_category: account.account_category || 'other',
              balance: account.balance || 0,
              description: account.description || ''
            });
            created++;
          } catch (err) {
            console.error('Failed to create account:', account, err);
          }
        }
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        toast.success(`Generated ${created} accounts successfully`);
        setAiDialogOpen(false);
        setGenerating(false);
      } catch (error) {
        toast.error("Error creating accounts");
        setGenerating(false);
      }
    },
    onError: (error) => {
      toast.error("Failed to generate accounts: " + error.message);
      setGenerating(false);
    }
  });

  const handleGenerateAccounts = () => {
    setGenerating(true);
    generateAccountsMutation.mutate(businessDescription);
  };

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
      expense: 'bg-red-100 text-red-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const filteredAccounts = accounts.filter(acc => 
    searchTerm === "" || 
    acc.account_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedAccounts = filteredAccounts.reduce((groups, account) => {
    const type = account.account_type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(account);
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

  if (!selectedCompanyId) {
    return (
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="p-6">
          <p className="text-yellow-800 font-semibold">⚠️ Please select a company first</p>
          <p className="text-sm text-yellow-700 mt-2">You need to select a company from the dropdown at the top before creating accounts.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Chart of Accounts</h2>
          <p className="text-sm text-gray-600">AI-powered account management</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button onClick={() => setImportDialogOpen(true)} variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setAiDialogOpen(true)} variant="outline" className="bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Generate
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
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-500" />
            <p className="text-xl font-semibold mb-2">No chart of accounts yet</p>
            <p className="text-gray-500 mb-4">Let AI generate a comprehensive chart of accounts for your business</p>
            <Button onClick={() => setAiDialogOpen(true)} className="bg-gradient-to-r from-purple-500 to-blue-500">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate with AI
            </Button>
          </CardContent>
        </Card>
      )}

      {accounts.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

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
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
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
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {/* AI Generation Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              AI Generate Chart of Accounts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Business Description (Optional)</Label>
              <Input
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                placeholder="e.g., Automotive dealership with repair shop and parts sales"
                disabled={generating}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to use default: {company?.name || 'Company'} - automotive operations
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                AI will generate 40-50 essential accounts including assets, liabilities, equity, revenue, and expense accounts tailored to your business.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAiDialogOpen(false)} disabled={generating}>
                Cancel
              </Button>
              <Button onClick={handleGenerateAccounts} disabled={generating} className="bg-gradient-to-r from-purple-500 to-blue-500">
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Accounts
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {dialogOpen && (
        <AccountDialog
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setEditingAccount(null); }}
          account={editingAccount}
        />
      )}

      {importDialogOpen && (
        <ImportAccountsWizard
          open={importDialogOpen}
          onClose={() => setImportDialogOpen(false)}
          companyId={selectedCompanyId}
        />
      )}
    </div>
  );
}