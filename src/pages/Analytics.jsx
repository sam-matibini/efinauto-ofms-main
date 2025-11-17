import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Users, Wrench, Sparkles, Calendar } from "lucide-react";
import { useCompany } from "@/components/shared/CompanyContext";
import TechnicianPerformance from "@/components/analytics/TechnicianPerformance";
import RepairTrends from "@/components/analytics/RepairTrends";
import PredictiveInsights from "@/components/analytics/PredictiveInsights";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AnalyticsPage() {
  const { selectedCompanyId } = useCompany();
  const [dateRange, setDateRange] = useState("30"); // days

  const { data: repairOrders = [] } = useQuery({
    queryKey: ['repairs', selectedCompanyId],
    queryFn: () => base44.entities.RepairOrder.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians', selectedCompanyId],
    queryFn: () => base44.entities.Technician.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets', selectedCompanyId],
    queryFn: () => base44.entities.Timesheet.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['parts', selectedCompanyId],
    queryFn: () => base44.entities.Part.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  if (!selectedCompanyId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please select a company to view analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-blue-600" />
            AI-Powered Analytics
          </h1>
          <p className="text-gray-500 mt-1">Advanced insights and predictive analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="365">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Repairs</p>
                <h3 className="text-2xl font-bold text-gray-900">{repairOrders.length}</h3>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Wrench className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Technicians</p>
                <h3 className="text-2xl font-bold text-gray-900">
                  {technicians.filter(t => t.status === 'active').length}
                </h3>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Hours</p>
                <h3 className="text-2xl font-bold text-gray-900">
                  {timesheets.reduce((sum, t) => sum + (t.total_hours || 0), 0).toFixed(0)}
                </h3>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Revenue</p>
                <h3 className="text-2xl font-bold text-gray-900">
                  ${repairOrders.reduce((sum, r) => sum + (r.total_cost || 0), 0).toLocaleString()}
                </h3>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Technician Performance</TabsTrigger>
          <TabsTrigger value="trends">Repair Trends</TabsTrigger>
          <TabsTrigger value="predictive">Predictive Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <TechnicianPerformance 
            technicians={technicians}
            repairOrders={repairOrders}
            timesheets={timesheets}
            dateRange={parseInt(dateRange)}
          />
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <RepairTrends 
            repairOrders={repairOrders}
            parts={parts}
            dateRange={parseInt(dateRange)}
          />
        </TabsContent>

        <TabsContent value="predictive" className="space-y-4">
          <PredictiveInsights 
            repairOrders={repairOrders}
            parts={parts}
            timesheets={timesheets}
            dateRange={parseInt(dateRange)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}