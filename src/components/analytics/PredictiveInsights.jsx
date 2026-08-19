import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { Sparkles, TrendingUp, AlertTriangle, Package } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";

export default function PredictiveInsights({ repairOrders, parts, timesheets, dateRange }) {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);

  const cutoffDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - dateRange);
    return date.toISOString().split('T')[0];
  }, [dateRange]);

  const analyticsData = useMemo(() => {
    const filteredOrders = repairOrders.filter(order => order.start_date >= cutoffDate);
    
    // Calculate daily/weekly averages
    const daysInRange = dateRange;
    const avgRepairsPerDay = filteredOrders.length / daysInRange;
    const avgRevenuePerDay = filteredOrders.reduce((sum, o) => sum + (o.total_cost || 0), 0) / daysInRange;

    // Parts consumption rate
    const partsConsumption = {};
    filteredOrders.forEach(order => {
      if (order.parts_used && Array.isArray(order.parts_used)) {
        order.parts_used.forEach(part => {
          const key = part.part_id || part.part_name;
          if (!partsConsumption[key]) {
            partsConsumption[key] = {
              name: part.part_name,
              totalUsed: 0,
              avgPerRepair: 0,
            };
          }
          partsConsumption[key].totalUsed += part.quantity || 0;
        });
      }
    });

    Object.values(partsConsumption).forEach(part => {
      part.avgPerRepair = part.totalUsed / filteredOrders.length;
    });

    // Seasonal patterns
    const monthlyData = {};
    filteredOrders.forEach(order => {
      if (order.start_date) {
        const month = new Date(order.start_date).getMonth();
        monthlyData[month] = (monthlyData[month] || 0) + 1;
      }
    });

    return {
      avgRepairsPerDay,
      avgRevenuePerDay,
      partsConsumption,
      monthlyData,
      totalOrders: filteredOrders.length,
    };
  }, [repairOrders, parts, dateRange, cutoffDate]);

  // Inventory predictions
  const inventoryPredictions = useMemo(() => {
    return parts.map(part => {
      const consumption = Object.values(analyticsData.partsConsumption).find(
        p => p.name === part.name
      );
      
      if (!consumption) {
        return {
          ...part,
          daysUntilStockout: part.quantity > 0 ? 999 : 0,
          reorderSuggested: false,
        };
      }

      const avgDailyUsage = consumption.totalUsed / dateRange;
      const daysUntilStockout = avgDailyUsage > 0 ? part.quantity / avgDailyUsage : 999;
      const reorderSuggested = daysUntilStockout < 30 || part.quantity <= part.reorder_level;

      return {
        ...part,
        avgDailyUsage,
        daysUntilStockout,
        reorderSuggested,
        projectedNeed30Days: Math.ceil(avgDailyUsage * 30),
      };
    }).filter(p => p.reorderSuggested).sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);
  }, [parts, analyticsData, dateRange]);

  // Demand forecast
  const demandForecast = useMemo(() => {
    const forecast = [];
    const baseAvg = analyticsData.avgRepairsPerDay;
    
    for (let i = 1; i <= 12; i++) {
      const currentMonth = (new Date().getMonth() + i) % 12;
      const historicalData = analyticsData.monthlyData[currentMonth] || baseAvg * 30;
      const seasonalFactor = historicalData / (baseAvg * 30) || 1;
      
      forecast.push({
        month: new Date(2024, currentMonth).toLocaleDateString('en-US', { month: 'short' }),
        predicted: Math.round(baseAvg * 30 * seasonalFactor),
        revenue: Math.round(analyticsData.avgRevenuePerDay * 30 * seasonalFactor),
      });
    }
    
    return forecast;
  }, [analyticsData]);

  const generatePredictions = useMutation({
    mutationFn: async () => {
      setLoading(true);
      
      const prompt = `Based on this auto repair shop data, provide predictive insights and recommendations:

Current Metrics (Last ${dateRange} days):
- Average repairs per day: ${analyticsData.avgRepairsPerDay.toFixed(1)}
- Average revenue per day: $${analyticsData.avgRevenuePerDay.toFixed(0)}
- Total orders: ${analyticsData.totalOrders}

Inventory Alerts:
${inventoryPredictions.slice(0, 5).map(part => 
  `- ${part.name}: ${part.quantity} in stock, ${part.daysUntilStockout.toFixed(0)} days until stockout`
).join('\n')}

Provide 4-5 specific predictions and recommendations for:
1. Service demand for next 30-60 days
2. Parts inventory that need immediate attention
3. Staffing needs based on predicted workload
4. Revenue projections and growth opportunities
5. Potential bottlenecks or challenges

Be specific with numbers and actionable recommendations.`;

      const response = await supabase.integrations.Core.InvokeLLM({ prompt });
      setLoading(false);
      return response;
    },
    onSuccess: (data) => {
      setPredictions(data);
      toast.success("Predictions generated!");
    },
    onError: () => {
      setLoading(false);
      toast.error("Failed to generate predictions");
    }
  });

  return (
    <div className="space-y-6">
      {/* AI Predictions */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-600" />
              AI-Powered Predictions
            </CardTitle>
            <Button 
              onClick={() => generatePredictions.mutate()}
              disabled={loading}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? "Predicting..." : "Generate Predictions"}
            </Button>
          </div>
        </CardHeader>
        {predictions && (
          <CardContent>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
              {predictions}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Daily Repairs</p>
                <h3 className="text-2xl font-bold text-gray-900">
                  {analyticsData.avgRepairsPerDay.toFixed(1)}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  ~{(analyticsData.avgRepairsPerDay * 30).toFixed(0)} per month
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Daily Revenue</p>
                <h3 className="text-2xl font-bold text-gray-900">
                  ${analyticsData.avgRevenuePerDay.toFixed(0)}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  ~${(analyticsData.avgRevenuePerDay * 30).toFixed(0)} per month
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Parts Need Reorder</p>
                <h3 className="text-2xl font-bold text-red-600">
                  {inventoryPredictions.length}
                </h3>
                <p className="text-xs text-gray-500 mt-1">Requires attention</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Demand Forecast */}
      <Card>
        <CardHeader>
          <CardTitle>12-Month Demand Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={demandForecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="predicted" stroke="#3b82f6" strokeWidth={2} name="Predicted Repairs" />
              <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Predicted Revenue ($)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Inventory Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-600" />
            Inventory Reorder Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inventoryPredictions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">All inventory levels are healthy!</p>
          ) : (
            <div className="space-y-3">
              {inventoryPredictions.slice(0, 10).map(part => (
                <div key={part.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{part.name}</h4>
                        {part.daysUntilStockout < 7 && (
                          <Badge className="bg-red-500 text-white">URGENT</Badge>
                        )}
                        {part.daysUntilStockout >= 7 && part.daysUntilStockout < 14 && (
                          <Badge className="bg-orange-500 text-white">HIGH</Badge>
                        )}
                        {part.daysUntilStockout >= 14 && part.daysUntilStockout < 30 && (
                          <Badge className="bg-yellow-500 text-white">MEDIUM</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Part #: {part.part_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Current Stock</p>
                      <p className="text-2xl font-bold">{part.quantity}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t text-sm">
                    <div>
                      <p className="text-gray-600">Avg Daily Usage</p>
                      <p className="font-semibold">{part.avgDailyUsage?.toFixed(2) || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Days Until Stockout</p>
                      <p className="font-semibold text-red-600">
                        {part.daysUntilStockout < 999 ? part.daysUntilStockout.toFixed(0) : '∞'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Suggested Order Qty</p>
                      <p className="font-semibold text-green-600">{part.projectedNeed30Days || part.reorder_level}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}