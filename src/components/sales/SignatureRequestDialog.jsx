import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Mail, Loader2, Calendar } from "lucide-react";

export default function SignatureRequestDialog({ open, onClose, sale, company }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    signerEmail: sale?.customer_email || "",
    signerName: sale?.customer_name || "",
    signerType: "buyer",
    message: `Please review and sign the Bill of Sale for ${sale?.vehicle_details || "your vehicle"}.`,
    expiresInDays: 7,
    requireIdentityVerification: false
  });

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open && sale) {
      setFormData({
        signerEmail: sale?.customer_email || "",
        signerName: sale?.customer_name || "",
        signerType: "buyer",
        message: `Please review and sign the Bill of Sale for ${sale?.vehicle_details || "your vehicle"}.`,
        expiresInDays: 7,
        requireIdentityVerification: false
      });
    }
  }, [open, sale]);

  const handleSendRequest = async () => {
    if (!formData.signerEmail || !formData.signerName) {
      toast.error("Email and name are required");
      return;
    }

    setLoading(true);
    try {
      const signatureRequestUrl = `${window.location.origin}/sign-document/${sale.id}?token=${btoa(formData.signerEmail)}&type=${formData.signerType}`;
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + formData.expiresInDays);

      // Create signature request record in database
      await base44.entities.SignatureRequest.create({
        company_id: sale.company_id,
        sale_id: sale.id,
        signer_email: formData.signerEmail,
        signer_name: formData.signerName,
        signer_type: formData.signerType,
        status: "pending",
        message: formData.message,
        expires_at: expirationDate.toISOString(),
        signature_url: signatureRequestUrl,
        require_identity_verification: formData.requireIdentityVerification
      });

      // Send email notification
      await base44.integrations.Core.SendEmail({
        to: formData.signerEmail,
        subject: `Signature Request - Bill of Sale (BOS ${sale.bos_number || sale.sale_number})`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e3a8a;">Signature Request</h2>
            <p>Hello ${formData.signerName},</p>
            <p>${formData.message}</p>
            
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Document:</strong> Bill of Sale</p>
              <p style="margin: 5px 0;"><strong>BOS Number:</strong> ${sale.bos_number || sale.sale_number}</p>
              <p style="margin: 5px 0;"><strong>Vehicle:</strong> ${sale.vehicle_details}</p>
              <p style="margin: 5px 0;"><strong>From:</strong> ${company?.name || "Dealership"}</p>
              <p style="margin: 5px 0;"><strong>Expires:</strong> ${expirationDate.toLocaleDateString()}</p>
            </div>

            <a href="${signatureRequestUrl}" style="display: inline-block; background: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Review & Sign Document
            </a>

            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              This signature request will expire in ${formData.expiresInDays} days. 
              If you did not expect this email, please contact ${company?.email || "us"}.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
            <p style="color: #999; font-size: 11px;">
              This is a legally binding electronic signature request. 
              By clicking the button above and signing, you agree to the terms of the Bill of Sale.
            </p>
          </div>
        `
      });

      toast.success(`Signature request sent to ${formData.signerEmail}`);
      setLoading(false);
      // Close dialog after a brief delay to show success message
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error("Failed to send signature request:", error);
      toast.error("Failed to send signature request");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Send Signature Request
          </DialogTitle>
          <DialogDescription>
            Send an email to request a digital signature on this Bill of Sale
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Signer Type</Label>
            <Select value={formData.signerType} onValueChange={(value) => setFormData({...formData, signerType: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buyer">Buyer/Purchaser</SelectItem>
                <SelectItem value="seller">Seller/Salesperson</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Signer Name</Label>
            <Input 
              value={formData.signerName}
              onChange={(e) => setFormData({...formData, signerName: e.target.value})}
              placeholder="Full name"
            />
          </div>

          <div>
            <Label>Signer Email</Label>
            <Input 
              type="email"
              value={formData.signerEmail}
              onChange={(e) => setFormData({...formData, signerEmail: e.target.value})}
              placeholder="email@example.com"
            />
          </div>

          <div>
            <Label>Message to Signer</Label>
            <Textarea 
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
              rows={3}
            />
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Expires In (Days)
            </Label>
            <Select value={formData.expiresInDays.toString()} onValueChange={(value) => setFormData({...formData, expiresInDays: parseInt(value)})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSendRequest} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
            Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}