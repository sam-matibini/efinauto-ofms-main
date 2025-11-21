import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/components/shared/CompanyContext";
import { AIAccountMapperButton } from "./AIAccountMapper";

export default function JournalEntryDialog({ open, onClose }) {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    reference_number: `JE-${Date.now()}`,
    description: "",
    entries: [
      { account_id: "", account_code: "", account_name: "", debit: 0, credit: 0 },
      { account_id: "", account_code: "", account_name: "", debit: 0, credit: 0 }
    ]
  });

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['accounts', selectedCompanyId],
    queryFn: async () => {
      console.log("Fetching accounts for company:", selectedCompanyId);
      const result = await base44.entities.Account.filter({ company_id: selectedCompanyId }, 'account_code');
      console.log("Fetched accounts:", result?.length || 0, "accounts");
      return result || [];
    },
    enabled: !!selectedCompanyId && open,
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Create transaction for each journal entry line
      const promises = data.entries.map(entry => {
        if (!entry.account_id || (entry.debit === 0 && entry.credit === 0)) return null;
        
        return base44.entities.Transaction.create({
          company_id: selectedCompanyId,
          transaction_number: data.reference_number,
          transaction_type: 'other_income',
          category: entry.debit > 0 ? 'expense' : 'revenue',
          amount: entry.debit > 0 ? entry.debit : entry.credit,
          account_id: entry.account_id,
          account_code: entry.account_code,
          account_name: entry.account_name,
          transaction_date: data.transaction_date,
          description: data.description,
          reference_number: data.reference_number,
          status: 'completed'
        });
      });
      
      await Promise.all(promises.filter(p => p !== null));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success("Journal entry created!");
      onClose();
    }
  });

  const addEntry = () => {
    setFormData({
      ...formData,
      entries: [...formData.entries, { account_id: "", account_code: "", account_name: "", debit: 0, credit: 0 }]
    });
  };

  const removeEntry = (index) => {
    setFormData({
      ...formData,
      entries: formData.entries.filter((_, i) => i !== index)
    });
  };

  const updateEntry = (index, field, value) => {
    const newEntries = [...formData.entries];
    newEntries[index][field] = value;
    setFormData({ ...formData, entries: newEntries });
  };

  const totalDebits = formData.entries.reduce((sum, e) => sum + (parseFloat(e.debit) || 0), 0);
  const totalCredits = formData.entries.reduce((sum, e) => sum + (parseFloat(e.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Journal Entry</DialogTitle>
        </DialogHeader>
        
        {!loadingAccounts && accounts.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4">
            <h4 className="font-semibold text-yellow-900 mb-2">Chart of Accounts Required</h4>
            <p className="text-sm text-yellow-800 mb-3">
              You need to create your chart of accounts before creating journal entries. 
            </p>
            <p className="text-sm text-yellow-800 mb-3">
              Go to the <strong>Chart of Accounts</strong> tab and either:
            </p>
            <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1 mb-3">
              <li>Click <strong>AI Generate</strong> to automatically create accounts</li>
              <li>Click <strong>Add Account</strong> to create accounts manually</li>
              <li>Click <strong>Import</strong> to upload accounts from a file</li>
            </ul>
            <Button onClick={onClose} variant="outline" size="sm">
              Close and Setup Accounts
            </Button>
          </div>
        )}
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" value={formData.transaction_date} onChange={(e) => setFormData({...formData, transaction_date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input value={formData.reference_number} onChange={(e) => setFormData({...formData, reference_number: e.target.value})} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} />
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <Label className="text-base font-semibold">Journal Entries</Label>
              <Button size="sm" variant="outline" onClick={addEntry}>
                <Plus className="w-4 h-4 mr-2" />
                Add Line
              </Button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-sm font-semibold text-gray-600 pb-2 border-b">
                <div className="col-span-5">Account</div>
                <div className="col-span-3 text-right">Debit</div>
                <div className="col-span-3 text-right">Credit</div>
                <div className="col-span-1"></div>
              </div>

              {formData.entries.map((entry, index) => (
                <div key={index} className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                     <Select 
                       value={entry.account_id || ""} 
                       onValueChange={(value) => {
                         const account = accounts.find(a => a.id === value);
                         if (account) {
                           const newEntries = [...formData.entries];
                           newEntries[index] = {
                             ...newEntries[index],
                             account_id: account.id,
                             account_code: account.account_code,
                             account_name: account.account_name
                           };
                           setFormData({ ...formData, entries: newEntries });
                         }
                       }}
                     >
                       <SelectTrigger>
                         <SelectValue placeholder="Select account">
                           {entry.account_id && entry.account_code && entry.account_name 
                             ? `${entry.account_code} - ${entry.account_name}`
                             : "Select account"}
                         </SelectValue>
                       </SelectTrigger>
                       <SelectContent>
                         {loadingAccounts ? (
                           <div className="p-2 text-sm text-gray-500">Loading accounts...</div>
                         ) : accounts.length === 0 ? (
                           <div className="p-2 text-sm text-red-600">No accounts found. Please create accounts first.</div>
                         ) : (
                           accounts.map(account => (
                             <SelectItem key={account.id} value={account.id}>
                               {account.account_code} - {account.account_name}
                             </SelectItem>
                           ))
                         )}
                       </SelectContent>
                     </Select>
                    </div>
                  <div className="col-span-3">
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={entry.debit} 
                      onChange={(e) => updateEntry(index, 'debit', parseFloat(e.target.value) || 0)}
                      className="text-right"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={entry.credit} 
                      onChange={(e) => updateEntry(index, 'credit', parseFloat(e.target.value) || 0)}
                      className="text-right"
                    />
                  </div>
                    <div className="col-span-1">
                      <Button size="sm" variant="ghost" onClick={() => removeEntry(index)} disabled={formData.entries.length <= 2}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                  {formData.description && (
                    <div className="pl-2">
                      <AIAccountMapperButton
                        transactionData={{
                          transaction_type: entry.debit > 0 ? 'expense' : 'revenue',
                          category: entry.debit > 0 ? 'expense' : 'revenue',
                          amount: entry.debit > 0 ? entry.debit : entry.credit,
                          description: formData.description
                        }}
                        onAccountSelected={(account) => {
                          const newEntries = [...formData.entries];
                          newEntries[index] = {
                            ...newEntries[index],
                            account_id: account.id,
                            account_code: account.account_code,
                            account_name: account.account_name
                          };
                          setFormData({ ...formData, entries: newEntries });
                        }}
                        companyId={selectedCompanyId}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-12 gap-2 mt-4 pt-3 border-t font-bold">
              <div className="col-span-5 text-right">TOTALS:</div>
              <div className="col-span-3 text-right">${totalDebits.toFixed(2)}</div>
              <div className="col-span-3 text-right">${totalCredits.toFixed(2)}</div>
              <div className="col-span-1"></div>
            </div>

            {!isBalanced && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                <p className="text-sm text-red-800">⚠️ Debits and Credits must be equal. Difference: ${Math.abs(totalDebits - totalCredits).toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => createMutation.mutate(formData)} disabled={!isBalanced || createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Journal Entry'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}