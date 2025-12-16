import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, Sparkles, Download } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function DocumentAnalyzer() {
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setAnalysis(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setAnalyzing(true);
    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Analyze document
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this shipping/logistics document and provide a comprehensive summary. Extract and organize key information including:
- Document type and purpose
- Shipment details (tracking numbers, container numbers, B/L numbers)
- Parties involved (shipper, consignee, carrier)
- Cargo details (description, weight, volume, quantity)
- Route information (origin, destination, ports)
- Dates (shipping date, ETA, ETD)
- Financial information (charges, fees, amounts)
- Special conditions or notes
- Compliance requirements

Format the response in clear sections with bullet points.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            document_type: { type: "string" },
            summary: { type: "string" },
            key_details: {
              type: "object",
              properties: {
                tracking_numbers: { type: "array", items: { type: "string" } },
                parties: { type: "object" },
                cargo: { type: "object" },
                route: { type: "object" },
                dates: { type: "object" },
                financial: { type: "object" }
              }
            },
            important_notes: { type: "array", items: { type: "string" } },
            compliance_flags: { type: "array", items: { type: "string" } }
          }
        }
      });

      setAnalysis(result);
      toast.success("Document analyzed successfully");
    } catch (error) {
      toast.error("Failed to analyze document");
      console.error(error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Document Analyzer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
          <input
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            className="hidden"
            id="doc-upload"
          />
          <label htmlFor="doc-upload" className="cursor-pointer">
            <Upload className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600">
              {file ? file.name : "Click to upload shipping document"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              PDF, PNG, JPG, DOC, DOCX
            </p>
          </label>
        </div>

        {file && (
          <Button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Document...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze with AI
              </>
            )}
          </Button>
        )}

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-lg">Analysis Results</h3>
            </div>

            {/* Document Type */}
            <div>
              <Badge className="bg-blue-100 text-blue-800">
                {analysis.document_type}
              </Badge>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Summary</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {analysis.summary}
              </p>
            </div>

            {/* Key Details */}
            {analysis.key_details && (
              <div className="space-y-3">
                {analysis.key_details.tracking_numbers?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Tracking Numbers</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.key_details.tracking_numbers.map((num, idx) => (
                        <Badge key={idx} variant="outline">{num}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.key_details.parties && (
                  <div className="bg-blue-50 p-3 rounded">
                    <h4 className="font-semibold text-sm mb-2">Parties</h4>
                    <div className="text-sm space-y-1">
                      {Object.entries(analysis.key_details.parties).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-gray-600">{key}:</span>{" "}
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.key_details.cargo && (
                  <div className="bg-green-50 p-3 rounded">
                    <h4 className="font-semibold text-sm mb-2">Cargo Details</h4>
                    <div className="text-sm space-y-1">
                      {Object.entries(analysis.key_details.cargo).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-gray-600">{key}:</span>{" "}
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.key_details.route && (
                  <div className="bg-purple-50 p-3 rounded">
                    <h4 className="font-semibold text-sm mb-2">Route</h4>
                    <div className="text-sm space-y-1">
                      {Object.entries(analysis.key_details.route).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-gray-600">{key}:</span>{" "}
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.key_details.financial && (
                  <div className="bg-yellow-50 p-3 rounded">
                    <h4 className="font-semibold text-sm mb-2">Financial</h4>
                    <div className="text-sm space-y-1">
                      {Object.entries(analysis.key_details.financial).map(([key, value]) => (
                        <div key={key}>
                          <span className="text-gray-600">{key}:</span>{" "}
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Important Notes */}
            {analysis.important_notes?.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 p-3 rounded">
                <h4 className="font-semibold text-sm mb-2 text-orange-900">
                  Important Notes
                </h4>
                <ul className="text-sm space-y-1 text-orange-800">
                  {analysis.important_notes.map((note, idx) => (
                    <li key={idx}>• {note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Compliance Flags */}
            {analysis.compliance_flags?.length > 0 && (
              <div className="bg-red-50 border border-red-200 p-3 rounded">
                <h4 className="font-semibold text-sm mb-2 text-red-900">
                  Compliance Alerts
                </h4>
                <ul className="text-sm space-y-1 text-red-800">
                  {analysis.compliance_flags.map((flag, idx) => (
                    <li key={idx}>⚠️ {flag}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}