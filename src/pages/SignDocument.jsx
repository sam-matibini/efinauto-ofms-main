import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import BillOfSale from "@/components/sales/BillOfSale";
import SignaturePad from "@/components/shared/SignaturePad";

export default function SignDocument() {
  const [saleId, setSaleId] = useState(null);
  const [signerType, setSignerType] = useState(null);
  const [token, setToken] = useState(null);
  const [signatureData, setSignatureData] = useState(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [signed, setSigned] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pathParts = window.location.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    
    setSaleId(id);
    setToken(urlParams.get('token'));
    setSignerType(urlParams.get('type') || 'buyer');
  }, []);

  const { data: sale, isLoading, error } = useQuery({
    queryKey: ['sale', saleId],
    queryFn: async () => {
      const sales = await base44.entities.Sale.filter({ id: saleId });
      return sales[0];
    },
    enabled: !!saleId,
  });

  const { data: company } = useQuery({
    queryKey: ['company', sale?.company_id],
    queryFn: async () => {
      const companies = await base44.entities.Company.filter({ id: sale.company_id });
      return companies[0];
    },
    enabled: !!sale?.company_id,
  });

  const updateSignatureMutation = useMutation({
    mutationFn: async (signatureUrl) => {
      const timestamp = new Date().toISOString();
      const signerName = signerType === 'buyer' ? sale.customer_name : (sale.salesman || company?.contact_person_name || 'Seller');
      const signerEmail = signerType === 'buyer' ? sale.customer_email : company?.contact_person_email;
      
      const updateData = {
        [`${signerType}_signature_url`]: signatureUrl,
        [`${signerType}_name`]: signerName,
        [`${signerType}_signed_at`]: timestamp,
        [`${signerType}_email`]: signerEmail,
        signature_method: 'electronic_capture'
      };

      return await base44.entities.Sale.update(saleId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
      setSigned(true);
      toast.success("✅ Document signed successfully!");
    },
    onError: (error) => {
      toast.error("Failed to save signature: " + error.message);
    }
  });

  const handleSaveSignature = async (dataUrl) => {
    if (!dataUrl) return;
    
    setUploading(true);
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `signature_${signerType}_${Date.now()}.png`, { type: 'image/png' });
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await updateSignatureMutation.mutateAsync(file_url);
      setShowSignaturePad(false);
    } catch (error) {
      toast.error("Failed to upload signature");
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Document Not Found</h2>
            <p className="text-gray-600">
              The signature request link may be invalid or expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Document Signed!</h2>
            <p className="text-gray-600 mb-4">
              Thank you for signing the Bill of Sale. You will receive a copy via email shortly.
            </p>
            <p className="text-sm text-gray-500">
              You can now close this window.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const alreadySigned = signerType === 'buyer' ? !!sale.buyer_signature_url : !!sale.seller_signature_url;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Signature Request - Bill of Sale
            </CardTitle>
          </CardHeader>
          <CardContent>
            {company?.logo_url && (
              <div className="flex justify-center mb-4">
                <img src={company.logo_url} alt={company.name} className="h-16 object-contain" />
              </div>
            )}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>{company?.name || "The dealership"}</strong> has requested your signature on this Bill of Sale.
              </p>
              <p className="text-sm text-blue-600 mt-2">
                Please review the document below and sign at the bottom.
              </p>
            </div>

            {alreadySigned && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  This document has already been signed.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="p-0">
            {company && <BillOfSale sale={sale} company={company} existingSignatures={sale} onSignaturesUpdate={() => {}} />}
          </CardContent>
        </Card>

        {!alreadySigned && (
          <Card>
            <CardHeader>
              <CardTitle>Your Signature Required</CardTitle>
            </CardHeader>
            <CardContent>
              {showSignaturePad ? (
                <div className="space-y-4">
                  <SignaturePad
                    label=""
                    onSave={handleSaveSignature}
                    onClear={() => setShowSignaturePad(false)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowSignaturePad(false)} disabled={uploading}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-600 mb-4">
                    By clicking below, you agree to sign this Bill of Sale electronically.
                  </p>
                  <Button
                    onClick={() => setShowSignaturePad(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    Sign Document
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}