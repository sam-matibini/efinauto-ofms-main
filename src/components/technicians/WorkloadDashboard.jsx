import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { User, Clock, Wrench, AlertTriangle, TrendingUp } from "lucide-react";
import { useCompany } from "@/components/shared/CompanyContext";

export default function WorkloadDashboard() {
  const { selectedCompanyId } = useCompany();

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians', selectedCompanyId],
    queryFn: () => supabase.entities.Technician.filter({ 
      company_id: selectedCompanyId,
      status: 'active'
    }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: repairOrders = [] } = useQuery({
    queryKey: ['repairs', selectedCompanyId],
    queryFn: () => supabase.entities.RepairOrder.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets', selectedCompanyId],
    queryFn: () => supabase.entities.Timesheet.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const workloadData = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const thisWeekStart = new Date();
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay() + 1);
    const weekStartStr = thisWeekStart.toISOString().split('T')[0];

    return technicians.map(tech => {
      // Active repair orders assigned to this tech
      const activeOrders = repairOrders.filter(order => 
        order.assigned_technician === tech.full_name &&
        ['pending', 'in_progress', 'waiting_parts'].includes(order.status)
      );

      // Timesheets for this week
      const weekTimesheets = timesheets.filter(ts => 
        ts.technician_id === tech.id &&
        ts.date >= weekStartStr
      );

      const totalHoursThisWeek = weekTimesheets.reduce((sum, ts) => 
        sum + (ts.total_hours || 0), 0
      );

      const billableHoursThisWeek = weekTimesheets
        .filter(ts => ts.billable)
        .reduce((sum, ts) => sum + (ts.total_hours || 0), 0);

      // Calculate utilization (assuming 40 hours per week)
      const utilizationRate = (totalHoursThisWeek / 40) * 100;

      // Calculate efficiency (billable vs total hours)
      const efficiencyRate = totalHoursThisWeek > 0 
        ? (billableHoursThisWeek / totalHoursThisWeek) * 100 
        : 0;

      return {
        ...tech,
        activeOrdersCount: activeOrders.length,
        activeOrders,
        totalHoursThisWeek,
        billableHoursThisWeek,
        utilizationRate: Math.min(utilizationRate, 100),
        efficiencyRate,
        capacity: 40 - totalHoursThisWeek, // Remaining capacity in hours
      };
    });
  }, [technicians, repairOrders, timesheets]);

  const getUtilizationColor = (rate) => {
    if (rate >= 90) return "text-red-600";
    if (rate >= 70) return "text-yellow-600";
    return "text-green-600";
  };

  const getCapacityStatus = (capacity) => {
    if (capacity <= 5) return { label: "Near Capacity", color: "bg-red-500" };
    if (capacity <= 15) return { label: "Moderate", color: "bg-yellow-500" };
    return { label: "Available", color: "bg-green-500" };
  };

  const sortedByUtilization = [...workloadData].sort((a, b) => b.utilizationRate - a.utilizationRate);

  const overloadedTechs = workloadData.filter(t => t.utilizationRate >= 90);
  const availableTechs = workloadData.filter(t => t.utilizationRate < 70);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Utilization</p>
                <h3 className="text-2xl font-bold">
                  {(workloadData.reduce((sum, t) => sum + t.utilizationRate, 0) / workloadData.length || 0).toFixed(1)}%
                </h3>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overloaded</p>
                <h3 className="text-2xl font-bold text-red-600">{overloadedTechs.length}</h3>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available</p>
                <h3 className="text-2xl font-bold text-green-600">{availableTechs.length}</h3>
              </div>
              <User className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Technician Workload Details */}
      <Card>
        <CardHeader>
          <CardTitle>Technician Workload Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedByUtilization.map(tech => {
              const capacityStatus = getCapacityStatus(tech.capacity);
              
              return (
                <div key={tech.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{tech.full_name}</h4>
                        <Badge variant="outline">{tech.employee_id}</Badge>
                        <Badge className={capacityStatus.color + " text-white"}>
                          {capacityStatus.label}
                        </Badge>
                      </div>
                      {tech.specialization && tech.specialization.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {tech.specialization.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${getUtilizationColor(tech.utilizationRate)}`}>
                        {tech.utilizationRate.toFixed(0)}%
                      </p>
                      <p className="text-xs text-gray-500">Utilization</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Weekly Hours</span>
                        <span className="font-semibold">
                          {tech.totalHoursThisWeek.toFixed(1)} / 40h
                        </span>
                      </div>
                      <Progress value={tech.utilizationRate} className="h-2" />
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Efficiency (Billable)</span>
                        <span className="font-semibold">
                          {tech.efficiencyRate.toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={tech.efficiencyRate} className="h-2 bg-blue-100" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-gray-600">Active Jobs</p>
                        <p className="font-semibold">{tech.activeOrdersCount}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-gray-600">Billable Hours</p>
                        <p className="font-semibold">{tech.billableHoursThisWeek.toFixed(1)}h</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 ${tech.capacity <= 10 ? 'text-red-600' : 'text-gray-400'}`} />
                      <div>
                        <p className="text-gray-600">Capacity Left</p>
                        <p className="font-semibold">{tech.capacity.toFixed(1)}h</p>
                      </div>
                    </div>
                  </div>

                  {tech.activeOrders.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Current Assignments:</p>
                      <div className="flex flex-wrap gap-2">
                        {tech.activeOrders.map(order => (
                          <Badge key={order.id} variant="outline" className="text-xs">
                            {order.order_number}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}