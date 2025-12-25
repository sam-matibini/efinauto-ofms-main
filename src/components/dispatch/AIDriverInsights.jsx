import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, TrendingUp, AlertTriangle, Target, Lightbulb } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AIDriverInsights({ metrics, drivers }) {
  const [generating, setGenerating] = useState(false);
  const [insights, setInsights] = useState(null);

  const generateInsights = async () => {
    if (metrics.length === 0) {
      toast.error("No metrics available for analysis");
      return;
    }

    setGenerating(true);
    try {
      // Aggregate data for AI analysis
      const aggregateData = drivers.map(driver => {
        const driverMetrics = metrics.filter(m => m.driver_id === driver.id);
        if (driverMetrics.length === 0) return null;

        return {
          driver_name: driver.display_name,
          driver_type: driver.driver_type,
          total_trips: driverMetrics.length,
          on_time_rate: (driverMetrics.filter(m => m.on_time_delivery).length / driverMetrics.length) * 100,
          avg_score: driverMetrics.reduce((sum, m) => sum + (m.overall_score || 0), 0) / driverMetrics.length,
          total_incidents: driverMetrics.reduce((sum, m) => sum + (m.safety_incidents?.length || 0), 0),
          speeding_incidents: driverMetrics.reduce((sum, m) => sum + (m.driving_behavior?.speeding_incidents || 0), 0),
          harsh_braking: driverMetrics.reduce((sum, m) => sum + (m.driving_behavior?.harsh_braking_count || 0), 0),
          avg_fuel_efficiency: driverMetrics
            .filter(m => m.fuel_efficiency?.fuel_efficiency_km_per_liter)
            .reduce((sum, m) => sum + m.fuel_efficiency.fuel_efficiency_km_per_liter, 0) / 
            driverMetrics.filter(m => m.fuel_efficiency?.fuel_efficiency_km_per_liter).length || 0
        };
      }).filter(Boolean);

      const prompt = `You are a fleet performance analyst. Analyze the following driver performance data and provide actionable insights:

${JSON.stringify(aggregateData, null, 2)}

Provide analysis in the following JSON format:
{
  "fleet_overview": "Brief overview of overall fleet performance",
  "top_performers": ["List 3 drivers performing exceptionally well and why"],
  "areas_of_concern": ["List 3 specific areas needing immediate attention"],
  "safety_recommendations": ["3 specific safety improvement recommendations"],
  "efficiency_opportunities": ["3 opportunities to improve fuel efficiency and route optimization"],
  "training_needs": ["3 specific training programs that would benefit the fleet"],
  "predicted_trends": "What trends do you predict based on this data?",
  "cost_savings_potential": "Estimated potential cost savings from implementing recommendations"
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            fleet_overview: { type: "string" },
            top_performers: { type: "array", items: { type: "string" } },
            areas_of_concern: { type: "array", items: { type: "string" } },
            safety_recommendations: { type: "array", items: { type: "string" } },
            efficiency_opportunities: { type: "array", items: { type: "string" } },
            training_needs: { type: "array", items: { type: "string" } },
            predicted_trends: { type: "string" },
            cost_savings_potential: { type: "string" }
          }
        }
      });

      setInsights(result);
      toast.success("AI insights generated successfully");
    } catch (error) {
      toast.error("Failed to generate insights");
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-600" />
            AI-Powered Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 mb-4">
            Get AI-driven analysis of your fleet's performance with actionable recommendations
            to improve safety, efficiency, and overall operations.
          </p>
          <Button
            onClick={generateInsights}
            disabled={generating || metrics.length === 0}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Performance Data...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Generate AI Insights
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {insights && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fleet Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{insights.fleet_overview}</p>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.top_performers.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Badge className="bg-green-100 text-green-800 mt-0.5">{idx + 1}</Badge>
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Areas of Concern
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.areas_of_concern.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Badge className="bg-orange-100 text-orange-800 mt-0.5">!</Badge>
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Safety Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {insights.safety_recommendations.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 p-2 bg-blue-50 rounded">
                    <span className="font-bold text-blue-600">{idx + 1}.</span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-600" />
                Efficiency Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {insights.efficiency_opportunities.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 p-2 bg-yellow-50 rounded">
                    <span className="font-bold text-yellow-600">💡</span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Training Needs</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.training_needs.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-purple-600">📚</span>
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cost Savings Potential</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{insights.cost_savings_potential}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
            <CardHeader>
              <CardTitle className="text-lg">Predicted Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{insights.predicted_trends}</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}