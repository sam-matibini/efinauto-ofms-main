import React, { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, Mail, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function PaymentReceiptDialog({ open, onClose, payment, company }) {
  const receiptRef = useRef(null);

  if (!payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleEmailReceipt = async () => {
    if (!payment.customer_email) {
      toast.error("No customer email on file");
      return;
    }

    try {
      await base44.integrations.Core.SendEmail({
        to: payment.customer_email,
        subject: `Payment Receipt - ${payment.payment_number}`,
        body: `
Dear ${payment.customer_name},

Thank you for your payment. Please find your receipt details below:

Receipt Number: ${payment.payment_number}
Date: ${payment.payment_date}
Amount: $${payment.amount?.toLocaleString()}
Payment Method: ${payment.payment_method}
${payment.reference_number ? `Reference: ${payment.reference_number}` : ''}

${payment.invoice_number ? `Applied to Invoice: ${payment.invoice_number}` : ''}

Thank you for your business!

${company?.name || 'Our Company'}
${company?.phone || ''}
${company?.email || ''}
        `.trim()
      });
      toast.success("Receipt emailed successfully!");
    } catch (error) {
      toast.error("Failed to send email");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payment Receipt</DialogTitle>
        </DialogHeader>

        <style>{`
          @media print {
            body * { visibility: hidden; }
            .receipt-printable, .receipt-printable * { visibility: visible !important; }
            .receipt-printable { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
          }
        `}</style>

        <div ref={receiptRef} className="receipt-printable bg-white p-6 space-y-6">
          {/* Header */}
          <div className="text-center border-b pb-4">
            <div className="flex justify-center mb-2">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Payment Receipt</h2>
            <p className="text-gray-500">{company?.name || 'Company Name'}</p>
            {company?.address && <p className="text-sm text-gray-400">{company.address}</p>}
            {company?.phone && <p className="text-sm text-gray-400">{company.phone}</p>}
          </div>

          {/* Receipt Details */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-500 uppercase">Receipt Number</p>
              <p className="font-bold text-lg">{payment.payment_number || `RCP-${payment.id?.slice(0, 8)}`}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase">Date</p>
              <p className="font-semibold">{payment.payment_date ? format(new Date(payment.payment_date), 'MMMM d, yyyy') : 'N/A'}</p>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase mb-1">Received From</p>
            <p className="font-semibold text-lg">{payment.customer_name}</p>
            {payment.customer_email && <p className="text-sm text-gray-600">{payment.customer_email}</p>}
          </div>

          {/* Payment Details */}
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Payment Method</span>
              <span className="font-medium capitalize">{payment.payment_method?.replace(/_/g, ' ')}</span>
            </div>
            {payment.reference_number && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Reference Number</span>
                <span className="font-medium">{payment.reference_number}</span>
              </div>
            )}
            {payment.invoice_number && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Applied to Invoice</span>
                <span className="font-medium text-blue-600">{payment.invoice_number}</span>
              </div>
            )}
            {payment.sale_number && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Sale Reference</span>
                <span className="font-medium">{payment.sale_number}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Status</span>
              <Badge className={
                payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }>
                {payment.status}
              </Badge>
            </div>
          </div>

          {/* Amount */}
          <div className="bg-green-50 rounded-lg p-6 text-center">
            <p className="text-sm text-green-600 uppercase mb-1">Amount Received</p>
            <p className="text-4xl font-bold text-green-700">
              ${payment.amount?.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Notes */}
          {payment.notes && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase mb-1">Notes</p>
              <p className="text-sm text-gray-700">{payment.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 pt-4 border-t">
            <p>Thank you for your payment!</p>
            <p>This receipt was generated on {format(new Date(), 'MMMM d, yyyy h:mm a')}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t no-print">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="outline" onClick={handleEmailReceipt}>
            <Mail className="w-4 h-4 mr-2" />
            Email Receipt
          </Button>
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}