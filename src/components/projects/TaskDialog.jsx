import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { useCompany } from "@/components/shared/CompanyContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

const TASK_CATEGORIES = [
  { value: "planning", label: "Planning" },
  { value: "procurement", label: "Procurement" },
  { value: "labor", label: "Labor" },
  { value: "inspection", label: "Inspection" },
  { value: "documentation", label: "Documentation" },
  { value: "delivery", label: "Delivery" },
  { value: "other", label: "Other" }
];

export default function TaskDialog({ open, onClose, task, projectId, projectName, existingTasks = [], onSave, isLoading }) {
  const { selectedCompanyId } = useCompany();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    assigned_to: "",
    start_date: "",
    due_date: "",
    estimated_hours: 0,
    estimated_cost: 0,
    category: "other",
    dependencies: [],
    notes: ""
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', selectedCompanyId],
    queryFn: () => supabase.entities.Employee.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        status: task.status || "todo",
        priority: task.priority || "medium",
        assigned_to: task.assigned_to || "",
        start_date: task.start_date || "",
        due_date: task.due_date || "",
        estimated_hours: task.estimated_hours || 0,
        estimated_cost: task.estimated_cost || 0,
        category: task.category || "other",
        dependencies: task.dependencies || [],
        notes: task.notes || ""
      });
    } else {
      setFormData({
        title: "", description: "", status: "todo", priority: "medium",
        assigned_to: "", start_date: "", due_date: "", estimated_hours: 0,
        estimated_cost: 0, category: "other", dependencies: [], notes: ""
      });
    }
  }, [task, open]);

  const handleSubmit = () => {
    if (!formData.title) return;
    const employee = employees.find(e => e.email === formData.assigned_to);
    onSave({
      ...formData,
      company_id: selectedCompanyId,
      project_id: projectId,
      project_name: projectName,
      assigned_name: employee?.full_name || "",
      estimated_hours: Number(formData.estimated_hours) || 0,
      estimated_cost: Number(formData.estimated_cost) || 0
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div>
            <Label>Task Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Assigned To</Label>
              <Select value={formData.assigned_to} onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}>
                <SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Unassigned</SelectItem>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.email}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {formData.start_date ? format(new Date(formData.start_date), 'MMM d, yyyy') : 'Select'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.start_date ? new Date(formData.start_date) : undefined}
                    onSelect={(date) => setFormData({ ...formData, start_date: date ? format(date, 'yyyy-MM-dd') : "" })}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {formData.due_date ? format(new Date(formData.due_date), 'MMM d, yyyy') : 'Select'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.due_date ? new Date(formData.due_date) : undefined}
                    onSelect={(date) => setFormData({ ...formData, due_date: date ? format(date, 'yyyy-MM-dd') : "" })}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Estimated Hours</Label>
              <Input
                type="number"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
              />
            </div>

            <div>
              <Label>Estimated Cost ($)</Label>
              <Input
                type="number"
                value={formData.estimated_cost}
                onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
              />
            </div>
          </div>

          {existingTasks.length > 0 && (
            <div>
              <Label>Dependencies</Label>
              <Select
                value={formData.dependencies[0] || ""}
                onValueChange={(v) => setFormData({ ...formData, dependencies: v ? [v] : [] })}
              >
                <SelectTrigger><SelectValue placeholder="Select dependency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {existingTasks.filter(t => t.id !== task?.id).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading || !formData.title}>
            {isLoading ? "Saving..." : (task ? "Update" : "Create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}