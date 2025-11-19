import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { format } from "date-fns";

export default function TransactionsList({ transactions }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = !searchTerm || 
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.transaction_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || t.transaction_type === filterType;
    const matchesCategory = filterCategory === "all" || t.category === filterCategory;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  const getTransactionIcon = (category) => {
    return category === 'revenue' ? (
      <ArrowUpCircle className="w-5 h-5 text-green-600" />
    ) : (
      <ArrowDownCircle className="w-5 h-5 text-red-600" />
    );
  };

  const getCategoryBadge = (category) => {
    const colors = {
      revenue: 'bg-green-100 text-green-700',
      expense: 'bg-red-100 text-red-700',
      asset: 'bg-blue-100 text-blue-700',
      liability: 'bg-orange-100 text-orange-700',
      equity: 'bg-purple-100 text-purple-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="asset">Asset</SelectItem>
                <SelectItem value="liability">Liability</SelectItem>
                <SelectItem value="equity">Equity</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sale_revenue">Vehicle Sales</SelectItem>
                <SelectItem value="service_revenue">Service Revenue</SelectItem>
                <SelectItem value="parts_revenue">Parts Revenue</SelectItem>
                <SelectItem value="vehicle_purchase">Vehicle Purchase</SelectItem>
                <SelectItem value="parts_purchase">Parts Purchase</SelectItem>
                <SelectItem value="labor_expense">Labor Expense</SelectItem>
                <SelectItem value="overhead_expense">Overhead</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transactions List */}
          <div className="space-y-2">
            {filteredTransactions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No transactions found</p>
            ) : (
              filteredTransactions.map(transaction => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {getTransactionIcon(transaction.category)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{transaction.description || 'Untitled Transaction'}</span>
                        <Badge className={getCategoryBadge(transaction.category)}>
                          {transaction.category}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                        <span>{transaction.transaction_number || transaction.id.slice(0, 8)}</span>
                        {transaction.customer_name && <span>• {transaction.customer_name}</span>}
                        <span>• {format(new Date(transaction.transaction_date), 'MMM d, yyyy')}</span>
                        {transaction.reference_number && <span>• Ref: {transaction.reference_number}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${transaction.category === 'revenue' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.category === 'revenue' ? '+' : '-'}${transaction.amount.toLocaleString()}
                    </p>
                    {transaction.tax_amount > 0 && (
                      <p className="text-xs text-gray-500">Tax: ${transaction.tax_amount.toFixed(2)}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}