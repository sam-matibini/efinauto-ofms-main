import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const standardChartOfAccounts = {
  assets: [
    { code: "1000", name: "Cash - Operating", category: "cash", description: "Primary operating bank account" },
    { code: "1010", name: "Cash - Payroll", category: "cash", description: "Payroll bank account" },
    { code: "1020", name: "Petty Cash", category: "cash", description: "Cash on hand for small expenses" },
    { code: "1100", name: "Accounts Receivable", category: "accounts_receivable", description: "Money owed by customers" },
    { code: "1200", name: "Vehicle Inventory - New", category: "inventory", description: "New vehicle inventory" },
    { code: "1210", name: "Vehicle Inventory - Used", category: "inventory", description: "Used vehicle inventory" },
    { code: "1220", name: "Parts Inventory", category: "inventory", description: "Auto parts and supplies" },
    { code: "1300", name: "Prepaid Insurance", category: "other", description: "Insurance paid in advance" },
    { code: "1310", name: "Prepaid Rent", category: "other", description: "Rent paid in advance" },
    { code: "1500", name: "Equipment", category: "fixed_assets", description: "Shop equipment and tools" },
    { code: "1510", name: "Vehicles - Company Use", category: "fixed_assets", description: "Company-owned vehicles" },
    { code: "1520", name: "Furniture & Fixtures", category: "fixed_assets", description: "Office furniture and fixtures" },
    { code: "1530", name: "Buildings", category: "fixed_assets", description: "Real estate and structures" },
    { code: "1540", name: "Land", category: "fixed_assets", description: "Land owned" },
    { code: "1600", name: "Accumulated Depreciation - Equipment", category: "fixed_assets", description: "Depreciation on equipment" },
    { code: "1610", name: "Accumulated Depreciation - Vehicles", category: "fixed_assets", description: "Depreciation on vehicles" },
    { code: "1620", name: "Accumulated Depreciation - Buildings", category: "fixed_assets", description: "Depreciation on buildings" }
  ],
  liabilities: [
    { code: "2000", name: "Accounts Payable", category: "accounts_payable", description: "Money owed to suppliers" },
    { code: "2100", name: "Credit Card Payable", category: "other", description: "Credit card balances" },
    { code: "2200", name: "Sales Tax Payable - GST", category: "other", description: "GST collected and owing" },
    { code: "2210", name: "Sales Tax Payable - PST", category: "other", description: "PST collected and owing" },
    { code: "2220", name: "Sales Tax Payable - HST", category: "other", description: "HST collected and owing" },
    { code: "2300", name: "Wages Payable", category: "other", description: "Unpaid wages owed to employees" },
    { code: "2400", name: "Payroll Liabilities", category: "other", description: "CPP, EI, and tax deductions payable" },
    { code: "2500", name: "Vehicle Loans Payable", category: "other", description: "Loans for inventory vehicles" },
    { code: "2510", name: "Equipment Loans Payable", category: "other", description: "Loans for equipment" },
    { code: "2600", name: "Line of Credit", category: "other", description: "Business line of credit" },
    { code: "2700", name: "Long-term Debt", category: "other", description: "Mortgage and long-term loans" }
  ],
  equity: [
    { code: "3000", name: "Owner's Equity", category: "other", description: "Owner's investment in business" },
    { code: "3100", name: "Owner's Drawings", category: "other", description: "Money withdrawn by owner" },
    { code: "3900", name: "Retained Earnings", category: "other", description: "Accumulated profits" },
    { code: "3950", name: "Current Year Earnings", category: "other", description: "Current year profit/loss" }
  ],
  revenue: [
    { code: "4000", name: "Vehicle Sales - New", category: "sales_revenue", description: "Revenue from new vehicle sales" },
    { code: "4010", name: "Vehicle Sales - Used", category: "sales_revenue", description: "Revenue from used vehicle sales" },
    { code: "4100", name: "Service Revenue - Mechanical", category: "service_revenue", description: "Mechanical repair services" },
    { code: "4110", name: "Service Revenue - Body Work", category: "service_revenue", description: "Body repair and paint services" },
    { code: "4120", name: "Service Revenue - Detailing", category: "service_revenue", description: "Vehicle detailing services" },
    { code: "4130", name: "Service Revenue - Inspections", category: "service_revenue", description: "Vehicle inspection fees" },
    { code: "4200", name: "Parts Sales", category: "sales_revenue", description: "Revenue from parts sales" },
    { code: "4300", name: "Labor Revenue", category: "service_revenue", description: "Labor charges for services" },
    { code: "4400", name: "Finance & Insurance Income", category: "other", description: "Commissions from financing" },
    { code: "4500", name: "Warranty Income", category: "other", description: "Warranty work reimbursements" },
    { code: "4600", name: "Export Revenue", category: "sales_revenue", description: "Revenue from vehicle exports" },
    { code: "4700", name: "Freight Income", category: "service_revenue", description: "Shipping and freight charges" },
    { code: "4800", name: "Other Income", category: "other", description: "Miscellaneous income" }
  ],
  expenses: [
    { code: "5000", name: "Cost of Vehicles Sold", category: "cost_of_goods_sold", description: "Cost of vehicles sold" },
    { code: "5100", name: "Cost of Parts Sold", category: "cost_of_goods_sold", description: "Cost of parts sold" },
    { code: "5200", name: "Wages & Salaries", category: "operating_expenses", description: "Employee wages and salaries" },
    { code: "5210", name: "Commissions - Sales", category: "operating_expenses", description: "Sales commissions" },
    { code: "5300", name: "Payroll Taxes", category: "operating_expenses", description: "Employer payroll taxes" },
    { code: "5310", name: "CPP Expense", category: "operating_expenses", description: "Employer CPP contributions" },
    { code: "5320", name: "EI Expense", category: "operating_expenses", description: "Employer EI contributions" },
    { code: "5330", name: "Workers Compensation", category: "operating_expenses", description: "Workers compensation insurance" },
    { code: "5400", name: "Employee Benefits", category: "operating_expenses", description: "Health and other benefits" },
    { code: "5500", name: "Rent Expense", category: "operating_expenses", description: "Facility rent" },
    { code: "5510", name: "Property Taxes", category: "operating_expenses", description: "Real estate taxes" },
    { code: "5600", name: "Utilities - Electricity", category: "operating_expenses", description: "Electricity costs" },
    { code: "5610", name: "Utilities - Gas", category: "operating_expenses", description: "Natural gas costs" },
    { code: "5620", name: "Utilities - Water", category: "operating_expenses", description: "Water and sewer" },
    { code: "5630", name: "Internet & Phone", category: "operating_expenses", description: "Communication services" },
    { code: "5700", name: "Insurance - General Liability", category: "operating_expenses", description: "General liability insurance" },
    { code: "5710", name: "Insurance - Vehicle", category: "operating_expenses", description: "Vehicle insurance" },
    { code: "5720", name: "Insurance - Property", category: "operating_expenses", description: "Property insurance" },
    { code: "5800", name: "Advertising & Marketing", category: "operating_expenses", description: "Marketing expenses" },
    { code: "5810", name: "Website & Online Advertising", category: "operating_expenses", description: "Digital marketing" },
    { code: "5900", name: "Office Supplies", category: "operating_expenses", description: "Office supplies and materials" },
    { code: "5910", name: "Shop Supplies", category: "operating_expenses", description: "Shop tools and supplies" },
    { code: "6000", name: "Vehicle Maintenance", category: "operating_expenses", description: "Company vehicle maintenance" },
    { code: "6010", name: "Fuel Expense", category: "operating_expenses", description: "Fuel for company vehicles" },
    { code: "6100", name: "Professional Fees - Legal", category: "operating_expenses", description: "Legal fees" },
    { code: "6110", name: "Professional Fees - Accounting", category: "operating_expenses", description: "Accounting and bookkeeping" },
    { code: "6120", name: "Professional Fees - Consulting", category: "operating_expenses", description: "Consulting fees" },
    { code: "6200", name: "Bank Fees & Charges", category: "operating_expenses", description: "Banking fees" },
    { code: "6210", name: "Credit Card Processing Fees", category: "operating_expenses", description: "Payment processing fees" },
    { code: "6300", name: "Interest Expense - Loans", category: "other", description: "Interest on loans" },
    { code: "6310", name: "Interest Expense - Line of Credit", category: "other", description: "Interest on line of credit" },
    { code: "6400", name: "Depreciation Expense", category: "other", description: "Asset depreciation" },
    { code: "6500", name: "Repairs & Maintenance - Building", category: "operating_expenses", description: "Building repairs" },
    { code: "6510", name: "Repairs & Maintenance - Equipment", category: "operating_expenses", description: "Equipment repairs" },
    { code: "6600", name: "Licenses & Permits", category: "operating_expenses", description: "Business licenses" },
    { code: "6700", name: "Training & Development", category: "operating_expenses", description: "Employee training" },
    { code: "6800", name: "Travel & Entertainment", category: "operating_expenses", description: "Business travel expenses" },
    { code: "6900", name: "Miscellaneous Expenses", category: "other", description: "Other expenses" }
  ]
};

