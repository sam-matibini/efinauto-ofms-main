import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

export default function AIMileageScanner({ onMileageDetected }) {
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

      // Use AI to extract mileage from the image
      const response = await supabase.integrations.Core.InvokeLLM({
        prompt: `Analyze this image of a vehicle's dashboard or odometer and extract the mileage reading.
        Look for:
        - Digital odometer displays
        - Analog odometer readings
        - Trip meter displays
        - Dashboard displays showing mileage/distance
        
        Extract the numerical mileage value. If the unit is visible (km, miles, mi), note that as well.
        Return the mileage as a number. If no mileage is visible, indicate that.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            mileage_detected: { type: "boolean" },
            mileage: { type: "number" },
            unit: { type: "string", enum: ["km", "miles", "unknown"] },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            display_type: { type: "string" },
            notes: { type: "string" }
          }
        }
      });

      setResult(response);

      if (response.mileage_detected && response.mileage) {
        toast.success("Mileage detected successfully!");
        onMileageDetected(response.mileage);
      } else {
        toast.warning("No mileage detected in the image");
      }
    } catch (error) {
      console.error("Mileage scanning error:", error);
      toast.error("Failed to scan mileage from image");
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
          id="mileage-scanner-input"
          className="hidden"
        />
        <label htmlFor="mileage-scanner-input">
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
                  Scanning Mileage...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Scan Mileage from Photo
                </>
              )}
            </span>
          </Button>
        </label>
      </div>

      {result && (
        <Card className="p-4">
          <div className="flex items-start gap-3">
            {result.mileage_detected ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
            )}
            <div className="flex-1 space-y-2">
              {result.mileage_detected ? (
                <>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Mileage Detected</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {result.mileage.toLocaleString()} {result.unit}
                    </p>
                  </div>
                  {result.display_type && (
                    <p className="text-xs text-gray-600">Display: {result.display_type}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Confidence: <span className="font-medium">{result.confidence}</span>
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-600">{result.notes || "No mileage detected in image"}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      <p className="text-xs text-gray-500">
        Take a clear photo of the vehicle's odometer or dashboard display
      </p>
    </div>
  );
}