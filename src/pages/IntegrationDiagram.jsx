import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Car, Wrench, Package, Ship, DollarSign, Users, Trash2, 
  ArrowRight, ArrowDown, Database, CheckCircle, AlertCircle,
  FileText, CreditCard, Receipt, Building2, Briefcase, BarChart3, Landmark
} from "lucide-react";

const modules = [
  {
    id: 'sales',
    name: 'Sales',
    icon: DollarSign,
    color: 'bg-green-500',
    borderColor: 'border-green-500',
    transactions: [
      { action: 'Create Sale', type: 'sale_revenue', debit: 'Accounts Receivable', credit: 'Vehicle Sales Revenue' },
      { action: 'GST/HST Collected', type: 'tax_liability', debit: 'Accounts Receivable', credit: 'GST/HST Payable (2100/2120)' },
      { action: 'PST/QST Collected', type: 'tax_liability', debit: 'Accounts Receivable', credit: 'PST Payable (2110)' },
      { action: 'Payment Received', type: 'payment_received', debit: 'Cash', credit: 'Accounts Receivable' },
      { action: 'COGS (if vehicle)', type: 'other_expense', debit: 'Cost of Vehicles Sold', credit: 'Vehicle Inventory' }
    ]
  },
  {
    id: 'purchases',
    name: 'Purchases',
    icon: Package,
    color: 'bg-blue-500',
    borderColor: 'border-blue-500',
    transactions: [
      { action: 'Receive Purchase', type: 'vehicle_purchase / parts_purchase', debit: 'Inventory (Vehicle/Parts)', credit: 'Accounts Payable' },
      { action: 'Payment Made', type: 'payment_made', debit: 'Accounts Payable', credit: 'Cash' }
    ]
  },
  {
    id: 'repairs',
    name: 'Auto Repair',
    icon: Wrench,
    color: 'bg-orange-500',
    borderColor: 'border-orange-500',
    transactions: [
      { action: 'Complete Repair (Labor)', type: 'service_revenue', debit: 'Accounts Receivable', credit: 'Service Revenue' },
      { action: 'Parts Used', type: 'other_expense', debit: 'Cost of Parts Sold', credit: 'Parts Inventory' },
      { action: 'Inventory Update', type: 'inventory_adjustment', debit: 'N/A', credit: 'Parts Quantity Reduced' }
    ]
  },
  {
    id: 'salvage',
    name: 'Salvage & Dismantling',
    icon: Trash2,
    color: 'bg-purple-500',
    borderColor: 'border-purple-500',
    transactions: [
      { action: 'Acquire Salvage Vehicle', type: 'vehicle_purchase', debit: 'Vehicle Inventory', credit: 'Accounts Payable' },
      { action: 'Scrap Sale', type: 'other_income', debit: 'Cash', credit: 'Salvage Revenue' },
      { action: 'Parts Extraction', type: 'journal_entry', debit: 'Parts Inventory', credit: 'Vehicle Inventory' }
    ]
  },
  {
    id: 'shipping',
    name: 'Global Shipping',
    icon: Ship,
    color: 'bg-cyan-500',
    borderColor: 'border-cyan-500',
    transactions: [
      { action: 'Freight Charges', type: 'other_expense', debit: 'Shipping & Freight Expense', credit: 'Accounts Payable' },
      { action: 'Customs & Duties', type: 'other_expense', debit: 'Customs & Duties Expense', credit: 'Accounts Payable' },
      { action: 'Insurance', type: 'other_expense', debit: 'Insurance Expense', credit: 'Accounts Payable' }
    ]
  },
  {
    id: 'payroll',
    name: 'Payroll & HR',
    icon: Users,
    color: 'bg-indigo-500',
    borderColor: 'border-indigo-500',
    transactions: [
      { action: 'Process Payroll (Gross)', type: 'payroll_expense', debit: 'Wages & Salaries Expense', credit: 'Cash' },
      { action: 'Employer CPP', type: 'payroll_expense', debit: 'CPP Expense', credit: 'Payroll Liabilities' },
      { action: 'Employer EI', type: 'payroll_expense', debit: 'EI Expense', credit: 'Payroll Liabilities' },
      { action: 'Deductions Payable', type: 'payroll_liability', debit: 'N/A', credit: 'Payroll Liabilities (CPP/EI/Tax)' }
    ]
  },
  {
    id: 'banking',
    name: 'Banking',
    icon: Landmark,
    color: 'bg-teal-500',
    borderColor: 'border-teal-500',
    transactions: [
      { action: 'Bank Deposit', type: 'bank_deposit', debit: 'Bank Account (1000)', credit: 'Undeposited Funds / A/R' },
      { action: 'Bank Withdrawal', type: 'bank_withdrawal', debit: 'Expense / A/P', credit: 'Bank Account (1000)' },
      { action: 'Transfer Between Accounts', type: 'bank_transfer', debit: 'Destination Bank Account', credit: 'Source Bank Account' },
      { action: 'Bank Fees', type: 'bank_expense', debit: 'Bank Charges Expense (6200)', credit: 'Bank Account (1000)' },
      { action: 'Interest Income', type: 'interest_income', debit: 'Bank Account (1000)', credit: 'Interest Income (4500)' },
      { action: 'Reconciliation Adjustment', type: 'journal_entry', debit: 'Bank Account / Adjustment', credit: 'Adjustment / Bank Account' }
    ]
  }
];

