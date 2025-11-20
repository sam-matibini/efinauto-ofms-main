import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Mail, MessageSquare, Calendar, ShoppingCart, Wrench, Loader2, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";

export default function AIFollowUpSuggestions({ customers, sales, repairs, onSendEmail, onSendSMS }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  const analyzeCommunications = async () => {
    setLoading(true);
    try {
      // Analyze customer data
      const customerAnalysis = customers.map(customer => {
        const customerSales = sales.filter(s => s.customer_id === customer.id || s.customer_name === customer.full_name);
        const customerRepairs = repairs.filter(r => r.customer_id === customer.id || r.customer_name === customer.full_name);
        
        const lastSale = customerSales.length > 0 ? 
          customerSales.sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date))[0] : null;
        
        const lastRepair = customerRepairs.length > 0 ?
          customerRepairs.sort((a, b) => new Date(b.completion_date || b.start_date) - new Date(a.completion_date || a.start_date))[0] : null;
        
        const daysSinceLastSale = lastSale ? differenceInDays(new Date(), new Date(lastSale.sale_date)) : null;
        const daysSinceLastRepair = lastRepair ? differenceInDays(new Date(), new Date(lastRepair.completion_date || lastRepair.start_date)) : null;

        return {
          name: customer.full_name,
          email: customer.email,
          phone: customer.phone,
          total_purchases: customerSales.length,
          total_repairs: customerRepairs.length,
          last_purchase: lastSale ? {
            date: lastSale.sale_date,
            vehicle: lastSale.vehicle_details,
            amount: lastSale.grand_total
          } : null,
          last_repair: lastRepair ? {
            date: lastRepair.completion_date || lastRepair.start_date,
            service: lastRepair.service_type,
            vehicle: `${lastRepair.vehicle_year} ${lastRepair.vehicle_make} ${lastRepair.vehicle_model}`
          } : null,
          days_since_last_sale: daysSinceLastSale,
          days_since_last_repair: daysSinceLastRepair
        };
      });

      const prompt = `Analyze this customer data and suggest personalized follow-up communications:

Customer Data:
${JSON.stringify(customerAnalysis.slice(0, 20), null, 2)}

For each customer needing follow-up, provide:
1. Customer name and contact preference (email/sms)
2. Follow-up type (service_reminder, special_offer, post_repair_checkin, re_engagement, maintenance_due)
3. Priority (high, medium, low)
4. Reasoning
5. Suggested email subject and body
6. Suggested SMS message (under 160 chars)
7. Best time to send

Consider:
- Service intervals (oil change every 3-6 months, major service yearly)
- Post-repair check-ins (within 1 week of completion)
- Re-engagement for customers inactive >90 days
- Upsell opportunities based on purchase history
- Seasonal promotions`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            follow_ups: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  customer_name: { type: "string" },
                  customer_email: { type: "string" },
                  customer_phone: { type: "string" },
                  follow_up_type: { type: "string" },
                  priority: { type: "string" },
                  reasoning: { type: "string" },
                  email_subject: { type: "string" },
                  email_body: { type: "string" },
                  sms_message: { type: "string" },
                  best_send_time: { type: "string" }
                }
              }
            },
            summary: {
              type: "object",
              properties: {
                total_suggestions: { type: "number" },
                high_priority: { type: "number" },
                service_reminders: { type: "number" },
                re_engagement: { type: "number" },
                insights: { type: "string" }
              }
            }
          }
        }
      });

      setSuggestions(response);
      toast.success(`Generated ${response.follow_ups?.length || 0} follow-up suggestions`);
    } catch (error) {
      toast.error("Failed to generate suggestions");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'service_reminder': return <Wrench className="w-4 h-4" />;
      case 'special_offer': return <ShoppingCart className="w-4 h-4" />;
      case 'post_repair_checkin': return <Calendar className="w-4 h-4" />;
      case 'maintenance_due': return <Wrench className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-600 text-white';
      case 'medium': return 'bg-yellow-600 text-white';
      case 'low': return 'bg-green-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const handleSendEmail = (followUp) => {
    onSendEmail({
      to: followUp.customer_email,
      subject: followUp.email_subject,
      body: followUp.email_body
    });
    toast.success("Email composed - switch to Email tab to review and send");
  };

  const handleSendSMS = (followUp) => {
    onSendSMS({
      to: followUp.customer_phone,
      message: followUp.sms_message
    });
    toast.success("SMS composed - switch to SMS tab to review and send");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI Follow-Up Suggestions
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Proactive customer engagement recommendations
              </p>
            </div>
            <Button onClick={analyzeCommunications} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Suggestions
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {!suggestions && (
          <CardContent>
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-2">No suggestions generated yet</p>
              <p className="text-sm text-gray-400">Click "Generate Suggestions" to analyze customer data and get AI recommendations</p>
            </div>
          </CardContent>
        )}
      </Card>

      {suggestions && (
        <>
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Suggestions</p>
                  <p className="text-2xl font-bold text-purple-900">{suggestions.summary?.total_suggestions}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600">High Priority</p>
                  <p className="text-2xl font-bold text-red-900">{suggestions.summary?.high_priority}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Service Reminders</p>
                  <p className="text-2xl font-bold text-blue-900">{suggestions.summary?.service_reminders}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Re-engagement</p>
                  <p className="text-2xl font-bold text-green-900">{suggestions.summary?.re_engagement}</p>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-semibold mb-2">AI Insights</p>
                <p className="text-sm text-gray-700">{suggestions.summary?.insights}</p>
              </div>
            </CardContent>
          </Card>

          {/* Follow-up Suggestions */}
          <div className="space-y-3">
            {suggestions.follow_ups?.map((followUp, idx) => (
              <Card key={idx} className="border-l-4 border-purple-500">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        {getTypeIcon(followUp.follow_up_type)}
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{followUp.customer_name}</p>
                        <p className="text-sm text-gray-500">{followUp.customer_email} • {followUp.customer_phone}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getPriorityColor(followUp.priority)}>
                        {followUp.priority}
                      </Badge>
                      <Badge variant="outline">
                        {followUp.follow_up_type?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>

                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>Why:</strong> {followUp.reasoning}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      <strong>Best time:</strong> {followUp.best_send_time}
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="w-4 h-4 text-blue-600" />
                        <p className="font-semibold text-sm text-blue-900">Email Draft</p>
                      </div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">Subject:</p>
                      <p className="text-sm text-gray-900 mb-2">{followUp.email_subject}</p>
                      <p className="text-xs font-semibold text-gray-700 mb-1">Body:</p>
                      <p className="text-sm text-gray-700 line-clamp-3">{followUp.email_body}</p>
                    </div>

                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-purple-600" />
                        <p className="font-semibold text-sm text-purple-900">SMS Draft</p>
                      </div>
                      <p className="text-sm text-gray-700">{followUp.sms_message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {followUp.sms_message?.length} / 160 characters
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button 
                      onClick={() => handleSendEmail(followUp)} 
                      variant="outline"
                      size="sm"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Use Email Draft
                    </Button>
                    <Button 
                      onClick={() => handleSendSMS(followUp)} 
                      variant="outline"
                      size="sm"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Use SMS Draft
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}