import React, { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function BillOfSale({ sale, company }) {
  const [generatingSignature, setGeneratingSignature] = useState(false);
  const [sellerSignature, setSellerSignature] = useState(null);

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
      
      setSellerSignature({
        name: sellerName,
        pathData: result.path_data,
        timestamp: new Date().toISOString()
      });
      toast.success("Digital signature generated!");
    } catch (error) {
      // Fallback to text-based signature
      setSellerSignature({
        name: sellerName,
        textBased: true,
        timestamp: new Date().toISOString()
      });
      toast.success("Signature applied!");
    }
    setGeneratingSignature(false);
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
        <div></div>
        <div className="text-center flex-1">
          <h1 className="text-2xl font-bold">BILL OF SALE</h1>
          <div className="mt-2 flex justify-center gap-2">
            <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${isExport ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
              {isExport ? '☑ EXPORT SALE' : '☑ DOMESTIC SALE'}
            </span>
          </div>
          {isExport && (
            <p className="text-sm mt-1 text-green-700 font-medium">Zero-Rated (GST/HST Exempt)</p>
          )}
        </div>
        <div></div>
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
            <div className="flex justify-between">
              <span className="font-semibold">P.S.T</span>
              <span>${sale.tax_pst?.toFixed(2) || '0.00'}</span>
            </div>
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
        <div>
          <p className="font-semibold mb-4">Purchaser's Signature:</p>
          <div className="border-b border-gray-800 h-12"></div>
        </div>
        <div>
          <p className="font-semibold mb-2">Salesman/Seller Signature:</p>
          {sellerSignature ? (
            <div className="border-2 border-green-200 bg-green-50 rounded-lg p-3 relative">
              {sellerSignature.textBased ? (
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
                  Digitally Signed
                </span>
                <span>{format(new Date(sellerSignature.timestamp), 'MMM d, yyyy h:mm a')}</span>
              </div>
            </div>
          ) : (
            <div className="border-b border-gray-800 h-12 flex items-end justify-center pb-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={generateAISignature}
                disabled={generatingSignature}
                className="text-blue-600 border-blue-300 hover:bg-blue-50 print:hidden"
              >
                {generatingSignature ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Sign
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}