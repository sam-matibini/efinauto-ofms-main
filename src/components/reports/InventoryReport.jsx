import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Package, AlertTriangle, Car, Settings } from "lucide-react";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function InventoryReport({ vehicles, parts }) {
  const totalVehicles = vehicles.length;
  const inStockVehicles = vehicles.filter(v => v.status === 'in_stock').length;
  const soldVehicles = vehicles.filter(v => v.status === 'sold').length;
  const totalVehicleValue = vehicles.reduce((sum, v) => sum + (v.selling_price || 0), 0);

  const totalParts = parts.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const lowStockParts = parts.filter(p => p.quantity <= p.reorder_level).length;
  const totalPartsValue = parts.reduce((sum, p) => sum + ((p.selling_price || 0) * (p.quantity || 0)), 0);

  // Vehicles by status
  const vehicleStatusData = vehicles.reduce((acc, vehicle) => {
    const status = vehicle.status || 'unknown';
    if (!acc[status]) acc[status] = 0;
    acc[status] += 1;
    return acc;
  }, {});

  const vehicleStatusPie = Object.entries(vehicleStatusData).map(([name, value]) => ({ name, value }));

  // Vehicles by make
  const vehicleByMake = vehicles.reduce((acc, vehicle) => {
    const make = vehicle.make || 'Unknown';
    if (!acc[make]) acc[make] = { make, count: 0, value: 0 };
    acc[make].count += 1;
    acc[make].value += vehicle.selling_price || 0;
    return acc;
  }, {});

  const makeData = Object.values(vehicleByMake).sort((a, b) => b.count - a.count).slice(0, 10);

  // Parts by category
  const partsByCategory = parts.reduce((acc, part) => {
    const category = part.category || 'other';
    if (!acc[category]) acc[category] = { category, count: 0, quantity: 0 };
    acc[category].count += 1;
    acc[category].quantity += part.quantity || 0;
    return acc;
  }, {});

  const categoryData = Object.values(partsByCategory);

  // Low stock items
  const lowStockItems = parts.filter(p => p.quantity <= p.reorder_level).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Vehicles</p>
                <h3 className="text-2xl font-bold text-gray-900">{totalVehicles}</h3>
                <p className="text-xs text-gray-500 mt-1">{inStockVehicles} in stock</p>
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
                <p className="text-sm text-gray-600">Vehicle Inventory Value</p>
                <h3 className="text-2xl font-bold text-gray-900">${totalVehicleValue.toLocaleString()}</h3>
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
                <p className="text-sm text-gray-600">Total Parts</p>
                <h3 className="text-2xl font-bold text-gray-900">{totalParts}</h3>
                <p className="text-xs text-gray-500 mt-1">{parts.length} SKUs</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Settings className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock Alerts</p>
                <h3 className="text-2xl font-bold text-red-600">{lowStockParts}</h3>
                <p className="text-xs text-gray-500 mt-1">Need reorder</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Vehicles by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={vehicleStatusPie}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {vehicleStatusPie.map((entry, index) => (
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
            <CardTitle>Top Vehicle Makes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={makeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="make" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Parts by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantity" fill="#10b981" name="Quantity" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Stock Alert ({lowStockParts} items)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {lowStockItems.map((part, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{part.name}</p>
                    <p className="text-xs text-gray-500">{part.part_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-600">{part.quantity} units</p>
                    <p className="text-xs text-gray-500">Reorder at: {part.reorder_level}</p>
                  </div>
                </div>
              ))}
              {lowStockItems.length === 0 && (
                <p className="text-center text-gray-500 py-8">No low stock items</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}