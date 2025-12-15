import React, { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Check, Pen, X, Mail, Shield } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import Barcode from "react-barcode";
import SignaturePad from "@/components/shared/SignaturePad";
import SignatureRequestDialog from "./SignatureRequestDialog";
import EnhancedAuditTrail from "./EnhancedAuditTrail";
import CompletionCertificate from "./CompletionCertificate";

export default function BillOfSale({ sale, company, existingSignatures, onSignaturesUpdate }) {
  const [generatingSignature, setGeneratingSignature] = useState(false);
  const [sellerSignature, setSellerSignature] = useState(existingSignatures?.seller_signature_url || null);
  const [buyerSignature, setBuyerSignature] = useState(existingSignatures?.buyer_signature_url || null);
  const [showBuyerSignaturePad, setShowBuyerSignaturePad] = useState(false);
  const [showSellerSignaturePad, setShowSellerSignaturePad] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(null);
  const [showSignatureRequestDialog, setShowSignatureRequestDialog] = useState(false);
  const [signatureMetadata, setSignatureMetadata] = useState({
    buyer: existingSignatures?.buyer_signed_at ? {
      name: existingSignatures.buyer_name,
      signedAt: existingSignatures.buyer_signed_at,
      method: existingSignatures.signature_method,
      email: existingSignatures.buyer_email,
      ipAddress: existingSignatures.buyer_ip_address,
      userAgent: existingSignatures.buyer_user_agent,
      geolocation: existingSignatures.buyer_geolocation
    } : null,
    seller: existingSignatures?.seller_signed_at ? {
      name: existingSignatures.seller_name,
      signedAt: existingSignatures.seller_signed_at,
      method: existingSignatures.signature_method,
      email: existingSignatures.seller_email,
      ipAddress: existingSignatures.seller_ip_address,
      userAgent: existingSignatures.seller_user_agent,
      geolocation: existingSignatures.seller_geolocation
    } : null
  });

  // Load existing signatures on mount
  useEffect(() => {
    if (existingSignatures) {
      if (existingSignatures.buyer_signature_url) setBuyerSignature(existingSignatures.buyer_signature_url);
      if (existingSignatures.seller_signature_url) setSellerSignature(existingSignatures.seller_signature_url);
    }
  }, [existingSignatures]);

  const uploadSignatureImage = async (dataUrl, type) => {
    setUploadingSignature(type);
    try {
      // Convert base64 to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `signature_${type}_${Date.now()}.png`, { type: 'image/png' });
      
      // Upload to cloud
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const timestamp = new Date().toISOString();
      const signerName = type === 'buyer' ? sale.customer_name : (sale.salesman || company?.contact_person_name || 'Seller');
      const signerEmail = type === 'buyer' ? sale.customer_email : company?.contact_person_email;
      
      // Collect enhanced audit data
      const ipAddress = await fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => d.ip).catch(() => null);
      const userAgent = navigator.userAgent;
      
      const metadata = {
        name: signerName,
        signedAt: timestamp,
        method: 'electronic_capture',
        email: signerEmail,
        ipAddress,
        userAgent
      };
      
      if (type === 'buyer') {
        setBuyerSignature(file_url);
        setSignatureMetadata(prev => ({ ...prev, buyer: metadata }));
      } else {
        setSellerSignature(file_url);
        setSignatureMetadata(prev => ({ ...prev, seller: metadata }));
      }
      
      // Notify parent of signature update
      onSignaturesUpdate?.({
        [`${type}_signature_url`]: file_url,
        [`${type}_name`]: signerName,
        [`${type}_signed_at`]: timestamp,
        [`${type}_email`]: signerEmail,
        [`${type}_ip_address`]: ipAddress,
        [`${type}_user_agent`]: userAgent,
        signature_method: 'electronic_capture'
      });
      
      toast.success(`${type === 'buyer' ? 'Buyer' : 'Seller'} signature saved!`);
      
      if (type === 'buyer') setShowBuyerSignaturePad(false);
      else setShowSellerSignaturePad(false);
      
    } catch (error) {
      console.error("Signature upload error:", error);
      toast.error("Failed to save signature");
    } finally {
      setUploadingSignature(null);
    }
  };

  const generateAISignature = async () => {
    const sellerName = sale.salesman || company?.contact_person_name || company?.name || 'Seller';
    setGeneratingSignature(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a stylized digital signature representation for "${sellerName}". 
        Return ONLY an SVG path data string (the 'd' attribute value) that looks like a handwritten signature.
        The signature should be elegant, flowing cursive style.
        Keep the path within viewBox coordinates 0-200 width and 0-60 height.
        Return ONLY the path data, nothing else.`,
        response_json_schema: {
          type: "object",
          properties: {
            path_data: { type: "string", description: "SVG path data for the signature" },
            signature_text: { type: "string", description: "The name being signed" }
          }
        }
      });
      
      // Create SVG signature as data URL
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="200" height="60">
        <path d="${result.path_data || 'M10,30 Q30,10 50,30 T90,30 Q110,50 130,30 T170,30'}" fill="none" stroke="#1e3a8a" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
      const svgDataUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;
      
      // Upload the AI signature
      await uploadSignatureImage(svgDataUrl, 'seller');
      
      setSignatureMetadata(prev => ({
        ...prev,
        seller: { name: sellerName, signedAt: new Date().toISOString(), method: 'ai_generated' }
      }));
      
      toast.success("AI signature generated and saved!");
    } catch (error) {
      // Fallback to text-based signature
      const timestamp = new Date().toISOString();
      setSellerSignature({ textBased: true, name: sellerName });
      setSignatureMetadata(prev => ({
        ...prev,
        seller: { name: sellerName, signedAt: timestamp, method: 'ai_generated' }
      }));
      toast.success("Signature applied!");
    }
    setGeneratingSignature(false);
  };

  const clearSignature = (type) => {
    if (type === 'buyer') {
      setBuyerSignature(null);
      setSignatureMetadata(prev => ({ ...prev, buyer: null }));
    } else {
      setSellerSignature(null);
      setSignatureMetadata(prev => ({ ...prev, seller: null }));
    }
    onSignaturesUpdate?.({ [`${type}_signature_url`]: null });
  };

  if (!sale) return null;

  const isExport = sale.sale_type === 'export';

  // Build full address
  const companyAddress = [
    company?.address,
    company?.city,
    company?.province,
    company?.postal_code,
    company?.country
  ].filter(Boolean).join(', ');

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto" id="bill-of-sale">
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          #bill-of-sale { max-width: 100% !important; }
          #bill-of-sale * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>
      {/* Company Logo - Top Center */}
      {company?.logo_url && (
        <div className="flex justify-center mb-4">
          <img src={company.logo_url} alt={company.name} className="h-24 object-contain" />
        </div>
      )}

      {/* Company Header */}
      <div className="text-center mb-6 border-b pb-4">
        <h2 className="text-xl font-bold text-gray-900">{company?.name || 'Company Name'}</h2>
        {companyAddress && (
          <p className="text-sm text-gray-600 mt-1">{companyAddress}</p>
        )}
        <div className="flex justify-center gap-6 mt-2 text-sm text-gray-600">
          {company?.phone && <span>Tel: {company.phone}</span>}
          {company?.email && <span>Email: {company.email}</span>}
        </div>
        <div className="flex justify-center gap-6 mt-1 text-sm text-gray-700 font-medium">
          {company?.gst_number && <span>GST #: {company.gst_number}</span>}
          {company?.pst_number && <span>PST #: {company.pst_number}</span>}
          {company?.dealer_permit_number && <span>Dealer Permit #: {company.dealer_permit_number}</span>}
        </div>
      </div>

      {/* Bill of Sale Title */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex-1">
          {sale.bos_number && (
            <div className="border-2 border-gray-800 p-3 inline-block bg-gray-50">
              <p className="text-xs font-semibold text-gray-600 mb-1">BOS NUMBER</p>
              <p className="text-lg font-bold text-gray-900 font-mono tracking-wider">{sale.bos_number}</p>
              <div className="mt-2">
                <Barcode 
                  value={sale.bos_number} 
                  height={40}
                  width={1.5}
                  fontSize={10}
                  margin={0}
                  background="#f9fafb"
                />
              </div>
              {sale.bos_issued_date && (
                <p className="text-xs text-gray-500 mt-1">
                  Issued: {format(new Date(sale.bos_issued_date), 'MMM d, yyyy')}
                </p>
              )}
              {sale.bos_issued_by && (
                <p className="text-xs text-gray-500">
                  By: {sale.bos_issued_by}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="text-center flex-1">
          <h1 className="text-2xl font-bold">BILL OF SALE</h1>
          {sale.bos_status && (
            <div className="mt-2 flex justify-center gap-2">
              {sale.bos_status === 'voided' ? (
                <span className="inline-block px-3 py-1 rounded text-sm font-semibold bg-red-100 text-red-800">
                  ⚠ VOIDED
                </span>
              ) : sale.bos_status === 'finalized' ? (
                <span className="inline-block px-3 py-1 rounded text-sm font-semibold bg-green-100 text-green-800">
                  ✓ FINALIZED
                </span>
              ) : (
                <span className="inline-block px-3 py-1 rounded text-sm font-semibold bg-gray-100 text-gray-800">
                  DRAFT
                </span>
              )}
            </div>
          )}
          <div className="mt-2 flex justify-center gap-2">
            <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${isExport ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
              {isExport ? '☑ EXPORT SALE' : '☑ DOMESTIC SALE'}
            </span>
          </div>
          {isExport && (
            <p className="text-sm mt-1 text-green-700 font-medium">Zero-Rated (GST/HST Exempt)</p>
          )}
        </div>
        <div className="flex-1"></div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="border-b border-gray-800 pb-1">
            <span className="text-sm font-semibold">Purchaser's Name:</span>
            <span className="ml-2">{sale.customer_name}</span>
          </div>
          <div className="border-b border-gray-800 pb-1">
            <span className="text-sm font-semibold">Salesman:</span>
            <span className="ml-2">{sale.salesman || ''}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="border-b border-gray-800 pb-1">
            <span className="text-sm font-semibold">Purchaser's Address:</span>
            <span className="ml-2">{sale.customer_address || ''}</span>
          </div>
          <div className="border-b border-gray-800 pb-1">
            <span className="text-sm font-semibold">Date:</span>
            <span className="ml-2">{sale.sale_date ? format(new Date(sale.sale_date), 'MMM d, yyyy') : ''}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="border-b border-gray-800 pb-1">
            <span className="text-sm font-semibold">City:</span>
            <span className="ml-2">{sale.customer_city || ''}</span>
          </div>
          <div className="border-b border-gray-800 pb-1">
            <span className="text-sm font-semibold">Province:</span>
            <span className="ml-2">{sale.province || ''}</span>
          </div>
          <div className="border-b border-gray-800 pb-1">
            <span className="text-sm font-semibold">Postal Code:</span>
            <span className="ml-2">{sale.customer_postal_code || ''}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="border-b border-gray-800 pb-1">
            <span className="text-sm font-semibold">Residential Phone:</span>
            <span className="ml-2">{sale.customer_phone || ''}</span>
          </div>
          <div className="border-b border-gray-800 pb-1">
            <span className="text-sm font-semibold">Business Phone:</span>
            <span className="ml-2">{sale.customer_business_phone || ''}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="border-b border-gray-800 pb-1">
            <span className="text-sm font-semibold">Email Address:</span>
            <span className="ml-2">{sale.customer_email || ''}</span>
          </div>
        </div>
      </div>

      <div className="border-2 border-gray-800 mb-6">
        <div className="grid grid-cols-6 border-b border-gray-800">
          <div className="col-span-2 p-2 border-r border-gray-800 font-semibold text-sm">Vehicle Purchased</div>
          <div className="p-2 border-r border-gray-800 font-semibold text-sm">Year</div>
          <div className="col-span-3 p-2 font-semibold text-sm">Make & Model</div>
        </div>
        <div className="grid grid-cols-6 border-b border-gray-800">
          <div className="col-span-2 p-2 border-r border-gray-800">{sale.vehicle_details}</div>
          <div className="p-2 border-r border-gray-800">{sale.vehicle_year || ''}</div>
          <div className="col-span-3 p-2">{sale.vehicle_make_model || ''}</div>
        </div>
        <div className="grid grid-cols-6">
          <div className="col-span-2 p-2 border-r border-gray-800 font-semibold text-sm">Odometer</div>
          <div className="p-2 border-r border-gray-800 font-semibold text-sm">Colour</div>
          <div className="col-span-3 p-2 font-semibold text-sm">
            VIN: {sale.vehicle_vin ? sale.vehicle_vin.split('').join(' ') : ''}
          </div>
        </div>
        <div className="grid grid-cols-6">
          <div className="col-span-2 p-2 border-r border-gray-800">{sale.vehicle_mileage || ''}</div>
          <div className="p-2 border-r border-gray-800">{sale.vehicle_color || ''}</div>
          <div className="col-span-3 p-2"></div>
        </div>
      </div>

      <div className="border-2 border-gray-800 mb-6">
        <div className="grid grid-cols-2">
          <div className="p-3 border-b border-gray-800">
            <div className="flex justify-between">
              <span className="font-semibold">Total Price</span>
              <span>${sale.sale_price?.toLocaleString()}</span>
            </div>
          </div>
          <div className="p-3 border-b border-gray-800 border-l border-gray-800"></div>
        </div>
        
        <div className="grid grid-cols-2">
          <div className="p-3 border-b border-gray-800">
            <div className="flex justify-between">
              <span className="font-semibold">Less Trade</span>
              <span>${sale.trade_in?.net_trade_value?.toLocaleString() || '0'}</span>
            </div>
          </div>
          <div className="p-3 border-b border-gray-800 border-l border-gray-800"></div>
        </div>

        <div className="grid grid-cols-2">
          <div className="p-3 border-b border-gray-800">
            <div className="flex justify-between items-center">
              <span className="font-semibold">
                P.S.T
                {sale.pst_exempt && (
                  <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300">EXEMPT</span>
                )}
              </span>
              <span>${sale.tax_pst?.toFixed(2) || '0.00'}</span>
            </div>
            {sale.pst_exempt && sale.pst_exempt_reason && (
              <div className="text-xs text-gray-600 mt-1 pt-1 border-t border-gray-200">
                Reason: {sale.pst_exempt_reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                {sale.pst_exempt_reference && <span className="block">Ref: {sale.pst_exempt_reference}</span>}
              </div>
            )}
          </div>
          <div className="p-3 border-b border-gray-800 border-l border-gray-800"></div>
        </div>

        <div className="grid grid-cols-2">
          <div className="p-3 border-b border-gray-800">
            <div className="flex justify-between">
              <span className="font-semibold">G.S.T / H.S.T</span>
              <span>${(sale.tax_gst || sale.tax_hst)?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
          <div className="p-3 border-b border-gray-800 border-l border-gray-800"></div>
        </div>

        <div className="grid grid-cols-2">
          <div className="p-3 border-b border-gray-800">
            <div className="flex justify-between">
              <span className="font-semibold">Total</span>
              <span>${sale.grand_total?.toLocaleString()}</span>
            </div>
          </div>
          <div className="p-3 border-b border-gray-800 border-l border-gray-800"></div>
        </div>

        <div className="grid grid-cols-2">
          <div className="p-3 border-b border-gray-800">
            <div className="flex justify-between">
              <span className="font-semibold">Less Deposit</span>
              <span>${sale.deposit_amount?.toLocaleString() || '0'}</span>
            </div>
          </div>
          <div className="p-3 border-b border-gray-800 border-l border-gray-800"></div>
        </div>

        <div className="grid grid-cols-2">
          <div className="p-3">
            <div className="flex justify-between">
              <span className="font-semibold">Balance Due</span>
              <span>${sale.balance_due?.toLocaleString()}</span>
            </div>
          </div>
          <div className="p-3 border-l border-gray-800"></div>
        </div>

        <div className="p-3 border-t border-gray-800 text-center text-xs font-bold">
          ALL VEHICLES ARE SOLD WITHOUT ANY WARRANTIES OR GUARANTEES UNLESS STIPULATED IN WRITING
        </div>

        <div className="grid grid-cols-2 border-t border-gray-800">
          <div className="p-3">
            <span className="text-sm font-semibold">Customer Initials:</span>
            <span className="ml-2 border-b border-gray-400 inline-block w-20"></span>
          </div>
          <div className="p-3 border-l border-gray-800"></div>
        </div>
      </div>

      <div className="text-xs mb-6 leading-relaxed">
        The purchaser understands and agrees that the provisions listed above are hereby incorporated and
        constitute part of this offer and acknowledges that this offer will not be considered as binding until
        signed by the Purchaser and accepted in writing by the Management
      </div>

      <div className="grid grid-cols-2 gap-8 mt-12">
        {/* Buyer Signature */}
        <div>
          <p className="font-semibold mb-2">Purchaser's Signature:</p>
          {buyerSignature ? (
            <div className="border-2 border-green-200 bg-green-50 rounded-lg p-3 relative">
              {typeof buyerSignature === 'string' && buyerSignature.startsWith('http') ? (
                <img src={buyerSignature} alt="Buyer Signature" className="h-12 object-contain mx-auto" />
              ) : (
                <div className="text-center">
                  <p className="font-signature text-2xl italic text-gray-800" style={{ fontFamily: 'cursive' }}>
                    {sale.customer_name}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-600" />
                  Signed by {signatureMetadata.buyer?.name || sale.customer_name}
                </span>
                <span>{signatureMetadata.buyer?.signedAt ? format(new Date(signatureMetadata.buyer.signedAt), 'MMM d, yyyy h:mm a') : ''}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearSignature('buyer')}
                className="absolute top-1 right-1 h-6 w-6 p-0 print:hidden"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : showBuyerSignaturePad ? (
            <div className="print:hidden">
              <SignaturePad
                label=""
                onSave={(dataUrl) => uploadSignatureImage(dataUrl, 'buyer')}
                onClear={() => setShowBuyerSignaturePad(false)}
              />
              <div className="flex justify-end mt-2">
                <Button variant="ghost" size="sm" onClick={() => setShowBuyerSignaturePad(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
           <div className="border-2 border-dashed border-gray-300 rounded-lg h-20 flex items-center justify-center gap-2 print:border-solid print:border-gray-800">
             <Button 
               variant="outline" 
               size="sm" 
               onClick={() => setShowBuyerSignaturePad(true)}
               disabled={uploadingSignature === 'buyer'}
               className="print:hidden"
             >
               {uploadingSignature === 'buyer' ? (
                 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
               ) : (
                 <Pen className="w-4 h-4 mr-2" />
               )}
               Sign Here
             </Button>
             <Button 
               variant="outline" 
               size="sm" 
               onClick={() => setShowSignatureRequestDialog(true)}
               className="print:hidden text-blue-600 border-blue-300 hover:bg-blue-50"
             >
               <Mail className="w-4 h-4 mr-2" />
               Email Request
             </Button>
           </div>
          )}
        </div>

        {/* Seller Signature */}
        <div>
          <p className="font-semibold mb-2">Salesman/Seller Signature:</p>
          {sellerSignature ? (
            <div className="border-2 border-green-200 bg-green-50 rounded-lg p-3 relative">
              {typeof sellerSignature === 'string' && sellerSignature.startsWith('http') ? (
                <img src={sellerSignature} alt="Seller Signature" className="h-12 object-contain mx-auto" />
              ) : sellerSignature.textBased ? (
                <div className="text-center">
                  <p className="font-signature text-2xl italic text-gray-800" style={{ fontFamily: 'cursive' }}>
                    {sellerSignature.name}
                  </p>
                </div>
              ) : (
                <svg viewBox="0 0 200 60" className="w-full h-12">
                  <path 
                    d={sellerSignature.pathData || "M10,30 Q30,10 50,30 T90,30 Q110,50 130,30 T170,30"} 
                    fill="none" 
                    stroke="#1e3a8a" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                  />
                </svg>
              )}
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-600" />
                  {signatureMetadata.seller?.method === 'ai_generated' ? 'AI Signed' : 'Signed'} by {signatureMetadata.seller?.name}
                </span>
                <span>{signatureMetadata.seller?.signedAt ? format(new Date(signatureMetadata.seller.signedAt), 'MMM d, yyyy h:mm a') : ''}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearSignature('seller')}
                className="absolute top-1 right-1 h-6 w-6 p-0 print:hidden"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : showSellerSignaturePad ? (
            <div className="print:hidden">
              <SignaturePad
                label=""
                onSave={(dataUrl) => uploadSignatureImage(dataUrl, 'seller')}
                onClear={() => setShowSellerSignaturePad(false)}
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="ghost" size="sm" onClick={() => setShowSellerSignaturePad(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg h-20 flex items-center justify-center gap-2 print:border-solid print:border-gray-800">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowSellerSignaturePad(true)}
                disabled={uploadingSignature === 'seller' || generatingSignature}
                className="print:hidden"
              >
                <Pen className="w-4 h-4 mr-2" />
                Sign
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={generateAISignature}
                disabled={generatingSignature || uploadingSignature === 'seller'}
                className="text-purple-600 border-purple-300 hover:bg-purple-50 print:hidden"
              >
                {generatingSignature ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                AI Sign
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Audit Trail */}
      <EnhancedAuditTrail auditData={signatureMetadata} />

      {/* Completion Certificate */}
      <CompletionCertificate 
        sale={sale}
        company={company}
        signatureMetadata={signatureMetadata}
      />

      {/* Signature Request Dialog */}
      <SignatureRequestDialog 
        open={showSignatureRequestDialog}
        onClose={() => setShowSignatureRequestDialog(false)}
        sale={sale}
        company={company}
      />
    </div>
  );
}