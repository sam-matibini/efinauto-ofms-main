import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function TemplateDialog({ open, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    entries: [
      { account: "", debit: 0, credit: 0 },
      { account: "", debit: 0, credit: 0 }
    ]
  });

  const handleSave = () => {
    if (!formData.name) {
      toast.error("Template name is required");
      return;
    }
    
    // Save to localStorage for now
    const templates = JSON.parse(localStorage.getItem('journalTemplates') || '[]');
    templates.push({ ...formData, id: Date.now() });
    localStorage.setItem('journalTemplates', JSON.stringify(templates));
    
    toast.success("Template saved!");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Journal Entry Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Template Name *</Label>
            <Input 
              placeholder="e.g., Monthly Rent Payment" 
              value={formData.name} 
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea 
              placeholder="Describe when to use this template..." 
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})} 
              rows={3}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Templates help you quickly create recurring journal entries. Define the accounts and structure here, and fill in amounts when using the template.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Template</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}