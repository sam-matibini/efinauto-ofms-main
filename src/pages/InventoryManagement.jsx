import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  Car, Package, Wrench, Search, TrendingUp, TrendingDown, 
  AlertTriangle, DollarSign, BarChart3, RefreshCw, Filter,
  Download, ArrowUpRight, ArrowDownRight, Boxes
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import AIInventoryInsights from "@/components/shared/AIInventoryInsights";

export default function InventoryManagement() {
  const { selectedCompanyId } = useCompany();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch all inventory data
  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['vehicles', selectedCompanyId],
    queryFn: () => base44.entities.Vehicle.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: parts = [], isLoading: loadingParts } = useQuery({
    queryKey: ['parts', selectedCompanyId],
    queryFn: () => base44.entities.Part.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products', selectedCompanyId],
    queryFn: () => base44.entities.Product.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales', selectedCompanyId],
    queryFn: () => base44.entities.Sale.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['purchases', selectedCompanyId],
    queryFn: () => base44.entities.Purchase.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: repairs = [] } = useQuery({
    queryKey: ['repairs', selectedCompanyId],
    queryFn: () => base44.entities.RepairOrder.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: salvageVehicles = [] } = useQuery({
    queryKey: ['salvage-vehicles', selectedCompanyId],
    queryFn: () => base44.entities.SalvageVehicle.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  // Calculate inventory metrics
  const inStockVehicles = vehicles.filter(v => v.status === 'in_stock');
  const vehicleInventoryValue = inStockVehicles.reduce((sum, v) => sum + (v.total_cost || v.purchase_price || 0), 0);
  const partsInventoryValue = parts.reduce((sum, p) => sum + ((p.cost_price || 0) * (p.quantity || 0)), 0);
  const productsInventoryValue = products.reduce((sum, p) => sum + ((p.cost_price || 0) * (p.quantity || 0)), 0);
  const totalInventoryValue = vehicleInventoryValue + partsInventoryValue + productsInventoryValue;

  const lowStockParts = parts.filter(p => p.quantity <= (p.reorder_level || 5));
  const lowStockProducts = products.filter(p => p.quantity <= (p.reorder_level || 10));

  // Calculate turnover metrics
  const vehiclesSoldThisMonth = sales.filter(s => {
    const saleDate = new Date(s.sale_date || s.created_date);
    const now = new Date();
    return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
  }).length;

  const avgDaysInStock = inStockVehicles.length > 0 
    ? inStockVehicles.reduce((sum, v) => {
        const daysIn = Math.floor((new Date() - new Date(v.created_date)) / (1000 * 60 * 60 * 24));
        return sum + daysIn;
      }, 0) / inStockVehicles.length
    : 0;

  if (!selectedCompanyId) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Please select a company to view inventory</p>
      </div>
    );
  }

  const isLoading = loadingVehicles || loadingParts || loadingProducts;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Boxes className="w-6 h-6" />
              Inventory Management
            </h1>
            <p className="text-sm text-gray-300 mt-1">Consolidated view of all inventory assets</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Inventory Value</p>
                    <p className="text-2xl font-bold text-gray-900">${totalInventoryValue.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-2 flex items-center text-xs text-gray-500">
                  <span className="flex items-center text-green-600">
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                    Vehicles: ${vehicleInventoryValue.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Vehicles In Stock</p>
                    <p className="text-2xl font-bold text-gray-900">{inStockVehicles.length}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Car className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-2 flex items-center text-xs">
                  <span className="text-gray-500">Avg. {Math.round(avgDaysInStock)} days in stock</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Parts & Products</p>
                    <p className="text-2xl font-bold text-gray-900">{parts.length + products.length}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Package className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-2 flex items-center text-xs text-gray-500">
                  <span>Value: ${(partsInventoryValue + productsInventoryValue).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className={`border-l-4 ${lowStockParts.length + lowStockProducts.length > 0 ? 'border-l-red-500' : 'border-l-gray-300'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Low Stock Alerts</p>
                    <p className="text-2xl font-bold text-gray-900">{lowStockParts.length + lowStockProducts.length}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${lowStockParts.length + lowStockProducts.length > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                    <AlertTriangle className={`w-6 h-6 ${lowStockParts.length + lowStockProducts.length > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                  </div>
                </div>
                <div className="mt-2 flex items-center text-xs text-gray-500">
                  <span>{lowStockParts.length} parts, {lowStockProducts.length} products</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Search */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="vehicles">Vehicles ({inStockVehicles.length})</TabsTrigger>
            <TabsTrigger value="parts">Parts ({parts.length})</TabsTrigger>
            <TabsTrigger value="products">Products ({products.length})</TabsTrigger>
            <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Inventory Breakdown */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Inventory Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Vehicle Inventory</span>
                      <span className="font-medium">${vehicleInventoryValue.toLocaleString()}</span>
                    </div>
                    <Progress value={totalInventoryValue > 0 ? (vehicleInventoryValue / totalInventoryValue) * 100 : 0} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Parts Inventory</span>
                      <span className="font-medium">${partsInventoryValue.toLocaleString()}</span>
                    </div>
                    <Progress value={totalInventoryValue > 0 ? (partsInventoryValue / totalInventoryValue) * 100 : 0} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Products Inventory</span>
                      <span className="font-medium">${productsInventoryValue.toLocaleString()}</span>
                    </div>
                    <Progress value={totalInventoryValue > 0 ? (productsInventoryValue / totalInventoryValue) * 100 : 0} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Inventory Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-800">Healthy Stock</p>
                      <p className="text-xs text-green-600">{parts.filter(p => p.quantity > (p.reorder_level || 5)).length} parts above reorder level</p>
                    </div>
                    <Badge className="bg-green-600">{Math.round((parts.filter(p => p.quantity > (p.reorder_level || 5)).length / Math.max(parts.length, 1)) * 100)}%</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Low Stock</p>
                      <p className="text-xs text-yellow-600">{lowStockParts.length} parts need reordering</p>
                    </div>
                    <Badge className="bg-yellow-600">{lowStockParts.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-blue-800">Vehicles Sold (This Month)</p>
                      <p className="text-xs text-blue-600">Turnover rate</p>
                    </div>
                    <Badge className="bg-blue-600">{vehiclesSoldThisMonth}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Low Stock Alerts */}
            {(lowStockParts.length > 0 || lowStockProducts.length > 0) && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-5 h-5" />
                    Low Stock Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {lowStockParts.slice(0, 6).map((part) => (
                      <div key={part.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{part.name}</p>
                          <p className="text-xs text-gray-500">{part.part_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600">{part.quantity} left</p>
                          <p className="text-xs text-gray-500">Reorder: {part.reorder_level || 5}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="vehicles" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3">Vehicle</th>
                        <th className="text-left p-3">VIN</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-right p-3">Cost</th>
                        <th className="text-right p-3">Selling Price</th>
                        <th className="text-right p-3">Days In Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inStockVehicles.filter(v => 
                        searchTerm === "" || 
                        `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        v.vin?.toLowerCase().includes(searchTerm.toLowerCase())
                      ).slice(0, 20).map((vehicle) => (
                        <tr key={vehicle.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</td>
                          <td className="p-3 font-mono text-xs">{vehicle.vin}</td>
                          <td className="p-3">
                            <Badge className="bg-green-100 text-green-800">{vehicle.status}</Badge>
                          </td>
                          <td className="p-3 text-right">${(vehicle.total_cost || vehicle.purchase_price || 0).toLocaleString()}</td>
                          <td className="p-3 text-right">${(vehicle.selling_price || 0).toLocaleString()}</td>
                          <td className="p-3 text-right">
                            {Math.floor((new Date() - new Date(vehicle.created_date)) / (1000 * 60 * 60 * 24))} days
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parts" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Parts Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3">Part Name</th>
                        <th className="text-left p-3">Part #</th>
                        <th className="text-left p-3">Category</th>
                        <th className="text-right p-3">Quantity</th>
                        <th className="text-right p-3">Cost</th>
                        <th className="text-right p-3">Value</th>
                        <th className="text-center p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parts.filter(p => 
                        searchTerm === "" || 
                        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.part_number?.toLowerCase().includes(searchTerm.toLowerCase())
                      ).slice(0, 20).map((part) => (
                        <tr key={part.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{part.name}</td>
                          <td className="p-3 font-mono text-xs">{part.part_number}</td>
                          <td className="p-3">{part.category}</td>
                          <td className="p-3 text-right">{part.quantity}</td>
                          <td className="p-3 text-right">${(part.cost_price || 0).toFixed(2)}</td>
                          <td className="p-3 text-right">${((part.cost_price || 0) * (part.quantity || 0)).toLocaleString()}</td>
                          <td className="p-3 text-center">
                            {part.quantity <= (part.reorder_level || 5) ? (
                              <Badge className="bg-red-100 text-red-800">Low Stock</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800">In Stock</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Products Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3">Product Name</th>
                        <th className="text-left p-3">SKU</th>
                        <th className="text-left p-3">Category</th>
                        <th className="text-right p-3">Quantity</th>
                        <th className="text-right p-3">Cost</th>
                        <th className="text-right p-3">Value</th>
                        <th className="text-center p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.filter(p => 
                        searchTerm === "" || 
                        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
                      ).slice(0, 20).map((product) => (
                        <tr key={product.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{product.name}</td>
                          <td className="p-3 font-mono text-xs">{product.sku}</td>
                          <td className="p-3">{product.category}</td>
                          <td className="p-3 text-right">{product.quantity}</td>
                          <td className="p-3 text-right">${(product.cost_price || 0).toFixed(2)}</td>
                          <td className="p-3 text-right">${((product.cost_price || 0) * (product.quantity || 0)).toLocaleString()}</td>
                          <td className="p-3 text-center">
                            {product.quantity <= (product.reorder_level || 10) ? (
                              <Badge className="bg-red-100 text-red-800">Low Stock</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800">In Stock</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-insights" className="mt-6">
            <AIInventoryInsights
              companyId={selectedCompanyId}
              inventoryType="all"
              parts={parts}
              vehicles={vehicles}
              sales={sales}
              purchases={purchases}
              repairs={repairs}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}