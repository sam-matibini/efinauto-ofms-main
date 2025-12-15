import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Shield, MapPin, Smartphone, Globe, Check, Clock, FileText } from "lucide-react";

export default function EnhancedAuditTrail({ auditData }) {
  if (!auditData || (!auditData.buyer && !auditData.seller)) return null;

  const getMethodBadge = (method) => {
    const badges = {
      electronic_capture: { label: "E-Signature", color: "bg-blue-100 text-blue-800" },
      ai_generated: { label: "AI Generated", color: "bg-purple-100 text-purple-800" },
      email_link: { label: "Email Link", color: "bg-green-100 text-green-800" }
    };
    return badges[method] || badges.electronic_capture;
  };

  const SignerAuditCard = ({ signer, type }) => {
    const badge = getMethodBadge(signer.method);
    
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            {type === 'buyer' ? 'Buyer/Purchaser' : 'Seller/Salesperson'}
          </h4>
          <Badge className={badge.color}>{badge.label}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-start gap-2">
            <FileText className="w-3 h-3 text-gray-500 mt-0.5" />
            <div>
              <p className="text-gray-500">Name</p>
              <p className="font-medium">{signer.name}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Clock className="w-3 h-3 text-gray-500 mt-0.5" />
            <div>
              <p className="text-gray-500">Signed At</p>
              <p className="font-medium">{format(new Date(signer.signedAt), 'MMM d, yyyy')}</p>
              <p className="text-gray-400">{format(new Date(signer.signedAt), 'h:mm:ss a')}</p>
            </div>
          </div>

          {signer.email && (
            <div className="flex items-start gap-2">
              <Globe className="w-3 h-3 text-gray-500 mt-0.5" />
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium text-xs">{signer.email}</p>
              </div>
            </div>
          )}

          {signer.ipAddress && (
            <div className="flex items-start gap-2">
              <MapPin className="w-3 h-3 text-gray-500 mt-0.5" />
              <div>
                <p className="text-gray-500">IP Address</p>
                <p className="font-mono text-xs">{signer.ipAddress}</p>
              </div>
            </div>
          )}

          {signer.userAgent && (
            <div className="flex items-start gap-2 col-span-2">
              <Smartphone className="w-3 h-3 text-gray-500 mt-0.5" />
              <div>
                <p className="text-gray-500">Device</p>
                <p className="text-xs text-gray-600">{signer.userAgent}</p>
              </div>
            </div>
          )}

          {signer.geolocation && (
            <div className="flex items-start gap-2 col-span-2">
              <MapPin className="w-3 h-3 text-gray-500 mt-0.5" />
              <div>
                <p className="text-gray-500">Location</p>
                <p className="text-xs text-gray-600">
                  {signer.geolocation.city}, {signer.geolocation.region}, {signer.geolocation.country}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          Digital Signature Audit Trail
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {auditData.buyer && <SignerAuditCard signer={auditData.buyer} type="buyer" />}
          {auditData.seller && <SignerAuditCard signer={auditData.seller} type="seller" />}
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-gray-500 flex items-center gap-2">
            <Shield className="w-3 h-3" />
            This document has been electronically signed and is legally binding under the ESIGN Act and UETA.
            All signature events are cryptographically secured and timestamped.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}