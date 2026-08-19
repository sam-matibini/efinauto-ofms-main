import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, MessageCircle, Share2, Printer, FileDown, Copy, Check } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import jsPDF from "jspdf";

export default function ShipmentShareDialog({ open, onClose, trackingData, trackingNumber, carrier }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/track?number=${encodeURIComponent(trackingNumber)}&carrier=${encodeURIComponent(carrier)}`;

  const generateTrackingText = () => {
    return `🚢 Shipment Tracking Update

Container/B/L: ${trackingNumber}
Carrier: ${carrier}
Status: ${trackingData.status.replace(/_/g, ' ').toUpperCase()}
Current Location: ${trackingData.location}
${trackingData.estimated_arrival ? `Estimated Arrival: ${trackingData.estimated_arrival}` : ''}
Last Event: ${trackingData.last_event}

Track your shipment: ${shareUrl}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied to clipboard");
  };

  const handleEmailShare = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    setSending(true);
    try {
      await supabase.integrations.Core.SendEmail({
        to: email,
        subject: `Shipment Tracking - ${trackingNumber}`,
        body: generateTrackingText()
      });
      toast.success("Email sent successfully");
      setEmail("");
    } catch (error) {
      toast.error("Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(generateTrackingText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleGoogleChatShare = () => {
    const text = encodeURIComponent(generateTrackingText());
    window.open(`https://chat.google.com/?text=${text}`, '_blank');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Shipment Tracking - ${trackingNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1e40af; }
            .status { 
              display: inline-block;
              padding: 8px 16px;
              background: #dbeafe;
              color: #1e40af;
              border-radius: 8px;
              font-weight: bold;
            }
            .info { margin: 20px 0; }
            .info-item { margin: 10px 0; }
            .label { font-weight: bold; color: #666; }
            .event { 
              border-left: 2px solid #3b82f6;
              padding-left: 15px;
              margin: 15px 0;
            }
            .event-time { color: #666; font-size: 0.9em; }
          </style>
        </head>
        <body>
          <h1>🚢 Shipment Tracking</h1>
          <div class="info">
            <div class="info-item"><span class="label">Container/B/L:</span> ${trackingNumber}</div>
            <div class="info-item"><span class="label">Carrier:</span> ${carrier}</div>
            <div class="info-item">
              <span class="label">Status:</span> 
              <span class="status">${trackingData.status.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
            <div class="info-item"><span class="label">Current Location:</span> ${trackingData.location}</div>
            ${trackingData.estimated_arrival ? `<div class="info-item"><span class="label">Estimated Arrival:</span> ${trackingData.estimated_arrival}</div>` : ''}
            <div class="info-item"><span class="label">Last Event:</span> ${trackingData.last_event}</div>
          </div>
          ${trackingData.events ? `
            <h2>Tracking History</h2>
            ${trackingData.events.map(event => `
              <div class="event">
                <div><strong>${event.description}</strong></div>
                <div>${event.location}</div>
                <div class="event-time">${event.timestamp}</div>
              </div>
            `).join('')}
          ` : ''}
          <p style="margin-top: 30px; color: #666; font-size: 0.9em;">
            Track online: ${shareUrl}
          </p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(30, 64, 175);
    doc.text('Shipment Tracking', 20, 20);
    
    // Info
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    let y = 40;
    
    doc.text(`Container/B/L: ${trackingNumber}`, 20, y);
    y += 10;
    doc.text(`Carrier: ${carrier}`, 20, y);
    y += 10;
    doc.text(`Status: ${trackingData.status.replace(/_/g, ' ').toUpperCase()}`, 20, y);
    y += 10;
    doc.text(`Current Location: ${trackingData.location}`, 20, y);
    y += 10;
    if (trackingData.estimated_arrival) {
      doc.text(`Estimated Arrival: ${trackingData.estimated_arrival}`, 20, y);
      y += 10;
    }
    doc.text(`Last Event: ${trackingData.last_event}`, 20, y);
    y += 20;
    
    // Events
    if (trackingData.events && trackingData.events.length > 0) {
      doc.setFontSize(14);
      doc.text('Tracking History', 20, y);
      y += 10;
      
      doc.setFontSize(10);
      trackingData.events.forEach((event, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFont(undefined, 'bold');
        doc.text(event.description, 20, y);
        y += 6;
        doc.setFont(undefined, 'normal');
        doc.text(event.location, 20, y);
        y += 6;
        doc.setTextColor(100, 100, 100);
        doc.text(event.timestamp, 20, y);
        doc.setTextColor(0, 0, 0);
        y += 10;
      });
    }
    
    // Footer
    y += 10;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Track online: ${shareUrl}`, 20, y);
    
    doc.save(`tracking-${trackingNumber}.pdf`);
    toast.success("PDF downloaded successfully");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Tracking Information
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Copy Link */}
          <div>
            <Label>Tracking Link</Label>
            <div className="flex gap-2 mt-1">
              <Input value={shareUrl} readOnly className="text-sm" />
              <Button onClick={handleCopyLink} variant="outline" size="icon">
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Email */}
          <div>
            <Label>Send via Email</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="email"
                placeholder="recipient@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button onClick={handleEmailShare} disabled={sending}>
                <Mail className="w-4 h-4 mr-2" />
                {sending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={handleWhatsAppShare} variant="outline" className="w-full">
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Button onClick={handleGoogleChatShare} variant="outline" className="w-full">
              <MessageCircle className="w-4 h-4 mr-2" />
              Google Chat
            </Button>
          </div>

          {/* Print & Download */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <Button onClick={handlePrint} variant="outline" className="w-full">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleDownloadPDF} variant="outline" className="w-full">
              <FileDown className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}