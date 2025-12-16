import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

export default function TaskDialog({ 
  open, onClose, task, companyId, customerId, leadId, opportunityId, onDelete 
}) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    task_type: "follow_up",
    status: "pending",
    priority: "medium",
    due_date: "",
    assigned_to: "",
    notes: ""
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (task) {
      setFormData({ ...task });
    } else {
      setFormData({
        title: "",
        description: "",
        task_type: "follow_up",
        status: "pending",
        priority: "medium",
        due_date: "",
        assigned_to: "",
        notes: ""
      });
    }
  }, [task, open]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        company_id: companyId,
        customer_id: customerId,
        lead_id: leadId,
        opportunity_id: opportunityId
      };
      if (task) {
        return base44.entities.CRMTask.update(task.id, payload);
      } else {
        return base44.entities.CRMTask.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tasks'] });
      toast.success(task ? "Task updated" : "Task created");
      onClose();
    },
  });

  const handleSave = () => {
    if (!formData.title) {
      toast.error("Title is required");
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Add New Task'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Title *</Label>
            <Input value={formData.title} 
                   onChange={(e) => setFormData({...formData, title: e.target.value})} 
                   placeholder="e.g., Follow up on proposal" />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={formData.task_type} 
                    onValueChange={(value) => setFormData({...formData, task_type: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="follow_up">Follow-up</SelectItem>
                <SelectItem value="demo">Demo</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={formData.priority} 
                    onValueChange={(value) => setFormData({...formData, priority: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={formData.status} 
                    onValueChange={(value) => setFormData({...formData, status: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Due Date</Label>
            <Input type="datetime-local" value={formData.due_date} 
                   onChange={(e) => setFormData({...formData, due_date: e.target.value})} />
          </div>
          <div>
            <Label>Assigned To (Email)</Label>
            <Input value={formData.assigned_to} 
                   onChange={(e) => setFormData({...formData, assigned_to: e.target.value})} />
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Textarea value={formData.description} 
                      onChange={(e) => setFormData({...formData, description: e.target.value})} 
                      rows={3} />
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea value={formData.notes} 
                      onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                      rows={2} />
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          {task && (
            <Button variant="outline" onClick={() => { onDelete(task.id); onClose(); }} 
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