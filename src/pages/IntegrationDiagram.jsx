import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Car, Wrench, Package, Ship, DollarSign, Users, Trash2, 
  ArrowRight, ArrowDown, Database, CheckCircle, AlertCircle,
  FileText, CreditCard, Receipt, Building2, Briefcase, BarChart3
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
  }
];

const glAccounts = [
  { code: '1000', name: 'Cash', type: 'Asset' },
  { code: '1100', name: 'Accounts Receivable', type: 'Asset' },
  { code: '1200', name: 'Vehicle Inventory', type: 'Asset' },
  { code: '1210', name: 'Parts Inventory', type: 'Asset' },
  { code: '2000', name: 'Accounts Payable', type: 'Liability' },
  { code: '2400', name: 'Payroll Liabilities', type: 'Liability' },
  { code: '4000', name: 'Vehicle Sales Revenue', type: 'Revenue' },
  { code: '4200', name: 'Service Revenue', type: 'Revenue' },
  { code: '4400', name: 'Salvage Revenue', type: 'Revenue' },
  { code: '5000', name: 'Cost of Vehicles Sold', type: 'Expense' },
  { code: '5100', name: 'Cost of Parts Sold', type: 'Expense' },
  { code: '5200', name: 'Shipping & Freight Expense', type: 'Expense' },
  { code: '5210', name: 'Customs & Duties Expense', type: 'Expense' },
  { code: '6100', name: 'Payroll Expense', type: 'Expense' }
];

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
                      {[1,2,3,4,5,6].map(i => (
                        <ArrowDown key={i} className="w-5 h-5 text-gray-400" />
                      ))}
                    </div>
                  </div>

                  {/* Module Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
        </Tabs>
      </div>
    </div>
  );
}