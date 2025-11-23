import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  DollarSign
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function BankingMobilePage() {
  const { selectedCompanyId } = useCompany();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("all");

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bankAccounts', selectedCompanyId],
    queryFn: () => base44.entities.BankAccount.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['bankTransactions', selectedCompanyId],
    queryFn: () => base44.entities.BankTransaction.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const filteredTransactions = transactions
    .filter(t => selectedAccount === "all" || t.bank_account_id === selectedAccount)
    .filter(t => 
      searchTerm === "" || 
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.payee?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date))
    .slice(0, 50);

  const totalBalance = bankAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  const monthlyIncome = transactions
    .filter(t => t.transaction_type === 'credit' && new Date(t.transaction_date).getMonth() === new Date().getMonth())
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const monthlyExpenses = transactions
    .filter(t => t.transaction_type === 'debit' && new Date(t.transaction_date).getMonth() === new Date().getMonth())
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  if (!selectedCompanyId) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <p className="text-yellow-800">Please select a company</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Mobile Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-6 text-white">
        <h1 className="text-2xl font-bold mb-1">Banking</h1>
        <p className="text-blue-100 text-sm">Manage your accounts</p>
      </div>

      {/* Balance Overview */}
      <div className="px-4 -mt-4">
        <Card className="bg-white shadow-lg">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 mb-1">Total Balance</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              ${totalBalance.toLocaleString()}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Income</p>
                  <p className="font-semibold text-green-600">${monthlyIncome.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Expenses</p>
                  <p className="font-semibold text-red-600">${monthlyExpenses.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Carousel */}
      <div className="px-4 py-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Your Accounts</h3>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedAccount("all")}
            className={`flex-shrink-0 px-4 py-3 rounded-xl border-2 transition-all ${
              selectedAccount === "all"
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-white border-gray-200 text-gray-700"
            }`}
          >
            <p className="text-xs font-medium">All Accounts</p>
            <p className="text-lg font-bold">{bankAccounts.length}</p>
          </button>
          {bankAccounts.map(acc => (
            <button
              key={acc.id}
              onClick={() => setSelectedAccount(acc.id)}
              className={`flex-shrink-0 px-4 py-3 rounded-xl border-2 transition-all min-w-[140px] ${
                selectedAccount === acc.id
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-gray-200 text-gray-700"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4" />
                <p className="text-xs font-medium truncate">{acc.account_name}</p>
              </div>
              <p className="text-lg font-bold">${(acc.current_balance || 0).toLocaleString()}</p>
              <p className="text-xs opacity-75">{acc.institution_name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-11 rounded-xl"
          />
        </div>
      </div>

      {/* Transactions List */}
      <div className="px-4 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Recent Transactions</h3>
          <Button variant="ghost" size="sm" className="h-8 text-xs">
            <Filter className="w-3 h-3 mr-1" />
            Filter
          </Button>
        </div>

        {filteredTransactions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-600">No transactions found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.map(transaction => (
              <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        transaction.transaction_type === 'credit' 
                          ? 'bg-green-50' 
                          : 'bg-red-50'
                      }`}>
                        {transaction.transaction_type === 'credit' ? (
                          <ArrowDownRight className="w-5 h-5 text-green-600" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {transaction.description || transaction.payee || 'Transaction'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <p className="text-xs text-gray-600">
                            {new Date(transaction.transaction_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        {transaction.category && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            {transaction.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <p className={`font-bold text-lg ${
                        transaction.transaction_type === 'credit' 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {transaction.transaction_type === 'credit' ? '+' : '-'}
                        ${transaction.amount?.toLocaleString()}
                      </p>
                      <Badge 
                        variant={transaction.status === 'posted' ? 'default' : 'secondary'}
                        className="text-xs mt-1"
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}