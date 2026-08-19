import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";

const formatCurrency = (amount, currency = "CAD") => {
  const symbols = { CAD: "CA$", USD: "$", NGN: "₦" };
  return `${symbols[currency] || "$"}${(amount || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function AIDocumentSummary({ 
  documentType, // paystub, invoice, bill_of_sale, loading_declaration
  documentData,
  company,
  compact = false,
  autoGenerate = false
}) {
  const [summary, setSummary] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(!compact);
  const [copied, setCopied] = useState(false);

  const getDocumentContext = () => {
    switch (documentType) {
      case 'paystub':
        return {
          type: "Pay Statement",
          data: `
Employee: ${documentData?.employee_name || 'N/A'}
Employee #: ${documentData?.employee_number || 'N/A'}
Pay Period: ${documentData?.pay_period_start || 'N/A'} to ${documentData?.pay_period_end || 'N/A'}
Pay Date: ${documentData?.pay_date || 'N/A'}
Regular Hours: ${documentData?.regular_hours || 0}
Overtime Hours: ${documentData?.overtime_hours || 0}
Gross Pay: $${documentData?.gross_pay || 0}
CPP Deduction: $${documentData?.cpp_employee || 0}
EI Deduction: $${documentData?.ei_employee || 0}
Federal Tax: $${documentData?.federal_tax || 0}
Provincial Tax: $${documentData?.provincial_tax || 0}
Total Deductions: $${documentData?.total_deductions || 0}
Net Pay: $${documentData?.net_pay || 0}
YTD Gross: $${documentData?.ytd_gross || 0}
          `
        };
      
      case 'invoice':
        return {
          type: "Invoice",
          data: `
Invoice #: ${documentData?.invoice_number || 'N/A'}
Customer: ${documentData?.customer_name || 'N/A'}
Customer Email: ${documentData?.customer_email || 'N/A'}
Invoice Date: ${documentData?.invoice_date || 'N/A'}
Due Date: ${documentData?.due_date || 'N/A'}
Currency: ${documentData?.currency || 'CAD'}
Line Items: ${documentData?.line_items?.map(i => `${i.description}: ${i.quantity} x $${i.unit_price || i.rate}`).join(', ') || 'None'}
Subtotal: $${documentData?.subtotal || 0}
Tax Rate: ${documentData?.tax_rate || 0}%
Tax Amount: $${documentData?.tax_amount || 0}
Total Amount: $${documentData?.total_amount || 0}
Amount Paid: $${documentData?.amount_paid || 0}
Balance Due: $${documentData?.balance_due || 0}
Payment Status: ${documentData?.payment_status || 'pending'}
          `
        };
      
      case 'bill_of_sale':
        return {
          type: "Bill of Sale",
          data: `
Sale #: ${documentData?.sale_number || 'N/A'}
Sale Type: ${documentData?.sale_type || 'domestic'}
Customer: ${documentData?.customer_name || 'N/A'}
Customer Phone: ${documentData?.customer_phone || 'N/A'}
Customer Address: ${documentData?.customer_address || 'N/A'}
Sale Date: ${documentData?.sale_date || 'N/A'}
Vehicle: ${documentData?.vehicle_details || 'N/A'}
VIN: ${documentData?.vehicle_vin || 'N/A'}
Year: ${documentData?.vehicle_year || 'N/A'}
Mileage: ${documentData?.vehicle_mileage || 'N/A'}
Color: ${documentData?.vehicle_color || 'N/A'}
Sale Price: $${documentData?.sale_price || 0}
GST: $${documentData?.tax_gst || 0}
PST: $${documentData?.tax_pst || 0}
HST: $${documentData?.tax_hst || 0}
Grand Total: $${documentData?.grand_total || 0}
Deposit: $${documentData?.deposit_amount || 0}
Balance Due: $${documentData?.balance_due || 0}
Trade-In Value: $${documentData?.trade_in?.net_trade_value || 0}
          `
        };
      
      case 'loading_declaration':
        return {
          type: "Loading Declaration",
          data: `
Booking #: ${documentData?.booking_number || 'N/A'}
Container #: ${documentData?.container_number || 'N/A'}
Seal #: ${documentData?.seal_number || 'N/A'}
Exporter: ${documentData?.exporter?.name || 'N/A'}
Exporter Address: ${documentData?.exporter?.address_postal || 'N/A'}, ${documentData?.exporter?.city_province || 'N/A'}
Consignee: ${documentData?.consignee?.name || 'N/A'}
Consignee Country: ${documentData?.consignee?.city_country || 'N/A'}
Commodity: ${documentData?.commodity || 'N/A'}
Total Weight: ${documentData?.weight || 0} kg
Total Value: $${documentData?.value || 0}
Vehicles: ${documentData?.vehicles?.length || 0} units
Vehicle Details: ${documentData?.vehicles?.map(v => `${v.year} ${v.make_model} (VIN: ${v.vin})`).join('; ') || 'None'}
          `
        };
      
      default:
        return { type: "Document", data: JSON.stringify(documentData, null, 2) };
    }
  };

  const generateSummary = async () => {
    setGenerating(true);
    try {
      const context = getDocumentContext();
      
      const response = await supabase.integrations.Core.InvokeLLM({
        prompt: `Analyze this ${context.type} document and provide a concise executive summary with key highlights. Include the most important financial figures, dates, and identifiers. Format as bullet points.

Company: ${company?.name || 'Company'}
Document Type: ${context.type}

Document Data:
${context.data}

Provide:
1. A one-line summary (max 15 words)
2. 3-5 key highlights as bullet points
3. Any notable observations or flags (e.g., large amounts, overdue, export sale)`,
        response_json_schema: {
          type: "object",
          properties: {
            one_liner: { type: "string", description: "One sentence summary" },
            highlights: { 
              type: "array", 
              items: { type: "string" },
              description: "Key bullet points"
            },
            flags: {
              type: "array",
              items: { type: "string" },
              description: "Notable observations or warnings"
            },
            key_figures: {
              type: "object",
              properties: {
                primary_amount: { type: "number" },
                primary_label: { type: "string" },
                secondary_amount: { type: "number" },
                secondary_label: { type: "string" }
              }
            }
          }
        }
      });

      setSummary(response);
      setExpanded(true);
    } catch (error) {
      console.error("AI Summary error:", error);
      toast.error("Failed to generate summary");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!summary) return;
    const text = `${summary.one_liner}\n\nKey Highlights:\n${summary.highlights?.map(h => `• ${h}`).join('\n')}\n\n${summary.flags?.length ? `Notes:\n${summary.flags.map(f => `⚠️ ${f}`).join('\n')}` : ''}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Summary copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Auto-generate on mount if requested
  React.useEffect(() => {
    if (autoGenerate && documentData && !summary) {
      generateSummary();
    }
  }, [autoGenerate, documentData]);

  if (!documentData) return null;

  return (
    <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="font-semibold text-purple-800 text-sm">AI Document Summary</span>
          </div>
          <div className="flex items-center gap-2">
            {summary && (
              <>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2">
                  {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setExpanded(!expanded)}
                  className="h-7 px-2"
                >
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </>
            )}
            {!summary && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={generateSummary}
                disabled={generating}
                className="h-7 text-xs border-purple-300 text-purple-700 hover:bg-purple-100"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 mr-1" />
                    Generate Summary
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {summary && expanded && (
          <div className="space-y-3 mt-3">
            {/* One-liner */}
            <p className="text-sm font-medium text-gray-800 bg-white/60 p-2 rounded-lg">
              {summary.one_liner}
            </p>

            {/* Key Figures */}
            {summary.key_figures && (
              <div className="flex gap-4">
                {summary.key_figures.primary_label && (
                  <div className="bg-white/80 rounded-lg p-2 flex-1">
                    <p className="text-xs text-gray-500">{summary.key_figures.primary_label}</p>
                    <p className="text-lg font-bold text-purple-700">
                      {typeof summary.key_figures.primary_amount === 'number' 
                        ? formatCurrency(summary.key_figures.primary_amount, documentData?.currency)
                        : summary.key_figures.primary_amount}
                    </p>
                  </div>
                )}
                {summary.key_figures.secondary_label && (
                  <div className="bg-white/80 rounded-lg p-2 flex-1">
                    <p className="text-xs text-gray-500">{summary.key_figures.secondary_label}</p>
                    <p className="text-lg font-bold text-indigo-700">
                      {typeof summary.key_figures.secondary_amount === 'number' 
                        ? formatCurrency(summary.key_figures.secondary_amount, documentData?.currency)
                        : summary.key_figures.secondary_amount}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Highlights */}
            {summary.highlights?.length > 0 && (
              <ul className="space-y-1">
                {summary.highlights.map((highlight, idx) => (
                  <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">•</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Flags/Warnings */}
            {summary.flags?.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-purple-200">
                {summary.flags.map((flag, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
                    ⚠️ {flag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {summary && !expanded && (
          <p className="text-xs text-gray-600 truncate">{summary.one_liner}</p>
        )}
      </CardContent>
    </Card>
  );
}