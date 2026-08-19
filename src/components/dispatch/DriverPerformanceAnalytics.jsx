import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, TrendingDown, Clock, Zap, Droplet, AlertTriangle, 
  Trophy, Star, Target, Brain, BarChart3, Download
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useCompany } from "@/components/shared/CompanyContext";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import AIDriverInsights from "./AIDriverInsights";
import DriverPerformanceReports from "./DriverPerformanceReports";

export default function DriverPerformanceAnalytics() {
  const { selectedCompanyId } = useCompany();
  const [timeRange, setTimeRange] = useState("30");
  const [selectedDriver, setSelectedDriver] = useState("all");

  const { data: drivers = [] } = useQuery({
    queryKey: ['allDrivers', selectedCompanyId],
    queryFn: async () => {
      const internal = await supabase.entities.Driver.filter({ company_id: selectedCompanyId });
      const thirdParty = await supabase.entities.ThirdPartyDriver.filter({ company_id: selectedCompanyId });
      return [
        ...internal.map(d => ({ ...d, driver_type: 'internal', display_name: d.driver_name })),
        ...thirdParty.map(d => ({ ...d, driver_type: 'third_party', display_name: `${d.driver_name} (3rd Party)` }))
      ];
    },
    enabled: !!selectedCompanyId,
  });

  const { data: metrics = [] } = useQuery({
    queryKey: ['performanceMetrics', selectedCompanyId, timeRange, selectedDriver],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeRange));
      
      const query = { 
        company_id: selectedCompanyId,
        metric_date: { $gte: startDate.toISOString().split('T')[0] }
      };
      
      if (selectedDriver !== 'all') {
        query.driver_id = selectedDriver;
      }
      
      return supabase.entities.DriverPerformanceMetric.filter(query, '-metric_date', 500);
    },
    enabled: !!selectedCompanyId,
  });

  // Calculate aggregate statistics
  const stats = React.useMemo(() => {
    if (metrics.length === 0) return null;

    const onTimeDeliveries = metrics.filter(m => m.on_time_delivery).length;
    const totalDeliveries = metrics.length;
    const onTimeRate = totalDeliveries > 0 ? (onTimeDeliveries / totalDeliveries) * 100 : 0;

    const avgScore = metrics.reduce((sum, m) => sum + (m.overall_score || 0), 0) / metrics.length;

    const totalIncidents = metrics.reduce((sum, m) => sum + (m.safety_incidents?.length || 0), 0);

    const totalSpeeding = metrics.reduce((sum, m) => 
      sum + (m.driving_behavior?.speeding_incidents || 0), 0);
    
    const totalHarshBraking = metrics.reduce((sum, m) => 
      sum + (m.driving_behavior?.harsh_braking_count || 0), 0);

    const avgFuelEfficiency = metrics
      .filter(m => m.fuel_efficiency?.fuel_efficiency_km_per_liter)
      .reduce((sum, m) => sum + m.fuel_efficiency.fuel_efficiency_km_per_liter, 0) / 
      metrics.filter(m => m.fuel_efficiency?.fuel_efficiency_km_per_liter).length;

    const avgRouteDeviation = metrics
      .filter(m => m.route_efficiency?.route_deviation_percentage)
      .reduce((sum, m) => sum + m.route_efficiency.route_deviation_percentage, 0) / 
      metrics.filter(m => m.route_efficiency?.route_deviation_percentage).length;

    return {
      onTimeRate,
      avgScore,
      totalIncidents,
      totalSpeeding,
      totalHarshBraking,
      avgFuelEfficiency,
      avgRouteDeviation,
      totalDeliveries
    };
  }, [metrics]);

  // Top performers
  const topPerformers = React.useMemo(() => {
    const driverScores = {};
    
    metrics.forEach(m => {
      if (!driverScores[m.driver_id]) {
        driverScores[m.driver_id] = { scores: [], driver: drivers.find(d => d.id === m.driver_id) };
      }
      driverScores[m.driver_id].scores.push(m.overall_score || 0);
    });

    return Object.entries(driverScores)
      .map(([id, data]) => ({
        driver: data.driver,
        avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 5);
  }, [metrics, drivers]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Driver Performance Analytics</h2>
        <div className="flex gap-3">
          <Select value={selectedDriver} onValueChange={setSelectedDriver}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Drivers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Drivers</SelectItem>
              {drivers.map(driver => (
                <SelectItem key={driver.id} value={driver.id}>
                  {driver.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
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

      {stats && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">On-Time Rate</p>
                  <p className="text-2xl font-bold">{stats.onTimeRate.toFixed(1)}%</p>
                </div>
                <Clock className={`w-8 h-8 ${stats.onTimeRate >= 90 ? 'text-green-500' : 'text-orange-500'}`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Performance</p>
                  <p className="text-2xl font-bold">{stats.avgScore.toFixed(0)}/100</p>
                </div>
                <Star className={`w-8 h-8 ${stats.avgScore >= 80 ? 'text-yellow-500' : 'text-gray-400'}`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Safety Incidents</p>
                  <p className="text-2xl font-bold">{stats.totalIncidents}</p>
                </div>
                <AlertTriangle className={`w-8 h-8 ${stats.totalIncidents === 0 ? 'text-green-500' : 'text-red-500'}`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Fuel Efficiency</p>
                  <p className="text-2xl font-bold">{stats.avgFuelEfficiency.toFixed(1)} km/L</p>
                </div>
                <Droplet className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="driving">Driving Behavior</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Delivery Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Deliveries</span>
                    <span className="font-bold">{stats?.totalDeliveries}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">On-Time Deliveries</span>
                    <span className="font-bold text-green-600">{stats?.onTimeRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Avg Route Deviation</span>
                    <span className="font-bold">{stats?.avgRouteDeviation.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Safety Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Incidents</span>
                    <Badge className={stats?.totalIncidents === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {stats?.totalIncidents}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Speeding Events</span>
                    <Badge variant="outline">{stats?.totalSpeeding}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Harsh Braking</span>
                    <Badge variant="outline">{stats?.totalHarshBraking}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="driving" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Driving Behavior Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {drivers.filter(d => selectedDriver === 'all' || d.id === selectedDriver).map(driver => {
                  const driverMetrics = metrics.filter(m => m.driver_id === driver.id);
                  if (driverMetrics.length === 0) return null;

                  const speeding = driverMetrics.reduce((sum, m) => sum + (m.driving_behavior?.speeding_incidents || 0), 0);
                  const harsh = driverMetrics.reduce((sum, m) => sum + (m.driving_behavior?.harsh_braking_count || 0), 0);

                  return (
                    <div key={driver.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">{driver.display_name}</h4>
                        <Badge>{driverMetrics.length} trips</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600">Speeding</p>
                          <p className="font-bold text-orange-600">{speeding}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Harsh Braking</p>
                          <p className="font-bold text-red-600">{harsh}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Avg Score</p>
                          <p className="font-bold">
                            {(driverMetrics.reduce((sum, m) => sum + (m.overall_score || 0), 0) / driverMetrics.length).toFixed(0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topPerformers.map((performer, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        idx === 0 ? 'bg-yellow-100 text-yellow-800' :
                        idx === 1 ? 'bg-gray-100 text-gray-800' :
                        idx === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{performer.driver?.display_name}</p>
                        <p className="text-xs text-gray-500">{performer.driver?.driver_type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{performer.avgScore.toFixed(0)}</p>
                      <p className="text-xs text-gray-500">Performance Score</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <AIDriverInsights metrics={metrics} drivers={drivers} />
        </TabsContent>

        <TabsContent value="reports">
          <DriverPerformanceReports metrics={metrics} drivers={drivers} timeRange={timeRange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}