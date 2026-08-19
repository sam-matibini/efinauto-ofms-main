import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

export default function AIVINScanner({ onVINDetected }) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    setScanning(true);
    setResult(null);

    try {
      // Upload the image first
      const { file_url } = await supabase.integrations.Core.UploadFile({ file });

      // Use AI to extract VIN from the image
      const response = await supabase.integrations.Core.InvokeLLM({
        prompt: `Analyze this image and extract the Vehicle Identification Number (VIN). 
        The VIN is typically 17 characters long and contains both letters and numbers.
        Look for VIN labels on the vehicle, dashboard, door jamb, or any visible VIN plate.
        If you find a VIN, return it. If no VIN is visible, indicate that.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            vin_detected: { type: "boolean" },
            vin: { type: "string" },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            location: { type: "string" },
            notes: { type: "string" }
          }
        }
      });

      setResult(response);

      if (response.vin_detected && response.vin) {
        toast.success("VIN detected successfully!");
        onVINDetected(response.vin.toUpperCase());
      } else {
        toast.warning("No VIN detected in the image");
      }
    } catch (error) {
      console.error("VIN scanning error:", error);
      toast.error("Failed to scan VIN from image");
    }

    setScanning(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageUpload}
          disabled={scanning}
          id="vin-scanner-input"
          className="hidden"
        />
        <label htmlFor="vin-scanner-input">
          <Button
            type="button"
            variant="outline"
            disabled={scanning}
            className="w-full cursor-pointer"
            asChild
          >
            <span>
              {scanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning VIN...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Scan VIN from Photo
                </>
              )}
            </span>
          </Button>
        </label>
      </div>

      {result && (
        <Card className="p-4">
          <div className="flex items-start gap-3">
            {result.vin_detected ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
            )}
            <div className="flex-1 space-y-2">
              {result.vin_detected ? (
                <>
                  <div>
                    <p className="text-sm font-medium text-gray-700">VIN Detected</p>
                    <p className="text-lg font-mono font-bold text-gray-900">{result.vin}</p>
                  </div>
                  {result.location && (
                    <p className="text-xs text-gray-600">Location: {result.location}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Confidence: <span className="font-medium">{result.confidence}</span>
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-600">{result.notes || "No VIN detected in image"}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      <p className="text-xs text-gray-500">
        Take a clear photo of the VIN plate on the dashboard, door jamb, or vehicle registration
      </p>
    </div>
  );
}