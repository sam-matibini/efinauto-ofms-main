import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Eye, Download, CheckCircle, Loader2, PenTool } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import SignaturePad from "@/components/shared/SignaturePad";

export default function DocumentManager() {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [podDialogOpen, setPodDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [uploadFormData, setUploadFormData] = useState({
    shipment_id: "",
    document_type: "bill_of_lading",
    file: null
  });

  const [podFormData, setPodFormData] = useState({
    receiver_name: "",
    receiver_role: "",
    delivery_notes: "",
    condition_on_delivery: "good",
    signature: null
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ['localShipments', selectedCompanyId],
    queryFn: () => base44.entities.LocalShipment.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['shipmentDocuments'],
    queryFn: () => base44.entities.ShipmentDocument.list('-upload_timestamp', 100),
  });

  const handleFileUpload = async () => {
    if (!uploadFormData.file || !uploadFormData.shipment_id) {
      toast.error("Please select shipment and file");
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: uploadFormData.file });
      
      await base44.entities.ShipmentDocument.create({
        shipment_id: uploadFormData.shipment_id,
        document_type: uploadFormData.document_type,
        document_url: file_url,
        file_name: uploadFormData.file.name,
        file_size_bytes: uploadFormData.file.size,
        mime_type: uploadFormData.file.type,
        uploaded_by: (await base44.auth.me()).email,
        uploaded_via: "web",
        upload_timestamp: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['shipmentDocuments'] });
      toast.success("Document uploaded successfully");
      setUploadDialogOpen(false);
      setUploadFormData({ shipment_id: "", document_type: "bill_of_lading", file: null });
    } catch (error) {
      toast.error("Failed to upload document");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleGeneratePOD = async () => {
    if (!selectedShipment || !podFormData.signature || !podFormData.receiver_name) {
      toast.error("Please complete all required fields");
      return;
    }

    try {
      // Upload signature
      const signatureBlob = await fetch(podFormData.signature).then(r => r.blob());
      const signatureFile = new File([signatureBlob], 'signature.png', { type: 'image/png' });
      const { file_url: signatureUrl } = await base44.integrations.Core.UploadFile({ file: signatureFile });

      // Get last GPS point
      const gpsPoints = await base44.entities.GPSTrackingPoint.filter(
        { shipment_id: selectedShipment.id },
        '-timestamp',
        1
      );
      const lastLocation = gpsPoints.length > 0 ? {
        latitude: gpsPoints[0].latitude,
        longitude: gpsPoints[0].longitude,
        address: `${selectedShipment.destination_address}, ${selectedShipment.destination_city}`
      } : null;

      // Create POD
      const podData = {
        shipment_id: selectedShipment.id,
        pod_number: `POD-${Date.now()}`,
        driver_id: selectedShipment.driver_id,
        driver_name: selectedShipment.driver_name || 'N/A',
        truck_number: selectedShipment.truck_number || 'N/A',
        trailer_number: selectedShipment.trailer_number || 'N/A',
        commodities_summary: selectedShipment.commodities?.map(c => c.product_name).join(', ') || 'N/A',
        total_weight_kg: selectedShipment.total_weight_kg,
        receiver_signature_url: signatureUrl,
        receiver_name: podFormData.receiver_name,
        receiver_role: podFormData.receiver_role,
        delivered_at: new Date().toISOString(),
        delivery_location: lastLocation,
        delivery_notes: podFormData.delivery_notes,
        condition_on_delivery: podFormData.condition_on_delivery,
        legally_binding: true
      };

      const pod = await base44.entities.ProofOfDelivery.create(podData);

      // Update shipment status
      await base44.entities.LocalShipment.update(selectedShipment.id, {
        status: 'delivered',
        pod_id: pod.id,
        actual_delivery_time: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['localShipments'] });
      toast.success("Proof of Delivery generated successfully");
      setPodDialogOpen(false);
      setSelectedShipment(null);
    } catch (error) {
      toast.error("Failed to generate POD");
      console.error(error);
    }
  };

  const openPODDialog = (shipment) => {
    setSelectedShipment(shipment);
    setPodFormData({
      receiver_name: "",
      receiver_role: "",
      delivery_notes: "",
      condition_on_delivery: "good",
      signature: null
    });
    setPodDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setUploadDialogOpen(true)} className="w-full bg-blue-600 hover:bg-blue-700">
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generate POD</CardTitle>
          </CardHeader>
          <CardContent>
            <Select onValueChange={(value) => {
              const shipment = shipments.find(s => s.id === value);
              if (shipment) openPODDialog(shipment);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select shipment" />
              </SelectTrigger>
              <SelectContent>
                {shipments.filter(s => s.status === 'in_transit' || s.status === 'near_destination').map(shipment => (
                  <SelectItem key={shipment.id} value={shipment.id}>
                    {shipment.shipment_number} - {shipment.destination_city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {documents.slice(0, 10).map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-sm">{doc.file_name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Badge variant="outline" className="text-xs">{doc.document_type?.replace(/_/g, ' ')}</Badge>
                      <span>•</span>
                      <span>{new Date(doc.upload_timestamp || doc.created_date).toLocaleDateString()}</span>
                      {doc.is_signed && <CheckCircle className="w-3 h-3 text-green-600" />}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.open(doc.document_url, '_blank')}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.open(doc.document_url, '_blank')}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {documents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No documents uploaded yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Shipment Document</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Shipment *</Label>
              <Select value={uploadFormData.shipment_id} onValueChange={(value) => setUploadFormData({ ...uploadFormData, shipment_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select shipment" />
                </SelectTrigger>
                <SelectContent>
                  {shipments.map(shipment => (
                    <SelectItem key={shipment.id} value={shipment.id}>
                      {shipment.shipment_number} - {shipment.destination_city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Document Type *</Label>
              <Select value={uploadFormData.document_type} onValueChange={(value) => setUploadFormData({ ...uploadFormData, document_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bill_of_lading">Bill of Lading</SelectItem>
                  <SelectItem value="packing_list">Packing List</SelectItem>
                  <SelectItem value="commercial_invoice">Commercial Invoice</SelectItem>
                  <SelectItem value="sds">Safety Data Sheet (SDS)</SelectItem>
                  <SelectItem value="delivery_note">Delivery Note</SelectItem>
                  <SelectItem value="inspection_report">Inspection Report</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Select File *</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => setUploadFormData({ ...uploadFormData, file: e.target.files[0] })}
              />
              {uploadFormData.file && (
                <p className="text-xs text-gray-600 mt-1">
                  Selected: {uploadFormData.file.name} ({(uploadFormData.file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleFileUpload} disabled={uploading}>
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
          </div>
        </DialogContent>
      </Dialog>

      {/* POD Generation Dialog */}
      <Dialog open={podDialogOpen} onOpenChange={setPodDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Generate Proof of Delivery - {selectedShipment?.shipment_number}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 font-semibold mb-1">Shipment Summary</p>
              <div className="text-xs text-blue-700 space-y-1">
                <p>Route: {selectedShipment?.origin_city} → {selectedShipment?.destination_city}</p>
                <p>Commodities: {selectedShipment?.commodities?.map(c => c.product_name).join(', ')}</p>
                <p>Total Weight: {selectedShipment?.total_weight_kg?.toLocaleString()} kg</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Receiver Name *</Label>
                <Input value={podFormData.receiver_name} onChange={(e) => setPodFormData({ ...podFormData, receiver_name: e.target.value })} />
              </div>
              <div>
                <Label>Receiver Role/Title</Label>
                <Input value={podFormData.receiver_role} onChange={(e) => setPodFormData({ ...podFormData, receiver_role: e.target.value })} placeholder="e.g., Warehouse Manager" />
              </div>
            </div>

            <div>
              <Label>Condition on Delivery</Label>
              <Select value={podFormData.condition_on_delivery} onValueChange={(value) => setPodFormData({ ...podFormData, condition_on_delivery: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good Condition</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="partial">Partial Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Delivery Notes</Label>
              <Input value={podFormData.delivery_notes} onChange={(e) => setPodFormData({ ...podFormData, delivery_notes: e.target.value })} placeholder="Optional delivery notes..." />
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-2">
                <PenTool className="w-4 h-4" />
                Receiver Signature *
              </Label>
              <SignaturePad
                onSave={(signatureData) => setPodFormData({ ...podFormData, signature: signatureData })}
                onClear={() => setPodFormData({ ...podFormData, signature: null })}
              />
              {podFormData.signature && (
                <div className="mt-2 flex items-center gap-2 text-green-700 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Signature captured
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setPodDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleGeneratePOD}
                disabled={!podFormData.signature || !podFormData.receiver_name}
                className="bg-green-600 hover:bg-green-700"
              >
                <FileText className="w-4 h-4 mr-2" />
                Generate POD
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}