import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import TaskDialog from "./TaskDialog";

export default function TasksTab({ companyId, customerId, leadId, opportunityId }) {
  const [selectedTask, setSelectedTask] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const filterCriteria = { company_id: companyId };
  if (customerId) filterCriteria.customer_id = customerId;
  if (leadId) filterCriteria.lead_id = leadId;
  if (opportunityId) filterCriteria.opportunity_id = opportunityId;

  const { data: tasks = [] } = useQuery({
    queryKey: ['crm-tasks', companyId, customerId, leadId, opportunityId],
    queryFn: () => supabase.entities.CRMTask.filter(filterCriteria, 'due_date'),
    enabled: !!companyId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => supabase.entities.CRMTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tasks'] });
      toast.success("Task updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supabase.entities.CRMTask.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tasks'] });
      toast.success("Task deleted");
    },
  });

  const handleToggleComplete = (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const updates = { status: newStatus };
    if (newStatus === 'completed') {
      updates.completed_date = new Date().toISOString();
    }
    updateMutation.mutate({ id: task.id, data: updates });
  };

  const priorityColors = {
    low: "bg-gray-100 text-gray-800",
    medium: "bg-blue-100 text-blue-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800"
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800"
  };

  const pendingTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold">Tasks & Follow-ups</h3>
          <p className="text-sm text-gray-600">{pendingTasks.length} pending tasks</p>
        </div>
        <Button onClick={() => { setSelectedTask(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      <div className="space-y-3">
        <h4 className="font-semibold text-sm text-gray-700">Pending Tasks</h4>
        {pendingTasks.map((task) => (
          <Card key={task.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={task.status === 'completed'}
                  onCheckedChange={() => handleToggleComplete(task)}
                  className="mt-1"
                />
                <div className="flex-1 cursor-pointer" onClick={() => { setSelectedTask(task); setDialogOpen(true); }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-gray-600 line-clamp-1">{task.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Badge className={priorityColors[task.priority]}>
                        {task.priority}
                      </Badge>
                      <Badge className={statusColors[task.status]}>
                        {task.status?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {task.due_date && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(task.due_date), 'MMM d, yyyy h:mm a')}
                      </div>
                    )}
                    {task.assigned_to && (
                      <span>Assigned to: {task.assigned_to.split('@')[0]}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {pendingTasks.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No pending tasks</p>
            </CardContent>
          </Card>
        )}
      </div>

      {completedTasks.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-gray-700">Completed Tasks</h4>
          {completedTasks.slice(0, 5).map((task) => (
            <Card key={task.id} className="opacity-75">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox checked={true} disabled className="mt-1" />
                  <div className="flex-1">
                    <h4 className="font-semibold line-through">{task.title}</h4>
                    {task.completed_date && (
                      <p className="text-xs text-gray-500">
                        Completed {format(new Date(task.completed_date), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TaskDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setSelectedTask(null); }}
        task={selectedTask}
        companyId={companyId}
        customerId={customerId}
        leadId={leadId}
        opportunityId={opportunityId}
        onDelete={deleteMutation.mutate}
      />
    </div>
  );
}