const glAccounts = [
  { code: '1000', name: 'Cash / Bank Account', type: 'Asset' },
  { code: '1050', name: 'Undeposited Funds', type: 'Asset' },
  { code: '1100', name: 'Accounts Receivable', type: 'Asset' },
  { code: '1200', name: 'Vehicle Inventory', type: 'Asset' },
  { code: '1210', name: 'Parts Inventory', type: 'Asset' },
  { code: '2000', name: 'Accounts Payable', type: 'Liability' },
  { code: '2100', name: 'GST Payable', type: 'Liability' },
  { code: '2110', name: 'PST/QST Payable', type: 'Liability' },
  { code: '2120', name: 'HST Payable', type: 'Liability' },
  { code: '2400', name: 'Payroll Liabilities', type: 'Liability' },
  { code: '4000', name: 'Vehicle Sales Revenue', type: 'Revenue' },
  { code: '4200', name: 'Service Revenue', type: 'Revenue' },
  { code: '4400', name: 'Salvage Revenue', type: 'Revenue' },
  { code: '4500', name: 'Interest Income', type: 'Revenue' },
  { code: '5000', name: 'Cost of Vehicles Sold', type: 'Expense' },
  { code: '5100', name: 'Cost of Parts Sold', type: 'Expense' },
  { code: '5200', name: 'Shipping & Freight Expense', type: 'Expense' },
  { code: '5210', name: 'Customs & Duties Expense', type: 'Expense' },
  { code: '6100', name: 'Payroll Expense', type: 'Expense' },
  { code: '6200', name: 'Bank Charges & Fees', type: 'Expense' }
];

// Canadian Sales Tax Rates Reference
const CANADIAN_TAX_RATES = {
  AB: { name: "Alberta", gst: 5, pst: 0, hst: 0, total: 5, type: "GST" },
  BC: { name: "British Columbia", gst: 5, pst: 7, hst: 0, total: 12, type: "GST+PST" },
  MB: { name: "Manitoba", gst: 5, pst: 7, hst: 0, total: 12, type: "GST+PST" },
  NB: { name: "New Brunswick", gst: 0, pst: 0, hst: 15, total: 15, type: "HST" },
  NL: { name: "Newfoundland", gst: 0, pst: 0, hst: 15, total: 15, type: "HST" },
  NT: { name: "NWT", gst: 5, pst: 0, hst: 0, total: 5, type: "GST" },
  NS: { name: "Nova Scotia", gst: 0, pst: 0, hst: 15, total: 15, type: "HST" },
  NU: { name: "Nunavut", gst: 5, pst: 0, hst: 0, total: 5, type: "GST" },
  ON: { name: "Ontario", gst: 0, pst: 0, hst: 13, total: 13, type: "HST" },
  PE: { name: "PEI", gst: 0, pst: 0, hst: 15, total: 15, type: "HST" },
  QC: { name: "Quebec", gst: 5, pst: 9.975, hst: 0, total: 14.975, type: "GST+QST" },
  SK: { name: "Saskatchewan", gst: 5, pst: 6, hst: 0, total: 11, type: "GST+PST" },
  YT: { name: "Yukon", gst: 5, pst: 0, hst: 0, total: 5, type: "GST" },
};

