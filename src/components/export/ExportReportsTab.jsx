import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, TrendingUp, Package, Globe } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import ExportReportFilters from "./ExportReportFilters";
import ExportMetrics from "./ExportMetrics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export default function ExportReportsTab({ companyId }) {
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    destinationCountry: 'all',
    itemType: 'all',
    hsCode: '',
    exportStatus: 'all'
  });

  const { data: exportOrders = [], isLoading } = useQuery({
    queryKey: ['exportOrders', companyId],
    queryFn: () => supabase.entities.ExportOrder.filter({ company_id: companyId }, '-created_date'),
    enabled: !!companyId,
  });

  const filteredOrders = useMemo(() => {
    return exportOrders.filter(order => {
      const orderDate = new Date(order.created_date);
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      
      if (orderDate < start || orderDate > end) return false;
      if (filters.destinationCountry !== 'all' && order.destination_country !== filters.destinationCountry) return false;
      if (filters.exportStatus !== 'all' && order.export_status !== filters.exportStatus) return false;
      
      if (filters.itemType !== 'all') {
        const lineItems = order.line_items || order.items || [];
        if (!lineItems.some(item => item.item_type === filters.itemType)) return false;
      }
      
      if (filters.hsCode) {
        const lineItems = order.line_items || order.items || [];
        if (!lineItems.some(item => item.hs_code?.includes(filters.hsCode))) return false;
      }
      
      return true;
    });
  }, [exportOrders, filters]);

  const reportData = useMemo(() => {
    const totalValue = filteredOrders.reduce((sum, o) => sum + (o.total_value || 0), 0);
    const totalWeight = filteredOrders.reduce((sum, o) => sum + (o.total_weight || 0), 0);
    
    // Volume by HS Code
    const hsCodes = {};
    filteredOrders.forEach(order => {
      (order.line_items || order.items || []).forEach(item => {
        const code = item.hs_code || 'Unknown';
        if (!hsCodes[code]) {
          hsCodes[code] = { count: 0, value: 0 };
        }
        hsCodes[code].count += item.quantity || 1;
        hsCodes[code].value += item.total_value || 0;
      });
    });
    
    const hsByVolume = Object.entries(hsCodes).map(([code, data]) => ({
      hs_code: code,
      count: data.count,
      value: data.value
    })).sort((a, b) => b.value - a.value);

    // Vehicles by category
    const vehicleCategories = {};
    filteredOrders.forEach(order => {
      (order.line_items || order.items || []).forEach(item => {
        if (item.item_type === 'vehicle') {
          const type = item.vehicle_type || 'passenger';
          vehicleCategories[type] = (vehicleCategories[type] || 0) + 1;
        }
      });
    });
    
    const vehiclesByCategory = Object.entries(vehicleCategories).map(([type, count]) => ({
      type: type.replace(/_/g, ' '),
      count
    }));

    // Parts by destination country
    const partsByCountry = {};
    filteredOrders.forEach(order => {
      (order.line_items || order.items || []).forEach(item => {
        if (item.item_type === 'part') {
          const country = order.destination_country || 'Unknown';
          if (!partsByCountry[country]) {
            partsByCountry[country] = { count: 0, value: 0 };
          }
          partsByCountry[country].count += item.quantity || 1;
          partsByCountry[country].value += item.total_value || 0;
        }
      });
    });
    
    const partsByDestination = Object.entries(partsByCountry).map(([country, data]) => ({
      country,
      count: data.count,
      value: data.value
    })).sort((a, b) => b.value - a.value);

    // Exports by destination
    const destinations = {};
    filteredOrders.forEach(order => {
      const country = order.destination_country || 'Unknown';
      if (!destinations[country]) {
        destinations[country] = { count: 0, value: 0 };
      }
      destinations[country].count += 1;
      destinations[country].value += order.total_value || 0;
    });
    
    const byDestination = Object.entries(destinations).map(([country, data]) => ({
      country,
      count: data.count,
      value: data.value
    })).sort((a, b) => b.value - a.value);

    return {
      totalValue,
      totalWeight,
      totalOrders: filteredOrders.length,
      hsByVolume,
      vehiclesByCategory,
      partsByDestination,
      byDestination
    };
  }, [filteredOrders]);

  const exportToCSV = () => {
    if (filteredOrders.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      'Export Order #',
      'Date',
      'Status',
      'Type',
      'Consignee',
      'Destination',
      'Currency',
      'Total Value',
      'Weight (kg)',
      'Items Count',
      'HS Codes'
    ];

    const rows = filteredOrders.map(order => {
      const lineItems = order.line_items || order.items || [];
      const hsCodes = [...new Set(lineItems.map(item => item.hs_code).filter(Boolean))].join('; ');
      
      return [
        order.export_order_number || '',
        order.created_date?.split('T')[0] || '',
        order.export_status || '',
        order.export_type || '',
        order.consignee_name || '',
        order.destination_country || '',
        order.currency || 'USD',
        order.total_value || 0,
        order.total_weight || 0,
        lineItems.length,
        hsCodes
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export_report_${filters.startDate}_${filters.endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success(`Report exported: ${filteredOrders.length} orders`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold">Export Reports & Analytics</h3>
          <p className="text-sm text-gray-600">Analyze export performance and compliance</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" disabled={filteredOrders.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Export to CSV
        </Button>
      </div>

      <ExportReportFilters filters={filters} onChange={setFilters} exportOrders={exportOrders} />

      <ExportMetrics data={reportData} currency={filteredOrders[0]?.currency || 'USD'} />

      {/* Volume by HS Code */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-5 h-5" />
            Export Volume by HS Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reportData.hsByVolume.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.hsByVolume.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hs_code" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" name="Total Value" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No HS code data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicles by Category */}
      {reportData.vehiclesByCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Vehicles Exported by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reportData.vehiclesByCategory}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {reportData.vehiclesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Parts by Destination */}
      {reportData.partsByDestination.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Parts Volume by Destination Country
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reportData.partsByDestination.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{item.country}</p>
                    <p className="text-xs text-gray-600">{item.count} parts</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${item.value.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Export List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Export Orders ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOrders.length > 0 ? (
            <div className="space-y-2">
              {filteredOrders.map(order => (
                <div key={order.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                  <div>
                    <p className="font-medium">{order.export_order_number}</p>
                    <p className="text-xs text-gray-600">
                      {order.consignee_name} → {order.destination_country}
                      {' • '}
                      {(order.line_items || order.items || []).length} items
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{order.currency} ${order.total_value?.toLocaleString()}</p>
                    <p className="text-xs text-gray-600">{order.export_status?.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No export orders match the selected filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}