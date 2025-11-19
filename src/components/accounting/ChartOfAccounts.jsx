import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import AccountDialog from "./AccountDialog";

export default function ChartOfAccounts() {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

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
    setIsGenerating(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a comprehensive chart of accounts for an automotive dealership and service center business. Include standard accounts for:
        
        ASSETS (1000-1999):
        - Cash and bank accounts
        - Accounts receivable
        - Vehicle inventory
        - Parts inventory
        - Equipment and tools
        - Property and buildings
        
        LIABILITIES (2000-2999):
        - Accounts payable
        - Loans and credit lines
        - Taxes payable
        
        EQUITY (3000-3999):
        - Owner's equity
        - Retained earnings
        
        REVENUE (4000-4999):
        - Vehicle sales revenue
        - Service and repair revenue
        - Parts sales revenue
        - Extended warranty revenue
        - Other income
        
        EXPENSES (5000-5999):
        - Cost of vehicles sold
        - Cost of parts sold
        - Labor and wages
        - Rent and utilities
        - Marketing and advertising
        - Insurance
        - Office supplies
        - Vehicle operating expenses
        - Professional fees
        
        Return ONLY a JSON array of accounts with this structure for each account:
        {
          "account_code": "1000",
          "account_name": "Cash - Operating",
          "account_type": "asset",
          "account_category": "cash",
          "balance": 0,
          "description": "Primary operating cash account"
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
                }
              }
            }
          }
        }
      });

      if (response?.accounts) {
        const accountsToCreate = response.accounts.map(acc => ({
          ...acc,
          company_id: selectedCompanyId
        }));

        await Promise.all(
          accountsToCreate.map(account => base44.entities.Account.create(account))
        );

        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        toast.success(`${accountsToCreate.length} accounts created successfully!`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate accounts");
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Chart of Accounts</h2>
        <div className="flex gap-2">
          {accounts.length === 0 && (
            <Button 
              onClick={handleGenerateAccounts} 
              disabled={isGenerating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isGenerating ? "Generating..." : "AI Generate Accounts"}
            </Button>
          )}
          <Button onClick={() => { setEditingAccount(null); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Account
          </Button>
        </div>
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

      <AccountDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingAccount(null); }}
        account={editingAccount}
      />
    </div>
  );
}