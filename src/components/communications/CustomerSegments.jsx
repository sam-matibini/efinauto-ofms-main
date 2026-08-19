import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, ShoppingCart, Star, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";

export default function CustomerSegments({ customers, sales }) {
  const [loading, setLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);

  const segments = [
    {
      id: "vip",
      name: "VIP Customers",
      icon: Star,
      color: "bg-yellow-100 text-yellow-800",
      count: customers.filter(c => 
        sales.filter(s => s.customer_id === c.id).length >= 2
      ).length
    },
    {
      id: "recent",
      name: "Recent Buyers",
      icon: ShoppingCart,
      color: "bg-green-100 text-green-800",
      count: sales.filter(s => {
        const saleDate = new Date(s.sale_date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return saleDate >= thirtyDaysAgo;
      }).length
    },
    {
      id: "potential",
      name: "High Potential",
      icon: TrendingUp,
      color: "bg-blue-100 text-blue-800",
      count: customers.filter(c => 
        sales.filter(s => s.customer_id === c.id).length === 0
      ).length
    },
    {
      id: "inactive",
      name: "Inactive",
      icon: Users,
      color: "bg-gray-100 text-gray-800",
      count: customers.filter(c => {
        const lastSale = sales.filter(s => s.customer_id === c.id).sort((a, b) => 
          new Date(b.sale_date) - new Date(a.sale_date)
        )[0];
        if (!lastSale) return false;
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return new Date(lastSale.sale_date) < sixMonthsAgo;
      }).length
    }
  ];

  const generateAIInsights = async () => {
    setLoading(true);
    try {
      const response = await supabase.integrations.Core.InvokeLLM({
        prompt: `Analyze this customer data and provide marketing insights:
        
Total Customers: ${customers.length}
Total Sales: ${sales.length}
VIP Customers: ${segments[0].count}
Recent Buyers: ${segments[1].count}
High Potential: ${segments[2].count}
Inactive Customers: ${segments[3].count}

Provide:
1. Key insights about customer segments
2. Recommended marketing campaigns for each segment
3. Engagement strategies to improve retention`,
        response_json_schema: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  segment: { type: "string" },
                  insight: { type: "string" },
                  campaign_idea: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAiInsights(response.insights);
      toast.success("AI insights generated");
    } catch (error) {
      toast.error("Failed to generate insights");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Customer Segments</CardTitle>
            <Button onClick={generateAIInsights} disabled={loading} variant="outline">
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              AI Insights
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {segments.map((segment) => {
              const Icon = segment.icon;
              return (
                <div key={segment.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-lg ${segment.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{segment.name}</p>
                      <p className="text-2xl font-bold">{segment.count}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    Send Campaign
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {aiInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI-Generated Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {aiInsights.map((insight, idx) => (
                <div key={idx} className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-purple-600 text-white">{insight.segment}</Badge>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Insight:</strong> {insight.insight}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Campaign Idea:</strong> {insight.campaign_idea}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}