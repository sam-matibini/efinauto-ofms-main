import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Target, Users, Mail, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CustomerSegmentation({ companyId, customers }) {
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [generatingSegments, setGeneratingSegments] = useState(false);
  const queryClient = useQueryClient();

  // Calculate segments
  const segments = {
    vip: customers.filter(c => (c.lifetime_value || 0) > 50000),
    active: customers.filter(c => {
      if (!c.last_purchase_date) return false;
      const daysSince = (new Date() - new Date(c.last_purchase_date)) / (1000 * 60 * 60 * 24);
      return daysSince <= 180;
    }),
    at_risk: customers.filter(c => {
      if (!c.last_purchase_date) return false;
      const daysSince = (new Date() - new Date(c.last_purchase_date)) / (1000 * 60 * 60 * 24);
      return daysSince > 180 && daysSince <= 365;
    }),
    inactive: customers.filter(c => {
      if (!c.last_purchase_date) return true;
      const daysSince = (new Date() - new Date(c.last_purchase_date)) / (1000 * 60 * 60 * 24);
      return daysSince > 365;
    }),
    new: customers.filter(c => {
      const daysSince = (new Date() - new Date(c.created_date)) / (1000 * 60 * 60 * 24);
      return daysSince <= 30;
    })
  };

  const generateCampaign = async (segment, segmentName) => {
    setGeneratingSegments(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a targeted marketing campaign for ${segmentName} customers in our automotive dealership.
        
Segment: ${segmentName} (${segment.length} customers)
Segment characteristics: ${
  segmentName === 'vip' ? 'High lifetime value customers (>$50k)' :
  segmentName === 'active' ? 'Recent purchasers (last 6 months)' :
  segmentName === 'at_risk' ? 'Customers who haven\'t purchased in 6-12 months' :
  segmentName === 'inactive' ? 'Customers inactive for over a year' :
  'New customers (last 30 days)'
}

Generate:
1. Campaign subject line
2. Email message (personalized, professional, automotive-focused)
3. Call-to-action
4. Recommended offer/incentive
5. Best time to send

Make it compelling and relevant to the segment.`,
        response_json_schema: {
          type: "object",
          properties: {
            subject: { type: "string" },
            message: { type: "string" },
            call_to_action: { type: "string" },
            recommended_offer: { type: "string" },
            best_time: { type: "string" }
          }
        }
      });

      setSelectedSegment({ name: segmentName, customers: segment, campaign: result });
      toast.success("Campaign generated!");
    } catch (error) {
      toast.error("Failed to generate campaign");
    } finally {
      setGeneratingSegments(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold">Customer Segmentation</h3>
          <p className="text-sm text-gray-600">Target customers with personalized campaigns</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {Object.entries(segments).map(([key, segment]) => (
          <Card key={key} className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => generateCampaign(segment, key)}>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{segment.length}</div>
              <div className="text-sm text-gray-600 capitalize mt-1">{key.replace(/_/g, ' ')}</div>
              <Button variant="outline" size="sm" className="mt-3 w-full" disabled={generatingSegments}>
                {generatingSegments ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedSegment && (
        <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              {selectedSegment.name.toUpperCase()} Campaign
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Subject Line:</p>
              <p className="text-base font-medium">{selectedSegment.campaign.subject}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Message:</p>
              <p className="text-sm whitespace-pre-wrap bg-white p-3 rounded border">{selectedSegment.campaign.message}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Call to Action:</p>
                <p className="text-sm">{selectedSegment.campaign.call_to_action}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Recommended Offer:</p>
                <p className="text-sm">{selectedSegment.campaign.recommended_offer}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Best Time to Send:</p>
              <p className="text-sm">{selectedSegment.campaign.best_time}</p>
            </div>
            <div className="flex gap-2 pt-4 border-t">
              <Button className="flex-1 bg-purple-600 hover:bg-purple-700">
                <Mail className="w-4 h-4 mr-2" />
                Send to {selectedSegment.customers.length} Customers
              </Button>
              <Button variant="outline" onClick={() => setSelectedSegment(null)}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}