export default function IntegrationDiagram() {
  const [selectedModule, setSelectedModule] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <h1 className="text-2xl font-bold text-white">System Integration Diagram</h1>
        <p className="text-sm text-gray-300 mt-1">Visual documentation of module-to-GL transaction flows</p>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Tabs defaultValue="diagram" className="space-y-6">
          <TabsList>
            <TabsTrigger value="diagram">Flow Diagram</TabsTrigger>
            <TabsTrigger value="matrix">Transaction Matrix</TabsTrigger>
            <TabsTrigger value="accounts">GL Accounts</TabsTrigger>
            <TabsTrigger value="taxes">Sales Tax Rates</TabsTrigger>
          </TabsList>

          <TabsContent value="diagram" className="space-y-6">
            {/* Visual Flow Diagram */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Module Integration Flow
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {/* Central GL Hub */}
                  <div className="flex justify-center mb-8">
                    <div className="bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-2xl p-6 shadow-xl">
                      <div className="flex items-center gap-3">
                        <Database className="w-8 h-8" />
                        <div>
                          <h3 className="text-xl font-bold">General Ledger</h3>
                          <p className="text-sm text-slate-300">Transaction Entity</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Connection Lines */}
                  <div className="flex justify-center mb-4">
                    <div className="flex gap-2">
                      {[1,2,3,4,5,6,7].map(i => (
                        <ArrowDown key={i} className="w-5 h-5 text-gray-400" />
                      ))}
                    </div>
                  </div>

                  {/* Module Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {modules.map((module) => (
                      <div
                        key={module.id}
                        onClick={() => setSelectedModule(selectedModule === module.id ? null : module.id)}
                        className={`cursor-pointer transition-all duration-300 ${
                          selectedModule === module.id ? 'scale-105 shadow-xl' : 'hover:scale-102 hover:shadow-lg'
                        }`}
                      >
                        <Card className={`border-2 ${selectedModule === module.id ? module.borderColor : 'border-transparent'}`}>
                          <CardContent className="p-4 text-center">
                            <div className={`w-12 h-12 ${module.color} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                              <module.icon className="w-6 h-6 text-white" />
                            </div>
                            <h4 className="font-semibold text-sm">{module.name}</h4>
                            <Badge variant="outline" className="mt-2 text-xs">
                              {module.transactions.length} flows
                            </Badge>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>

                  {/* Selected Module Detail */}
                  {selectedModule && (
                    <div className="mt-8 animate-in slide-in-from-top">
                      <Card className={`border-2 ${modules.find(m => m.id === selectedModule)?.borderColor}`}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            {(() => {
                              const mod = modules.find(m => m.id === selectedModule);
                              const Icon = mod?.icon;
                              return Icon ? <Icon className="w-5 h-5" /> : null;
                            })()}
                            {modules.find(m => m.id === selectedModule)?.name} → GL Transactions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {modules.find(m => m.id === selectedModule)?.transactions.map((txn, idx) => (
                              <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                                <div className="flex-shrink-0">
                                  <Badge className="bg-blue-100 text-blue-800">{txn.action}</Badge>
                                </div>
                                <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                <div className="flex-1 grid grid-cols-3 gap-4">
                                  <div className="text-center p-2 bg-green-50 rounded border border-green-200">
                                    <p className="text-xs text-gray-500">Debit</p>
                                    <p className="font-medium text-green-700 text-sm">{txn.debit}</p>
                                  </div>
                                  <div className="text-center p-2 bg-red-50 rounded border border-red-200">
                                    <p className="text-xs text-gray-500">Credit</p>
                                    <p className="font-medium text-red-700 text-sm">{txn.credit}</p>
                                  </div>
                                  <div className="text-center p-2 bg-gray-100 rounded">
                                    <p className="text-xs text-gray-500">Type</p>
                                    <p className="font-mono text-xs">{txn.type}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Integration Status */}
            <Card>
              <CardHeader>
                <CardTitle>Integration Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {modules.map((module) => (
                    <div key={module.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-green-800">{module.name}</p>
                        <p className="text-xs text-green-600">All {module.transactions.length} GL flows active</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matrix" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Type Matrix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-semibold">Module</th>
                        <th className="text-left p-3 font-semibold">Action</th>
                        <th className="text-left p-3 font-semibold">Transaction Type</th>
                        <th className="text-left p-3 font-semibold">Debit Account</th>
                        <th className="text-left p-3 font-semibold">Credit Account</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modules.flatMap((module) =>
                        module.transactions.map((txn, idx) => (
                          <tr key={`${module.id}-${idx}`} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 ${module.color} rounded flex items-center justify-center`}>
                                  <module.icon className="w-3 h-3 text-white" />
                                </div>
                                <span className="font-medium">{module.name}</span>
                              </div>
                            </td>
                            <td className="p-3">{txn.action}</td>
                            <td className="p-3"><code className="bg-gray-100 px-2 py-1 rounded text-xs">{txn.type}</code></td>
                            <td className="p-3 text-green-700">{txn.debit}</td>
                            <td className="p-3 text-red-700">{txn.credit}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Chart of Accounts Reference</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {['Asset', 'Liability', 'Revenue', 'Expense'].map((type) => (
                    <div key={type}>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Badge className={
                          type === 'Asset' ? 'bg-blue-100 text-blue-800' :
                          type === 'Liability' ? 'bg-red-100 text-red-800' :
                          type === 'Revenue' ? 'bg-green-100 text-green-800' :
                          'bg-orange-100 text-orange-800'
                        }>{type}</Badge>
                      </h4>
                      <div className="space-y-2">
                        {glAccounts.filter(a => a.type === type).map((account) => (
                          <div key={account.code} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="font-mono text-sm">{account.code}</span>
                            <span className="text-sm">{account.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="taxes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Canadian Sales Tax Rates by Province</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-semibold">Province</th>
                        <th className="text-center p-3 font-semibold">GST</th>
                        <th className="text-center p-3 font-semibold">PST/QST</th>
                        <th className="text-center p-3 font-semibold">HST</th>
                        <th className="text-center p-3 font-semibold">Total</th>
                        <th className="text-center p-3 font-semibold">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(CANADIAN_TAX_RATES).map(([code, rate]) => (
                        <tr key={code} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{rate.name} ({code})</td>
                          <td className="p-3 text-center">{rate.gst > 0 ? `${rate.gst}%` : '-'}</td>
                          <td className="p-3 text-center">{rate.pst > 0 ? `${rate.pst}%` : '-'}</td>
                          <td className="p-3 text-center">{rate.hst > 0 ? `${rate.hst}%` : '-'}</td>
                          <td className="p-3 text-center font-bold text-blue-600">{rate.total}%</td>
                          <td className="p-3 text-center">
                            <Badge variant="outline">{rate.type}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tax Status Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">Taxable</h4>
                    <p className="text-sm text-green-700">Standard sales with applicable GST/PST/HST based on province. Most domestic vehicle sales.</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">Zero-Rated (0%)</h4>
                    <p className="text-sm text-blue-700">Export sales, basic groceries. Tax is 0% but seller can claim Input Tax Credits (ITC).</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-2">Tax Exempt</h4>
                    <p className="text-sm text-gray-700">No tax collected and no ITC can be claimed. Used for specific exempt goods/services.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tax GL Account Mapping</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <span className="font-mono text-sm">2100</span>
                      <span className="ml-3">GST Payable</span>
                    </div>
                    <Badge>Liability - GST collected on sales</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <span className="font-mono text-sm">2110</span>
                      <span className="ml-3">PST/QST Payable</span>
                    </div>
                    <Badge>Liability - PST/QST collected</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <span className="font-mono text-sm">2120</span>
                      <span className="ml-3">HST Payable</span>
                    </div>
                    <Badge>Liability - HST collected (ON, Atlantic)</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}