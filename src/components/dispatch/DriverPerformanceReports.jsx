import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function DriverPerformanceReports({ metrics, drivers, timeRange }) {
  const generateCSVReport = () => {
    if (metrics.length === 0) {
      toast.error("No data available for report");
      return;
    }

    const headers = [
      "Date", "Driver Name", "Driver Type", "On Time", "Delay (min)",
      "Overall Score", "Speeding Incidents", "Harsh Braking", 
      "Fuel Efficiency (km/L)", "Safety Incidents", "Customer Rating"
    ];

    const rows = metrics.map(m => {
      const driver = drivers.find(d => d.id === m.driver_id);
      return [
        m.metric_date,
        driver?.display_name || 'Unknown',
        m.driver_type,
        m.on_time_delivery ? 'Yes' : 'No',
        m.delivery_delay_minutes || 0,
        m.overall_score || 0,
        m.driving_behavior?.speeding_incidents || 0,
        m.driving_behavior?.harsh_braking_count || 0,
        m.fuel_efficiency?.fuel_efficiency_km_per_liter?.toFixed(2) || 'N/A',
        m.safety_incidents?.length || 0,
        m.customer_rating || 'N/A'
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `driver-performance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success("Report downloaded");
  };

  const generateSummaryReport = () => {
    if (metrics.length === 0) {
      toast.error("No data available for report");
      return;
    }

    const driverSummaries = drivers.map(driver => {
      const driverMetrics = metrics.filter(m => m.driver_id === driver.id);
      if (driverMetrics.length === 0) return null;

      const onTimeRate = (driverMetrics.filter(m => m.on_time_delivery).length / driverMetrics.length) * 100;
      const avgScore = driverMetrics.reduce((sum, m) => sum + (m.overall_score || 0), 0) / driverMetrics.length;
      const totalIncidents = driverMetrics.reduce((sum, m) => sum + (m.safety_incidents?.length || 0), 0);

      return {
        name: driver.display_name,
        type: driver.driver_type,
        trips: driverMetrics.length,
        onTimeRate: onTimeRate.toFixed(1),
        avgScore: avgScore.toFixed(0),
        incidents: totalIncidents
      };
    }).filter(Boolean);

    const headers = ["Driver", "Type", "Total Trips", "On-Time Rate", "Avg Score", "Incidents"];
    const rows = driverSummaries.map(s => [s.name, s.type, s.trips, `${s.onTimeRate}%`, s.avgScore, s.incidents]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `driver-summary-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success("Summary report downloaded");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Performance Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold mb-1">Detailed Performance Report</h4>
                <p className="text-sm text-gray-600">
                  Complete trip-by-trip performance data with all metrics
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-600">Last {timeRange} days</span>
                  <span className="text-xs text-gray-600">• {metrics.length} records</span>
                </div>
              </div>
              <Button onClick={generateCSVReport} disabled={metrics.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </Button>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold mb-1">Driver Summary Report</h4>
                <p className="text-sm text-gray-600">
                  Aggregated performance summary by driver
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-600">{drivers.length} drivers</span>
                </div>
              </div>
              <Button onClick={generateSummaryReport} disabled={metrics.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Download Summary
              </Button>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              💡 <strong>Tip:</strong> Use these reports for performance reviews, 
              identifying training needs, and tracking improvements over time.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}