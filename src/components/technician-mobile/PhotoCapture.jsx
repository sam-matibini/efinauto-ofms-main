import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";

export default function PhotoCapture({ open, onClose, onCapture, isOnline }) {
  const [capturedImage, setCapturedImage] = useState(null);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const result = await base44.integrations.Core.UploadFile({ file });
      return result.file_url;
    },
  });

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      toast.error("Could not access camera");
      console.error(error);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  const captureFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      setCapturedImage(blob);
      stopCamera();
    }, 'image/jpeg', 0.8);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setCapturedImage(file);
      } else {
        toast.error("Please select an image or video file");
      }
    }
  };

  const handleUpload = async () => {
    if (!capturedImage) return;

    if (!isOnline) {
      // Store in localStorage for later upload
      const reader = new FileReader();
      reader.onload = () => {
        const offlinePhoto = {
          url: reader.result,
          description,
          uploaded_date: new Date().toISOString(),
          offline: true,
        };
        onCapture(offlinePhoto);
        handleClose();
      };
      reader.readAsDataURL(capturedImage);
      return;
    }

    setUploading(true);
    try {
      const url = await uploadMutation.mutateAsync(capturedImage);
      onCapture({ url, description, uploaded_date: new Date().toISOString() });
      toast.success("Photo uploaded successfully");
      handleClose();
    } catch (error) {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setDescription("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Capture Photo/Video</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!capturedImage && !cameraActive && (
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={startCamera}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Camera className="w-4 h-4 mr-2" />
                Open Camera
              </Button>
              <Button 
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {cameraActive && (
            <div className="space-y-3">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline
                className="w-full rounded-lg"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={captureFromCamera}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Capture
                </Button>
                <Button 
                  onClick={stopCamera}
                  variant="outline"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {capturedImage && (
            <div className="space-y-3">
              <div className="relative">
                <img 
                  src={URL.createObjectURL(capturedImage)} 
                  alt="Captured"
                  className="w-full rounded-lg"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={() => setCapturedImage(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description..."
                />
              </div>

              <Button 
                onClick={handleUpload}
                disabled={uploading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {uploading ? "Uploading..." : "Add to Order"}
              </Button>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>
      </DialogContent>
    </Dialog>
  );
}