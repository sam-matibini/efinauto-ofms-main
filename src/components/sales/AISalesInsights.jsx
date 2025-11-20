import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, ShoppingCart, Target, Loader2, BarChart3 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AISalesInsights({ sales, vehicles, services }) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const totalSales = sales.reduce((sum, s) => sum + (s.sale_price || 0), 0);
      const avgSaleValue = sales.length > 0 ? totalSales / sales.length : 0;
      
      // Group sales by month
      const salesByMonth = {};
      sales.forEach(sale => {
        const month = new Date(sale.sale_date).toLocaleString('default', { month: 'short', year: 'numeric' });
        salesByMonth[month] = (salesByMonth[month] || 0) + (sale.sale_price || 0);
      });

      // Top selling vehicles
      const vehicleSales = {};
      sales.forEach(sale => {
        const key = sale.vehicle_details || 'Unknown';
        vehicleSales[key] = (vehicleSales[key] || 0) + 1;
      });

      const prompt = `Analyze this car dealership sales data and provide strategic insights:

Sales Overview:
- Total Sales: ${sales.length}
- Total Revenue: $${totalSales.toLocaleString()}
- Average Sale Value: $${avgSaleValue.toLocaleString()}
- Sales by Month: ${JSON.stringify(salesByMonth)}
- Vehicle Sales Distribution: ${JSON.stringify(vehicleSales)}

Provide:
1. Sales trend analysis and predictions for next 3 months
2. Top 3 selling vehicle types/models
3. Cross-selling opportunities (services, warranties, accessories)
4. Up-selling recommendations (premium models, upgrades)
5. Customer segments to target
6. Recommended actions to increase sales`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            trend_analysis: { type: "string" },
            predictions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  month: { type: "string" },
                  predicted_sales: { type: "number" },
                  predicted_revenue: { type: "number" }
                }
              }
            },
            top_products: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product: { type: "string" },
                  sales_count: { type: "number" },
                  reason: { type: "string" }
                }
              }
            },
            cross_sell_opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  opportunity: { type: "string" },
                  description: { type: "string" },
                  potential_revenue: { type: "string" }
                }
              }
            },
            upsell_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  recommendation: { type: "string" },
                  description: { type: "string" },
                  target_segment: { type: "string" }
                }
              }
            },
            action_items: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setInsights(response);
      toast.success("AI insights generated successfully");
    } catch (error) {
      toast.error("Failed to generate insights");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI Sales Intelligence
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Advanced analytics, predictions, and recommendations
              </p>
            </div>
            <Button onClick={generateInsights} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Insights
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {!insights && (
          <CardContent>
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-2">No insights generated yet</p>
              <p className="text-sm text-gray-400">Click "Generate Insights" to analyze your sales data with AI</p>
            </div>
          </CardContent>
        )}
      </Card>

      {insights && (
        <>
          {/* Trend Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Sales Trend Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">{insights.trend_analysis}</p>
              
              {insights.predictions?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">3-Month Sales Forecast</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={insights.predictions}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="predicted_sales" stroke="#8b5cf6" name="Predicted Sales" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                  
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    {insights.predictions.map((pred, idx) => (
                      <div key={idx} className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-sm font-semibold text-purple-900">{pred.month}</p>
                        <p className="text-lg font-bold text-purple-600">{pred.predicted_sales} sales</p>
                        <p className="text-xs text-purple-700">${pred.predicted_revenue?.toLocaleString()} revenue</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Selling Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-600" />
                Top Selling Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.top_products?.map((product, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                    <Badge className="bg-green-600 text-white text-lg px-3 py-1">#{idx + 1}</Badge>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-green-900">{product.product}</p>
                        <Badge variant="outline">{product.sales_count} sales</Badge>
                      </div>
                      <p className="text-sm text-green-700">{product.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Cross-Sell Opportunities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-600" />
                Cross-Selling Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.cross_sell_opportunities?.map((opp, idx) => (
                  <div key={idx} className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-orange-600" />
                      <p className="font-semibold text-orange-900">{opp.opportunity}</p>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{opp.description}</p>
                    <Badge className="bg-orange-600 text-white">{opp.potential_revenue}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Up-Sell Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Up-Selling Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.upsell_recommendations?.map((rec, idx) => (
                  <div key={idx} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-blue-900">{rec.recommendation}</p>
                      <Badge variant="outline" className="text-blue-700">
                        {rec.target_segment}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700">{rec.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Items */}
          <Card>
            <CardHeader>
              <CardTitle>Recommended Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {insights.action_items?.map((action, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <p className="text-sm text-gray-700 pt-0.5">{action}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}