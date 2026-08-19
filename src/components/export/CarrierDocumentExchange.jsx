import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { getCarrierAPIService, isCarrierAPIEnabled } from "./CarrierAPIRegistry";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CarrierDocumentExchange({ order, onDocumentFetched }) {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);

  const apiEnabled = isCarrierAPIEnabled(order.carrier_code);

  const fetchElectronicBL = async () => {
    if (!order.bill_of_lading_number) {
      toast.error("B/L number required");
      return;
    }

    setLoading(true);
    try {
      const apiService = getCarrierAPIService(order.carrier_code);
      const result = await apiService.getElectronicBL(order.bill_of_lading_number);

      if (result.success) {
        // Store document in export order
        const updatedDocuments = [
          ...(order.documents || []),
          {
            type: "electronic_bl",
            name: `e-B/L ${result.document.bl_number}`,
            url: result.document.document_url,
            generated_at: result.document.issued_date,
            source: "carrier_api"
          }
        ];

        await supabase.entities.ExportOrder.update(order.id, {
          documents: updatedDocuments,
          bl_issued: true,
          bl_issued_at: new Date().toISOString()
        });

        setDocuments(updatedDocuments);
        toast.success("Electronic B/L retrieved successfully");
        
        if (onDocumentFetched) {
          onDocumentFetched(result.document);
        }
      } else {
        toast.error(result.error || "Failed to fetch e-B/L");
      }
    } catch (error) {
      toast.error("Failed to retrieve document");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShippingInstructions = async () => {
    setLoading(true);
    try {
      // Simulate fetching shipping instructions
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const doc = {
        type: "shipping_instructions",
        name: `Shipping Instructions - ${order.export_order_number}`,
        url: `https://example.com/docs/si_${order.id}.pdf`,
        generated_at: new Date().toISOString(),
        source: "carrier_api"
      };

      const updatedDocuments = [
        ...(order.documents || []),
        doc
      ];

      await supabase.entities.ExportOrder.update(order.id, {
        documents: updatedDocuments
      });

      setDocuments(updatedDocuments);
      toast.success("Shipping instructions retrieved");
    } catch (error) {
      toast.error("Failed to retrieve shipping instructions");
    } finally {
      setLoading(false);
    }
  };

  if (!apiEnabled) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>Document exchange not available for this carrier</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Carrier Document Exchange
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={fetchElectronicBL}
            disabled={loading || !order.bill_of_lading_number || order.bl_issued}
            variant="outline"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : order.bl_issued ? (
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            Fetch e-B/L
          </Button>

          <Button
            onClick={fetchShippingInstructions}
            disabled={loading}
            variant="outline"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            Get Shipping Instructions
          </Button>
        </div>

        {!order.bill_of_lading_number && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <p className="text-yellow-800">
              B/L number required to fetch electronic Bill of Lading
            </p>
          </div>
        )}

        {/* Document List */}
        {(documents.length > 0 || order.documents?.length > 0) && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Retrieved Documents</h4>
            {(documents.length > 0 ? documents : order.documents).map((doc, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="font-medium text-sm">{doc.name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{doc.type.replace(/_/g, ' ')}</span>
                      {doc.generated_at && (
                        <>
                          <span>•</span>
                          <span>{format(new Date(doc.generated_at), 'MMM d, yyyy')}</span>
                        </>
                      )}
                      {doc.source === 'carrier_api' && (
                        <Badge variant="outline" className="text-green-600 text-xs">
                          From Carrier
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(doc.url, '_blank')}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}