import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { toast } from "sonner";

export default function AccountDialog({ open, onClose, account }) {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    account_code: "",
    account_name: "",
    account_type: "revenue",
    account_category: "other",
    balance: 0,
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
        description: account.description || ""
      });
    } else {
      setFormData({
        account_code: "",
        account_name: "",
        account_type: "revenue",
        account_category: "other",
        balance: 0,
        description: ""
      });
    }
  }, [account, open]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      try {
        console.log("Starting mutation with data:", data);
        console.log("Company ID:", selectedCompanyId);
        console.log("Is update?", !!account);
        
        let result;
        if (account) {
          console.log("Updating account ID:", account.id);
          result = await base44.entities.Account.update(account.id, data);
        } else {
          const createData = { ...data, company_id: selectedCompanyId };
          console.log("Creating account with data:", createData);
          result = await base44.entities.Account.create(createData);
        }
        
        console.log("Mutation result:", result);
        return result;
      } catch (err) {
        console.error("Mutation error details:", err);
        throw err;
      }
    },
    onSuccess: (data) => {
      console.log("Save successful, invalidating queries...");
      queryClient.invalidateQueries({ queryKey: ['accounts', selectedCompanyId] });
      toast.success(account ? "Account updated!" : "Account created!");
      onClose();
    },
    onError: (error) => {
      console.error("Save mutation failed:", error);
      toast.error("Failed to save: " + (error.message || JSON.stringify(error)));
    }
  });

  const handleSave = () => {
    if (!selectedCompanyId) {
      toast.error("Please select a company first");
      return;
    }
    if (!formData.account_code || !formData.account_name) {
      toast.error("Please fill in required fields");
      return;
    }
    console.log("Saving account with data:", { ...formData, company_id: selectedCompanyId });
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save Account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}