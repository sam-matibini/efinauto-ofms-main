import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

export default function ProfitLossStatement({ transactions, dateRange }) {
  const filteredTransactions = transactions.filter(t => {
    const transDate = new Date(t.transaction_date);
    return transDate >= dateRange.from && transDate <= dateRange.to;
  });

  // Revenue
  const saleRevenue = filteredTransactions
    .filter(t => t.transaction_type === 'sale_revenue' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const serviceRevenue = filteredTransactions
    .filter(t => t.transaction_type === 'service_revenue' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const partsRevenue = filteredTransactions
    .filter(t => t.transaction_type === 'parts_revenue' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const otherIncome = filteredTransactions
    .filter(t => t.transaction_type === 'other_income' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalRevenue = saleRevenue + serviceRevenue + partsRevenue + otherIncome;

  // Cost of Goods Sold
  const vehiclePurchases = filteredTransactions
    .filter(t => t.transaction_type === 'vehicle_purchase' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const partsPurchases = filteredTransactions
    .filter(t => t.transaction_type === 'parts_purchase' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const cogs = vehiclePurchases + partsPurchases;
  const grossProfit = totalRevenue - cogs;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue * 100).toFixed(1) : 0;

  // Operating Expenses
  const laborExpense = filteredTransactions
    .filter(t => t.transaction_type === 'labor_expense' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const overheadExpense = filteredTransactions
    .filter(t => t.transaction_type === 'overhead_expense' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const otherExpenses = filteredTransactions
    .filter(t => t.transaction_type === 'other_expense' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOperatingExpenses = laborExpense + overheadExpense + otherExpenses;

  // Net Profit
  const netProfit = grossProfit - totalOperatingExpenses;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue * 100).toFixed(1) : 0;

  const renderLine = (label, amount, bold = false, indent = false, color = null) => (
    <div className={`flex justify-between py-2 ${bold ? 'font-bold border-t-2 border-gray-300' : 'border-t border-gray-100'} ${indent ? 'pl-6' : ''}`}>
      <span className={bold ? 'text-base' : ''}>{label}</span>
      <span className={`${bold ? 'text-lg' : ''} ${color || (amount >= 0 ? 'text-gray-900' : 'text-red-600')}`}>
        ${Math.abs(amount).toLocaleString()}
      </span>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Profit & Loss Statement</span>
          <span className="text-sm font-normal text-gray-600">
            {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {/* Revenue Section */}
          <div className="mb-4">
            <h3 className="font-bold text-lg mb-2 text-gray-700">Revenue</h3>
            {renderLine('Vehicle Sales Revenue', saleRevenue, false, true)}
            {renderLine('Service Revenue', serviceRevenue, false, true)}
            {renderLine('Parts Revenue', partsRevenue, false, true)}
            {renderLine('Other Income', otherIncome, false, true)}
            {renderLine('Total Revenue', totalRevenue, true, false, 'text-green-600')}
          </div>

          {/* Cost of Goods Sold */}
          <div className="mb-4">
            <h3 className="font-bold text-lg mb-2 text-gray-700">Cost of Goods Sold</h3>
            {renderLine('Vehicle Purchases', vehiclePurchases, false, true)}
            {renderLine('Parts Purchases', partsPurchases, false, true)}
            {renderLine('Total COGS', cogs, true)}
          </div>

          {renderLine('Gross Profit', grossProfit, true, false, grossProfit >= 0 ? 'text-blue-600' : 'text-red-600')}
          <div className="text-right text-sm text-gray-600 mb-4">
            Gross Margin: {grossMargin}%
          </div>

          {/* Operating Expenses */}
          <div className="mb-4">
            <h3 className="font-bold text-lg mb-2 text-gray-700">Operating Expenses</h3>
            {renderLine('Labor Expenses', laborExpense, false, true)}
            {renderLine('Overhead Expenses', overheadExpense, false, true)}
            {renderLine('Other Expenses', otherExpenses, false, true)}
            {renderLine('Total Operating Expenses', totalOperatingExpenses, true)}
          </div>

          {/* Net Profit */}
          <div className="pt-4 border-t-4 border-gray-400">
            {renderLine('Net Profit', netProfit, true, false, netProfit >= 0 ? 'text-green-600' : 'text-red-600')}
            <div className="text-right text-sm text-gray-600 mt-1">
              Net Margin: {netMargin}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}