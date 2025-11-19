import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer, Receipt } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

const COLORS = {
  GST: '#3b82f6',
  PST: '#10b981',
  HST: '#f59e0b',
};

const PROVINCE_NAMES = {
  AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick',
  NL: 'Newfoundland', NT: 'Northwest Territories', NS: 'Nova Scotia',
  NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island',
  QC: 'Quebec', SK: 'Saskatchewan', YT: 'Yukon'
};

export default function SalesTaxReport({ sales, comparativePeriods = [] }) {
  const currentPeriod = comparativePeriods[0] || { from: new Date(), to: new Date(), label: "Current Period" };

  // Filter sales by current period
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.sale_date);
    return saleDate >= currentPeriod.from && saleDate <= currentPeriod.to;
  });

  // Calculate tax totals by type
  const taxByType = {
    GST: filteredSales.reduce((sum, s) => sum + (s.tax_gst || 0), 0),
    PST: filteredSales.reduce((sum, s) => sum + (s.tax_pst || 0), 0),
    HST: filteredSales.reduce((sum, s) => sum + (s.tax_hst || 0), 0),
  };

  const totalTaxCollected = taxByType.GST + taxByType.PST + taxByType.HST;

  // Calculate tax by province
  const taxByProvince = {};
  filteredSales.forEach(sale => {
    if (sale.province) {
      if (!taxByProvince[sale.province]) {
        taxByProvince[sale.province] = { 
          province: PROVINCE_NAMES[sale.province] || sale.province,
          gst: 0, 
          pst: 0, 
          hst: 0, 
          total: 0 
        };
      }
      taxByProvince[sale.province].gst += (sale.tax_gst || 0);
      taxByProvince[sale.province].pst += (sale.tax_pst || 0);
      taxByProvince[sale.province].hst += (sale.tax_hst || 0);
      taxByProvince[sale.province].total += (sale.tax_total || 0);
    }
  });

  const provinceData = Object.values(taxByProvince).sort((a, b) => b.total - a.total);

  // Tax by status
  const taxByStatus = {
    taxable: filteredSales.filter(s => s.tax_status === 'taxable').reduce((sum, s) => sum + (s.tax_total || 0), 0),
    zero_rated: filteredSales.filter(s => s.tax_status === 'zero_rated').reduce((sum, s) => sum + (s.tax_total || 0), 0),
    exempt: filteredSales.filter(s => s.tax_status === 'exempt').reduce((sum, s) => sum + (s.tax_total || 0), 0),
  };

  // Prepare pie chart data
  const taxTypeData = [
    { name: 'GST', value: taxByType.GST },
    { name: 'PST', value: taxByType.PST },
    { name: 'HST', value: taxByType.HST },
  ].filter(item => item.value > 0);

  // Monthly trend for all comparative periods
  const monthlyTrends = comparativePeriods.map(period => {
    const periodSales = sales.filter(sale => {
      const saleDate = new Date(sale.sale_date);
      return saleDate >= period.from && saleDate <= period.to;
    });

    const totalGst = periodSales.reduce((sum, s) => sum + (s.tax_gst || 0), 0);
    const totalPst = periodSales.reduce((sum, s) => sum + (s.tax_pst || 0), 0);
    const totalHst = periodSales.reduce((sum, s) => sum + (s.tax_hst || 0), 0);

    return {
      period: period.label,
      GST: totalGst,
      PST: totalPst,
      HST: totalHst,
      Total: totalGst + totalPst + totalHst
    };
  });

  const exportToCSV = () => {
    const data = [
      ['Sales Tax Report', `${format(currentPeriod.from, 'MMM d, yyyy')} - ${format(currentPeriod.to, 'MMM d, yyyy')}`],
      [],
      ['Tax Summary'],
      ['GST Collected', taxByType.GST.toFixed(2)],
      ['PST Collected', taxByType.PST.toFixed(2)],
      ['HST Collected', taxByType.HST.toFixed(2)],
      ['Total Tax Collected', totalTaxCollected.toFixed(2)],
      [],
      ['Tax by Province'],
      ['Province', 'GST', 'PST', 'HST', 'Total'],
      ...provinceData.map(p => [p.province, p.gst.toFixed(2), p.pst.toFixed(2), p.hst.toFixed(2), p.total.toFixed(2)]),
      [],
      ['Tax by Status'],
      ['Taxable', taxByStatus.taxable.toFixed(2)],
      ['Zero Rated', taxByStatus.zero_rated.toFixed(2)],
      ['Exempt', taxByStatus.exempt.toFixed(2)],
    ];

    const csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-tax-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tax Collected</p>
                <h3 className="text-2xl font-bold text-gray-900">${totalTaxCollected.toLocaleString()}</h3>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Receipt className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">GST Collected</p>
            <h3 className="text-2xl font-bold text-blue-600">${taxByType.GST.toLocaleString()}</h3>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">PST Collected</p>
            <h3 className="text-2xl font-bold text-green-600">${taxByType.PST.toLocaleString()}</h3>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">HST Collected</p>
            <h3 className="text-2xl font-bold text-amber-600">${taxByType.HST.toLocaleString()}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tax Type Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Tax Distribution by Type</CardTitle>
              <div className="flex gap-2">
                <Button onClick={exportToCSV} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button onClick={handlePrint} variant="outline" size="sm">
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {taxTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={taxTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: $${value.toLocaleString()}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {taxTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No tax data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tax by Province */}
        <Card>
          <CardHeader>
            <CardTitle>Tax Collection by Province</CardTitle>
          </CardHeader>
          <CardContent>
            {provinceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={provinceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="province" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="gst" stackId="a" fill={COLORS.GST} name="GST" />
                  <Bar dataKey="pst" stackId="a" fill={COLORS.PST} name="PST" />
                  <Bar dataKey="hst" stackId="a" fill={COLORS.HST} name="HST" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No provincial data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparative Period Trends */}
      {comparativePeriods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tax Collection Trends - Comparative Periods</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="GST" stroke={COLORS.GST} strokeWidth={2} />
                <Line type="monotone" dataKey="PST" stroke={COLORS.PST} strokeWidth={2} />
                <Line type="monotone" dataKey="HST" stroke={COLORS.HST} strokeWidth={2} />
                <Line type="monotone" dataKey="Total" stroke="#6366f1" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Summary by Province</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Province</th>
                  <th className="text-right p-3 font-semibold">GST</th>
                  <th className="text-right p-3 font-semibold">PST</th>
                  <th className="text-right p-3 font-semibold">HST</th>
                  <th className="text-right p-3 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {provinceData.map((row, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-3">{row.province}</td>
                    <td className="text-right p-3">${row.gst.toLocaleString()}</td>
                    <td className="text-right p-3">${row.pst.toLocaleString()}</td>
                    <td className="text-right p-3">${row.hst.toLocaleString()}</td>
                    <td className="text-right p-3 font-semibold">${row.total.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-gray-100">
                  <td className="p-3">Total</td>
                  <td className="text-right p-3">${taxByType.GST.toLocaleString()}</td>
                  <td className="text-right p-3">${taxByType.PST.toLocaleString()}</td>
                  <td className="text-right p-3">${taxByType.HST.toLocaleString()}</td>
                  <td className="text-right p-3">${totalTaxCollected.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tax Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Collection by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Taxable Sales</p>
              <h3 className="text-2xl font-bold text-green-600">${taxByStatus.taxable.toLocaleString()}</h3>
              <p className="text-xs text-gray-500 mt-1">Standard tax rates applied</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Zero-Rated Sales</p>
              <h3 className="text-2xl font-bold text-blue-600">${taxByStatus.zero_rated.toLocaleString()}</h3>
              <p className="text-xs text-gray-500 mt-1">0% GST/HST eligible for ITC</p>
            </div>
            <div className="border rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Exempt Sales</p>
              <h3 className="text-2xl font-bold text-gray-600">${taxByStatus.exempt.toLocaleString()}</h3>
              <p className="text-xs text-gray-500 mt-1">No tax, no ITC</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}