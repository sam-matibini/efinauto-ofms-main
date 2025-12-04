import React, { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Mail, MessageCircle, X, Download } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

export default function InvoicePreview({ open, onClose, invoice, company }) {
  const invoiceRef = useRef(null);

  if (!invoice) return null;

  const handlePrint = () => {
    const printContent = invoiceRef.current;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${invoice.invoice_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .invoice-header { text-align: center; margin-bottom: 30px; }
            .company-name { font-size: 24px; font-weight: bold; color: #1e293b; }
            .invoice-title { font-size: 20px; color: #64748b; margin-top: 10px; }
            .section { margin-bottom: 20px; }
            .section-title { font-weight: bold; color: #374151; margin-bottom: 8px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .label { color: #6b7280; font-size: 12px; }
            .value { font-weight: 500; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #f3f4f6; padding: 10px; text-align: left; font-size: 12px; }
            td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
            .text-right { text-align: right; }
            .totals { margin-top: 20px; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .grand-total { font-size: 18px; font-weight: bold; color: #2563eb; border-top: 2px solid #e5e7eb; padding-top: 10px; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
            .status-paid { background: #dcfce7; color: #166534; }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-partial { background: #dbeafe; color: #1e40af; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadPDF = async () => {
    try {
      const element = invoiceRef.current;
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Invoice-${invoice.invoice_number}.pdf`);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      toast.error("Failed to generate PDF");
    }
  };

  const handleEmailShare = async () => {
    if (!invoice.customer_email) {
      toast.error("No customer email available");
      return;
    }

    try {
      const emailBody = `
Dear ${invoice.customer_name},

Please find below your invoice details:

Invoice Number: ${invoice.invoice_number}
Invoice Date: ${invoice.invoice_date}
Due Date: ${invoice.due_date || 'Upon Receipt'}

Line Items:
${invoice.line_items?.map(item => `- ${item.description}: ${item.quantity} x $${formatCurrency(item.rate)} = $${formatCurrency(item.amount)}`).join('\n')}

Subtotal: $${formatCurrency(invoice.subtotal)}
Tax: $${formatCurrency(invoice.tax_amount)}
Total: $${formatCurrency(invoice.total_amount)}

Payment Status: ${invoice.payment_status?.toUpperCase()}
${invoice.balance_due > 0 ? `Balance Due: $${formatCurrency(invoice.balance_due)}` : ''}

Thank you for your business!

${company?.name || 'Our Company'}
${company?.phone || ''}
${company?.email || ''}
      `.trim();

      await base44.integrations.Core.SendEmail({
        to: invoice.customer_email,
        subject: `Invoice ${invoice.invoice_number} from ${company?.name || 'Our Company'}`,
        body: emailBody
      });

      toast.success(`Invoice sent to ${invoice.customer_email}`);
    } catch (error) {
      toast.error("Failed to send email");
    }
  };

  const handleWhatsAppShare = () => {
    const message = `
*Invoice ${invoice.invoice_number}*
From: ${company?.name || 'Our Company'}

Customer: ${invoice.customer_name}
Date: ${invoice.invoice_date}
Due: ${invoice.due_date || 'Upon Receipt'}

*Items:*
${invoice.line_items?.map(item => `• ${item.description}: $${formatCurrency(item.amount)}`).join('\n')}

*Subtotal:* $${formatCurrency(invoice.subtotal)}
*Tax:* $${formatCurrency(invoice.tax_amount)}
*Total:* $${formatCurrency(invoice.total_amount)}

Status: ${invoice.payment_status?.toUpperCase()}
${invoice.balance_due > 0 ? `*Balance Due:* $${formatCurrency(invoice.balance_due)}` : ''}

Thank you for your business!
    `.trim();

    const phoneNumber = invoice.customer_phone?.replace(/\D/g, '') || '';
    const whatsappUrl = phoneNumber 
      ? `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const getStatusBadge = (status) => {
    const styles = {
      paid: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      partial: "bg-blue-100 text-blue-800"
    };
    return styles[status] || styles.pending;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Invoice Preview</DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <Download className="w-4 h-4 mr-1" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleEmailShare}>
                <Mail className="w-4 h-4 mr-1" />
                Email
              </Button>
              <Button variant="outline" size="sm" className="bg-green-50 text-green-700 hover:bg-green-100" onClick={handleWhatsAppShare}>
                <MessageCircle className="w-4 h-4 mr-1" />
                WhatsApp
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div ref={invoiceRef} className="bg-white p-6 border rounded-lg">
          {/* Header */}
          <div className="text-center border-b pb-6 mb-6">
            <h1 className="text-2xl font-bold text-slate-800">{company?.name || "Company Name"}</h1>
            {company?.address && <p className="text-gray-600 text-sm mt-1">{company.address}</p>}
            {(company?.city || company?.province) && (
              <p className="text-gray-600 text-sm">{company.city}{company.city && company.province ? ', ' : ''}{company.province} {company.postal_code}</p>
            )}
            {company?.phone && <p className="text-gray-600 text-sm">Tel: {company.phone}</p>}
            {company?.email && <p className="text-gray-600 text-sm">{company.email}</p>}
            <h2 className="text-xl text-gray-500 mt-4">INVOICE</h2>
          </div>

          {/* Invoice Info */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Bill To:</h3>
              <p className="font-medium">{invoice.customer_name}</p>
              {invoice.customer_email && <p className="text-gray-600 text-sm">{invoice.customer_email}</p>}
              {invoice.customer_phone && <p className="text-gray-600 text-sm">{invoice.customer_phone}</p>}
              {invoice.customer_address && <p className="text-gray-600 text-sm">{invoice.customer_address}</p>}
            </div>
            <div className="text-right">
              <div className="mb-2">
                <span className="text-gray-500 text-sm">Invoice #:</span>
                <span className="ml-2 font-medium">{invoice.invoice_number}</span>
              </div>
              <div className="mb-2">
                <span className="text-gray-500 text-sm">Date:</span>
                <span className="ml-2">{invoice.invoice_date}</span>
              </div>
              <div className="mb-2">
                <span className="text-gray-500 text-sm">Due Date:</span>
                <span className="ml-2">{invoice.due_date || 'Upon Receipt'}</span>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Status:</span>
                <Badge className={`ml-2 ${getStatusBadge(invoice.payment_status)}`}>
                  {invoice.payment_status?.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <table className="w-full mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-3 text-sm font-semibold text-gray-700">Description</th>
                <th className="text-center p-3 text-sm font-semibold text-gray-700 w-20">Qty</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-700 w-28">Rate</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-700 w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items?.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="p-3">{item.description}</td>
                  <td className="p-3 text-center">{item.quantity}</td>
                  <td className="p-3 text-right">${formatCurrency(item.rate)}</td>
                  <td className="p-3 text-right font-medium">${formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64">
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">${formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Tax ({invoice.tax_rate || 0}%):</span>
                <span className="font-medium">${formatCurrency(invoice.tax_amount)}</span>
              </div>
              <div className="flex justify-between py-3 border-t-2 border-gray-300">
                <span className="text-lg font-bold">Total:</span>
                <span className="text-lg font-bold text-blue-600">${formatCurrency(invoice.total_amount)}</span>
              </div>
              {invoice.amount_paid > 0 && (
                <>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Amount Paid:</span>
                    <span className="font-medium text-green-600">${formatCurrency(invoice.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t">
                    <span className="font-semibold">Balance Due:</span>
                    <span className="font-bold text-red-600">${formatCurrency(invoice.balance_due)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold text-gray-700 mb-2">Notes:</h3>
              <p className="text-gray-600 text-sm">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t text-center text-gray-500 text-sm">
            <p>Thank you for your business!</p>
            {company?.gst_number && <p className="mt-1">GST #: {company.gst_number}</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}