import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function BalanceSheet({ comparativePeriods = [] }) {
  const { selectedCompanyId } = useCompany();
  const [drilldown, setDrilldown] = useState(null);
  
  const periods = comparativePeriods.length > 0 ? comparativePeriods : [{ 
    from: new Date(new Date().getFullYear(), 0, 1), 
    to: new Date(),
    label: 'Current Period'
  }];

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', selectedCompanyId],
    queryFn: () => base44.entities.Transaction.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', selectedCompanyId],
    queryFn: () => base44.entities.Account.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  // Get vehicles inventory (in_stock vehicles are inventory assets)
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', selectedCompanyId],
    queryFn: () => base44.entities.Vehicle.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  // Get sales for accounts receivable calculation
  const { data: sales = [] } = useQuery({
    queryKey: ['sales', selectedCompanyId],
    queryFn: () => base44.entities.Sale.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  // Get purchases for accounts payable calculation
  const { data: purchases = [] } = useQuery({
    queryKey: ['purchases', selectedCompanyId],
    queryFn: () => base44.entities.Purchase.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  // Get repairs for service receivables
  const { data: repairs = [] } = useQuery({
    queryKey: ['repairs', selectedCompanyId],
    queryFn: () => base44.entities.RepairOrder.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  // Calculate for each period
  const periodData = periods.map(period => {
    const periodTransactions = transactions.filter(t => {
      const transDate = new Date(t.transaction_date);
      return transDate <= period.to;
    });

    // Get account balances by type using proper double-entry
    const getAccountBalance = (accountType, accountCategory = null) => {
      return periodTransactions
        .filter(t => {
          const account = accounts.find(a => a.id === t.account_id);
          if (!account) return false;
          if (accountCategory) {
            return account.account_type === accountType && account.account_category === accountCategory;
          }
          return account.account_type === accountType;
        })
        .reduce((sum, t) => {
          // Use debit/credit amounts if available (new format)
          if (t.debit_amount > 0 || t.credit_amount > 0) {
            // Assets: debit increases, credit decreases
            if (accountType === 'asset') return sum + (t.debit_amount || 0) - (t.credit_amount || 0);
            // Liabilities & Equity: credit increases, debit decreases
            if (accountType === 'liability' || accountType === 'equity') return sum + (t.credit_amount || 0) - (t.debit_amount || 0);
          } else {
            // Fallback to old format
            if (accountType === 'asset') return sum + t.amount;
            if (accountType === 'liability' || accountType === 'equity') return sum + t.amount;
          }
          return sum;
        }, 0);
    };

    // ASSETS
    const cashAndBankFromAccounts = getAccountBalance('asset', 'cash');
    const accountsReceivableFromAccounts = getAccountBalance('asset', 'accounts_receivable');
    const otherInventory = getAccountBalance('asset', 'inventory');
    
    // Accounts Receivable from unpaid sales (within period)
    const salesReceivable = sales
      .filter(s => {
        const saleDate = new Date(s.sale_date || s.created_date);
        return saleDate <= period.to && 
               (s.payment_status === 'pending' || s.payment_status === 'partial');
      })
      .reduce((sum, s) => sum + ((s.grand_total || s.sale_price || 0) - (s.total_paid || 0)), 0);

    // Service receivables from unpaid repairs
    const serviceReceivable = repairs
      .filter(r => {
        const repairDate = new Date(r.completion_date || r.created_date);
        return repairDate <= period.to && 
               r.status === 'completed' &&
               (r.payment_status === 'pending' || r.payment_status === 'partial');
      })
      .reduce((sum, r) => sum + ((r.total_cost || 0) - (r.amount_paid || 0)), 0);

    const cashAndBank = cashAndBankFromAccounts;
    const accountsReceivable = accountsReceivableFromAccounts + salesReceivable + serviceReceivable;
    
    // Vehicle Inventory - calculate based on purchases and sales within the period
    // Start with vehicles purchased by period end, then subtract vehicles sold by period end
    const vehiclesPurchasedByPeriodEnd = vehicles
      .filter(v => {
        const acquisitionDate = new Date(v.transaction_date || v.created_date);
        return acquisitionDate <= period.to;
      });
    
    // Get vehicle IDs that were sold by period end
    const vehiclesSoldByPeriodEnd = new Set(
      sales
        .filter(s => {
          const saleDate = new Date(s.sale_date || s.created_date);
          return saleDate <= period.to && s.vehicle_id;
        })
        .map(s => s.vehicle_id)
    );
    
    // Inventory = vehicles purchased by period end minus vehicles sold by period end
    const vehicleInventory = vehiclesPurchasedByPeriodEnd
      .filter(v => !vehiclesSoldByPeriodEnd.has(v.id))
      .reduce((sum, v) => sum + (v.total_cost || v.purchase_price || 0), 0);
    
    const inventory = otherInventory + vehicleInventory;
    const totalCurrentAssets = cashAndBank + accountsReceivable + inventory;

    const fixedAssets = getAccountBalance('asset', 'fixed_assets');
    const accumulatedDepreciation = periodTransactions
      .filter(t => {
        const account = accounts.find(a => a.id === t.account_id);
        return account?.account_name?.toLowerCase().includes('depreciation') || 
               account?.account_name?.toLowerCase().includes('accumulated');
      })
      .reduce((sum, t) => sum + t.amount, 0);
    const netFixedAssets = fixedAssets - accumulatedDepreciation;

    const totalAssets = totalCurrentAssets + netFixedAssets;

    // LIABILITIES
    const accountsPayableFromAccounts = periodTransactions
      .filter(t => {
        const account = accounts.find(a => a.id === t.account_id);
        return account?.account_type === 'liability' && 
               account?.account_code?.startsWith('2') && 
               !account?.account_code?.startsWith('24') && // Exclude payroll liabilities
               t.status === 'pending';
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // Accounts Payable from unpaid purchases
    const purchasesPayable = purchases
      .filter(p => {
        const purchaseDate = new Date(p.order_date || p.created_date);
        return purchaseDate <= period.to && 
               (p.payment_status === 'pending' || p.payment_status === 'partial');
      })
      .reduce((sum, p) => sum + ((p.total_amount || 0) - (p.amount_paid || 0)), 0);

    const accountsPayable = accountsPayableFromAccounts + purchasesPayable;
    
    const payrollLiabilities = periodTransactions
      .filter(t => {
        const account = accounts.find(a => a.id === t.account_id);
        return account?.account_code?.startsWith('24') && t.status === 'pending';
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const shortTermDebt = periodTransactions
      .filter(t => {
        const account = accounts.find(a => a.id === t.account_id);
        return account?.account_type === 'liability' && 
               (account?.account_code?.startsWith('21') || account?.account_code?.startsWith('22'));
      })
      .reduce((sum, t) => sum + t.amount, 0);
    const totalCurrentLiabilities = accountsPayable + payrollLiabilities + shortTermDebt;

    const longTermDebt = periodTransactions
      .filter(t => {
        const account = accounts.find(a => a.id === t.account_id);
        return account?.account_type === 'liability' && 
               (account?.account_code?.startsWith('25') || account?.account_code?.startsWith('26'));
      })
      .reduce((sum, t) => sum + t.amount, 0);
    const totalLiabilities = totalCurrentLiabilities + longTermDebt;

    // EQUITY - Calculate retained earnings from all revenue sources
    const revenueFromAccounts = periodTransactions
      .filter(t => {
        const account = accounts.find(a => a.id === t.account_id);
        return account?.account_type === 'revenue';
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // Revenue from sales (paid)
    const salesRevenue = sales
      .filter(s => {
        const saleDate = new Date(s.sale_date || s.created_date);
        return saleDate <= period.to && s.payment_status === 'paid';
      })
      .reduce((sum, s) => sum + (s.grand_total || s.sale_price || 0), 0);

    // Revenue from repairs (paid)
    const repairRevenue = repairs
      .filter(r => {
        const repairDate = new Date(r.completion_date || r.created_date);
        return repairDate <= period.to && r.status === 'completed' && r.payment_status === 'paid';
      })
      .reduce((sum, r) => sum + (r.total_cost || 0), 0);

    const expenseFromAccounts = periodTransactions
      .filter(t => {
        const account = accounts.find(a => a.id === t.account_id);
        return account?.account_type === 'expense';
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // Note: Vehicle/Parts purchases are NOT expenses - they become inventory (asset)
    // Only operating expenses reduce retained earnings
    // COGS = cost of vehicles/parts that were SOLD (not purchased)
    
    // Calculate COGS - cost of vehicles sold during period
    const vehicleCogs = sales
      .filter(s => {
        const saleDate = new Date(s.sale_date || s.created_date);
        return saleDate <= period.to && s.vehicle_id;
      })
      .reduce((sum, s) => {
        const vehicle = vehicles.find(v => v.id === s.vehicle_id);
        return sum + (vehicle?.total_cost || vehicle?.purchase_price || 0);
      }, 0);

    const revenueTotal = revenueFromAccounts + salesRevenue + repairRevenue;
    const expenseTotal = expenseFromAccounts + vehicleCogs; // COGS, not purchase amounts

    const retainedEarnings = revenueTotal - expenseTotal;
    const ownerEquity = periodTransactions
      .filter(t => {
        const account = accounts.find(a => a.id === t.account_id);
        return account?.account_type === 'equity' && 
               !account?.account_name?.toLowerCase().includes('retained');
      })
      .reduce((sum, t) => sum + t.amount, 0);
    const totalEquity = ownerEquity + retainedEarnings;

    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    return {
      period,
      cashAndBank,
      accountsReceivable,
      inventory,
      vehicleInventory,
      otherInventory,
      totalCurrentAssets,
      fixedAssets,
      accumulatedDepreciation,
      netFixedAssets,
      totalAssets,
      accountsPayable,
      payrollLiabilities,
      shortTermDebt,
      totalCurrentLiabilities,
      longTermDebt,
      totalLiabilities,
      retainedEarnings,
      ownerEquity,
      totalEquity,
      totalLiabilitiesAndEquity
    };
  });

  // Helper to get drilldown data for a specific account type
  const getDrilldownData = (accountKey, periodIdx) => {
    const period = periods[periodIdx];
    const data = periodData[periodIdx];
    
    switch (accountKey) {
      case 'vehicleInventory':
        const vehiclesPurchased = vehicles.filter(v => {
          const acquisitionDate = new Date(v.transaction_date || v.created_date);
          return acquisitionDate <= period.to;
        });
        const soldIds = new Set(sales.filter(s => {
          const saleDate = new Date(s.sale_date || s.created_date);
          return saleDate <= period.to && s.vehicle_id;
        }).map(s => s.vehicle_id));
        return {
          title: 'Vehicle Inventory',
          items: vehiclesPurchased.filter(v => !soldIds.has(v.id)).map(v => ({
            date: v.transaction_date || v.created_date,
            description: `${v.year} ${v.make} ${v.model}`,
            reference: v.stock_number || v.vin,
            amount: v.total_cost || v.purchase_price || 0
          }))
        };
      case 'accountsReceivable':
        const arItems = [];
        sales.filter(s => {
          const saleDate = new Date(s.sale_date || s.created_date);
          return saleDate <= period.to && (s.payment_status === 'pending' || s.payment_status === 'partial');
        }).forEach(s => {
          arItems.push({
            date: s.sale_date || s.created_date,
            description: `Sale: ${s.customer_name}`,
            reference: s.sale_number,
            amount: (s.grand_total || s.sale_price || 0) - (s.total_paid || 0)
          });
        });
        repairs.filter(r => {
          const repairDate = new Date(r.completion_date || r.created_date);
          return repairDate <= period.to && r.status === 'completed' && (r.payment_status === 'pending' || r.payment_status === 'partial');
        }).forEach(r => {
          arItems.push({
            date: r.completion_date || r.created_date,
            description: `Service: ${r.customer_name}`,
            reference: r.order_number,
            amount: (r.total_cost || 0) - (r.amount_paid || 0)
          });
        });
        return { title: 'Accounts Receivable', items: arItems };
      case 'accountsPayable':
        return {
          title: 'Accounts Payable',
          items: purchases.filter(p => {
            const purchaseDate = new Date(p.order_date || p.created_date);
            return purchaseDate <= period.to && (p.payment_status === 'pending' || p.payment_status === 'partial');
          }).map(p => ({
            date: p.order_date || p.created_date,
            description: `Purchase: ${p.supplier_name}`,
            reference: p.purchase_number,
            amount: (p.total_amount || 0) - (p.amount_paid || 0)
          }))
        };
      default:
        return { title: accountKey, items: [] };
    }
  };

  const handleDrilldown = (accountKey, periodIdx) => {
    const data = getDrilldownData(accountKey, periodIdx);
    setDrilldown({ ...data, period: periods[periodIdx] });
  };

  const renderLine = (label, values, isSubtotal = false, isTotal = false, indent = 0, accountKey = null) => (
    <div className={`grid gap-4 py-2 px-4 ${isSubtotal || isTotal ? 'border-t border-gray-300 font-semibold' : ''} ${isTotal ? 'bg-blue-50 text-blue-900' : ''}`}
         style={{ gridTemplateColumns: `300px repeat(${periods.length}, 1fr)` }}>
      <span style={{ paddingLeft: `${indent * 20}px` }}>{label}</span>
      {values.map((value, idx) => (
        <span 
          key={idx} 
          className={`text-right ${accountKey ? 'cursor-pointer hover:text-blue-600 hover:underline' : ''}`}
          onDoubleClick={() => accountKey && handleDrilldown(accountKey, idx)}
          title={accountKey ? 'Double-click to view details' : ''}
        >
          ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ))}
    </div>
  );

  const exportToCSV = () => {
    const headers = ['Account', ...periods.map(p => p.label)];
    const csvContent = [
      ['Balance Sheet'],
      ['Generated on', format(new Date(), 'MMMM d, yyyy')],
      [],
      headers,
      ['Cash and Bank', ...periodData.map(d => d.cashAndBank.toFixed(2))],
      ['Accounts Receivable', ...periodData.map(d => d.accountsReceivable.toFixed(2))],
      ['Inventory', ...periodData.map(d => d.inventory.toFixed(2))],
      ['Total Current Assets', ...periodData.map(d => d.totalCurrentAssets.toFixed(2))],
      ['Total Assets', ...periodData.map(d => d.totalAssets.toFixed(2))],
      ['Total Liabilities', ...periodData.map(d => d.totalLiabilities.toFixed(2))],
      ['Total Equity', ...periodData.map(d => d.totalEquity.toFixed(2))],
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-sheet-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Balance Sheet</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Comparative Period Analysis</p>
          </div>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Column Headers */}
        <div className="grid gap-4 py-3 px-4 bg-gray-100 font-semibold border-b-2 border-gray-300"
             style={{ gridTemplateColumns: `300px repeat(${periods.length}, 1fr)` }}>
          <span className="text-sm uppercase">Account</span>
          {periods.map((period, idx) => (
            <span key={idx} className="text-right text-sm">
              {period.label}
            </span>
          ))}
        </div>

        {/* ASSETS */}
        <div>
          <h3 className="font-bold text-base mb-2 text-gray-900 px-4">ASSETS</h3>
          
          <div className="mb-4">
            <h4 className="font-semibold text-sm mb-2 px-4 text-gray-700">Current Assets</h4>
            {renderLine('Cash and Bank', periodData.map(d => d.cashAndBank), false, false, 1, 'cashAndBank')}
            {renderLine('Accounts Receivable', periodData.map(d => d.accountsReceivable), false, false, 1, 'accountsReceivable')}
            {renderLine('Vehicle Inventory', periodData.map(d => d.vehicleInventory), false, false, 1, 'vehicleInventory')}
            {renderLine('Other Inventory', periodData.map(d => d.otherInventory), false, false, 1)}
            {renderLine('Total Current Assets', periodData.map(d => d.totalCurrentAssets), true, false, 1)}
          </div>

          <div className="mb-4">
            <h4 className="font-semibold text-sm mb-2 px-4 text-gray-700">Fixed Assets</h4>
            {renderLine('Fixed Assets', periodData.map(d => d.fixedAssets), false, false, 1)}
            {renderLine('Less: Accumulated Depreciation', periodData.map(d => -d.accumulatedDepreciation), false, false, 1)}
            {renderLine('Net Fixed Assets', periodData.map(d => d.netFixedAssets), true, false, 1)}
          </div>

          {renderLine('TOTAL ASSETS', periodData.map(d => d.totalAssets), false, true)}
        </div>

        {/* LIABILITIES */}
        <div className="mt-8">
          <h3 className="font-bold text-base mb-2 text-gray-900 px-4">LIABILITIES</h3>
          
          <div className="mb-4">
            <h4 className="font-semibold text-sm mb-2 px-4 text-gray-700">Current Liabilities</h4>
            {renderLine('Accounts Payable', periodData.map(d => d.accountsPayable), false, false, 1, 'accountsPayable')}
            {renderLine('Payroll Liabilities', periodData.map(d => d.payrollLiabilities), false, false, 1)}
            {renderLine('Short-term Debt', periodData.map(d => d.shortTermDebt), false, false, 1)}
            {renderLine('Total Current Liabilities', periodData.map(d => d.totalCurrentLiabilities), true, false, 1)}
          </div>

          <div className="mb-4">
            <h4 className="font-semibold text-sm mb-2 px-4 text-gray-700">Long-term Liabilities</h4>
            {renderLine('Long-term Debt', periodData.map(d => d.longTermDebt), false, false, 1)}
          </div>

          {renderLine('TOTAL LIABILITIES', periodData.map(d => d.totalLiabilities), false, true)}
        </div>

        {/* EQUITY */}
        <div className="mt-8">
          <h3 className="font-bold text-base mb-2 text-gray-900 px-4">EQUITY</h3>
          {renderLine('Owner Equity', periodData.map(d => d.ownerEquity), false, false, 1)}
          {renderLine('Retained Earnings', periodData.map(d => d.retainedEarnings), false, false, 1)}
          {renderLine('TOTAL EQUITY', periodData.map(d => d.totalEquity), false, true)}
        </div>

        {/* TOTAL LIABILITIES & EQUITY */}
        <div className="mt-6">
          {renderLine('TOTAL LIABILITIES & EQUITY', periodData.map(d => d.totalLiabilitiesAndEquity), false, true)}
        </div>

        {/* Drilldown Dialog */}
        <Dialog open={!!drilldown} onOpenChange={() => setDrilldown(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{drilldown?.title} - {drilldown?.period?.label}</DialogTitle>
            </DialogHeader>
            {drilldown && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-xl font-bold text-blue-600">
                    ${drilldown.items.reduce((sum, i) => sum + i.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 bg-gray-100">
                      <th className="text-left py-2 px-3">Date</th>
                      <th className="text-left py-2 px-3">Description</th>
                      <th className="text-left py-2 px-3">Reference</th>
                      <th className="text-right py-2 px-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drilldown.items.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-4 text-gray-500">No items found</td></tr>
                    ) : (
                      drilldown.items.map((item, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-3">{format(new Date(item.date), 'MMM d, yyyy')}</td>
                          <td className="py-2 px-3">{item.description}</td>
                          <td className="py-2 px-3 text-gray-600">{item.reference || '-'}</td>
                          <td className="py-2 px-3 text-right font-medium">${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}