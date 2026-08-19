import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Users, Wrench, Sparkles, Filter, X } from "lucide-react";
import { useCompany } from "@/components/shared/CompanyContext";
import TechnicianPerformance from "@/components/analytics/TechnicianPerformance";
import RepairTrends from "@/components/analytics/RepairTrends";
import PredictiveInsights from "@/components/analytics/PredictiveInsights";
import AnalyticsFilters from "@/components/analytics/AnalyticsFilters";
import { Badge } from "@/components/ui/badge";

export default function AnalyticsPage() {
  const { selectedCompanyId } = useCompany();
  const [filters, setFilters] = useState({
    dateRange: 30,
    startDate: null,
    endDate: null,
    technicianId: "all",
    vehicleMake: "all",
    vehicleModel: "all",
    serviceType: "all",
    partId: "all",
    compareWith: null, // Previous period comparison
  });

  const { data: repairOrders = [] } = useQuery({
    queryKey: ['repairs', selectedCompanyId],
    queryFn: () => supabase.entities.RepairOrder.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians', selectedCompanyId],
    queryFn: () => supabase.entities.Technician.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets', selectedCompanyId],
    queryFn: () => supabase.entities.Timesheet.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['parts', selectedCompanyId],
    queryFn: () => supabase.entities.Part.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', selectedCompanyId],
    queryFn: () => supabase.entities.Vehicle.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  // Filter data based on selected filters
  const filteredData = React.useMemo(() => {
    let filtered = [...repairOrders];
    
    // Date filtering
    const cutoffDate = new Date();
    if (filters.startDate && filters.endDate) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.start_date);
        return orderDate >= new Date(filters.startDate) && orderDate <= new Date(filters.endDate);
      });
    } else {
      cutoffDate.setDate(cutoffDate.getDate() - filters.dateRange);
      const cutoffStr = cutoffDate.toISOString().split('T')[0];
      filtered = filtered.filter(order => order.start_date >= cutoffStr);
    }

    // Technician filter
    if (filters.technicianId !== "all") {
      const tech = technicians.find(t => t.id === filters.technicianId);
      if (tech) {
        filtered = filtered.filter(order => order.assigned_technician === tech.full_name);
      }
    }

    // Vehicle make filter
    if (filters.vehicleMake !== "all") {
      filtered = filtered.filter(order => order.vehicle_make === filters.vehicleMake);
    }

    // Vehicle model filter
    if (filters.vehicleModel !== "all") {
      filtered = filtered.filter(order => order.vehicle_model === filters.vehicleModel);
    }

    // Service type filter
    if (filters.serviceType !== "all") {
      filtered = filtered.filter(order => order.service_type === filters.serviceType);
    }

    // Part filter
    if (filters.partId !== "all") {
      filtered = filtered.filter(order => {
        if (!order.parts_used || !Array.isArray(order.parts_used)) return false;
        return order.parts_used.some(part => part.part_id === filters.partId);
      });
    }

    return filtered;
  }, [repairOrders, filters, technicians]);

  // Get comparison data for previous period
  const comparisonData = React.useMemo(() => {
    if (!filters.compareWith) return null;

    const daysToCompare = filters.dateRange;
    const comparisonCutoff = new Date();
    comparisonCutoff.setDate(comparisonCutoff.getDate() - (daysToCompare * 2));
    const comparisonEnd = new Date();
    comparisonEnd.setDate(comparisonEnd.getDate() - daysToCompare);
    
    const cutoffStr = comparisonCutoff.toISOString().split('T')[0];
    const endStr = comparisonEnd.toISOString().split('T')[0];

    return repairOrders.filter(order => {
      const orderDate = order.start_date;
      return orderDate >= cutoffStr && orderDate < endStr;
    });
  }, [repairOrders, filters]);

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'dateRange' || key === 'startDate' || key === 'endDate' || key === 'compareWith') return false;
    return value !== "all";
  }).length;

  const clearFilters = () => {
    setFilters({
      dateRange: 30,
      startDate: null,
      endDate: null,
      technicianId: "all",
      vehicleMake: "all",
      vehicleModel: "all",
      serviceType: "all",
      partId: "all",
      compareWith: null,
    });
  };

  const stats = {
    repairs: filteredData.length,
    technicians: technicians.filter(t => t.status === 'active').length,
    hours: timesheets.reduce((sum, t) => sum + (t.total_hours || 0), 0),
    revenue: filteredData.reduce((sum, r) => sum + (r.total_cost || 0), 0),
  };

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
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-blue-400" />
          AI-Powered Analytics
        </h1>
        <p className="text-sm text-gray-300 mt-1">Advanced insights and predictive analytics</p>
      </div>

      <div className="p-6 space-y-6">

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Segmentation
              {activeFiltersCount > 0 && (
                <Badge className="bg-blue-600">{activeFiltersCount} active</Badge>
              )}
            </CardTitle>
            {activeFiltersCount > 0 && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <AnalyticsFilters
            filters={filters}
            onFiltersChange={setFilters}
            technicians={technicians}
            parts={parts}
            vehicles={vehicles}
            repairOrders={repairOrders}
          />
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Filtered Repairs</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats.repairs}</h3>
                {comparisonData && (
                  <p className="text-xs text-gray-500 mt-1">
                    vs {comparisonData.length} previous period
                  </p>
                )}
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
                <h3 className="text-2xl font-bold text-gray-900">{stats.technicians}</h3>
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
                <h3 className="text-2xl font-bold text-gray-900">{stats.hours.toFixed(0)}</h3>
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
                <h3 className="text-2xl font-bold text-gray-900">${stats.revenue.toLocaleString()}</h3>
                {comparisonData && (
                  <p className="text-xs text-gray-500 mt-1">
                    vs ${comparisonData.reduce((sum, r) => sum + (r.total_cost || 0), 0).toLocaleString()}
                  </p>
                )}
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
            repairOrders={filteredData}
            timesheets={timesheets}
            filters={filters}
            comparisonData={comparisonData}
          />
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <RepairTrends 
            repairOrders={filteredData}
            parts={parts}
            filters={filters}
            comparisonData={comparisonData}
          />
        </TabsContent>

        <TabsContent value="predictive" className="space-y-4">
          <PredictiveInsights 
            repairOrders={filteredData}
            parts={parts}
            timesheets={timesheets}
            filters={filters}
          />
        </TabsContent>
      </Tabs>
      </div>
      </div>
      );
      }