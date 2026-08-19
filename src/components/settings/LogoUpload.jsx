import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  Trash2, 
  Image as ImageIcon, 
  Loader2, 
  CheckCircle, 
  Info,
  RefreshCw,
  Eye
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";

export default function LogoUpload({ company, onUpdate, isUpdating }) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

  const validateFile = (file) => {
    if (!file) {
      toast.error("No file selected");
      return false;
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Please upload a PNG or JPG image");
      return false;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size must be less than 2MB");
      return false;
    }
    
    return true;
  };

  const handleFileSelect = async (file) => {
    if (!validateFile(file)) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target.result);
    reader.readAsDataURL(file);

    // Upload file
    setUploading(true);
    try {
      const { file_url } = await supabase.integrations.Core.UploadFile({ file });
      
      // Add cache-busting parameter
      const logoUrlWithCache = `${file_url}?v=${Date.now()}`;
      
      // Update company with new logo URL
      await onUpdate({ logo_url: logoUrlWithCache });
      
      toast.success("Logo uploaded successfully!");
      setPreviewUrl(null);
    } catch (error) {
      console.error("Logo upload error:", error);
      toast.error("Failed to upload logo");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    // Reset input
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleRemoveLogo = async () => {
    if (!confirm("Are you sure you want to remove the company logo?")) return;
    
    try {
      await onUpdate({ logo_url: "" });
      toast.success("Logo removed successfully");
    } catch (error) {
      toast.error("Failed to remove logo");
    }
  };

  const currentLogo = company?.logo_url;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Company Logo
        </CardTitle>
        <CardDescription>
          Upload your company logo to display on all documents (invoices, bills of sale, paystubs, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Requirements:</strong> PNG or JPG format, max 2MB. Recommended: PNG with transparent background, 300px width.
          </AlertDescription>
        </Alert>

        {/* Current Logo Display */}
        {currentLogo && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="text-sm text-gray-600 mb-3 font-medium">Current Logo:</p>
            <div className="flex items-center gap-4">
              <div className="bg-white border rounded-lg p-4 flex items-center justify-center min-w-[150px] min-h-[80px]">
                <img 
                  src={currentLogo} 
                  alt="Company Logo" 
                  className="max-w-[150px] max-h-[80px] object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="hidden items-center justify-center text-gray-400 text-sm">
                  <ImageIcon className="w-8 h-8" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(currentLogo, '_blank')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Full Size
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRemoveLogo}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove Logo
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="text-sm text-gray-600">Uploading logo...</p>
            </div>
          ) : previewUrl ? (
            <div className="flex flex-col items-center gap-3">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="max-w-[200px] max-h-[100px] object-contain border rounded"
              />
              <p className="text-sm text-gray-600">Processing...</p>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop your logo here, or click to browse
              </p>
              <p className="text-xs text-gray-500">
                PNG or JPG, max 2MB
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                {currentLogo ? 'Replace Logo' : 'Upload Logo'}
              </Button>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>

        {/* Document Preview Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Logo will appear on:
          </h4>
          <ul className="text-sm text-blue-700 grid grid-cols-2 gap-1">
            <li>• Invoices</li>
            <li>• Bills of Sale</li>
            <li>• Quotations</li>
            <li>• Paystubs</li>
            <li>• Purchase Orders</li>
            <li>• Loading Declarations</li>
            <li>• Export Documents</li>
            <li>• Repair Invoices</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}