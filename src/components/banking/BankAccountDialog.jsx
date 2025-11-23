import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export default function BankAccountDialog({ open, onClose, account, onSave, glAccounts, isLoading }) {
  const [formData, setFormData] = useState({
    account_name: "",
    account_type: "checking",
    institution_name: "",
    account_number: "",
    routing_number: "",
    currency: "CAD",
    current_balance: 0,
    gl_account_id: "",
    connection_status: "manual",
    email_import_enabled: false,
    status: "active",
    opening_balance: 0,
    opening_balance_date: new Date().toISOString().split('T')[0],
    notes: ""
  });

  useEffect(() => {
    if (account) {
      setFormData(account);
    } else {
      setFormData({
        account_name: "",
        account_type: "checking",
        institution_name: "",
        account_number: "",
        routing_number: "",
        currency: "CAD",
        current_balance: 0,
        gl_account_id: "",
        connection_status: "manual",
        email_import_enabled: false,
        status: "active",
        opening_balance: 0,
        opening_balance_date: new Date().toISOString().split('T')[0],
        notes: ""
      });
    }
  }, [account, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{account ? "Edit Bank Account" : "Add Bank Account"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="basic">
            <TabsList>
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="connection">Connection</TabsTrigger>
              <TabsTrigger value="integration">GL Integration</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Name *</Label>
                  <Input
                    required
                    value={formData.account_name}
                    onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                    placeholder="e.g., Business Checking"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Account Type *</Label>
                  <Select value={formData.account_type} onValueChange={(v) => setFormData({ ...formData, account_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Checking</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="line_of_credit">Line of Credit</SelectItem>
                      <SelectItem value="money_market">Money Market</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Financial Institution *</Label>
                <Input
                  required
                  value={formData.institution_name}
                  onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                  placeholder="e.g., TD Bank, RBC, BMO"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Number (Last 4)</Label>
                  <Input
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    placeholder="****1234"
                    maxLength={16}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Routing Number</Label>
                  <Input
                    value={formData.routing_number}
                    onChange={(e) => setFormData({ ...formData, routing_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CAD">CAD</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Opening Balance</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.opening_balance}
                    onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>As of Date</Label>
                  <Input
                    type="date"
                    value={formData.opening_balance_date}
                    onChange={(e) => setFormData({ ...formData, opening_balance_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="connection" className="space-y-4">
              <div className="space-y-2">
                <Label>Connection Type</Label>
                <Select value={formData.connection_status} onValueChange={(v) => setFormData({ ...formData, connection_status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Import</SelectItem>
                    <SelectItem value="connected">Bank Connection (Coming Soon)</SelectItem>
                    <SelectItem value="disconnected">Disconnected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Auto-Import</Label>
                    <p className="text-sm text-gray-500">Automatically import statements forwarded to email</p>
                  </div>
                  <Switch
                    checked={formData.email_import_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, email_import_enabled: checked })}
                  />
                </div>

                {formData.email_import_enabled && (
                  <div className="space-y-2">
                    <Label>Forward Statements To</Label>
                    <Input
                      value={formData.email_import_address || `statements-${formData.account_name?.toLowerCase().replace(/\s+/g, '-')}@yourcompany.com`}
                      onChange={(e) => setFormData({ ...formData, email_import_address: e.target.value })}
                      placeholder="statements@yourcompany.com"
                    />
                    <p className="text-xs text-gray-500">
                      Forward bank statements from your bank to this email address for automatic import
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="integration" className="space-y-4">
              <div className="space-y-2">
                <Label>Link to GL Account</Label>
                <Select value={formData.gl_account_id} onValueChange={(v) => setFormData({ ...formData, gl_account_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select GL account" />
                  </SelectTrigger>
                  <SelectContent>
                    {glAccounts
                      .filter(acc => acc.account_type === 'asset' || acc.account_type === 'liability')
                      .map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.account_code} - {acc.account_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Link this bank account to a general ledger account for automatic posting
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Double-Entry Accounting</h4>
                <p className="text-sm text-blue-800">
                  Bank transactions will be automatically posted to the general ledger using double-entry bookkeeping:
                </p>
                <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
                  <li>Deposits (credits): Debit Bank Account, Credit Revenue/Income</li>
                  <li>Withdrawals (debits): Credit Bank Account, Debit Expense/Asset</li>
                  <li>All entries affect Trial Balance, Balance Sheet, and Income Statement</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}