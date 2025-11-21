import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Sparkles, Download, Printer, Upload } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import AccountDialog from "./AccountDialog";
import ImportAccountsDialog from "./ImportAccountsDialog";

export default function ChartOfAccounts() {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts', selectedCompanyId],
    queryFn: () => base44.entities.Account.filter({ company_id: selectedCompanyId }, 'account_code'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (accountId) => base44.entities.Account.delete(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success("Account deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete account");
    }
  });

  const handleGenerateAccounts = async () => {
    if (!selectedCompanyId) {
      toast.error("Please select a company first");
      return;
    }

    setIsGenerating(true);
    
    try {
      toast.info("Creating standard chart of accounts...");
      
      const standardAccounts = [
        { code: "1000", name: "Cash - Operating", type: "asset", category: "cash", description: "Primary operating bank account" },
        { code: "1010", name: "Cash - Payroll", type: "asset", category: "cash", description: "Payroll bank account" },
        { code: "1020", name: "Petty Cash", type: "asset", category: "cash", description: "Cash on hand for small expenses" },
        { code: "1100", name: "Accounts Receivable", type: "asset", category: "accounts_receivable", description: "Money owed by customers" },
        { code: "1200", name: "Vehicle Inventory - New", type: "asset", category: "inventory", description: "New vehicle inventory" },
        { code: "1210", name: "Vehicle Inventory - Used", type: "asset", category: "inventory", description: "Used vehicle inventory" },
        { code: "1220", name: "Parts Inventory", type: "asset", category: "inventory", description: "Auto parts and supplies" },
        { code: "1300", name: "Prepaid Insurance", type: "asset", category: "other", description: "Insurance paid in advance" },
        { code: "1310", name: "Prepaid Rent", type: "asset", category: "other", description: "Rent paid in advance" },
        { code: "1500", name: "Equipment", type: "asset", category: "fixed_assets", description: "Shop equipment and tools" },
        { code: "1510", name: "Vehicles - Company Use", type: "asset", category: "fixed_assets", description: "Company-owned vehicles" },
        { code: "1520", name: "Furniture & Fixtures", type: "asset", category: "fixed_assets", description: "Office furniture and fixtures" },
        { code: "1530", name: "Buildings", type: "asset", category: "fixed_assets", description: "Real estate and structures" },
        { code: "1540", name: "Land", type: "asset", category: "fixed_assets", description: "Land owned" },
        { code: "1600", name: "Accumulated Depreciation - Equipment", type: "asset", category: "fixed_assets", description: "Depreciation on equipment" },
        { code: "1610", name: "Accumulated Depreciation - Vehicles", type: "asset", category: "fixed_assets", description: "Depreciation on vehicles" },
        { code: "1620", name: "Accumulated Depreciation - Buildings", type: "asset", category: "fixed_assets", description: "Depreciation on buildings" },
        { code: "2000", name: "Accounts Payable", type: "liability", category: "accounts_payable", description: "Money owed to suppliers" },
        { code: "2100", name: "Credit Card Payable", type: "liability", category: "other", description: "Credit card balances" },
        { code: "2200", name: "Sales Tax Payable - GST", type: "liability", category: "other", description: "GST collected and owing" },
        { code: "2210", name: "Sales Tax Payable - PST", type: "liability", category: "other", description: "PST collected and owing" },
        { code: "2220", name: "Sales Tax Payable - HST", type: "liability", category: "other", description: "HST collected and owing" },
        { code: "2300", name: "Wages Payable", type: "liability", category: "other", description: "Unpaid wages owed to employees" },
        { code: "2400", name: "Payroll Liabilities", type: "liability", category: "other", description: "CPP, EI, and tax deductions payable" },
        { code: "2500", name: "Vehicle Loans Payable", type: "liability", category: "other", description: "Loans for inventory vehicles" },
        { code: "2510", name: "Equipment Loans Payable", type: "liability", category: "other", description: "Loans for equipment" },
        { code: "2600", name: "Line of Credit", type: "liability", category: "other", description: "Business line of credit" },
        { code: "2700", name: "Long-term Debt", type: "liability", category: "other", description: "Mortgage and long-term loans" },
        { code: "3000", name: "Owner's Equity", type: "equity", category: "other", description: "Owner's investment in business" },
        { code: "3100", name: "Owner's Drawings", type: "equity", category: "other", description: "Money withdrawn by owner" },
        { code: "3900", name: "Retained Earnings", type: "equity", category: "other", description: "Accumulated profits" },
        { code: "3950", name: "Current Year Earnings", type: "equity", category: "other", description: "Current year profit/loss" },
        { code: "4000", name: "Vehicle Sales - New", type: "revenue", category: "sales_revenue", description: "Revenue from new vehicle sales" },
        { code: "4010", name: "Vehicle Sales - Used", type: "revenue", category: "sales_revenue", description: "Revenue from used vehicle sales" },
        { code: "4100", name: "Service Revenue - Mechanical", type: "revenue", category: "service_revenue", description: "Mechanical repair services" },
        { code: "4110", name: "Service Revenue - Body Work", type: "revenue", category: "service_revenue", description: "Body repair and paint services" },
        { code: "4120", name: "Service Revenue - Detailing", type: "revenue", category: "service_revenue", description: "Vehicle detailing services" },
        { code: "4130", name: "Service Revenue - Inspections", type: "revenue", category: "service_revenue", description: "Vehicle inspection fees" },
        { code: "4200", name: "Parts Sales", type: "revenue", category: "sales_revenue", description: "Revenue from parts sales" },
        { code: "4300", name: "Labor Revenue", type: "revenue", category: "service_revenue", description: "Labor charges for services" },
        { code: "4400", name: "Finance & Insurance Income", type: "revenue", category: "other", description: "Commissions from financing" },
        { code: "4500", name: "Warranty Income", type: "revenue", category: "other", description: "Warranty work reimbursements" },
        { code: "4600", name: "Export Revenue", type: "revenue", category: "sales_revenue", description: "Revenue from vehicle exports" },
        { code: "4700", name: "Freight Income", type: "revenue", category: "service_revenue", description: "Shipping and freight charges" },
        { code: "4800", name: "Other Income", type: "revenue", category: "other", description: "Miscellaneous income" },
        { code: "5000", name: "Cost of Vehicles Sold", type: "expense", category: "cost_of_goods_sold", description: "Cost of vehicles sold" },
        { code: "5100", name: "Cost of Parts Sold", type: "expense", category: "cost_of_goods_sold", description: "Cost of parts sold" },
        { code: "5200", name: "Wages & Salaries", type: "expense", category: "operating_expenses", description: "Employee wages and salaries" },
        { code: "5210", name: "Commissions - Sales", type: "expense", category: "operating_expenses", description: "Sales commissions" },
        { code: "5300", name: "Payroll Taxes", type: "expense", category: "operating_expenses", description: "Employer payroll taxes" },
        { code: "5310", name: "CPP Expense", type: "expense", category: "operating_expenses", description: "Employer CPP contributions" },
        { code: "5320", name: "EI Expense", type: "expense", category: "operating_expenses", description: "Employer EI contributions" },
        { code: "5330", name: "Workers Compensation", type: "expense", category: "operating_expenses", description: "Workers compensation insurance" },
        { code: "5400", name: "Employee Benefits", type: "expense", category: "operating_expenses", description: "Health and other benefits" },
        { code: "5500", name: "Rent Expense", type: "expense", category: "operating_expenses", description: "Facility rent" },
        { code: "5510", name: "Property Taxes", type: "expense", category: "operating_expenses", description: "Real estate taxes" },
        { code: "5600", name: "Utilities - Electricity", type: "expense", category: "operating_expenses", description: "Electricity costs" },
        { code: "5610", name: "Utilities - Gas", type: "expense", category: "operating_expenses", description: "Natural gas costs" },
        { code: "5620", name: "Utilities - Water", type: "expense", category: "operating_expenses", description: "Water and sewer" },
        { code: "5630", name: "Internet & Phone", type: "expense", category: "operating_expenses", description: "Communication services" },
        { code: "5700", name: "Insurance - General Liability", type: "expense", category: "operating_expenses", description: "General liability insurance" },
        { code: "5710", name: "Insurance - Vehicle", type: "expense", category: "operating_expenses", description: "Vehicle insurance" },
        { code: "5720", name: "Insurance - Property", type: "expense", category: "operating_expenses", description: "Property insurance" },
        { code: "5800", name: "Advertising & Marketing", type: "expense", category: "operating_expenses", description: "Marketing expenses" },
        { code: "5810", name: "Website & Online Advertising", type: "expense", category: "operating_expenses", description: "Digital marketing" },
        { code: "5900", name: "Office Supplies", type: "expense", category: "operating_expenses", description: "Office supplies and materials" },
        { code: "5910", name: "Shop Supplies", type: "expense", category: "operating_expenses", description: "Shop tools and supplies" },
        { code: "6000", name: "Vehicle Maintenance", type: "expense", category: "operating_expenses", description: "Company vehicle maintenance" },
        { code: "6010", name: "Fuel Expense", type: "expense", category: "operating_expenses", description: "Fuel for company vehicles" },
        { code: "6100", name: "Professional Fees - Legal", type: "expense", category: "operating_expenses", description: "Legal fees" },
        { code: "6110", name: "Professional Fees - Accounting", type: "expense", category: "operating_expenses", description: "Accounting and bookkeeping" },
        { code: "6120", name: "Professional Fees - Consulting", type: "expense", category: "operating_expenses", description: "Consulting fees" },
        { code: "6200", name: "Bank Fees & Charges", type: "expense", category: "operating_expenses", description: "Banking fees" },
        { code: "6210", name: "Credit Card Processing Fees", type: "expense", category: "operating_expenses", description: "Payment processing fees" },
        { code: "6300", name: "Interest Expense - Loans", type: "expense", category: "other", description: "Interest on loans" },
        { code: "6310", name: "Interest Expense - Line of Credit", type: "expense", category: "other", description: "Interest on line of credit" },
        { code: "6400", name: "Depreciation Expense", type: "expense", category: "other", description: "Asset depreciation" },
        { code: "6500", name: "Repairs & Maintenance - Building", type: "expense", category: "operating_expenses", description: "Building repairs" },
        { code: "6510", name: "Repairs & Maintenance - Equipment", type: "expense", category: "operating_expenses", description: "Equipment repairs" },
        { code: "6600", name: "Licenses & Permits", type: "expense", category: "operating_expenses", description: "Business licenses" },
        { code: "6700", name: "Training & Development", type: "expense", category: "operating_expenses", description: "Employee training" },
        { code: "6800", name: "Travel & Entertainment", type: "expense", category: "operating_expenses", description: "Business travel expenses" },
        { code: "6900", name: "Miscellaneous Expenses", type: "expense", category: "other", description: "Other expenses" }
      ];

      let created = 0;
      for (const acc of standardAccounts) {
        try {
          await base44.entities.Account.create({
            company_id: selectedCompanyId,
            account_code: acc.code,
            account_name: acc.name,
            account_type: acc.type,
            account_category: acc.category,
            balance: 0,
            description: acc.description
          });
          created++;
        } catch (err) {
          console.error(`Failed to create ${acc.code}:`, err);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success(`Successfully created ${created} standard accounts!`);
    } catch (error) {
      console.error("Generation error:", error);
      toast.error(error.message || "Failed to generate accounts");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setDialogOpen(true);
  };

  const handleDelete = (accountId) => {
    if (confirm("Are you sure you want to delete this account?")) {
      deleteAccountMutation.mutate(accountId);
    }
  };

  const getTypeBadge = (type) => {
    const colors = {
      asset: 'bg-blue-100 text-blue-700',
      liability: 'bg-orange-100 text-orange-700',
      equity: 'bg-purple-100 text-purple-700',
      revenue: 'bg-green-100 text-green-700',
      expense: 'bg-red-100 text-red-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const groupedAccounts = accounts.reduce((groups, account) => {
    const type = account.account_type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(account);
    return groups;
  }, {});

  const exportToCSV = () => {
    const headers = ['Account Code', 'Account Name', 'Type', 'Category', 'Balance', 'Description'];
    const rows = accounts.map(acc => [
      acc.account_code,
      acc.account_name,
      acc.account_type,
      acc.account_category,
      acc.balance || 0,
      acc.description || ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chart-of-accounts-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Chart of Accounts</h2>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button 
            onClick={handleGenerateAccounts} 
            disabled={isGenerating || !selectedCompanyId}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isGenerating ? "Creating..." : "Generate Standard Accounts"}
          </Button>
          <Button onClick={() => setImportDialogOpen(true)} variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => { setEditingAccount(null); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Account
          </Button>
        </div>
      </div>

      {accounts.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-500" />
            <p className="text-xl font-semibold mb-2">No accounts yet</p>
            <p className="text-gray-500 mb-4">Generate a complete standard chart of accounts or import your own</p>
            <Button 
              onClick={handleGenerateAccounts} 
              disabled={isGenerating || !selectedCompanyId}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isGenerating ? "Creating..." : "Generate Standard Accounts"}
            </Button>
          </CardContent>
        </Card>
      )}

      {Object.entries(groupedAccounts).map(([type, typeAccounts]) => (
        <Card key={type}>
          <CardHeader>
            <CardTitle className="capitalize flex items-center gap-2">
              {type}
              <Badge className={getTypeBadge(type)}>{typeAccounts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {typeAccounts.map(account => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <span className="font-mono text-sm font-semibold text-gray-600 w-20">
                      {account.account_code}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold">{account.account_name}</p>
                      {account.description && (
                        <p className="text-sm text-gray-600">{account.description}</p>
                      )}
                    </div>
                    <Badge variant="outline">{account.account_category}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg w-32 text-right">
                      ${account.balance?.toLocaleString() || '0'}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(account)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(account.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <AccountDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingAccount(null); }}
        account={editingAccount}
      />

      <ImportAccountsDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        companyId={selectedCompanyId}
        onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ['accounts'] })}
      />
    </div>
  );
}