import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Download, Sparkles, Check, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { 
  generateCommercialInvoice, 
  generateBillOfLading, 
  generateCertificateOfOrigin,
  generatePackingList,
  getAISuggestions
} from "./DocumentTemplateEngine";

export default function EnhancedDocumentGenerator({ order, sale, company }) {
  const [generating, setGenerating] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState({});
  const [generatedDocs, setGeneratedDocs] = useState({});
  const [previewDoc, setPreviewDoc] = useState(null);

  const documentTypes = [
    { type: "commercial_invoice", label: "Commercial Invoice", icon: FileText },
    { type: "bill_of_lading", label: "Bill of Lading", icon: FileText },
    { type: "certificate_of_origin", label: "Certificate of Origin", icon: FileText },
    { type: "packing_list", label: "Packing List", icon: FileText }
  ];

  const getAIFieldSuggestions = async (docType) => {
    setLoadingAI(true);
    try {
      const suggestions = await getAISuggestions(order, company, docType);
      setAiSuggestions(prev => ({ ...prev, [docType]: suggestions }));
      toast.success("AI suggestions loaded");
    } catch (error) {
      toast.error("Failed to get AI suggestions");
    } finally {
      setLoadingAI(false);
    }
  };

  const generateDocument = async (docType) => {
    setGenerating(true);
    try {
      let docData;
      const suggestions = aiSuggestions[docType] || {};

      switch (docType) {
        case "commercial_invoice":
          docData = await generateCommercialInvoice(order, sale, company, suggestions);
          break;
        case "bill_of_lading":
          docData = await generateBillOfLading(order, company, suggestions);
          break;
        case "certificate_of_origin":
          docData = await generateCertificateOfOrigin(order, company, suggestions);
          break;
        case "packing_list":
          docData = await generatePackingList(order, company);
          break;
        default:
          throw new Error("Unknown document type");
      }

      // Store generated document
      setGeneratedDocs(prev => ({ ...prev, [docType]: docData }));

      // Save to export order documents array
      const updatedDocs = [
        ...(order.documents || []),
        {
          type: docType,
          name: docData.documentType.replace(/_/g, ' ').toUpperCase(),
          data: docData,
          generated_at: new Date().toISOString()
        }
      ];

      await base44.entities.ExportOrder.update(order.id, {
        documents: updatedDocs
      });

      toast.success(`${docData.documentType.replace(/_/g, ' ')} generated successfully`);
    } catch (error) {
      toast.error("Failed to generate document: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const downloadDocument = (docType) => {
    const doc = generatedDocs[docType];
    if (!doc) return;

    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.documentNumber || docType}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Export Document Generator
        </CardTitle>
        <p className="text-sm text-gray-600">
          Auto-populate documents with ISO codes, HS classifications, and AI compliance suggestions
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="commercial_invoice">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="commercial_invoice">Invoice</TabsTrigger>
            <TabsTrigger value="bill_of_lading">B/L</TabsTrigger>
            <TabsTrigger value="certificate_of_origin">COO</TabsTrigger>
            <TabsTrigger value="packing_list">Packing</TabsTrigger>
          </TabsList>

          {documentTypes.map(({ type, label }) => (
            <TabsContent key={type} value={type} className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div>
                  <h4 className="font-semibold">{label}</h4>
                  <p className="text-sm text-gray-600">
                    {generatedDocs[type] ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        Generated: {generatedDocs[type].documentNumber}
                      </span>
                    ) : (
                      "Not generated yet"
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => getAIFieldSuggestions(type)}
                    disabled={loadingAI}
                  >
                    {loadingAI ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    AI Suggest
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => generateDocument(type)}
                    disabled={generating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {generating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4 mr-2" />
                    )}
                    Generate
                  </Button>
                  {generatedDocs[type] && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewDoc(generatedDocs[type])}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadDocument(type)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {aiSuggestions[type] && (
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-5 h-5 text-purple-600 mt-1" />
                      <div className="flex-1">
                        <h5 className="font-semibold text-purple-900 mb-2">AI Suggestions</h5>
                        <div className="space-y-2 text-sm">
                          {aiSuggestions[type].paymentTerms && (
                            <div>
                              <Label className="text-purple-800">Payment Terms:</Label>
                              <p className="text-purple-700">{aiSuggestions[type].paymentTerms}</p>
                            </div>
                          )}
                          {aiSuggestions[type].declaration && (
                            <div>
                              <Label className="text-purple-800">Declaration:</Label>
                              <p className="text-purple-700">{aiSuggestions[type].declaration}</p>
                            </div>
                          )}
                          {aiSuggestions[type].complianceNotes?.length > 0 && (
                            <div>
                              <Label className="text-purple-800">Compliance Notes:</Label>
                              <ul className="list-disc list-inside text-purple-700">
                                {aiSuggestions[type].complianceNotes.map((note, idx) => (
                                  <li key={idx}>{note}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {generatedDocs[type] && (
                <div className="space-y-2">
                  <Label>Document Preview (JSON)</Label>
                  <Textarea
                    value={JSON.stringify(generatedDocs[type], null, 2)}
                    readOnly
                    rows={15}
                    className="font-mono text-xs"
                  />
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <div className="pt-4 border-t space-y-2">
          <h5 className="font-semibold text-sm">Auto-Population Features</h5>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Badge variant="outline" className="justify-start">
              <Check className="w-3 h-3 mr-1 text-green-600" />
              ISO Country Codes
            </Badge>
            <Badge variant="outline" className="justify-start">
              <Check className="w-3 h-3 mr-1 text-green-600" />
              HS Code Integration
            </Badge>
            <Badge variant="outline" className="justify-start">
              <Check className="w-3 h-3 mr-1 text-green-600" />
              Currency Standards
            </Badge>
            <Badge variant="outline" className="justify-start">
              <Check className="w-3 h-3 mr-1 text-green-600" />
              Port UN/LOCODE
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}