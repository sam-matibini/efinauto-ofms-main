import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { format, differenceInDays, addDays } from "date-fns";
import {
  Brain, Calendar, AlertTriangle, TrendingUp, Clock, CheckCircle2,
  Loader2, Lightbulb, Target, Zap
} from "lucide-react";

export default function AIProjectAssistant({ project, tasks, onApplySuggestions }) {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("schedule");

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const projectData = {
        name: project.name,
        type: project.project_type,
        status: project.status,
        start_date: project.start_date,
        due_date: project.due_date,
        budget: project.budget,
        actual_cost: project.actual_cost,
        progress: project.progress_percent,
        tasks: tasks.map(t => ({
          title: t.title,
          status: t.status,
          priority: t.priority,
          category: t.category,
          start_date: t.start_date,
          due_date: t.due_date,
          estimated_hours: t.estimated_hours,
          actual_hours: t.actual_hours,
          dependencies: t.dependencies,
          assigned_to: t.assigned_name
        }))
      };

      const result = await supabase.integrations.Core.InvokeLLM({
        prompt: `You are a project management AI assistant. Analyze this project and provide optimization recommendations.

PROJECT DATA:
${JSON.stringify(projectData, null, 2)}

Today's date: ${format(new Date(), 'yyyy-MM-dd')}

Provide a comprehensive analysis with:

1. SCHEDULE OPTIMIZATION:
- Identify task scheduling conflicts or inefficiencies
- Suggest optimal task ordering based on dependencies
- Recommend parallel execution opportunities
- Estimate realistic completion date

2. RISK ASSESSMENT:
- Identify project risks (timeline, budget, resource, scope)
- Calculate overall risk score (1-100)
- List specific risk factors with severity (low/medium/high)
- Suggest mitigation strategies

3. RESOURCE OPTIMIZATION:
- Identify workload imbalances
- Suggest task reassignments
- Flag under-utilized or over-allocated resources

4. TIMELINE PREDICTIONS:
- Predicted completion date
- Confidence level (%)
- Factors affecting timeline
- Recommendations to meet deadline

5. ACTIONABLE SUGGESTIONS:
- List 3-5 specific, actionable recommendations
- Priority for each (high/medium/low)
- Expected impact`,
        response_json_schema: {
          type: "object",
          properties: {
            schedule_optimization: {
              type: "object",
              properties: {
                conflicts: { type: "array", items: { type: "string" } },
                optimal_order: { type: "array", items: { type: "string" } },
                parallel_opportunities: { type: "array", items: { type: "string" } },
                estimated_completion: { type: "string" }
              }
            },
            risk_assessment: {
              type: "object",
              properties: {
                overall_score: { type: "number" },
                risk_level: { type: "string" },
                risks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      category: { type: "string" },
                      description: { type: "string" },
                      severity: { type: "string" },
                      mitigation: { type: "string" }
                    }
                  }
                }
              }
            },
            resource_optimization: {
              type: "object",
              properties: {
                imbalances: { type: "array", items: { type: "string" } },
                reassignment_suggestions: { type: "array", items: { type: "string" } }
              }
            },
            timeline_prediction: {
              type: "object",
              properties: {
                predicted_date: { type: "string" },
                confidence: { type: "number" },
                factors: { type: "array", items: { type: "string" } },
                recommendations: { type: "array", items: { type: "string" } }
              }
            },
            actionable_suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  suggestion: { type: "string" },
                  priority: { type: "string" },
                  impact: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAnalysis(result);
      toast.success("Analysis complete");
    } catch (error) {
      toast.error("Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'high': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            AI Project Assistant
          </CardTitle>
          <Button onClick={runAnalysis} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" /> Run Analysis</>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {!analysis ? (
          <div className="text-center py-8 text-gray-500">
            <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Click "Run Analysis" to get AI-powered project insights</p>
            <p className="text-sm mt-1">Schedule optimization, risk assessment, and recommendations</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="schedule" className="flex items-center gap-1">
                <Calendar className="w-4 h-4" /> Schedule
              </TabsTrigger>
              <TabsTrigger value="risks" className="flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Risks
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> Timeline
              </TabsTrigger>
              <TabsTrigger value="actions" className="flex items-center gap-1">
                <Lightbulb className="w-4 h-4" /> Actions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="schedule" className="space-y-4 mt-4">
              {analysis.schedule_optimization?.conflicts?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    Scheduling Conflicts
                  </h4>
                  <ul className="space-y-1">
                    {analysis.schedule_optimization.conflicts.map((c, i) => (
                      <li key={i} className="text-sm text-gray-600 bg-yellow-50 p-2 rounded">• {c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.schedule_optimization?.parallel_opportunities?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-500" />
                    Parallel Execution Opportunities
                  </h4>
                  <ul className="space-y-1">
                    {analysis.schedule_optimization.parallel_opportunities.map((p, i) => (
                      <li key={i} className="text-sm text-gray-600 bg-blue-50 p-2 rounded">• {p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.schedule_optimization?.optimal_order?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Recommended Task Order</h4>
                  <ol className="space-y-1">
                    {analysis.schedule_optimization.optimal_order.map((t, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs">{i+1}</span>
                        {t}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </TabsContent>

            <TabsContent value="risks" className="space-y-4 mt-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Overall Risk Score</p>
                  <p className="text-2xl font-bold">{analysis.risk_assessment?.overall_score || 0}/100</p>
                </div>
                <Badge className={getRiskColor(analysis.risk_assessment?.risk_level)}>
                  {analysis.risk_assessment?.risk_level || 'Unknown'} Risk
                </Badge>
              </div>

              <div className="space-y-3">
                {analysis.risk_assessment?.risks?.map((risk, i) => (
                  <div key={i} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{risk.category}</span>
                      <Badge className={getRiskColor(risk.severity)} variant="secondary">
                        {risk.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{risk.description}</p>
                    <div className="bg-green-50 p-2 rounded text-sm">
                      <span className="font-medium text-green-700">Mitigation:</span> {risk.mitigation}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-500">Predicted Completion</p>
                  <p className="text-lg font-bold text-blue-700">
                    {analysis.timeline_prediction?.predicted_date || 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-500">Confidence Level</p>
                  <div className="flex items-center gap-2">
                    <Progress value={analysis.timeline_prediction?.confidence || 0} className="flex-1" />
                    <span className="font-bold text-green-700">{analysis.timeline_prediction?.confidence || 0}%</span>
                  </div>
                </div>
              </div>

              {analysis.timeline_prediction?.factors?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Factors Affecting Timeline</h4>
                  <ul className="space-y-1">
                    {analysis.timeline_prediction.factors.map((f, i) => (
                      <li key={i} className="text-sm text-gray-600">• {f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.timeline_prediction?.recommendations?.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Timeline Recommendations</h4>
                  <ul className="space-y-1">
                    {analysis.timeline_prediction.recommendations.map((r, i) => (
                      <li key={i} className="text-sm bg-blue-50 p-2 rounded">• {r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>

            <TabsContent value="actions" className="space-y-3 mt-4">
              {analysis.actionable_suggestions?.map((action, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-purple-500" />
                        <span className="font-medium">{action.suggestion}</span>
                      </div>
                      <p className="text-sm text-gray-500">Impact: {action.impact}</p>
                    </div>
                    <Badge className={getPriorityColor(action.priority)} variant="secondary">
                      {action.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}