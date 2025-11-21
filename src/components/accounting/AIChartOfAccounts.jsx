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
      const prompt = `You are an expert accountant. Generate a comprehensive chart of accounts for this business: ${description || company?.name + ' - automotive dealership with sales, service, parts, and export operations'}.

Create accounts suitable for:
- Asset tracking (cash, bank accounts, accounts receivable, inventory, vehicles, parts, fixed assets, equipment)
- Liability management (accounts payable, loans, credit cards, payroll liabilities, sales tax payable, deferred tax)
- Equity tracking (owner's equity, retained earnings, draws)
- Revenue streams (vehicle sales, service revenue, parts sales, export revenue, other income)
- Expense categories (cost of goods sold, wages, payroll taxes, rent, utilities, insurance, marketing, depreciation, office supplies, repairs & maintenance)

CRITICAL: You MUST return ONLY valid JSON in this EXACT format with NO additional text:
{
  "accounts": [
    {
      "account_code": "1010",
      "account_name": "Checking Account",
      "account_type": "asset",
      "account_category": "cash",
      "balance": 0,
      "description": "Primary business checking account"
    }
  ]
}

Rules:
- Use standard numbering: 1000s=Assets, 2000s=Liabilities, 3000s=Equity, 4000s=Revenue, 5000s=Expenses
- Include 40-60 essential accounts
- account_type MUST be one of: asset, liability, equity, revenue, expense (lowercase)
- Return pure JSON only, no markdown, no explanations`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            accounts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  account_code: { type: "string" },
                  account_name: { type: "string" },
                  account_type: { type: "string" },
                  account_category: { type: "string" },
                  balance: { type: "number" },
                  description: { type: "string" }
                },
                required: ["account_code", "account_name", "account_type"]
              }
            }
          }
        }
      });

      return result?.accounts || [];
    },
    onSuccess: async (generatedAccounts) => {
      try {
        if (!Array.isArray(generatedAccounts) || generatedAccounts.length === 0) {
          toast.error("No accounts generated. Please try again.");
          setGenerating(false);
          return;
        }

        let created = 0;
        let failed = 0;
        
        for (const account of generatedAccounts) {
          if (!account.account_code || !account.account_name || !account.account_type) {
            failed++;
            continue;
          }
          
          try {
            await base44.entities.Account.create({
              company_id: selectedCompanyId,
              account_code: String(account.account_code).trim(),
              account_name: String(account.account_name).trim(),
              account_type: String(account.account_type).toLowerCase().trim(),
              account_category: account.account_category ? String(account.account_category).toLowerCase().trim() : 'other',
              balance: parseFloat(account.balance) || 0,
              description: account.description ? String(account.description).trim() : ''
            });
            created++;
          } catch (err) {
            console.error('Failed to create account:', account, err);
            failed++;
          }
        }
        
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        
        if (created > 0) {
          toast.success(`Successfully generated ${created} accounts${failed > 0 ? ` (${failed} skipped)` : ''}`);
        } else {
          toast.error("Failed to create accounts. Please try again.");
        }
        
        setAiDialogOpen(false);
        setGenerating(false);
      } catch (error) {
        console.error("Account creation error:", error);
        toast.error("Error creating accounts: " + error.message);
        setGenerating(false);
      }
    },
    onError: (error) => {
      console.error("Generation error:", error);
      toast.error("Failed to generate accounts. Please try again.");
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