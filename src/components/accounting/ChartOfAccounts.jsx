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
    toast.info("AI is generating your chart of accounts...");
    
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a comprehensive chart of accounts for an automotive dealership and service center business. Create 40-50 accounts across these categories:

ASSETS (1000-1999):
- Cash and bank accounts (1000-1099)
- Accounts receivable (1200-1299)
- Vehicle inventory (1300-1399)
- Parts inventory (1400-1499)
- Prepaid expenses (1500-1599)
- Equipment and tools (1600-1699)
- Property and buildings (1700-1799)
- Accumulated depreciation (1800-1899)

LIABILITIES (2000-2999):
- Accounts payable (2000-2099)
- Credit cards payable (2100-2199)
- Loans payable (2200-2299)
- Taxes payable (2300-2399)
- Accrued expenses (2400-2499)

EQUITY (3000-3999):
- Owner's equity (3000-3099)
- Retained earnings (3100-3199)
- Current year earnings (3200-3299)

REVENUE (4000-4999):
- Vehicle sales revenue (4000-4099)
- Service and repair revenue (4100-4199)
- Parts sales revenue (4200-4299)
- Extended warranty revenue (4300-4399)
- Finance and insurance income (4400-4499)
- Other income (4900-4999)

EXPENSES (5000-5999):
- Cost of vehicles sold (5000-5099)
- Cost of parts sold (5100-5199)
- Salaries and wages (5200-5299)
- Payroll taxes and benefits (5300-5399)
- Rent and lease (5400-5499)
- Utilities (5500-5599)
- Marketing and advertising (5600-5699)
- Insurance (5700-5799)
- Office and supplies (5800-5899)
- Professional fees (5900-5999)

Return ONLY a valid JSON object with an "accounts" array. Each account must have:
- account_code (string)
- account_name (string)
- account_type (one of: asset, liability, equity, revenue, expense)
- account_category (string, like "cash", "inventory", "payable", etc)
- balance (number, default 0)
- description (string)

Example format:
{
  "accounts": [
    {
      "account_code": "1000",
      "account_name": "Cash - Operating Account",
      "account_type": "asset",
      "account_category": "cash",
      "balance": 0,
      "description": "Primary checking account for daily operations"
    }
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
                  account_type: { type: "string", enum: ["asset", "liability", "equity", "revenue", "expense"] },
                  account_category: { type: "string" },
                  balance: { type: "number" },
                  description: { type: "string" }
                },
                required: ["account_code", "account_name", "account_type", "account_category"]
              }
            }
          },
          required: ["accounts"]
        }
      });

      if (!response || !response.accounts) {
        throw new Error("Invalid response from AI - no accounts returned");
      }

      if (!Array.isArray(response.accounts) || response.accounts.length === 0) {
        throw new Error("AI returned empty accounts array");
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
          console.error(`Failed to create account ${acc.account_code}:`, err);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success(`Successfully created ${created} accounts!`);
    } catch (error) {
      console.error("Error generating accounts:", error);
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
    
    const csvContent = [
      ['Chart of Accounts Report'],
      ['Generated on', format(new Date(), 'MMMM d, yyyy')],
      [],
      headers,
      ...rows
    ].map(row => row.join(',')).join('\n');
    
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
            <p className="text-gray-500 mb-4">No accounts found. Generate a chart of accounts to get started.</p>
            <Button 
              onClick={handleGenerateAccounts} 
              disabled={isGenerating || !selectedCompanyId}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isGenerating ? "Generating..." : "Generate Chart of Accounts"}
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