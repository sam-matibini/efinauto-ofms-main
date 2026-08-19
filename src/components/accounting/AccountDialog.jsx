import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { useCompany } from "@/components/shared/CompanyContext";
import { toast } from "sonner";

export default function AccountDialog({ open, onClose, account, accounts = [] }) {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    account_code: "",
    account_name: "",
    account_type: "revenue",
    account_category: "other",
    balance: 0,
    parent_account_id: "",
    description: ""
  });

  useEffect(() => {
    if (account) {
      setFormData({
        account_code: account.account_code || "",
        account_name: account.account_name || "",
        account_type: account.account_type || "revenue",
        account_category: account.account_category || "other",
        balance: account.balance || 0,
        parent_account_id: account.parent_account_id || "",
        description: account.description || ""
      });
    } else {
      setFormData({
        account_code: "",
        account_name: "",
        account_type: "revenue",
        account_category: "other",
        balance: 0,
        parent_account_id: "",
        description: ""
      });
    }
  }, [account, open]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Check for duplicate account code if creating new account
      if (!account) {
        const existingAccounts = await supabase.entities.Account.filter({ 
          company_id: selectedCompanyId,
          account_code: String(data.account_code).trim()
        });
        
        if (existingAccounts && existingAccounts.length > 0) {
          throw new Error(`Account code "${data.account_code}" already exists`);
        }
      }

      const accountData = {
        account_code: String(data.account_code).trim(),
        account_name: String(data.account_name).trim(),
        account_type: data.account_type,
        account_category: data.account_category || 'other',
        balance: parseFloat(data.balance) || 0,
        parent_account_id: data.parent_account_id || null,
        description: data.description || '',
        company_id: selectedCompanyId
      };
      
      if (account) {
        delete accountData.company_id; // Don't update company_id on existing accounts
        return await supabase.entities.Account.update(account.id, accountData);
      } else {
        return await supabase.entities.Account.create(accountData);
      }
    },
    onSuccess: () => {
      // Invalidate all accounts queries
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success(account ? "Account updated!" : "Account created!");
      setTimeout(() => {
        onClose();
      }, 500);
    },
    onError: (error) => {
      console.error("Save error:", error);
      const errorMsg = error?.response?.data?.message || error?.message || "Failed to save account";
      toast.error(errorMsg);
    }
  });

  const handleSave = () => {
    if (!selectedCompanyId) {
      toast.error("Please select a company first");
      return;
    }
    if (!formData.account_code || !formData.account_name || !formData.account_type) {
      toast.error("Please fill in all required fields");
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{account ? 'Edit Account' : 'Add New Account'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Account Code *</Label>
              <Input
                value={formData.account_code}
                onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
                placeholder="e.g., 4000"
              />
            </div>
            <div className="space-y-2">
              <Label>Account Name *</Label>
              <Input
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                placeholder="e.g., Vehicle Sales"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Account Type</Label>
              <Select value={formData.account_type} onValueChange={(value) => setFormData({ ...formData, account_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asset">Asset</SelectItem>
                  <SelectItem value="liability">Liability</SelectItem>
                  <SelectItem value="equity">Equity</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.account_category} onValueChange={(value) => setFormData({ ...formData, account_category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="accounts_receivable">Accounts Receivable</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="fixed_assets">Fixed Assets</SelectItem>
                  <SelectItem value="accounts_payable">Accounts Payable</SelectItem>
                  <SelectItem value="sales_revenue">Sales Revenue</SelectItem>
                  <SelectItem value="service_revenue">Service Revenue</SelectItem>
                  <SelectItem value="cost_of_goods_sold">Cost of Goods Sold</SelectItem>
                  <SelectItem value="operating_expenses">Operating Expenses</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Parent Account (Optional)</Label>
            <Select value={formData.parent_account_id || ""} onValueChange={(value) => setFormData({ ...formData, parent_account_id: value === "" ? null : value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select parent account (for sub-accounts)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None - Top Level Account</SelectItem>
                {accounts
                  .filter(acc => acc.id !== account?.id && acc.account_type === formData.account_type)
                  .map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_code} - {acc.account_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Initial Balance</Label>
            <Input
              type="number"
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saveMutation.isPending || !formData.account_code || !formData.account_name || !formData.account_type}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saveMutation.isPending ? "Saving..." : "Save Account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}