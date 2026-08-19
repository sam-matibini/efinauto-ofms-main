import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Shield, Clock, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { format, differenceInHours, subDays } from "date-fns";
import { validateExportOrder } from "../export/ExportValidationService";

export default function CompliancePerformance({ companyId }) {
  const { data: exportOrders = [], isLoading } = useQuery({
    queryKey: ['exportOrders', companyId],
    queryFn: () => supabase.entities.ExportOrder.filter({ company_id: companyId }),
    enabled: !!companyId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  // Calculate compliance metrics
  const ordersWithValidation = exportOrders.map(order => {
    const validation = validateExportOrder(order, order.line_items || order.items || []);
    return { order, validation };
  });

  const totalOrders = exportOrders.length;
  const ordersWithErrors = ordersWithValidation.filter(o => !o.validation.isValid).length;
  const ordersWithWarnings = ordersWithValidation.filter(o => o.validation.warnings.length > 0).length;
  const compliantOrders = ordersWithValidation.filter(o => o.validation.isValid && o.validation.warnings.length === 0).length;

  const errorRate = totalOrders > 0 ? (ordersWithErrors / totalOrders * 100) : 0;
  const warningRate = totalOrders > 0 ? (ordersWithWarnings / totalOrders * 100) : 0;

  // Calculate average review time
  const reviewedOrders = exportOrders.filter(o => o.compliance_reviewed_at && o.created_date);
  const avgReviewTime = reviewedOrders.length > 0 ? 
    reviewedOrders.reduce((sum, o) => {
      return sum + differenceInHours(new Date(o.compliance_reviewed_at), new Date(o.created_date));
    }, 0) / reviewedOrders.length : 0;

  // Last 7 days error trend
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    return {
      date: format(date, 'MMM dd'),
      errors: 0,
      warnings: 0,
      compliant: 0
    };
  });

  exportOrders.forEach(order => {
    const orderDate = new Date(order.created_date);
    const dayIndex = last7Days.findIndex(d => {
      const targetDate = subDays(new Date(), 6 - last7Days.indexOf(d));
      return orderDate.toDateString() === targetDate.toDateString();
    });

    if (dayIndex !== -1) {
      const validation = validateExportOrder(order, order.line_items || order.items || []);
      if (!validation.isValid) {
        last7Days[dayIndex].errors++;
      } else if (validation.warnings.length > 0) {
        last7Days[dayIndex].warnings++;
      } else {
        last7Days[dayIndex].compliant++;
      }
    }
  });

  // Error types breakdown
  const errorTypes = {};
  ordersWithValidation.forEach(({ validation }) => {
    validation.errors.forEach(error => {
      const type = error.includes('country') ? 'Country Codes' :
                   error.includes('HS code') ? 'HS Codes' :
                   error.includes('currency') ? 'Currency' :
                   error.includes('subdivision') ? 'Subdivision' : 'Other';
      errorTypes[type] = (errorTypes[type] || 0) + 1;
    });
  });

  const errorBreakdown = Object.entries(errorTypes).map(([name, value]) => ({ name, value }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Compliance Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-xs text-gray-600">Error Rate</p>
            </div>
            <p className="text-xl font-bold text-red-600">{errorRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500">{ordersWithErrors} orders</p>
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <p className="text-xs text-gray-600">Warning Rate</p>
            </div>
            <p className="text-xl font-bold text-yellow-600">{warningRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500">{ordersWithWarnings} orders</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <p className="text-xs text-gray-600">Compliant</p>
            </div>
            <p className="text-xl font-bold text-green-600">{compliantOrders}</p>
            <p className="text-xs text-gray-500">{totalOrders > 0 ? ((compliantOrders / totalOrders * 100).toFixed(0)) : 0}%</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-gray-600">Avg Review</p>
            </div>
            <p className="text-xl font-bold text-blue-600">{avgReviewTime.toFixed(1)}h</p>
            <p className="text-xs text-gray-500">{reviewedOrders.length} reviews</p>
          </div>
        </div>

        {/* 7-Day Compliance Trend */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Compliance Trend (Last 7 Days)</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={last7Days}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="errors" stackId="a" fill="#ef4444" name="Errors" />
              <Bar dataKey="warnings" stackId="a" fill="#f59e0b" name="Warnings" />
              <Bar dataKey="compliant" stackId="a" fill="#10b981" name="Compliant" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Error Types Breakdown */}
        {errorBreakdown.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3">Common Error Types</h4>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={errorBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="#ef4444" name="Occurrences" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}