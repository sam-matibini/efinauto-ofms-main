import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, Check, X, Undo2, ArrowUpRight, ArrowDownRight, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function TransactionsList({ transactions, bankAccounts, glAccounts, rules, companyId }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editingTransaction, setEditingTransaction] = useState(null);
  const queryClient = useQueryClient();

  const updateTransactionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BankTransaction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankTransactions'] });
      toast.success("Transaction updated");
      setEditingTransaction(null);
    },
  });

  const postToGLMutation = useMutation({
    mutationFn: async ({ transaction }) => {
      // Create GL transaction using double-entry bookkeeping
      const glTransaction = await base44.entities.Transaction.create({
        company_id: companyId,
        transaction_date: transaction.transaction_date,
        description: transaction.description,
        reference: transaction.reference_number,
        type: "bank",
        source_id: transaction.id,
        entries: [
          {
            account_id: transaction.gl_account_id,
            debit: transaction.transaction_type === "debit" ? transaction.amount : 0,
            credit: transaction.transaction_type === "credit" ? transaction.amount : 0,
          },
          {
            account_id: transaction.bank_account_id, // Bank account from BankAccount entity's gl_account_id
            debit: transaction.transaction_type === "credit" ? transaction.amount : 0,
            credit: transaction.transaction_type === "debit" ? transaction.amount : 0,
          }
        ]
      });

      // Update transaction as posted
      await base44.entities.BankTransaction.update(transaction.id, {
        posted_to_gl: true,
        transaction_id: glTransaction.id,
        status: "posted"
      });

      return glTransaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success("Posted to General Ledger");
    },
  });

  const excludeTransactionMutation = useMutation({
    mutationFn: ({ id, reason }) => 
      base44.entities.BankTransaction.update(id, { status: "excluded", excluded_reason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankTransactions'] });
      toast.success("Transaction excluded");
    },
  });

  const deleteImportBatchMutation = useMutation({
    mutationFn: async (batchId) => {
      const batchTransactions = transactions.filter(t => t.import_batch_id === batchId);
      await Promise.all(batchTransactions.map(t => base44.entities.BankTransaction.delete(t.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankTransactions'] });
      toast.success("Import batch deleted");
    },
  });

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         t.payee?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAccount = filterAccount === "all" || t.bank_account_id === filterAccount;
    const matchesStatus = filterStatus === "all" || t.status === filterStatus;
    return matchesSearch && matchesAccount && matchesStatus;
  }).sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

  const handleCategorize = (transaction, glAccountId) => {
    const account = glAccounts.find(a => a.id === glAccountId);
    updateTransactionMutation.mutate({
      id: transaction.id,
      data: {
        gl_account_id: glAccountId,
        gl_account_name: account?.account_name,
        status: "categorized"
      }
    });
  };

  const handlePostToGL = (transaction) => {
    if (!transaction.gl_account_id) {
      toast.error("Please categorize the transaction first");
      return;
    }
    postToGLMutation.mutate({ transaction });
  };

  const importBatches = [...new Set(transactions.map(t => t.import_batch_id).filter(Boolean))];
  const lastImportBatch = importBatches[0];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Bank Transactions</CardTitle>
            {lastImportBatch && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm('Undo last import? This will delete all transactions from the last import batch.')) {
                    deleteImportBatchMutation.mutate(lastImportBatch);
                  }
                }}
              >
                <Undo2 className="w-4 h-4 mr-2" />
                Undo Last Import
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bank Account</Label>
              <Select value={filterAccount} onValueChange={setFilterAccount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {bankAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.account_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="categorized">Categorized</SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                  <SelectItem value="excluded">Excluded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Payee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{new Date(transaction.transaction_date).toLocaleDateString()}</TableCell>
                      <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                      <TableCell>{transaction.payee || '-'}</TableCell>
                      <TableCell>
                        {transaction.transaction_type === 'credit' ? (
                          <Badge className="bg-green-100 text-green-800">
                            <ArrowDownRight className="w-3 h-3 mr-1" />
                            Deposit
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">
                            <ArrowUpRight className="w-3 h-3 mr-1" />
                            Withdrawal
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${transaction.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                        ${transaction.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {editingTransaction === transaction.id ? (
                          <Select
                            value={transaction.gl_account_id}
                            onValueChange={(value) => handleCategorize(transaction, value)}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                            <SelectContent>
                              {glAccounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id}>
                                  {acc.account_code} - {acc.account_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <button
                            onClick={() => setEditingTransaction(transaction.id)}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {transaction.gl_account_name || transaction.category || 'Categorize'}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={transaction.status === 'posted' ? 'default' : 'outline'}
                          className={
                            transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            transaction.status === 'categorized' ? 'bg-blue-100 text-blue-800' :
                            transaction.status === 'posted' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }
                        >
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {transaction.status !== 'posted' && transaction.gl_account_id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePostToGL(transaction)}
                              title="Post to General Ledger"
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                          {transaction.status !== 'excluded' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => excludeTransactionMutation.mutate({ id: transaction.id, reason: 'Manual exclusion' })}
                              title="Exclude"
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}