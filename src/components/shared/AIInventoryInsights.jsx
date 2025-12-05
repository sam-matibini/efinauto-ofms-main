import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Sparkles, TrendingUp, TrendingDown, AlertTriangle, Package, 
  DollarSign, BarChart3, RefreshCw, ShoppingCart, Clock,
  Target, Lightbulb, ArrowUpRight, ArrowDownRight
} from "lucide-react";

export default function AIInventoryInsights({ 
  companyId, 
  inventoryType = "all", // "parts", "vehicles", "all"
  parts = [],
  vehicles = [],
  sales = [],
  purchases = [],
  repairs = []
}) {
  const [insights, setInsights] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("demand");

  const analyzeInventory = async () => {
    setIsAnalyzing(true);
    try {
      // Prepare inventory summary for AI analysis
      const partsData = parts.map(p => ({
        name: p.name,
        part_number: p.part_number,
        category: p.category,
        quantity: p.quantity,
        reorder_level: p.reorder_level,
        cost_price: p.cost_price,
        selling_price: p.selling_price,
        last_sold: p.updated_date
      }));

      const vehiclesData = vehicles.map(v => ({
        vin: v.vin,
        make: v.make,
        model: v.model,
        year: v.year,
        status: v.status,
        purchase_price: v.purchase_price,
        selling_price: v.selling_price,
        days_in_stock: Math.floor((new Date() - new Date(v.created_date)) / (1000 * 60 * 60 * 24))
      }));

      const salesData = sales.slice(0, 100).map(s => ({
        date: s.sale_date,
        vehicle: s.vehicle_details,
        amount: s.sale_price
      }));

      const repairPartsUsed = repairs.flatMap(r => r.parts_used || []);

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this automotive inventory data and provide comprehensive insights:

PARTS INVENTORY (${partsData.length} items):
${JSON.stringify(partsData.slice(0, 50), null, 2)}

VEHICLE INVENTORY (${vehiclesData.length} vehicles):
${JSON.stringify(vehiclesData.slice(0, 30), null, 2)}

RECENT SALES (${salesData.length} transactions):
${JSON.stringify(salesData.slice(0, 30), null, 2)}

PARTS USED IN REPAIRS:
${JSON.stringify(repairPartsUsed.slice(0, 30), null, 2)}

Provide analysis in the following areas:
1. DEMAND FORECASTING: Predict which parts/vehicles will be in high demand next 30-90 days
2. REORDER RECOMMENDATIONS: Suggest optimal reorder points and quantities
3. SLOW-MOVING INVENTORY: Identify items that haven't sold or moved in 60+ days
4. OBSOLETE INVENTORY: Items that should be liquidated or written off
5. PRICING STRATEGIES: Recommendations for price adjustments based on demand and market
6. SEASONAL TRENDS: Any patterns related to season or time of year
7. ACTIONABLE INSIGHTS: Top 5 immediate actions to optimize inventory`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            demand_forecast: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item: { type: "string" },
                  type: { type: "string" },
                  predicted_demand: { type: "string" },
                  confidence: { type: "number" },
                  reasoning: { type: "string" }
                }
              }
            },
            reorder_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item: { type: "string" },
                  current_stock: { type: "number" },
                  suggested_reorder_point: { type: "number" },
                  suggested_order_quantity: { type: "number" },
                  urgency: { type: "string" },
                  reasoning: { type: "string" }
                }
              }
            },
            slow_moving: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item: { type: "string" },
                  days_stagnant: { type: "number" },
                  value: { type: "number" },
                  recommendation: { type: "string" }
                }
              }
            },
            obsolete_inventory: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item: { type: "string" },
                  reason: { type: "string" },
                  estimated_loss: { type: "number" },
                  action: { type: "string" }
                }
              }
            },
            pricing_strategies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item: { type: "string" },
                  current_price: { type: "number" },
                  suggested_price: { type: "number" },
                  change_percent: { type: "number" },
                  reasoning: { type: "string" }
                }
              }
            },
            seasonal_trends: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  trend: { type: "string" },
                  impact: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            action_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priority: { type: "number" },
                  action: { type: "string" },
                  impact: { type: "string" },
                  timeline: { type: "string" }
                }
              }
            },
            summary: {
              type: "object",
              properties: {
                total_inventory_value: { type: "number" },
                at_risk_value: { type: "number" },
                optimization_potential: { type: "number" },
                health_score: { type: "number" }
              }
            }
          }
        }
      });

      setInsights(response);
      toast.success("Inventory analysis complete");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze inventory");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Inventory Intelligence
          </CardTitle>
          <Button onClick={analyzeInventory} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze Inventory
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!insights ? (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">AI Inventory Analysis</p>
            <p className="text-sm mt-2">Click "Analyze Inventory" to get AI-powered insights on demand forecasting, reorder points, slow-moving inventory, and pricing strategies.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            {insights.summary && (
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-600 font-medium">Inventory Value</p>
                  <p className="text-2xl font-bold text-blue-800">
                    ${(insights.summary.total_inventory_value || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs text-red-600 font-medium">At Risk Value</p>
                  <p className="text-2xl font-bold text-red-800">
                    ${(insights.summary.at_risk_value || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-600 font-medium">Optimization Potential</p>
                  <p className="text-2xl font-bold text-green-800">
                    ${(insights.summary.optimization_potential || 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs text-purple-600 font-medium">Health Score</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-purple-800">
                      {insights.summary.health_score || 0}%
                    </p>
                    <Progress value={insights.summary.health_score || 0} className="flex-1 h-2" />
                  </div>
                </div>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="demand">Demand Forecast</TabsTrigger>
                <TabsTrigger value="reorder">Reorder Points</TabsTrigger>
                <TabsTrigger value="slow">Slow Moving</TabsTrigger>
                <TabsTrigger value="obsolete">Obsolete</TabsTrigger>
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                <TabsTrigger value="actions">Action Items</TabsTrigger>
              </TabsList>

              <TabsContent value="demand" className="mt-4">
                <div className="space-y-3">
                  {insights.demand_forecast?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium">{item.item}</p>
                          <p className="text-sm text-gray-500">{item.reasoning}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-blue-100 text-blue-800">{item.predicted_demand}</Badge>
                        <p className="text-xs text-gray-500 mt-1">{item.confidence}% confidence</p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="reorder" className="mt-4">
                <div className="space-y-3">
                  {insights.reorder_recommendations?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <ShoppingCart className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium">{item.item}</p>
                          <p className="text-sm text-gray-500">Current: {item.current_stock} | Reorder at: {item.suggested_reorder_point}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getUrgencyColor(item.urgency)}>{item.urgency}</Badge>
                        <p className="text-sm font-medium mt-1">Order {item.suggested_order_quantity} units</p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="slow" className="mt-4">
                <div className="space-y-3">
                  {insights.slow_moving?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-yellow-600" />
                        <div>
                          <p className="font-medium">{item.item}</p>
                          <p className="text-sm text-gray-500">{item.days_stagnant} days without movement</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-yellow-800">${item.value?.toLocaleString()}</p>
                        <p className="text-xs text-gray-600 mt-1">{item.recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="obsolete" className="mt-4">
                <div className="space-y-3">
                  {insights.obsolete_inventory?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <div>
                          <p className="font-medium">{item.item}</p>
                          <p className="text-sm text-gray-500">{item.reason}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-red-800">-${item.estimated_loss?.toLocaleString()}</p>
                        <Badge variant="outline" className="mt-1">{item.action}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="pricing" className="mt-4">
                <div className="space-y-3">
                  {insights.pricing_strategies?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium">{item.item}</p>
                          <p className="text-sm text-gray-500">{item.reasoning}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <span className="text-gray-500">${item.current_price?.toLocaleString()}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-bold text-green-700">${item.suggested_price?.toLocaleString()}</span>
                        <Badge className={item.change_percent >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {item.change_percent >= 0 ? <ArrowUpRight className="w-3 h-3 inline" /> : <ArrowDownRight className="w-3 h-3 inline" />}
                          {Math.abs(item.change_percent)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="actions" className="mt-4">
                <div className="space-y-3">
                  {insights.action_items?.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                        {item.priority}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-purple-900">{item.action}</p>
                        <p className="text-sm text-purple-700 mt-1">{item.impact}</p>
                        <Badge variant="outline" className="mt-2">{item.timeline}</Badge>
                      </div>
                      <Lightbulb className="w-5 h-5 text-purple-400" />
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            {/* Seasonal Trends */}
            {insights.seasonal_trends?.length > 0 && (
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Seasonal Trends
                </h4>
                <div className="grid md:grid-cols-2 gap-3">
                  {insights.seasonal_trends.map((trend, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-lg">
                      <p className="font-medium text-sm">{trend.trend}</p>
                      <p className="text-xs text-gray-500 mt-1">{trend.impact}</p>
                      <p className="text-xs text-blue-600 mt-1">{trend.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}