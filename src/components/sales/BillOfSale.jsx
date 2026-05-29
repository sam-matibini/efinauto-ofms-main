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

// Compliance-safe data normalizer
const normalizeSaleData = (sale) => {
  if (!sale) return null;
  
  return {
    id: sale.id || null,
    company_id: sale.company_id || null,
    customer_name: sale.customer_name || '',
    customer_address: sale.customer_address || '',
    customer_city: sale.customer_city || '',
    customer_postal_code: sale.customer_postal_code || '',
    customer_phone: sale.customer_phone || '',
    customer_business_phone: sale.customer_business_phone || '',
    customer_email: sale.customer_email || '',
    province: sale.province || '',
    salesman: sale.salesman || '',
    vehicle_details: sale.vehicle_details || '',
    vehicle_year: sale.vehicle_year || '',
    vehicle_make_model: sale.vehicle_make_model || '',
    vehicle_vin: sale.vehicle_vin || '',
    vehicle_color: sale.vehicle_color || '',
    vehicle_mileage: sale.vehicle_mileage || 0,
    sale_price: typeof sale.sale_price === 'number' ? sale.sale_price : 0,
    grand_total: typeof sale.grand_total === 'number' ? sale.grand_total : (typeof sale.sale_price === 'number' ? sale.sale_price : 0),
    balance_due: typeof sale.balance_due === 'number' ? sale.balance_due : 0,
    tax_gst: typeof sale.tax_gst === 'number' ? sale.tax_gst : 0,
    tax_pst: typeof sale.tax_pst === 'number' ? sale.tax_pst : 0,
    tax_hst: typeof sale.tax_hst === 'number' ? sale.tax_hst : 0,
    tax_total: typeof sale.tax_total === 'number' ? sale.tax_total : 0,
    deposit_amount: typeof sale.deposit_amount === 'number' ? sale.deposit_amount : 0,
    sale_date: sale.sale_date || null,
    sale_type: sale.sale_type || 'domestic',
    bos_number: sale.bos_number || '',
    bos_status: sale.bos_status || 'draft',
    bos_issued_date: sale.bos_issued_date || null,
    bos_issued_by: sale.bos_issued_by || '',
    pst_exempt: sale.pst_exempt || false,
    pst_exempt_reason: sale.pst_exempt_reason || '',
    pst_exempt_reference: sale.pst_exempt_reference || '',
    trade_in: sale.trade_in || { net_trade_value: 0 }
  };
};

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
    if (!sale || !dataUrl || !sale.id || !sale.company_id || uploadingSignature) {
      if (uploadingSignature) return; // Prevent concurrent uploads
      toast.error("Invalid sale data");
      return;
    }

    setUploadingSignature(type);
    try {
      // Store signature as base64 data URL directly (no file upload needed)
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
        setBuyerSignature(dataUrl);
        setSignatureMetadata(prev => ({ ...prev, buyer: metadata }));
      } else {
        setSellerSignature(dataUrl);
        setSignatureMetadata(prev => ({ ...prev, seller: metadata }));
      }
      
      // Notify parent of signature update (store base64 data URL)
      onSignaturesUpdate?.({
        [`${type}_signature_url`]: dataUrl,
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
    if (!sale || !company) {
      toast.error("Missing required data");
      return;
    }
    
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

  // Normalize data with compliance-safe defaults
  const safeSale = normalizeSaleData(sale);
  
  // Validate critical requirements
  if (!safeSale || !safeSale.id || !safeSale.company_id) {
    return <div className="p-8 text-center text-red-600">Invalid sale record.</div>;
  }
  
  if (!safeSale.customer_name || !safeSale.vehicle_details) {
    return <div className="p-8 text-center text-red-600">Missing required fields: customer name and vehicle details.</div>;
  }
  
  if (!company || !company.name) {
    return <div className="p-8 text-center text-red-600">Missing company information.</div>;
  }

  const isExport = safeSale.sale_type === 'export';

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
          @page {
            size: letter;
            margin: 0.5in;
          }

          body * {
            visibility: hidden;
          }

          #bill-of-sale, #bill-of-sale * {
            visibility: visible;
          }

          #bill-of-sale {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
          }

          .print\\:hidden,
          button,
          .audit-trail-section,
          .completion-certificate-section { 
            display: none !important; 
          }
          
          #bill-of-sale,
          #bill-of-sale *,
          #bill-of-sale *::before,
          #bill-of-sale *::after { 
            print-color-adjust: exact !important; 
            -webkit-print-color-adjust: exact !important; 
            color-adjust: exact !important;
          }
          
          .bos-number-container { 
            display: inline-block !important; 
            visibility: visible !important;
            opacity: 1 !important;
            page-break-inside: avoid !important;
            border: 2px solid #000 !important;
            background: #f9fafb !important;
            padding: 12px !important;
          }
          
          .bos-number-container * {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            color: #000 !important;
          }
          
          .bos-number-container p {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .barcode-container {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            margin-top: 8px !important;
            width: 100% !important;
            overflow: visible !important;
          }
          
          .barcode-container svg,
          .barcode-container canvas,
          .barcode-container img {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            width: 100% !important;
            max-width: 250px !important;
            height: auto !important;
            margin: 0 auto !important;
          }
          
          .barcode-container text {
            fill: #000 !important;
            color: #000 !important;
            font-size: 10px !important;
            font-family: monospace !important;
          }
          
          .barcode-container rect {
            fill: #000 !important;
          }
          
          .border-green-200 {
            border-color: #000 !important;
          }
          
          .bg-green-50 {
            background: #f9fafb !important;
          }
          
          .bg-blue-100,
          .bg-green-100,
          .bg-red-100,
          .bg-amber-100 {
            background: #e5e7eb !important;
            border: 1px solid #000 !important;
          }
          
          .border-gray-800,
          .border-b,
          .border-2 {
            border-color: #000 !important;
          }
          
          .border-r {
            border-right: 1px solid #000 !important;
          }
          
          .text-gray-900,
          .text-gray-800,
          .text-gray-700,
          .text-gray-600 {
            color: #000 !important;
          }
          
          .font-mono {
            font-family: 'Courier New', monospace !important;
          }
        }
      `}</style>
      
      {company?.logo_url && (
        <div className="flex justify-center mb-4">
          <img src={company.logo_url} alt={company?.name || 'Company'} className="h-24 object-contain" />
        </div>
      )}

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

      <div className="flex justify-between items-start mb-8">
        <div className="flex-1">
          {safeSale?.bos_number && safeSale.bos_status === 'finalized' && safeSale.bos_number.length > 0 && (
            <div className="border-2 border-gray-800 p-3 inline-block bg-gray-50 bos-number-container">
              <p className="text-xs font-semibold text-gray-600 mb-1">BOS NUMBER</p>
              <p className="text-lg font-bold text-gray-900 font-mono tracking-wider">{safeSale.bos_number}</p>
              {typeof window !== 'undefined' && safeSale.bos_number && safeSale.bos_number.length > 0 && safeSale.bos_status === 'finalized' && (
                <div className="mt-2 barcode-container">
                  {(() => {
                    try {
                      const cleanBosNumber = String(safeSale.bos_number).replace(/[^A-Z0-9-]/gi, '').substring(0, 30);
                      if (cleanBosNumber.length < 5) return null;
                      return (
                        <Barcode 
                          value={cleanBosNumber} 
                          height={50}
                          width={1.5}
                          fontSize={10}
                          margin={0}
                          background="transparent"
                          displayValue={true}
                          textMargin={2}
                        />
                      );
                    } catch (e) {
                      return null;
                    }
                  })()}
                </div>
              )}
              {safeSale.bos_issued_date && (() => { try { return (
                <p className="text-xs text-gray-500 mt-1">
                  Issued: {format(new Date(safeSale.bos_issued_date), 'MMM d, yyyy')}
                </p>
              ); } catch(e) { return null; } })()}
              {safeSale.bos_issued_by && (
                <p className="text-xs text-gray-500">
                  By: {safeSale.bos_issued_by}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="text-center flex-1">
          <h1 className="text-2xl font-bold">BILL OF SALE</h1>
          {safeSale?.bos_status && (
            <div className="mt-2 flex justify-center gap-2">
              {safeSale.bos_status === 'voided' ? (
                <span className="inline-block px-3 py-1 rounded text-sm font-semibold bg-red-100 text-red-800">
                  ⚠ VOIDED
                </span>
              ) : safeSale.bos_status === 'finalized' ? (
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
            <span className="ml-2">{safeSale.customer_name || ''}</span>
          </div>
          <div className="border-b border-gray-800 pb-1">
            <span className="text-sm font-semibold">Salesman:</span>
            <span className="ml-2">{safeSale.salesman || ''}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="border-b border-gray-800 pb-1">
            <span className="text-sm font-semibold">Purchaser's Address:</span>
            <span className="ml-2">{safeSale.customer_address || ''}</span>
          </div>
          <div className="border-b border-gray-800 pb-1">
            <span className="text-sm font-semibold">Date:</span>
            <span className="ml-2">{safeSale.sale_date ? (() => { try { return format(new Date(safeSale.sale_date), 'MMM d, yyyy'); } catch(e) { return ''; } })() : ''}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="border-b border-gray-800 pb-1">
            <span className="text-sm font-semibold">City:</span>
            <span className="ml-2">{safeSale.customer_city || ''}</span>
          </div>
          <div className="border-b border-gray-800 pb-1">
            <span className="text-sm font-semibold">Province:</span>
            <span className="ml-2">{safeSale.province || ''}</span>
          </div>
          <div className="border-b border-gray-800 pb-1">
            <span className="text-sm font-semibold">Postal Code:</span>
            <span className="ml-2">{safeSale.customer_postal_code || ''}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="border-b border-gray-800 pb-1">
            <span className="text-sm font-semibold">Residential Phone:</span>
            <span className="ml-2">{safeSale.customer_phone || ''}</span>
          </div>
          <div className="border-b border-gray-800 pb-1">
            <span className="text-sm font-semibold">Business Phone:</span>
            <span className="ml-2">{safeSale.customer_business_phone || ''}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="border-b border-gray-800 pb-1">
            <span className="text-sm font-semibold">Email Address:</span>
            <span className="ml-2">{safeSale.customer_email || ''}</span>
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
          <div className="col-span-2 p-2 border-r border-gray-800">{safeSale.vehicle_details || ''}</div>
          <div className="p-2 border-r border-gray-800">{safeSale.vehicle_year || ''}</div>
          <div className="col-span-3 p-2">{safeSale.vehicle_make_model || ''}</div>
        </div>
        <div className="grid grid-cols-6">
          <div className="col-span-2 p-2 border-r border-gray-800 font-semibold text-sm">Odometer</div>
          <div className="p-2 border-r border-gray-800 font-semibold text-sm">Colour</div>
          <div className="col-span-3 p-2 font-semibold text-sm">
            VIN: {safeSale.vehicle_vin && typeof safeSale.vehicle_vin === 'string' ? safeSale.vehicle_vin.split('').join(' ') : ''}
          </div>
        </div>
        <div className="grid grid-cols-6">
          <div className="col-span-2 p-2 border-r border-gray-800">{safeSale.vehicle_mileage || ''}</div>
          <div className="p-2 border-r border-gray-800">{safeSale.vehicle_color || ''}</div>
          <div className="col-span-3 p-2"></div>
        </div>
      </div>

      <div className="border-2 border-gray-800 mb-6">
        <div className="grid grid-cols-2">
          <div className="p-3 border-b border-gray-800">
            <div className="flex justify-between">
              <span className="font-semibold">Total Price</span>
              <span>${safeSale.sale_price.toLocaleString()}</span>
            </div>
          </div>
          <div className="p-3 border-b border-gray-800 border-l border-gray-800"></div>
        </div>
        
        <div className="grid grid-cols-2">
          <div className="p-3 border-b border-gray-800">
            <div className="flex justify-between">
              <span className="font-semibold">Less Trade</span>
              <span>${safeSale.trade_in?.net_trade_value?.toLocaleString() || '0'}</span>
            </div>
          </div>
          <div className="p-3 border-b border-gray-800 border-l border-gray-800"></div>
        </div>

        <div className="grid grid-cols-2">
          <div className="p-3 border-b border-gray-800">
            <div className="flex justify-between items-center">
              <span className="font-semibold">
                P.S.T
                {safeSale.pst_exempt && (
                  <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300">EXEMPT</span>
                )}
              </span>
              <span>${safeSale.tax_pst.toFixed(2)}</span>
            </div>
            {safeSale.pst_exempt && safeSale.pst_exempt_reason && (
              <div className="text-xs text-gray-600 mt-1 pt-1 border-t border-gray-200">
                Reason: {safeSale.pst_exempt_reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                {safeSale.pst_exempt_reference && <span className="block">Ref: {safeSale.pst_exempt_reference}</span>}
              </div>
            )}
          </div>
          <div className="p-3 border-b border-gray-800 border-l border-gray-800"></div>
        </div>

        <div className="grid grid-cols-2">
          <div className="p-3 border-b border-gray-800">
            <div className="flex justify-between">
              <span className="font-semibold">G.S.T / H.S.T</span>
              <span>${(safeSale.tax_gst || safeSale.tax_hst).toFixed(2)}</span>
            </div>
          </div>
          <div className="p-3 border-b border-gray-800 border-l border-gray-800"></div>
        </div>

        <div className="grid grid-cols-2">
          <div className="p-3 border-b border-gray-800">
            <div className="flex justify-between">
              <span className="font-semibold">Total</span>
              <span>${safeSale.grand_total.toLocaleString()}</span>
            </div>
          </div>
          <div className="p-3 border-b border-gray-800 border-l border-gray-800"></div>
        </div>

        <div className="grid grid-cols-2">
          <div className="p-3 border-b border-gray-800">
            <div className="flex justify-between">
              <span className="font-semibold">Less Deposit</span>
              <span>${safeSale.deposit_amount.toLocaleString()}</span>
            </div>
          </div>
          <div className="p-3 border-b border-gray-800 border-l border-gray-800"></div>
        </div>

        <div className="grid grid-cols-2">
          <div className="p-3">
            <div className="flex justify-between">
              <span className="font-semibold">Balance Due</span>
              <span>${safeSale.balance_due.toLocaleString()}</span>
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
        <div>
          <p className="font-semibold mb-2">Purchaser's Signature:</p>
          {buyerSignature ? (
            <div className="border-2 border-green-200 bg-green-50 rounded-lg p-3 relative">
              {typeof buyerSignature === 'string' && buyerSignature.startsWith('http') ? (
                <img src={buyerSignature} alt="Buyer Signature" className="h-12 object-contain mx-auto" />
              ) : (
                <div className="text-center">
                  <p className="font-signature text-2xl italic text-gray-800" style={{ fontFamily: 'cursive' }}>
                    {sale.customer_name || 'Buyer'}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-600" />
                  Signed by {signatureMetadata.buyer?.name || sale.customer_name || 'Buyer'}
                </span>
                <span>{signatureMetadata.buyer?.signedAt ? (() => { try { return format(new Date(signatureMetadata.buyer.signedAt), 'MMM d, yyyy h:mm a'); } catch(e) { return ''; } })() : ''}</span>
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

        <div>
          <p className="font-semibold mb-2">Salesman/Seller Signature:</p>
          {sellerSignature ? (
            <div className="border-2 border-green-200 bg-green-50 rounded-lg p-3 relative">
              {typeof sellerSignature === 'string' && sellerSignature.startsWith('http') ? (
                <img src={sellerSignature} alt="Seller Signature" className="h-12 object-contain mx-auto" />
              ) : sellerSignature?.textBased ? (
                <div className="text-center">
                  <p className="font-signature text-2xl italic text-gray-800" style={{ fontFamily: 'cursive' }}>
                    {sellerSignature.name || 'Seller'}
                  </p>
                </div>
              ) : typeof sellerSignature === 'object' && sellerSignature !== null ? (
                <svg viewBox="0 0 200 60" className="w-full h-12">
                  <path 
                    d={sellerSignature?.pathData || "M10,30 Q30,10 50,30 T90,30 Q110,50 130,30 T170,30"} 
                    fill="none" 
                    stroke="#1e3a8a" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                  />
                </svg>
              ) : null}
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-600" />
                  {signatureMetadata.seller?.method === 'ai_generated' ? 'AI Signed' : 'Signed'} by {signatureMetadata.seller?.name}
                </span>
                <span>{signatureMetadata.seller?.signedAt ? (() => { try { return format(new Date(signatureMetadata.seller.signedAt), 'MMM d, yyyy h:mm a'); } catch(e) { return ''; } })() : ''}</span>
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

      <div className="audit-trail-section">
        <EnhancedAuditTrail auditData={signatureMetadata} />
      </div>

      <div className="completion-certificate-section">
        <CompletionCertificate 
          sale={sale}
          company={company}
          signatureMetadata={signatureMetadata}
        />
      </div>

      <SignatureRequestDialog 
        open={showSignatureRequestDialog}
        onClose={() => setShowSignatureRequestDialog(false)}
        sale={sale}
        company={company}
      />
    </div>
  );
}