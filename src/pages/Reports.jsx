import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Package, DollarSign, Plane, Receipt } from "lucide-react";
import { useCompany } from "@/components/shared/CompanyContext";
import SalesReport from "@/components/reports/SalesReport";
import InventoryReport from "@/components/reports/InventoryReport";
import FinancialReport from "@/components/reports/FinancialReport";
import ExportReport from "@/components/reports/ExportReport";
import SalesTaxReport from "@/components/reports/SalesTaxReport";
import PeriodComparison from "@/components/shared/PeriodComparison";

export default function ReportsPage() {
  const { selectedCompanyId } = useCompany();
  const [comparativePeriods, setComparativePeriods] = useState([]);

  const { data: sales = [] } = useQuery({
    queryKey: ['sales', selectedCompanyId],
    queryFn: () => base44.entities.Sale.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', selectedCompanyId],
    queryFn: () => base44.entities.Vehicle.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['parts', selectedCompanyId],
    queryFn: () => base44.entities.Part.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: exports = [] } = useQuery({
    queryKey: ['exports', selectedCompanyId],
    queryFn: () => base44.entities.Export.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: repairs = [] } = useQuery({
    queryKey: ['repairs', selectedCompanyId],
    queryFn: () => base44.entities.RepairOrder.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  if (!selectedCompanyId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please select a company to view reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
            <p className="text-sm text-gray-300 mt-1">Business intelligence and insights</p>
          </div>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        <PeriodComparison onPeriodsChange={setComparativePeriods} maxPeriods={12} />

      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto bg-gray-100">
          <TabsTrigger value="sales" className="flex items-center gap-2 bg-blue-50 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
            <TrendingUp className="w-4 h-4" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="taxes" className="flex items-center gap-2 bg-indigo-50 data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700">
            <Receipt className="w-4 h-4" />
            Sales Taxes
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2 bg-green-50 data-[state=active]:bg-green-100 data-[state=active]:text-green-700">
            <Package className="w-4 h-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2 bg-purple-50 data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
            <DollarSign className="w-4 h-4" />
            Financial
          </TabsTrigger>
          <TabsTrigger value="exports" className="flex items-center gap-2 bg-amber-50 data-[state=active]:bg-amber-100 data-[state=active]:text-amber-700">
            <Plane className="w-4 h-4" />
            Exports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <SalesReport sales={sales} comparativePeriods={comparativePeriods} />
        </TabsContent>

        <TabsContent value="taxes">
          <SalesTaxReport sales={sales} comparativePeriods={comparativePeriods} />
        </TabsContent>

        <TabsContent value="inventory">
          <InventoryReport vehicles={vehicles} parts={parts} />
        </TabsContent>

        <TabsContent value="financial">
          <FinancialReport 
            sales={sales} 
            repairs={repairs} 
            exports={exports} 
            comparativePeriods={comparativePeriods}
          />
        </TabsContent>

        <TabsContent value="exports">
          <ExportReport exports={exports} comparativePeriods={comparativePeriods} />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}