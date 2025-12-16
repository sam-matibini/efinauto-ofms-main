import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Car, Settings, Wrench, DollarSign, ShoppingCart, Plane, Package, TrendingUp, LayoutGrid, List } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useCompany } from "../components/shared/CompanyContext";
import { format } from "date-fns";
import ExportOrderPipeline from "../components/dashboard/ExportOrderPipeline";
import ShipmentTrackingOverview from "../components/dashboard/ShipmentTrackingOverview";
import ComplianceStatusSummary from "../components/dashboard/ComplianceStatusSummary";
import RevenueAndCosts from "../components/dashboard/RevenueAndCosts";

function StatsCard({ title, value, icon: Icon, bgColor, textColor, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="relative overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-300 bg-white">
        <div className={`absolute top-0 right-0 w-32 h-32 ${bgColor} opacity-5 rounded-full transform translate-x-12 -translate-y-12`} />
        <CardContent className="p-3 md:p-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1 md:space-y-2">
              <p className="text-xs md:text-sm font-medium text-gray-600 leading-tight">{title}</p>
              <p className="text-xl md:text-3xl font-bold text-gray-900">{value}</p>
            </div>
            <div className={`p-2 md:p-3 rounded-xl ${bgColor} bg-opacity-10`}>
              <Icon className={`w-4 h-4 md:w-6 md:h-6 ${textColor}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const { selectedCompanyId } = useCompany();
  const [salesViewMode, setSalesViewMode] = useState("cards");
  const [repairsViewMode, setRepairsViewMode] = useState("cards");

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      return await base44.entities.Vehicle.filter({ company_id: selectedCompanyId });
    },
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['parts', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      return await base44.entities.Part.filter({ company_id: selectedCompanyId });
    },
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      return await base44.entities.Sale.filter({ company_id: selectedCompanyId });
    },
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: repairs = [] } = useQuery({
    queryKey: ['repairs', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      return await base44.entities.RepairOrder.filter({ company_id: selectedCompanyId });
    },
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: exports = [] } = useQuery({
    queryKey: ['exports', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      return await base44.entities.Export.filter({ company_id: selectedCompanyId });
    },
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      return await base44.entities.FreightShipment.filter({ company_id: selectedCompanyId });
    },
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const vehiclesInStock = vehicles.filter(v => v.status === 'in_stock').length;
  const lowStockParts = parts.filter(p => p.quantity <= p.reorder_level).length;
  const activeRepairs = repairs.filter(r => r.status === 'in_progress').length;
  const totalSalesValue = sales.reduce((sum, s) => sum + (s.sale_price || 0), 0);
  const pendingExports = exports.filter(e => e.status !== 'delivered').length;
  const activeShipments = shipments.filter(s => s.status === 'in_transit').length;

  const recentSales = sales.slice(0, 5);
  const recentRepairs = repairs.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 md:px-6 py-3 md:py-4" style={{ backgroundColor: '#1e293b' }}>
        <h1 className="text-xl md:text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-xs md:text-sm text-gray-300 mt-1">Overview of your car dealership operations</p>
      </div>
      
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">

        {/* Export Analytics Dashboard */}
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <ExportOrderPipeline companyId={selectedCompanyId} />
          <ShipmentTrackingOverview companyId={selectedCompanyId} />
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <ComplianceStatusSummary companyId={selectedCompanyId} />
          <RevenueAndCosts companyId={selectedCompanyId} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
        <StatsCard
          title="Vehicles in Stock"
          value={vehiclesInStock}
          icon={Car}
          bgColor="bg-blue-500"
          textColor="text-blue-600"
          index={0}
        />
        <StatsCard
          title="Total Sales Value"
          value={`$${totalSalesValue.toLocaleString()}`}
          icon={DollarSign}
          bgColor="bg-green-500"
          textColor="text-green-600"
          index={1}
        />
        <StatsCard
          title="Active Repairs"
          value={activeRepairs}
          icon={Wrench}
          bgColor="bg-orange-500"
          textColor="text-orange-600"
          index={2}
        />
        <StatsCard
          title="Low Stock Parts"
          value={lowStockParts}
          icon={Settings}
          bgColor="bg-red-500"
          textColor="text-red-600"
          index={3}
        />
      </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
        <StatsCard
          title="Pending Exports"
          value={pendingExports}
          icon={Plane}
          bgColor="bg-purple-500"
          textColor="text-purple-600"
          index={4}
        />
        <StatsCard
          title="Active Shipments"
          value={activeShipments}
          icon={Package}
          bgColor="bg-cyan-500"
          textColor="text-cyan-600"
          index={5}
        />
        <StatsCard
          title="Total Parts"
          value={parts.length}
          icon={Settings}
          bgColor="bg-indigo-500"
          textColor="text-indigo-600"
          index={6}
        />
      </div>

        <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        <Card className="shadow-md border-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-green-600" />
              Recent Sales
            </CardTitle>
            <div className="flex gap-1 border rounded-lg p-1">
              <Button
                variant={salesViewMode === "cards" ? "default" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setSalesViewMode("cards")}
              >
                <LayoutGrid className="w-3 h-3" />
              </Button>
              <Button
                variant={salesViewMode === "list" ? "default" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setSalesViewMode("list")}
              >
                <List className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentSales.length > 0 ? (
              salesViewMode === "list" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{sale.vehicle_details}</TableCell>
                        <TableCell>{sale.customer_name}</TableCell>
                        <TableCell className="text-right text-green-600 font-bold">${sale.sale_price?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={
                            sale.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                            sale.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {sale.payment_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="space-y-3">
                  {recentSales.map((sale) => (
                    <div key={sale.id} className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                      <div>
                        <p className="font-medium text-gray-900">{sale.vehicle_details}</p>
                        <p className="text-sm text-gray-500">{sale.customer_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">${sale.sale_price?.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{sale.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="text-center text-gray-500 py-8">No sales yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md border-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-600" />
              Recent Repairs
            </CardTitle>
            <div className="flex gap-1 border rounded-lg p-1">
              <Button
                variant={repairsViewMode === "cards" ? "default" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setRepairsViewMode("cards")}
              >
                <LayoutGrid className="w-3 h-3" />
              </Button>
              <Button
                variant={repairsViewMode === "list" ? "default" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setRepairsViewMode("list")}
              >
                <List className="w-3 h-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentRepairs.length > 0 ? (
              repairsViewMode === "list" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentRepairs.map((repair) => (
                      <TableRow key={repair.id}>
                        <TableCell className="font-medium">{repair.vehicle_make} {repair.vehicle_model}</TableCell>
                        <TableCell>{repair.customer_name}</TableCell>
                        <TableCell className="text-xs">{repair.service_type?.replace(/_/g, ' ')}</TableCell>
                        <TableCell>
                          <Badge className={
                            repair.status === 'completed' ? 'bg-green-100 text-green-700' :
                            repair.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            repair.status === 'waiting_parts' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {repair.status?.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="space-y-3">
                  {recentRepairs.map((repair) => (
                    <div key={repair.id} className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                      <div>
                        <p className="font-medium text-gray-900">
                          {repair.vehicle_make} {repair.vehicle_model}
                        </p>
                        <p className="text-sm text-gray-500">{repair.customer_name}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-medium px-2 py-1 rounded-full ${
                          repair.status === 'completed' ? 'bg-green-100 text-green-700' :
                          repair.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {repair.status?.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="text-center text-gray-500 py-8">No repair orders yet</p>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}