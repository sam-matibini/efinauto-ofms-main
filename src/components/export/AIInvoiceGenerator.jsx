import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, FileText, CheckCircle } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function AIInvoiceGenerator({ order, sale, company, onInvoiceCreated }) {
  const [generating, setGenerating] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState(null);
  const queryClient = useQueryClient();

  const generateInvoice = async () => {
    if (!order || !company) {
      toast.error("Missing required data");
      return;
    }

    setGenerating(true);
    try {
      // Prepare comprehensive data for AI analysis
      const lineItems = order.line_items || order.items || [];
      const itemsData = lineItems.map(item => ({
        type: item.item_type,
        description: item.description,
        hs_code: item.hs_code,
        quantity: item.quantity,
        unit_value: item.unit_value,
        total_value: item.total_value,
        weight: item.weight,
        vin: item.vin,
        make: item.make,
        model: item.model,
        year: item.year
      }));

      const prompt = `You are a professional international trade accountant. Generate a detailed invoice for this export order.

EXPORT ORDER DATA:
- Order #: ${order.export_order_number}
- Destination: ${order.destination_country}
- Consignee: ${order.consignee_name}
- Incoterms: ${order.incoterms || 'N/A'}
- Export Type: ${order.export_type}

COMPANY DATA:
- Company: ${company.name}
- GST #: ${company.gst_number || 'N/A'}
- Address: ${company.address}, ${company.city}, ${company.province}

LINE ITEMS:
${JSON.stringify(itemsData, null, 2)}

COSTS:
- Subtotal: ${order.total_value || 0}
- Freight: ${order.freight_cost || 0}
- Insurance: ${order.insurance_cost || 0}
- Handling: ${order.handling_fees || 0}
- Customs: ${order.customs_fees || 0}
- Currency: ${order.currency || 'USD'}

TAX RULES:
- Export sales are typically zero-rated (0% GST/HST) in Canada
- No PST on export sales
- Include GST collected on freight services if applicable
- Clearly mark zero-rated items

Generate a professional invoice with:
1. Invoice number (format: INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(6, '0')})
2. Invoice date (today)
3. Due date (30 days from today)
4. Line items with descriptions, quantities, unit prices, and totals
5. Subtotals for goods, freight, and other charges
6. Tax breakdown (zero-rated export goods, taxable services)
7. Grand total
8. Payment terms and instructions

Be precise with calculations and comply with Canadian export tax regulations.`;

      const aiResponse = await supabase.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            invoice_number: { type: "string" },
            invoice_date: { type: "string", format: "date" },
            due_date: { type: "string", format: "date" },
            line_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  quantity: { type: "number" },
                  unit_price: { type: "number" },
                  total: { type: "number" },
                  tax_status: { type: "string" }
                }
              }
            },
            subtotal_goods: { type: "number" },
            freight_charges: { type: "number" },
            insurance_charges: { type: "number" },
            handling_charges: { type: "number" },
            subtotal_before_tax: { type: "number" },
            tax_gst: { type: "number" },
            tax_pst: { type: "number" },
            tax_hst: { type: "number" },
            tax_total: { type: "number" },
            grand_total: { type: "number" },
            payment_terms: { type: "string" },
            notes: { type: "string" },
            tax_breakdown_notes: { type: "string" }
          }
        }
      });

      setGeneratedInvoice(aiResponse);
      toast.success("Invoice generated successfully");

      // Create draft invoice in system
      const invoiceData = {
        company_id: company.id,
        invoice_number: aiResponse.invoice_number,
        invoice_date: aiResponse.invoice_date,
        due_date: aiResponse.due_date,
        customer_id: order.consignee_id || null,
        customer_name: order.consignee_name,
        customer_email: order.consignee_email,
        customer_address: order.consignee_address,
        reference_type: 'ExportOrder',
        reference_id: order.id,
        reference_number: order.export_order_number,
        currency: order.currency || 'USD',
        line_items: aiResponse.line_items,
        subtotal: aiResponse.subtotal_before_tax,
        tax_status: 'zero_rated',
        tax_gst: aiResponse.tax_gst || 0,
        tax_pst: aiResponse.tax_pst || 0,
        tax_hst: aiResponse.tax_hst || 0,
        tax_total: aiResponse.tax_total || 0,
        grand_total: aiResponse.grand_total,
        payment_status: 'pending',
        status: 'draft',
        notes: aiResponse.notes,
        payment_terms: aiResponse.payment_terms
      };

      const createdInvoice = await supabase.entities.SalesInvoice.create(invoiceData);
      
      queryClient.invalidateQueries({ queryKey: ['salesInvoices'] });
      onInvoiceCreated?.(createdInvoice);
      
      toast.success("Draft invoice created in accounting");

    } catch (error) {
      console.error("Invoice generation error:", error);
      toast.error("Failed to generate invoice: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Invoice Generation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Automatically generate a professional invoice with accurate cost calculations and tax handling for this export order.
        </p>

        {!generatedInvoice ? (
          <Button 
            onClick={generateInvoice} 
            disabled={generating}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Invoice...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Invoice
              </>
            )}
          </Button>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-green-800 font-medium">
              <CheckCircle className="w-5 h-5" />
              Invoice Generated Successfully
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice #:</span>
                <span className="font-medium">{generatedInvoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">{generatedInvoice.invoice_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{order.currency} ${generatedInvoice.subtotal_before_tax?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax:</span>
                <span className="font-medium">{order.currency} ${generatedInvoice.tax_total?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Grand Total:</span>
                <span>{order.currency} ${generatedInvoice.grand_total?.toLocaleString()}</span>
              </div>
            </div>

            {generatedInvoice.tax_breakdown_notes && (
              <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-200">
                <p className="font-medium mb-1">Tax Notes:</p>
                <p>{generatedInvoice.tax_breakdown_notes}</p>
              </div>
            )}

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setGeneratedInvoice(null)}
              className="w-full"
            >
              Generate New Invoice
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}