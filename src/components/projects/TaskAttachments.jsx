import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Paperclip, Upload, Trash2, Download, File, Image, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

const FILE_ICONS = {
  image: Image,
  pdf: FileText,
  default: File
};

const getFileIcon = (type) => {
  if (type?.startsWith('image/')) return FILE_ICONS.image;
  if (type?.includes('pdf')) return FILE_ICONS.pdf;
  return FILE_ICONS.default;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function TaskAttachments({ task, onUpdateTask }) {
  const [isUploading, setIsUploading] = useState(false);
  const attachments = task.attachments || [];

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);
    try {
      const { file_url } = await supabase.integrations.Core.UploadFile({ file });
      
      const newAttachment = {
        name: file.name,
        url: file_url,
        type: file.type,
        size: file.size,
        uploaded_at: new Date().toISOString()
      };

      onUpdateTask(task.id, {
        attachments: [...attachments, newAttachment]
      });

      toast.success("File uploaded");
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = (index) => {
    const updatedAttachments = attachments.filter((_, i) => i !== index);
    onUpdateTask(task.id, { attachments: updatedAttachments });
    toast.success("Attachment removed");
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
        <Input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileUpload}
          disabled={isUploading}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="flex flex-col items-center gap-2">
            {isUploading ? (
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-gray-400" />
            )}
            <p className="text-sm text-gray-600">
              {isUploading ? "Uploading..." : "Click to upload or drag and drop"}
            </p>
            <p className="text-xs text-gray-400">Max file size: 10MB</p>
          </div>
        </label>
      </div>

      {/* Attachments List */}
      {attachments.length > 0 ? (
        <div className="space-y-2">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            Attachments ({attachments.length})
          </h4>
          {attachments.map((attachment, index) => {
            const FileIcon = getFileIcon(attachment.type);
            return (
              <Card key={index}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded">
                      <FileIcon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm truncate max-w-xs">{attachment.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(attachment.size)} • {attachment.uploaded_at && format(new Date(attachment.uploaded_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                    >
                      <a href={attachment.url} target="_blank" rel="noopener noreferrer" download>
                        <Download className="w-4 h-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-4">No attachments yet</p>
      )}
    </div>
  );
}