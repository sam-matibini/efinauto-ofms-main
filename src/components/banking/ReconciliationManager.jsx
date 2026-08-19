import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { GitCompare, Plus, Check } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ReconciliationManager({ bankAccounts, transactions, reconciliations, companyId }) {
  const [selectedAccount, setSelectedAccount] = useState("");
  const [statementDate, setStatementDate] = useState("");
  const [statementBalance, setStatementBalance] = useState(0);
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const queryClient = useQueryClient();

  const createReconciliationMutation = useMutation({
    mutationFn: async (data) => {
      const reconciliation = await supabase.entities.BankReconciliation.create(data);
      
      // Mark transactions as reconciled
      await Promise.all(
        selectedTransactions.map(t =>
          supabase.entities.BankTransaction.update(t.id, {
            reconciled: true,
            reconciliation_id: reconciliation.id
          })
        )
      );

      return reconciliation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankReconciliations'] });
      queryClient.invalidateQueries({ queryKey: ['bankTransactions'] });
      toast.success("Reconciliation completed successfully");
      setSelectedAccount("");
      setStatementDate("");
      setStatementBalance(0);
      setSelectedTransactions([]);
    },
  });

  const accountTransactions = transactions.filter(t =>
    t.bank_account_id === selectedAccount && !t.reconciled
  );

  const clearedBalance = selectedTransactions.reduce((sum, t) => {
    return sum + (t.transaction_type === 'credit' ? t.amount : -t.amount);
  }, 0);

  const bookBalance = accountTransactions.reduce((sum, t) => {
    return sum + (t.transaction_type === 'credit' ? t.amount : -t.amount);
  }, 0);

  const difference = statementBalance - clearedBalance;

  const handleToggleTransaction = (transaction) => {
    setSelectedTransactions(prev => {
      const exists = prev.find(t => t.id === transaction.id);
      if (exists) {
        return prev.filter(t => t.id !== transaction.id);
      }
      return [...prev, transaction];
    });
  };

  const handleReconcile = () => {
    if (!selectedAccount || !statementDate) {
      toast.error("Please select account and statement date");
      return;
    }

    if (Math.abs(difference) > 0.01) {
      const proceed = confirm(
        `There is a difference of $${difference.toFixed(2)} between the statement and cleared balance. Continue anyway?`
      );
      if (!proceed) return;
    }

    createReconciliationMutation.mutate({
      company_id: companyId,
      bank_account_id: selectedAccount,
      statement_date: statementDate,
      statement_balance: statementBalance,
      cleared_balance: clearedBalance,
      book_balance: bookBalance,
      difference: difference,
      reconciled_transactions: selectedTransactions.map(t => t.id),
      status: Math.abs(difference) < 0.01 ? "reconciled" : "draft"
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5" />
            Bank Reconciliation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Bank Account *</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts
                    .filter(acc => acc.status === 'active')
                    .map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.account_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Statement Date *</Label>
              <Input
                type="date"
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Statement Balance *</Label>
              <Input
                type="number"
                step="0.01"
                value={statementBalance}
                onChange={(e) => setStatementBalance(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          </div>

          {selectedAccount && (
            <>
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Statement Balance</p>
                  <p className="text-xl font-bold">${statementBalance.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cleared Balance</p>
                  <p className="text-xl font-bold text-blue-600">${clearedBalance.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Difference</p>
                  <p className={`text-xl font-bold ${Math.abs(difference) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                    ${Math.abs(difference).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Unreconciled Transactions ({accountTransactions.length})</Label>
                <div className="border rounded-lg max-h-96 overflow-y-auto">
                  {accountTransactions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No unreconciled transactions found
                    </div>
                  ) : (
                    <div className="divide-y">
                      {accountTransactions.map((transaction) => {
                        const isSelected = selectedTransactions.some(t => t.id === transaction.id);
                        return (
                          <div
                            key={transaction.id}
                            className={`p-3 hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
                            onClick={() => handleToggleTransaction(transaction)}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox checked={isSelected} />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-sm">{transaction.description}</p>
                                    <p className="text-xs text-gray-500">
                                      {new Date(transaction.transaction_date).toLocaleDateString()}
                                      {transaction.reference_number && ` • ${transaction.reference_number}`}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className={`font-bold ${transaction.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                      {transaction.transaction_type === 'credit' ? '+' : '-'}
                                      ${transaction.amount.toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleReconcile}
                  disabled={!selectedAccount || !statementDate || selectedTransactions.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Complete Reconciliation
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Reconciliations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reconciliations</CardTitle>
        </CardHeader>
        <CardContent>
          {reconciliations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No reconciliations yet
            </div>
          ) : (
            <div className="space-y-3">
              {reconciliations
                .sort((a, b) => new Date(b.statement_date) - new Date(a.statement_date))
                .slice(0, 10)
                .map((rec) => {
                  const account = bankAccounts.find(a => a.id === rec.bank_account_id);
                  return (
                    <div key={rec.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{account?.account_name}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(rec.statement_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${rec.statement_balance.toLocaleString()}</p>
                        <Badge variant={rec.status === 'reconciled' ? 'default' : 'outline'}>
                          {rec.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}