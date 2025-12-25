import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, CheckCircle, XCircle, AlertCircle, FileText, 
  Shield, Calendar, Loader2 
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function CarrierOnboardingDialog({ carrier, open, onClose, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [documentFile, setDocumentFile] = useState(null);
  const [documentType, setDocumentType] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const checklistItems = [
    { key: 'insurance_certificate', label: 'Insurance Certificate', required: true },
    { key: 'operating_authority', label: 'Operating Authority (DOT/MC)', required: true },
    { key: 'safety_rating', label: 'Safety Rating Documentation', required: true },
    { key: 'hazmat_certification', label: 'HAZMAT Certification', required: carrier?.hazmat_certified },
    { key: 'business_license', label: 'Business License', required: true },
    { key: 'w9_form', label: 'W-9 Tax Form', required: true },
    { key: 'carrier_agreement', label: 'Carrier Service Agreement', required: true },
    { key: 'background_check', label: 'Background Check', required: true }
  ];

  const checklist = carrier?.compliance_checklist || {};
  const documents = carrier?.compliance_documents || [];

  const completedItems = checklistItems.filter(item => checklist[item.key]).length;
  const totalRequired = checklistItems.filter(item => item.required).length;
  const progress = totalRequired > 0 ? (completedItems / totalRequired) * 100 : 0;

  const handleChecklistUpdate = async (key, checked) => {
    const updatedChecklist = { ...checklist, [key]: checked };
    await base44.entities.ThirdPartyCarrier.update(carrier.id, {
      compliance_checklist: updatedChecklist
    });
    onUpdate();
    toast.success("Checklist updated");
  };

  const handleDocumentUpload = async () => {
    if (!documentFile || !documentType) {
      toast.error("Please select file and document type");
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: documentFile });

      const newDocument = {
        document_type: documentType,
        document_name: documentFile.name,
        document_url: file_url,
        expiry_date: expiryDate || null,
        uploaded_at: new Date().toISOString(),
        verified: false
      };

      const updatedDocs = [...documents, newDocument];
      await base44.entities.ThirdPartyCarrier.update(carrier.id, {
        compliance_documents: updatedDocs
      });

      onUpdate();
      toast.success("Document uploaded");
      setDocumentFile(null);
      setDocumentType("");
      setExpiryDate("");
    } catch (error) {
      toast.error("Failed to upload document");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleVerifyDocument = async (docIndex, verified) => {
    const updatedDocs = [...documents];
    updatedDocs[docIndex] = {
      ...updatedDocs[docIndex],
      verified,
      verified_by: verified ? (await base44.auth.me()).email : null,
      verified_at: verified ? new Date().toISOString() : null
    };

    await base44.entities.ThirdPartyCarrier.update(carrier.id, {
      compliance_documents: updatedDocs
    });
    onUpdate();
    toast.success(verified ? "Document verified" : "Verification removed");
  };

  const handleApproveCarrier = async () => {
    if (progress < 100) {
      toast.error("Complete all required checklist items before approval");
      return;
    }

    await base44.entities.ThirdPartyCarrier.update(carrier.id, {
      onboarding_status: 'approved',
      approved_by: (await base44.auth.me()).email,
      approved_at: new Date().toISOString(),
      onboarding_completed_at: new Date().toISOString(),
      status: 'active'
    });
    onUpdate();
    toast.success("Carrier approved and activated");
  };

  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const days = Math.floor((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 30;
  };

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Carrier Onboarding & Compliance - {carrier?.carrier_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Overview */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-blue-900">Onboarding Progress</p>
                <p className="text-sm text-blue-700">
                  {completedItems} of {totalRequired} required items completed
                </p>
              </div>
              <Badge className={
                carrier?.onboarding_status === 'approved' ? 'bg-green-100 text-green-800' :
                carrier?.onboarding_status === 'review' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }>
                {carrier?.onboarding_status?.replace(/_/g, ' ')}
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <Tabs defaultValue="checklist">
            <TabsList>
              <TabsTrigger value="checklist">Compliance Checklist</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="details">Carrier Details</TabsTrigger>
            </TabsList>

            <TabsContent value="checklist" className="space-y-3 mt-4">
              {checklistItems.map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={checklist[item.key] || false}
                      onCheckedChange={(checked) => handleChecklistUpdate(item.key, checked)}
                      id={item.key}
                    />
                    <div>
                      <Label htmlFor={item.key} className="cursor-pointer font-medium">
                        {item.label}
                      </Label>
                      {item.required && (
                        <Badge variant="outline" className="ml-2 text-xs">Required</Badge>
                      )}
                    </div>
                  </div>
                  {checklist[item.key] ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-300" />
                  )}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="documents" className="space-y-4 mt-4">
              <div className="p-4 border rounded">
                <h4 className="font-semibold mb-3">Upload Compliance Document</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Document Type</Label>
                    <Input
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      placeholder="e.g., Insurance Certificate"
                    />
                  </div>
                  <div>
                    <Label>Expiry Date (Optional)</Label>
                    <Input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <Label>Select File</Label>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => setDocumentFile(e.target.files[0])}
                  />
                </div>
                <Button
                  onClick={handleDocumentUpload}
                  disabled={uploading || !documentFile}
                  className="mt-3 w-full"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Uploaded Documents</h4>
                {documents.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-sm">{doc.document_name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{doc.document_type}</span>
                          {doc.expiry_date && (
                            <>
                              <span>•</span>
                              <Calendar className="w-3 h-3" />
                              <span>Expires: {new Date(doc.expiry_date).toLocaleDateString()}</span>
                              {isExpired(doc.expiry_date) && (
                                <Badge className="bg-red-100 text-red-800 text-xs">Expired</Badge>
                              )}
                              {isExpiringSoon(doc.expiry_date) && !isExpired(doc.expiry_date) && (
                                <Badge className="bg-orange-100 text-orange-800 text-xs">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Expiring Soon
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.verified ? (
                        <>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerifyDocument(idx, false)}
                          >
                            Remove
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerifyDocument(idx, true)}
                        >
                          Verify
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.document_url, '_blank')}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))}
                {documents.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No documents uploaded yet</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-600">DOT Number</Label>
                  <p className="font-medium">{carrier?.operating_authority?.dot_number || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">MC Number</Label>
                  <p className="font-medium">{carrier?.operating_authority?.mc_number || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Insurance Provider</Label>
                  <p className="font-medium">{carrier?.insurance_details?.provider || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Policy Number</Label>
                  <p className="font-medium">{carrier?.insurance_details?.policy_number || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Coverage Amount</Label>
                  <p className="font-medium">
                    {carrier?.insurance_details?.coverage_amount 
                      ? `$${carrier.insurance_details.coverage_amount.toLocaleString()}` 
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Insurance Expiry</Label>
                  <p className="font-medium">
                    {carrier?.insurance_details?.expiry_date 
                      ? new Date(carrier.insurance_details.expiry_date).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Close</Button>
            {carrier?.onboarding_status !== 'approved' && (
              <Button
                onClick={handleApproveCarrier}
                disabled={progress < 100}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve Carrier
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}