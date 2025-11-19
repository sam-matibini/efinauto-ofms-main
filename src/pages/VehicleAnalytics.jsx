import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, DollarSign, TrendingUp, Package, BarChart3 } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useCompany } from "../components/shared/CompanyContext";

export default function VehicleAnalytics() {
  const { selectedCompanyId } = useCompany();
  const [dateRange, setDateRange] = useState("all");

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      return await base44.entities.Vehicle.filter({ company_id: selectedCompanyId }, '-created_date');
    },
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
    initialData: [],
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin';

  // Filter vehicles by date range
  const filteredVehicles = vehicles.filter(v => {
    if (dateRange === "all") return true;
    const createdDate = new Date(v.created_date);
    const now = new Date();
    const daysAgo = parseInt(dateRange);
    const cutoffDate = new Date(now.setDate(now.getDate() - daysAgo));
    return createdDate >= cutoffDate;
  });

  // Calculate metrics
  const totalVehicles = filteredVehicles.length;
  const inStockVehicles = filteredVehicles.filter(v => v.status === "in_stock").length;
  const soldVehicles = filteredVehicles.filter(v => v.status === "sold").length;
  const averageSellingPrice = filteredVehicles.length > 0
    ? filteredVehicles.reduce((sum, v) => sum + (v.selling_price || 0), 0) / filteredVehicles.length
    : 0;

  // Vehicles by make
  const vehiclesByMake = filteredVehicles.reduce((acc, v) => {
    const make = v.make || "Unknown";
    acc[make] = (acc[make] || 0) + 1;
    return acc;
  }, {});

  const makeChartData = Object.entries(vehiclesByMake)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Vehicles by status
  const vehiclesByStatus = filteredVehicles.reduce((acc, v) => {
    const status = v.status || "unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const statusChartData = Object.entries(vehiclesByStatus).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value
  }));

  // Vehicles by condition
  const vehiclesByCondition = filteredVehicles.reduce((acc, v) => {
    const condition = v.condition || "unknown";
    acc[condition] = (acc[condition] || 0) + 1;
    return acc;
  }, {});

  const conditionChartData = Object.entries(vehiclesByCondition).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value
  }));

  // Price ranges
  const priceRanges = {
    "Under $10k": 0,
    "$10k-$20k": 0,
    "$20k-$30k": 0,
    "$30k-$50k": 0,
    "Over $50k": 0
  };

  filteredVehicles.forEach(v => {
    const price = v.selling_price || 0;
    if (price < 10000) priceRanges["Under $10k"]++;
    else if (price < 20000) priceRanges["$10k-$20k"]++;
    else if (price < 30000) priceRanges["$20k-$30k"]++;
    else if (price < 50000) priceRanges["$30k-$50k"]++;
    else priceRanges["Over $50k"]++;
  });

  const priceRangeData = Object.entries(priceRanges).map(([name, value]) => ({ name, value }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  if (!selectedCompanyId) {
    return (
      <div className="p-6">
        <div className="text-center py-16">
          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Company Selected</h3>
          <p className="text-gray-500">Please select a company to view analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Vehicle Analytics Dashboard</h1>
            <p className="text-sm text-gray-300 mt-1">Comprehensive insights into your vehicle inventory</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Date Range</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="7">Last 7 Days</SelectItem>
                    <SelectItem value="30">Last 30 Days</SelectItem>
                    <SelectItem value="90">Last 90 Days</SelectItem>
                    <SelectItem value="365">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isAdmin && (
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Company</label>
                  <Select value={selectedCompanyId || ""} onValueChange={(value) => {
                    const { setSelectedCompanyId } = useCompany();
                    setSelectedCompanyId(value);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company..." />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.filter(c => c.status === 'active').map(company => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.display_name || company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Vehicles</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-1">{totalVehicles}</h3>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Car className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">In Stock</p>
                  <h3 className="text-3xl font-bold text-green-600 mt-1">{inStockVehicles}</h3>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Sold</p>
                  <h3 className="text-3xl font-bold text-orange-600 mt-1">{soldVehicles}</h3>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg. Price</p>
                  <h3 className="text-3xl font-bold text-purple-600 mt-1">
                    ${averageSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </h3>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Vehicles by Make (Top 10)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={makeChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vehicles by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Vehicles by Condition</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={conditionChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {conditionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Price Range Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={priceRangeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}