export default function ChartOfAccountsReference() {
  const [searchTerm, setSearchTerm] = useState("");

  const filterAccounts = (accounts) => {
    if (!searchTerm) return accounts;
    return accounts.filter(acc => 
      acc.code.includes(searchTerm) ||
      acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getTypeBadge = (type) => {
    const colors = {
      assets: 'bg-blue-100 text-blue-700',
      liabilities: 'bg-orange-100 text-orange-700',
      equity: 'bg-purple-100 text-purple-700',
      revenue: 'bg-green-100 text-green-700',
      expenses: 'bg-red-100 text-red-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Standard Chart of Accounts</h2>
          <p className="text-sm text-gray-600 mt-1">Reference guide for automotive dealership accounting</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by code, name, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Assets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Assets (1000-1999)</span>
            <Badge className={getTypeBadge('assets')}>{filterAccounts(standardChartOfAccounts.assets).length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filterAccounts(standardChartOfAccounts.assets).map((account) => (
              <div key={account.code} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="font-mono text-sm font-semibold text-blue-600 w-16">{account.code}</span>
                <div className="flex-1">
                  <p className="font-semibold">{account.name}</p>
                  <p className="text-sm text-gray-600">{account.description}</p>
                </div>
                <Badge variant="outline" className="text-xs">{account.category}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Liabilities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Liabilities (2000-2999)</span>
            <Badge className={getTypeBadge('liabilities')}>{filterAccounts(standardChartOfAccounts.liabilities).length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filterAccounts(standardChartOfAccounts.liabilities).map((account) => (
              <div key={account.code} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="font-mono text-sm font-semibold text-orange-600 w-16">{account.code}</span>
                <div className="flex-1">
                  <p className="font-semibold">{account.name}</p>
                  <p className="text-sm text-gray-600">{account.description}</p>
                </div>
                <Badge variant="outline" className="text-xs">{account.category}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Equity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Equity (3000-3999)</span>
            <Badge className={getTypeBadge('equity')}>{filterAccounts(standardChartOfAccounts.equity).length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filterAccounts(standardChartOfAccounts.equity).map((account) => (
              <div key={account.code} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="font-mono text-sm font-semibold text-purple-600 w-16">{account.code}</span>
                <div className="flex-1">
                  <p className="font-semibold">{account.name}</p>
                  <p className="text-sm text-gray-600">{account.description}</p>
                </div>
                <Badge variant="outline" className="text-xs">{account.category}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Revenue (4000-4999)</span>
            <Badge className={getTypeBadge('revenue')}>{filterAccounts(standardChartOfAccounts.revenue).length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filterAccounts(standardChartOfAccounts.revenue).map((account) => (
              <div key={account.code} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="font-mono text-sm font-semibold text-green-600 w-16">{account.code}</span>
                <div className="flex-1">
                  <p className="font-semibold">{account.name}</p>
                  <p className="text-sm text-gray-600">{account.description}</p>
                </div>
                <Badge variant="outline" className="text-xs">{account.category}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Expenses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Expenses (5000-6999)</span>
            <Badge className={getTypeBadge('expenses')}>{filterAccounts(standardChartOfAccounts.expenses).length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filterAccounts(standardChartOfAccounts.expenses).map((account) => (
              <div key={account.code} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="font-mono text-sm font-semibold text-red-600 w-16">{account.code}</span>
                <div className="flex-1">
                  <p className="font-semibold">{account.name}</p>
                  <p className="text-sm text-gray-600">{account.description}</p>
                </div>
                <Badge variant="outline" className="text-xs">{account.category}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}