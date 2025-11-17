import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Plane, Package, DollarSign, MapPin } from "lucide-react";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ExportReport({ exports, dateRange }) {
  const filterByDate = (items) => {
    if (dateRange === 'all') return items;
    const days = parseInt(dateRange);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return items.filter(item => new Date(item.created_date) >= cutoff);
  };

  const filteredExports = filterByDate(exports);

  const totalExports = filteredExports.length;
  const totalValue = filteredExports.reduce((sum, exp) => sum + (exp.total_value || 0), 0);
  const averageValue = totalExports > 0 ? totalValue / totalExports : 0;
  const inTransit = filteredExports.filter(e => e.status === 'in_transit' || e.status === 'shipped').length;

  // Exports by destination country
  const byCountry = filteredExports.reduce((acc, exp) => {
    const country = exp.destination_country || 'Unknown';
    if (!acc[country]) acc[country] = { country, count: 0, value: 0 };
    acc[country].count += 1;
    acc[country].value += exp.total_value || 0;
    return acc;
  }, {});

  const countryData = Object.values(byCountry).sort((a, b) => b.value - a.value).slice(0, 10);

  // Exports by status
  const statusData = filteredExports.reduce((acc, exp) => {
    const status = exp.status || 'pending';
    if (!acc[status]) acc[status] = 0;
    acc[status] += 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusData).map(([name, value]) => ({ name, value }));

  // Exports by type
  const typeData = filteredExports.reduce((acc, exp) => {
    const type = exp.export_type || 'vehicle';
    if (!acc[type]) acc[type] = { type, count: 0, value: 0 };
    acc[type].count += 1;
    acc[type].value += exp.total_value || 0;
    return acc;
  }, {});

  const exportTypeData = Object.values(typeData);

  // Monthly exports
  const monthlyExports = filteredExports.reduce((acc, exp) => {
    const date = new Date(exp.shipment_date || exp.created_date);
    const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    if (!acc[month]) acc[month] = { month, count: 0, value: 0 };
    acc[month].count += 1;
    acc[month].value += exp.total_value || 0;
    return acc;
  }, {});

  const monthlyData = Object.values(monthlyExports).sort((a, b) => new Date(a.month) - new Date(b.month));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Exports</p>
                <h3 className="text-2xl font-bold text-gray-900">{totalExports}</h3>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Plane className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <h3 className="text-2xl font-bold text-gray-900">${totalValue.toLocaleString()}</h3>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Value</p>
                <h3 className="text-2xl font-bold text-gray-900">${averageValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</h3>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Transit</p>
                <h3 className="text-2xl font-bold text-gray-900">{inTransit}</h3>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Export Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Count" />
                <Line type="monotone" dataKey="value" stroke="#10b981" name="Value ($)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exports by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
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
            <CardTitle>Top Destinations</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={countryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="country" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3b82f6" name="Count" />
                <Bar dataKey="value" fill="#10b981" name="Value ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exports by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={exportTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8b5cf6" name="Count" />
                <Bar dataKey="value" fill="#f59e0b" name="Value ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}