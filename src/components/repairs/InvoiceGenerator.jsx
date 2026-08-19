import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Mail, Download, Loader2, Sparkles, Eye } from "lucide-react";
import DocumentViewer from "../shared/DocumentViewer";
import { toast } from "sonner";
import { useCompany } from "@/components/shared/CompanyContext";

export default function InvoiceGenerator({ open, onClose, repairOrder }) {
  const { selectedCompanyId } = useCompany();
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: company } = useQuery({
    queryKey: ['company', selectedCompanyId],
    queryFn: () => supabase.entities.Company.filter({ id: selectedCompanyId }).then(res => res[0]),
    enabled: !!selectedCompanyId && open,
  });

  const { data: customer } = useQuery({
    queryKey: ['customer', repairOrder?.customer_id],
    queryFn: () => supabase.entities.Customer.filter({ id: repairOrder.customer_id }).then(res => res[0]),
    enabled: !!repairOrder?.customer_id && open,
  });

  const [invoiceData, setInvoiceData] = useState(null);

  const generateInvoiceMutation = useMutation({
    mutationFn: async () => {
      setGenerating(true);
      
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;
      
      // Prepare line items
      const lineItems = [];
      
      // Add labor
      if (repairOrder.total_labor_hours > 0) {
        lineItems.push({
          description: "Labor",
          quantity: repairOrder.total_labor_hours,
          unit_price: repairOrder.hourly_rate || 0,
          total: repairOrder.labor_cost || 0
        });
      }
      
      // Add parts
      if (repairOrder.parts_used && repairOrder.parts_used.length > 0) {
        repairOrder.parts_used.forEach(part => {
          lineItems.push({
            description: `${part.part_name} (${part.part_number})`,
            quantity: part.quantity,
            unit_price: part.unit_cost,
            total: part.total_cost
          });
        });
      }

      const subtotal = (repairOrder.labor_cost || 0) + (repairOrder.parts_cost || 0);
      const taxRate = repairOrder.tax_amount ? (repairOrder.tax_amount / subtotal * 100) : 13;
      
      const invoice = {
        company_id: selectedCompanyId,
        invoice_number: invoiceNumber,
        repair_order_id: repairOrder.id,
        repair_order_number: repairOrder.order_number,
        customer_id: repairOrder.customer_id,
        customer_name: repairOrder.customer_name,
        customer_email: customer?.email || repairOrder.customer_phone,
        customer_phone: repairOrder.customer_phone,
        customer_address: customer?.address || "",
        vehicle_details: `${repairOrder.vehicle_year} ${repairOrder.vehicle_make} ${repairOrder.vehicle_model} - VIN: ${repairOrder.vehicle_vin}`,
        service_date: repairOrder.completion_date || repairOrder.start_date,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        line_items: lineItems,
        labor_hours: repairOrder.total_labor_hours || 0,
        labor_rate: repairOrder.hourly_rate || 0,
        labor_cost: repairOrder.labor_cost || 0,
        parts_cost: repairOrder.parts_cost || 0,
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: repairOrder.tax_amount || 0,
        total_amount: repairOrder.total_cost || 0,
        amount_paid: 0,
        balance_due: repairOrder.total_cost || 0,
        payment_status: repairOrder.payment_status || "pending",
        payment_terms: "Due upon receipt",
        notes: `Thank you for your business! Services performed: ${repairOrder.description}`
      };

      // Use AI to enhance invoice notes
      try {
        const aiResponse = await supabase.integrations.Core.InvokeLLM({
          prompt: `Generate a professional, concise invoice note for an auto repair service. 
          Services: ${repairOrder.description}
          Diagnosis: ${repairOrder.diagnosis || 'N/A'}
          Keep it under 2 sentences, professional and friendly.`,
        });
        if (aiResponse) {
          invoice.notes = aiResponse;
        }
      } catch (error) {
        console.log("AI enhancement failed, using default note");
      }

      // Create invoice in database
      const createdInvoice = await supabase.entities.Invoice.create(invoice);
      setGenerating(false);
      return createdInvoice;
    },
    onSuccess: (data) => {
      setInvoiceData(data);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success("Invoice generated successfully!");
    },
    onError: (error) => {
      setGenerating(false);
      toast.error("Failed to generate invoice");
      console.error(error);
    }
  });

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      setSending(true);
      
      const emailBody = `
Dear ${invoiceData.customer_name},

Thank you for choosing ${company?.name || 'our service'} for your auto repair needs.

Please find attached your invoice details:

Invoice Number: ${invoiceData.invoice_number}
Vehicle: ${invoiceData.vehicle_details}
Service Date: ${invoiceData.service_date}
Total Amount: $${invoiceData.total_amount.toFixed(2)}
Balance Due: $${invoiceData.balance_due.toFixed(2)}

Payment is due by: ${invoiceData.due_date}

If you have any questions, please don't hesitate to contact us.

Best regards,
${company?.name || 'Auto Repair Team'}
${company?.phone || ''}
      `.trim();

      await supabase.integrations.Core.SendEmail({
        to: invoiceData.customer_email || repairOrder.customer_phone,
        subject: `Invoice ${invoiceData.invoice_number} - ${company?.name || 'Auto Repair'}`,
        body: emailBody,
        from_name: company?.name
      });

      // Update invoice to mark as sent
      await supabase.entities.Invoice.update(invoiceData.id, {
        email_sent: true,
        email_sent_date: new Date().toISOString()
      });

      setSending(false);
    },
    onSuccess: () => {
      toast.success("Invoice sent via email!");
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      setSending(false);
      toast.error("Failed to send email");
      console.error(error);
    }
  });

  const handleGenerate = () => {
    generateInvoiceMutation.mutate();
  };

  const handleSendEmail = () => {
    if (!invoiceData.customer_email && !repairOrder.customer_phone) {
      toast.error("No email address available for customer");
      return;
    }
    sendEmailMutation.mutate();
  };

  const handleDownloadPDF = () => {
    // Create a printable version
    const printWindow = window.open('', '_blank');
    printWindow.document.write(generatePrintableInvoice());
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const generatePrintableInvoice = () => {
    if (!invoiceData) return '';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoiceData.invoice_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .company { font-size: 24px; font-weight: bold; }
          .invoice-details { text-align: right; }
          .section { margin: 30px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .total-row { font-weight: bold; font-size: 18px; background-color: #f9f9f9; }
          .notes { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-left: 4px solid #3b82f6; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            ${company?.logo_url 
              ? `<img src="${company.logo_url}" alt="${company?.name}" style="max-height:60px;max-width:180px;margin-bottom:10px;object-fit:contain;" onerror="this.style.display='none'" />`
              : ''}
            <div class="company">${company?.name || 'Auto Repair Center'}</div>
            <div>${company?.address || ''}</div>
            <div>${company?.city || ''}, ${company?.province || ''} ${company?.postal_code || ''}</div>
            <div>Phone: ${company?.phone || ''}</div>
            <div>Email: ${company?.email || ''}</div>
          </div>
          <div class="invoice-details">
            <h1>INVOICE</h1>
            <div><strong>Invoice #:</strong> ${invoiceData.invoice_number}</div>
            <div><strong>Date:</strong> ${invoiceData.invoice_date}</div>
            <div><strong>Due Date:</strong> ${invoiceData.due_date}</div>
          </div>
        </div>

        <div class="section">
          <h3>Bill To:</h3>
          <div><strong>${invoiceData.customer_name}</strong></div>
          <div>${invoiceData.customer_address || ''}</div>
          <div>Phone: ${invoiceData.customer_phone}</div>
          <div>Email: ${invoiceData.customer_email || ''}</div>
        </div>

        <div class="section">
          <h3>Vehicle Information:</h3>
          <div>${invoiceData.vehicle_details}</div>
          <div>Service Date: ${invoiceData.service_date}</div>
          <div>Repair Order: ${invoiceData.repair_order_number}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Quantity</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceData.line_items.map(item => `
              <tr>
                <td>${item.description}</td>
                <td style="text-align: right;">${item.quantity}</td>
                <td style="text-align: right;">$${item.unit_price.toFixed(2)}</td>
                <td style="text-align: right;">$${item.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="text-align: right; margin-top: 30px;">
          <table style="width: 300px; margin-left: auto;">
            <tr>
              <td><strong>Subtotal:</strong></td>
              <td style="text-align: right;">$${invoiceData.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td><strong>Tax (${invoiceData.tax_rate.toFixed(1)}%):</strong></td>
              <td style="text-align: right;">$${invoiceData.tax_amount.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td><strong>Total Amount:</strong></td>
              <td style="text-align: right;">$${invoiceData.total_amount.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Amount Paid:</td>
              <td style="text-align: right;">$${invoiceData.amount_paid.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td><strong>Balance Due:</strong></td>
              <td style="text-align: right;">$${invoiceData.balance_due.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        ${invoiceData.notes ? `
          <div class="notes">
            <strong>Notes:</strong><br>
            ${invoiceData.notes}
          </div>
        ` : ''}

        <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666;">
          <p>${invoiceData.payment_terms}</p>
          <p>Thank you for your business!</p>
        </div>
      </body>
      </html>
    `;
  };

  if (!repairOrder) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            AI-Powered Invoice Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!invoiceData ? (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Repair Order Details</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><strong>Order #:</strong> {repairOrder.order_number}</p>
                      <p><strong>Customer:</strong> {repairOrder.customer_name}</p>
                      <p><strong>Vehicle:</strong> {repairOrder.vehicle_year} {repairOrder.vehicle_make} {repairOrder.vehicle_model}</p>
                      <p><strong>VIN:</strong> {repairOrder.vehicle_vin}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Cost Breakdown</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Labor ({repairOrder.total_labor_hours}h @ ${repairOrder.hourly_rate}/h):</span>
                        <span>${(repairOrder.labor_cost || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Parts:</span>
                        <span>${(repairOrder.parts_cost || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <span>${(repairOrder.tax_amount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base pt-2 border-t">
                        <span>Total:</span>
                        <span>${(repairOrder.total_cost || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleGenerate} 
                    disabled={generating}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Invoice...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Invoice with AI
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center mb-4">
                    <h2 className="text-2xl font-bold text-green-600 mb-2">✓ Invoice Generated!</h2>
                    <p className="text-lg font-semibold">Invoice #{invoiceData.invoice_number}</p>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b pb-2">
                      <span>Customer:</span>
                      <span className="font-semibold">{invoiceData.customer_name}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span>Vehicle:</span>
                      <span className="font-semibold">{invoiceData.vehicle_details}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span>Invoice Date:</span>
                      <span>{invoiceData.invoice_date}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span>Due Date:</span>
                      <span>{invoiceData.due_date}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2">
                      <span>Total Amount:</span>
                      <span className="text-blue-600">${invoiceData.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Balance Due:</span>
                      <span className="font-semibold text-red-600">${invoiceData.balance_due.toFixed(2)}</span>
                    </div>
                  </div>

                  {invoiceData.notes && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-gray-600 mb-1">AI-Generated Note:</p>
                      <p className="text-sm text-gray-700">{invoiceData.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-3 gap-3">
                <Button 
                  onClick={handleDownloadPDF} 
                  variant="outline"
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button 
                  onClick={() => setViewerOpen(true)} 
                  variant="outline"
                  className="w-full"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View & Share
                </Button>
                <Button 
                  onClick={handleSendEmail} 
                  disabled={sending}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            {invoiceData ? 'Close' : 'Cancel'}
          </Button>
        </div>

        {invoiceData && (
          <DocumentViewer
            open={viewerOpen}
            onClose={() => setViewerOpen(false)}
            documentType="repair_invoice"
            documentData={invoiceData}
            company={company}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}