import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { validateExportOrder } from "../export/ExportValidationService";

export default function ComplianceStatusSummary({ companyId }) {
  const { data: exportOrders = [] } = useQuery({
    queryKey: ['exportOrders', companyId],
    queryFn: () => base44.entities.ExportOrder.filter({ company_id: companyId }),
    enabled: !!companyId,
  });

  const complianceData = exportOrders.map(order => {
    const validation = validateExportOrder(order, order.line_items || []);
    return {
      id: order.id,
      orderNumber: order.export_order_number,
      status: order.export_status,
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
      hsValidated: order.hs_codes_validated
    };
  });

  const pendingReview = complianceData.filter(d => d.status === 'compliance_review').length;
  const hasErrors = complianceData.filter(d => !d.isValid).length;
  const hasWarnings = complianceData.filter(d => d.warnings.length > 0).length;
  const fullyCompliant = complianceData.filter(d => d.isValid && d.warnings.length === 0).length;

  const criticalIssues = complianceData.filter(d => !d.isValid);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Compliance Status Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-xs text-gray-600">Pending Review</span>
            </div>
            <div className="text-2xl font-bold text-yellow-600">{pendingReview}</div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-xs text-gray-600">Errors</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{hasErrors}</div>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <span className="text-xs text-gray-600">Warnings</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">{hasWarnings}</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-600">Compliant</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{fullyCompliant}</div>
          </div>
        </div>

        {criticalIssues.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-red-800">Critical Issues</h4>
            {criticalIssues.slice(0, 3).map((issue) => (
              <div key={issue.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-red-900">{issue.orderNumber}</p>
                    <ul className="text-xs text-red-700 mt-1 space-y-1">
                      {issue.errors.slice(0, 2).map((err, idx) => (
                        <li key={idx}>• {err}</li>
                      ))}
                    </ul>
                  </div>
                  <Badge className="bg-red-600 text-white">Action Required</Badge>
                </div>
              </div>
            ))}
            {criticalIssues.length > 3 && (
              <p className="text-xs text-gray-600 text-center">
                +{criticalIssues.length - 3} more orders with issues
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-6 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-600" />
            <p className="font-semibold text-green-800">All Export Orders Compliant</p>
            <p className="text-sm text-green-600">No validation issues detected</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}