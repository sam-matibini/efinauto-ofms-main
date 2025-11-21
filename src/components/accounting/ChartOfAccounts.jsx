import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Sparkles, Download, Printer, Upload } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import AccountDialog from "./AccountDialog";
import ImportAccountsDialog from "./ImportAccountsDialog";

export default function ChartOfAccounts() {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

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

  const handleGenerateAccounts = async () => {
    if (!selectedCompanyId) {
      toast.error("Please select a company first");
      return;
    }

    setIsGenerating(true);
    
    try {
      toast.info("AI is generating your chart of accounts...");
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a comprehensive chart of accounts for an automotive dealership and service center. Create 40-50 accounts covering:

ASSETS (1000-1999): Cash, bank accounts, accounts receivable, vehicle inventory, parts inventory, equipment, buildings
LIABILITIES (2000-2999): Accounts payable, loans, taxes payable, credit cards
EQUITY (3000-3999): Owner's equity, retained earnings
REVENUE (4000-4999): Vehicle sales, service revenue, parts sales, warranty income
EXPENSES (5000-5999): Cost of vehicles, cost of parts, salaries, rent, utilities, marketing, insurance

Return a JSON object with an "accounts" array. Each account needs:
- account_code: string (e.g. "1000")
- account_name: string (e.g. "Cash - Operating")
- account_type: one of "asset", "liability", "equity", "revenue", "expense"
- account_category: string (e.g. "cash", "inventory")
- balance: number (default 0)
- description: string

Example:
{
  "accounts": [
    {"account_code": "1000", "account_name": "Cash - Operating", "account_type": "asset", "account_category": "cash", "balance": 0, "description": "Primary operating account"}
  ]
}`,
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
          },
          required: ["accounts"]
        }
      });

      if (!response?.accounts || !Array.isArray(response.accounts) || response.accounts.length === 0) {
        throw new Error("AI did not return valid accounts");
      }

      toast.info(`Creating ${response.accounts.length} accounts...`);
      
      let created = 0;
      for (const acc of response.accounts) {
        try {
          await base44.entities.Account.create({
            company_id: selectedCompanyId,
            account_code: acc.account_code,
            account_name: acc.account_name,
            account_type: acc.account_type,
            account_category: acc.account_category || 'general',
            balance: acc.balance || 0,
            description: acc.description || ''
          });
          created++;
        } catch (err) {
          console.error(`Failed to create ${acc.account_code}:`, err);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success(`Successfully created ${created} accounts!`);
    } catch (error) {
      console.error("Generation error:", error);
      toast.error(error.message || "Failed to generate accounts");
    } finally {
      setIsGenerating(false);
    }
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

  const groupedAccounts = accounts.reduce((groups, account) => {
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
          <Button 
            onClick={handleGenerateAccounts} 
            disabled={isGenerating || !selectedCompanyId}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isGenerating ? "Generating..." : "AI Generate"}
          </Button>
          <Button onClick={() => setImportDialogOpen(true)} variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import
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
            <p className="text-xl font-semibold mb-2">No accounts yet</p>
            <p className="text-gray-500 mb-4">Generate a complete chart of accounts with AI or import your own</p>
            <Button 
              onClick={handleGenerateAccounts} 
              disabled={isGenerating || !selectedCompanyId}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isGenerating ? "Generating..." : "Generate with AI"}
            </Button>
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

      <AccountDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingAccount(null); }}
        account={editingAccount}
      />

      <ImportAccountsDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        companyId={selectedCompanyId}
        onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ['accounts'] })}
      />
    </div>
  );
}