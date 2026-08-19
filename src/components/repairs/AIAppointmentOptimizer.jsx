import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Calendar, Clock, AlertTriangle, TrendingUp, Loader2, Users } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import { format, addDays, parseISO } from "date-fns";

export default function AIAppointmentOptimizer({ repairs, technicians, selectedDate, onDateSelect }) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);

  const analyzeSchedule = async () => {
    setLoading(true);
    try {
      // Prepare data for AI analysis
      const technicianWorkload = technicians.map(tech => {
        const assignedRepairs = repairs.filter(r => 
          r.assigned_technician === tech.full_name && 
          r.status !== 'completed' && 
          r.status !== 'picked_up'
        );
        
        const totalHours = assignedRepairs.reduce((sum, r) => 
          sum + (r.total_labor_hours || 0), 0
        );

        return {
          name: tech.full_name,
          assigned_jobs: assignedRepairs.length,
          total_hours: totalHours,
          specialization: tech.specialization,
          hourly_rate: tech.hourly_rate || 0
        };
      });

      // Analyze repair history
      const completedRepairs = repairs.filter(r => r.status === 'completed');
      const avgRepairTimes = {};
      
      completedRepairs.forEach(repair => {
        const type = repair.service_type;
        if (!avgRepairTimes[type]) {
          avgRepairTimes[type] = { total: 0, count: 0 };
        }
        avgRepairTimes[type].total += repair.total_labor_hours || 0;
        avgRepairTimes[type].count += 1;
      });

      Object.keys(avgRepairTimes).forEach(type => {
        avgRepairTimes[type] = avgRepairTimes[type].total / avgRepairTimes[type].count;
      });

      // Current pending repairs
      const pendingRepairs = repairs.filter(r => r.status === 'pending').length;
      const inProgressRepairs = repairs.filter(r => r.status === 'in_progress').length;

      const prompt = `Analyze this auto repair shop scheduling data and provide optimization recommendations:

Technician Workload:
${JSON.stringify(technicianWorkload, null, 2)}

Average Repair Times by Service Type:
${JSON.stringify(avgRepairTimes, null, 2)}

Current Status:
- Pending repairs: ${pendingRepairs}
- In progress: ${inProgressRepairs}
- Total technicians: ${technicians.length}

Provide:
1. Optimal time slots for the next 7 days (consider workload distribution)
2. Technician recommendations for different service types
3. Identified bottlenecks in the current schedule
4. Workflow optimization suggestions
5. Capacity analysis and overbooking warnings`;

      const response = await supabase.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            optimal_slots: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  time_slot: { type: "string" },
                  recommended_technician: { type: "string" },
                  service_type: { type: "string" },
                  reason: { type: "string" },
                  capacity_score: { type: "number" }
                }
              }
            },
            technician_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  technician: { type: "string" },
                  best_for: { type: "array", items: { type: "string" } },
                  current_utilization: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            bottlenecks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  issue: { type: "string" },
                  severity: { type: "string" },
                  impact: { type: "string" },
                  solution: { type: "string" }
                }
              }
            },
            workflow_optimizations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  recommendation: { type: "string" },
                  expected_improvement: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            capacity_analysis: {
              type: "object",
              properties: {
                current_capacity: { type: "string" },
                utilization_percentage: { type: "number" },
                forecast: { type: "string" },
                warnings: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      });

      setRecommendations(response);
      toast.success("AI analysis complete");
    } catch (error) {
      toast.error("Failed to generate recommendations");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
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
                AI Appointment Optimizer
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Smart scheduling recommendations based on workload, skills, and historical data
              </p>
            </div>
            <Button onClick={analyzeSchedule} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Optimize Schedule
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {!recommendations && (
          <CardContent>
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-2">No optimization data yet</p>
              <p className="text-sm text-gray-400">Click "Optimize Schedule" to get AI-powered recommendations</p>
            </div>
          </CardContent>
        )}
      </Card>

      {recommendations && (
        <>
          {/* Capacity Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Capacity Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Current Capacity</p>
                  <p className="text-xl font-bold text-blue-900">{recommendations.capacity_analysis?.current_capacity}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Utilization</p>
                  <p className="text-xl font-bold text-purple-900">
                    {recommendations.capacity_analysis?.utilization_percentage}%
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-sm font-semibold mb-2">Forecast</p>
                <p className="text-sm text-gray-700">{recommendations.capacity_analysis?.forecast}</p>
              </div>
              {recommendations.capacity_analysis?.warnings?.length > 0 && (
                <div className="space-y-2">
                  {recommendations.capacity_analysis.warnings.map((warning, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                      <p className="text-sm text-red-800">{warning}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Optimal Time Slots */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                Recommended Appointment Slots (Next 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recommendations.optimal_slots?.map((slot, idx) => (
                  <div key={idx} className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-green-900">{slot.date}</p>
                        <p className="text-sm text-green-700">{slot.time_slot}</p>
                      </div>
                      <Badge className="bg-green-600 text-white">
                        {slot.capacity_score}/10
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-700">
                        <strong>Service:</strong> {slot.service_type}
                      </p>
                      <p className="text-gray-700">
                        <strong>Technician:</strong> {slot.recommended_technician}
                      </p>
                      <p className="text-gray-600 text-xs mt-2">{slot.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bottlenecks */}
          {recommendations.bottlenecks?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Identified Bottlenecks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recommendations.bottlenecks.map((bottleneck, idx) => (
                    <div key={idx} className={`p-4 border rounded-lg ${getSeverityColor(bottleneck.severity)}`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold">{bottleneck.issue}</p>
                        <Badge variant="outline">{bottleneck.severity} Priority</Badge>
                      </div>
                      <p className="text-sm mb-2">
                        <strong>Impact:</strong> {bottleneck.impact}
                      </p>
                      <div className="bg-white bg-opacity-50 p-2 rounded text-sm">
                        <strong>Solution:</strong> {bottleneck.solution}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Technician Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Technician Utilization & Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.technician_recommendations?.map((tech, idx) => (
                  <div key={idx} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-blue-900">{tech.technician}</p>
                      <Badge variant="outline">{tech.current_utilization}</Badge>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Best for:</p>
                        <div className="flex flex-wrap gap-1">
                          {tech.best_for?.map((service, sidx) => (
                            <Badge key={sidx} className="bg-blue-600 text-white text-xs">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 pt-2 border-t">
                        {tech.recommendation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Workflow Optimizations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                Workflow Optimization Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendations.workflow_optimizations?.map((opt, idx) => (
                  <div key={idx} className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={`
                        ${opt.priority === 'High' ? 'bg-red-600' : 
                          opt.priority === 'Medium' ? 'bg-yellow-600' : 'bg-green-600'} 
                        text-white
                      `}>
                        {opt.priority} Priority
                      </Badge>
                      <Badge variant="outline" className="text-purple-700">
                        {opt.expected_improvement}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700">{opt.recommendation}</p>
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