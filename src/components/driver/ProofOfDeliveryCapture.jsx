import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Upload, CheckCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import SignaturePad from "@/components/shared/SignaturePad";

export default function ProofOfDeliveryCapture({ open, onClose, shipment, driver }) {
  const queryClient = useQueryClient();
  const [receiverName, setReceiverName] = useState("");
  const [receiverRole, setReceiverRole] = useState("");
  const [signature, setSignature] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [notes, setNotes] = useState("");
  const [condition, setCondition] = useState("good");
  const [location, setLocation] = useState(null);
  const fileInputRef = useRef(null);

  const capturePODMutation = useMutation({
    mutationFn: async () => {
      // Get current location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      // Upload photos
      const photoUrls = await Promise.all(
        photos.map(async (photo) => {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: photo });
          return file_url;
        })
      );

      // Create POD record
      const pod = await base44.entities.ProofOfDelivery.create({
        shipment_id: shipment.id,
        driver_id: driver.id,
        driver_name: driver.driver_name,
        truck_number: shipment.truck_id,
        receiver_signature_url: signature,
        receiver_name: receiverName,
        receiver_role: receiverRole,
        delivered_at: new Date().toISOString(),
        delivery_location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          address: shipment.destination_address
        },
        delivery_photos: photoUrls,
        delivery_notes: notes,
        condition_on_delivery: condition,
        commodities_summary: shipment.commodities?.map(c => c.product_name).join(", "),
        total_weight_kg: shipment.total_weight_kg
      });

      // Update shipment status
      await base44.entities.LocalShipment.update(shipment.id, {
        status: 'delivered',
        actual_delivery_time: new Date().toISOString(),
        pod_id: pod.id
      });

      return pod;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeShipment'] });
      queryClient.invalidateQueries({ queryKey: ['assignedShipments'] });
      toast.success("Proof of Delivery captured successfully!");
      onClose();
    },
    onError: () => toast.error("Failed to capture POD")
  });

  const handlePhotoCapture = (e) => {
    const files = Array.from(e.target.files);
    setPhotos([...photos, ...files]);
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const canSubmit = receiverName && signature && photos.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Capture Proof of Delivery</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Receiver Name *</Label>
            <Input
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="Name of person receiving"
            />
          </div>

          <div>
            <Label>Receiver Role/Title</Label>
            <Input
              value={receiverRole}
              onChange={(e) => setReceiverRole(e.target.value)}
              placeholder="e.g., Warehouse Manager"
            />
          </div>

          <div>
            <Label>Condition on Delivery *</Label>
            <div className="flex gap-2 mt-2">
              {['good', 'damaged', 'partial'].map(cond => (
                <Button
                  key={cond}
                  onClick={() => setCondition(cond)}
                  variant={condition === cond ? "default" : "outline"}
                  size="sm"
                  className={condition === cond ? 'bg-blue-600' : ''}
                >
                  {cond === 'good' ? '✓ Good' : cond === 'damaged' ? '⚠ Damaged' : '📦 Partial'}
                </Button>
              ))}
            </div>
          </div>

          {condition !== 'good' && (
            <div>
              <Label>Damage/Issue Description</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe any damage or issues..."
                rows={3}
              />
            </div>
          )}

          <div>
            <Label>Delivery Photos * (At least 1 required)</Label>
            <div className="mt-2 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handlePhotoCapture}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full"
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Photo ({photos.length})
              </Button>
              
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <button
                        onClick={() => removePhoto(idx)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <Label>Receiver Signature *</Label>
            <SignaturePad onSave={setSignature} />
            {signature && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                ✓ Signature captured
              </div>
            )}
          </div>

          <div>
            <Label>Additional Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about the delivery..."
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => capturePODMutation.mutate()}
              disabled={!canSubmit || capturePODMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {capturePODMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Complete Delivery
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}