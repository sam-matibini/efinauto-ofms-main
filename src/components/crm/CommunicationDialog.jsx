import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/api/supabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

export default function CommunicationDialog({ 
  open, onClose, communication, companyId, customerId, leadId, opportunityId, onDelete 
}) {
  const [formData, setFormData] = useState({
    communication_type: "call",
    direction: "outbound",
    subject: "",
    notes: "",
    outcome: "",
    duration_minutes: "",
    communication_date: new Date().toISOString().slice(0, 16)
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (communication) {
      setFormData({ ...communication });
    } else {
      setFormData({
        communication_type: "call",
        direction: "outbound",
        subject: "",
        notes: "",
        outcome: "",
        duration_minutes: "",
        communication_date: new Date().toISOString().slice(0, 16)
      });
    }
  }, [communication, open]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const user = await supabase.auth.me();
      const payload = {
        ...data,
        company_id: companyId,
        customer_id: customerId,
        lead_id: leadId,
        opportunity_id: opportunityId,
        logged_by: user.email
      };
      if (communication) {
        return supabase.entities.CommunicationLog.update(communication.id, payload);
      } else {
        return supabase.entities.CommunicationLog.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      toast.success(communication ? "Communication updated" : "Communication logged");
      onClose();
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{communication ? 'Edit Communication' : 'Log Communication'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Type</Label>
            <Select value={formData.communication_type} 
                    onValueChange={(value) => setFormData({...formData, communication_type: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="social_media">Social Media</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Direction</Label>
            <Select value={formData.direction} 
                    onValueChange={(value) => setFormData({...formData, direction: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Subject</Label>
            <Input value={formData.subject} 
                   onChange={(e) => setFormData({...formData, subject: e.target.value})} 
                   placeholder="Brief description" />
          </div>
          <div>
            <Label>Date & Time</Label>
            <Input type="datetime-local" value={formData.communication_date} 
                   onChange={(e) => setFormData({...formData, communication_date: e.target.value})} />
          </div>
          <div>
            <Label>Duration (minutes)</Label>
            <Input type="number" value={formData.duration_minutes} 
                   onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})} />
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea value={formData.notes} 
                      onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                      rows={4}
                      placeholder="Detailed notes about the communication..." />
          </div>
          <div className="col-span-2">
            <Label>Outcome</Label>
            <Input value={formData.outcome} 
                   onChange={(e) => setFormData({...formData, outcome: e.target.value})} 
                   placeholder="e.g., Scheduled follow-up, Sent proposal" />
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          {communication && (
            <Button variant="outline" onClick={() => { onDelete(communication.id); onClose(); }} 
                    className="text-red-600 border-red-300">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}