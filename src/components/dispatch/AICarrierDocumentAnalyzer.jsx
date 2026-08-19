import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, FileText, Brain, CheckCircle, AlertCircle, Sparkles } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import { updateCarrierCompliance } from "./CarrierComplianceScoring";

export default function AICarrierDocumentAnalyzer({ carrier, onDocumentAdded }) {
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const handleAnalyzeDocument = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setAnalyzing(true);
    try {
      // Upload file
      const { file_url } = await supabase.integrations.Core.UploadFile({ file });

      // Analyze document with AI
      const prompt = `Analyze this carrier compliance document and extract key information:
      
Document Type: Identify what type of document this is (insurance certificate, operating authority, safety rating, license, etc.)
Carrier Name: Extract the carrier/company name
Policy/License Number: Extract any policy numbers, license numbers, or identifying codes
Expiry Date: Extract any expiration dates
Coverage/Limits: Extract any coverage amounts or limits
Key Findings: Summarize the most important information
Compliance Status: Assess if this document appears valid and complete
Recommendations: Suggest any actions needed

Return as JSON with fields: document_type, carrier_name, reference_number, expiry_date, coverage_amount, key_findings, compliance_status, recommendations, confidence_score`;

      const result = await supabase.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            document_type: { type: "string" },
            carrier_name: { type: "string" },
            reference_number: { type: "string" },
            expiry_date: { type: "string" },
            coverage_amount: { type: "string" },
            key_findings: { type: "array", items: { type: "string" } },
            compliance_status: { type: "string" },
            recommendations: { type: "array", items: { type: "string" } },
            confidence_score: { type: "number" }
          }
        }
      });

      setAnalysis({
        ...result,
        file_url,
        file_name: file.name
      });

      toast.success("Document analyzed successfully");
    } catch (error) {
      toast.error("Failed to analyze document");
      console.error(error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveDocument = async () => {
    if (!analysis) return;

    try {
      const newDocument = {
        document_type: analysis.document_type,
        document_name: analysis.file_name,
        document_url: analysis.file_url,
        expiry_date: analysis.expiry_date || null,
        uploaded_at: new Date().toISOString(),
        verified: false,
        ai_analysis: {
          key_findings: analysis.key_findings,
          compliance_status: analysis.compliance_status,
          recommendations: analysis.recommendations,
          confidence_score: analysis.confidence_score,
          analyzed_at: new Date().toISOString()
        }
      };

      const currentDocs = carrier.compliance_documents || [];
      await supabase.entities.ThirdPartyCarrier.update(carrier.id, {
        compliance_documents: [...currentDocs, newDocument]
      });

      onDocumentAdded();
      setAnalysis(null);
      setFile(null);
      
      // Automatically recalculate compliance score
      await updateCarrierCompliance(carrier.id);
      
      toast.success("Document saved with AI analysis - Compliance score updated");
    } catch (error) {
      toast.error("Failed to save document");
      console.error(error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          AI Document Analyzer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Upload Document for AI Analysis</Label>
          <Input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files[0])}
            disabled={analyzing}
          />
          {file && (
            <p className="text-xs text-gray-600 mt-1">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        <Button
          onClick={handleAnalyzeDocument}
          disabled={!file || analyzing}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing with AI...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Analyze Document
            </>
          )}
        </Button>

        {analysis && (
          <div className="space-y-3 p-4 border rounded-lg bg-purple-50">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-purple-900">AI Analysis Results</h4>
              <Badge className="bg-purple-600">
                Confidence: {(analysis.confidence_score * 100).toFixed(0)}%
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <Label className="text-xs text-gray-600">Document Type</Label>
                <p className="font-medium">{analysis.document_type}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Reference Number</Label>
                <p className="font-medium">{analysis.reference_number || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Expiry Date</Label>
                <p className="font-medium">{analysis.expiry_date || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Coverage</Label>
                <p className="font-medium">{analysis.coverage_amount || 'N/A'}</p>
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Key Findings</Label>
              <ul className="text-xs space-y-1">
                {analysis.key_findings?.map((finding, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 text-green-600 mt-0.5" />
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Compliance Status</Label>
              <p className="text-sm font-medium">{analysis.compliance_status}</p>
            </div>

            {analysis.recommendations?.length > 0 && (
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Recommendations</Label>
                <ul className="text-xs space-y-1">
                  {analysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <AlertCircle className="w-3 h-3 text-orange-600 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={handleSaveDocument} className="w-full mt-2">
              <FileText className="w-4 h-4 mr-2" />
              Save Document with AI Analysis
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}