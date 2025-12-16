import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, CheckCircle, Shield, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AIComplianceChecker({ order, onIssuesDetected }) {
  const [checking, setChecking] = useState(false);
  const [complianceResults, setComplianceResults] = useState(null);

  const runComplianceCheck = async () => {
    if (!order) return;
    
    setChecking(true);
    try {
      const prompt = `You are an international trade compliance expert. Analyze this export order for potential compliance issues:

Export Order Details:
- HS Code: ${order.hs_code || 'Not provided'}
- Country of Origin: ${order.country_of_origin || 'Not provided'}
- Destination Country: ${order.destination_country}
- Export Type: ${order.export_type}
- Customs Value: ${order.currency} ${order.customs_value}
- Incoterms: ${order.incoterms || 'Not specified'}
- Export Declaration Required: ${order.export_declaration_required ? 'Yes' : 'No'}
- Items: ${JSON.stringify(order.items || [])}

Analyze for:
1. HS Code validity and accuracy for the product type
2. Country of origin compliance and documentation requirements
3. Destination country import regulations and restrictions
4. Required export licenses or permits
5. Sanctions or embargo concerns
6. Documentation completeness

Provide a structured compliance assessment with risk level (low/medium/high) and specific actionable recommendations.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_risk: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Overall compliance risk level"
            },
            passed: {
              type: "boolean",
              description: "Whether the order passes compliance check"
            },
            issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  severity: { type: "string", enum: ["warning", "error", "info"] },
                  description: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            recommendations: {
              type: "array",
              items: { type: "string" }
            },
            required_documents: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setComplianceResults(result);
      if (onIssuesDetected) {
        onIssuesDetected(result);
      }
      
      if (result.passed) {
        toast.success("✅ Compliance check passed!");
      } else {
        toast.warning("⚠️ Compliance issues detected");
      }
    } catch (error) {
      toast.error("Compliance check failed: " + error.message);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (order && !complianceResults) {
      runComplianceCheck();
    }
  }, [order]);

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'info': return <CheckCircle className="w-4 h-4 text-blue-600" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  if (!order) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Compliance Analysis
          </CardTitle>
          <Button 
            onClick={runComplianceCheck} 
            disabled={checking}
            variant="outline"
            size="sm"
          >
            {checking ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Re-check
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {checking && !complianceResults && (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Running compliance checks...
          </div>
        )}

        {complianceResults && (
          <>
            {/* Overall Status */}
            <div className="flex items-center gap-3">
              <Badge className={`${getRiskColor(complianceResults.overall_risk)} border px-3 py-1`}>
                {complianceResults.overall_risk?.toUpperCase()} RISK
              </Badge>
              {complianceResults.passed ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Compliant</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Issues Detected</span>
                </div>
              )}
            </div>

            {/* Issues */}
            {complianceResults.issues && complianceResults.issues.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Detected Issues:</h4>
                {complianceResults.issues.map((issue, idx) => (
                  <Alert key={idx} className={`border-l-4 ${
                    issue.severity === 'error' ? 'border-red-500 bg-red-50' :
                    issue.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  }`}>
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(issue.severity)}
                      <div className="flex-1 space-y-1">
                        <AlertDescription>
                          <p className="font-medium text-sm">{issue.category}</p>
                          <p className="text-sm text-gray-700">{issue.description}</p>
                          {issue.recommendation && (
                            <p className="text-sm text-blue-600 mt-1">
                              💡 {issue.recommendation}
                            </p>
                          )}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {complianceResults.recommendations && complianceResults.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Recommendations:</h4>
                <ul className="space-y-1 text-sm">
                  {complianceResults.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Required Documents */}
            {complianceResults.required_documents && complianceResults.required_documents.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Required Documents:</h4>
                <div className="flex flex-wrap gap-2">
                  {complianceResults.required_documents.map((doc, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {doc}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}