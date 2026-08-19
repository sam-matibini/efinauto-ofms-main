import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { useCompany } from "@/components/shared/CompanyContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { 
  Clock, Paperclip, ListTree, Edit2, Calendar, User, 
  AlertTriangle, CheckCircle2, Plus
} from "lucide-react";
import TaskTimeTracking from "./TaskTimeTracking";
import TaskAttachments from "./TaskAttachments";

const STATUS_CONFIG = {
  todo: { label: "To Do", color: "bg-gray-100 text-gray-700" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700" },
  review: { label: "Review", color: "bg-yellow-100 text-yellow-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
  blocked: { label: "Blocked", color: "bg-red-100 text-red-700" }
};

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "bg-gray-200 text-gray-700" },
  medium: { label: "Medium", color: "bg-blue-200 text-blue-700" },
  high: { label: "High", color: "bg-orange-200 text-orange-700" },
  critical: { label: "Critical", color: "bg-red-200 text-red-700" }
};

export default function TaskDetailDialog({ 
  open, 
  onClose, 
  task, 
  subTasks = [],
  onEdit, 
  onUpdateTask,
  onAddSubTask 
}) {
  const [activeTab, setActiveTab] = useState("details");

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => supabase.auth.me()
  });

  if (!task) return null;

  const completedSubTasks = subTasks.filter(st => st.status === 'completed').length;
  const subTaskProgress = subTasks.length > 0 ? (completedSubTasks / subTasks.length) * 100 : 0;
  const totalHours = (task.time_entries || []).reduce((sum, e) => sum + (e.hours || 0), 0);
  const attachmentCount = (task.attachments || []).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{task.title}</DialogTitle>
              <div className="flex gap-2 mt-2">
                <Badge className={STATUS_CONFIG[task.status]?.color}>
                  {STATUS_CONFIG[task.status]?.label}
                </Badge>
                <Badge className={PRIORITY_CONFIG[task.priority]?.color} variant="secondary">
                  {task.priority}
                </Badge>
                {task.category && (
                  <Badge variant="outline">{task.category}</Badge>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => onEdit(task)}>
              <Edit2 className="w-4 h-4 mr-1" /> Edit
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="subtasks" className="flex items-center gap-1">
              <ListTree className="w-3 h-3" />
              Sub-tasks ({subTasks.length})
            </TabsTrigger>
            <TabsTrigger value="time" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Time ({totalHours.toFixed(1)}h)
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              Files ({attachmentCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {task.description && (
              <div>
                <h4 className="font-medium text-sm text-gray-500 mb-1">Description</h4>
                <p className="text-sm">{task.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Start Date</p>
                  <p className="text-sm font-medium">
                    {task.start_date ? format(new Date(task.start_date), 'MMM d, yyyy') : '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Due Date</p>
                  <p className="text-sm font-medium">
                    {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Assigned To</p>
                  <p className="text-sm font-medium">{task.assigned_name || 'Unassigned'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Estimated Hours</p>
                  <p className="text-sm font-medium">{task.estimated_hours || 0}h</p>
                </div>
              </div>
            </div>

            {task.dependencies?.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-gray-500 mb-1">Dependencies</h4>
                <div className="flex flex-wrap gap-1">
                  {task.dependencies.map((depId, i) => (
                    <Badge key={i} variant="outline">{depId}</Badge>
                  ))}
                </div>
              </div>
            )}

            {task.notes && (
              <div>
                <h4 className="font-medium text-sm text-gray-500 mb-1">Notes</h4>
                <p className="text-sm bg-gray-50 p-3 rounded">{task.notes}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="subtasks" className="mt-4">
            <div className="space-y-4">
              {/* Progress */}
              {subTasks.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Sub-task Progress</span>
                    <span>{completedSubTasks}/{subTasks.length} completed</span>
                  </div>
                  <Progress value={subTaskProgress} />
                </div>
              )}

              {/* Add Sub-task Button */}
              <Button variant="outline" className="w-full" onClick={() => onAddSubTask(task)}>
                <Plus className="w-4 h-4 mr-2" /> Add Sub-task
              </Button>

              {/* Sub-tasks List */}
              {subTasks.length > 0 ? (
                <div className="space-y-2">
                  {subTasks.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => onEdit(st)}
                    >
                      <div className="flex items-center gap-3">
                        {st.status === 'completed' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : st.status === 'blocked' ? (
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        ) : (
                          <div className="w-5 h-5 border-2 rounded-full" />
                        )}
                        <div>
                          <p className={`font-medium ${st.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                            {st.title}
                          </p>
                          <div className="flex gap-2 mt-1">
                            <Badge className={`${STATUS_CONFIG[st.status]?.color} text-xs`} variant="secondary">
                              {st.status}
                            </Badge>
                            {st.due_date && (
                              <span className="text-xs text-gray-500">
                                Due: {format(new Date(st.due_date), 'MMM d')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {st.assigned_name && (
                        <span className="text-sm text-gray-500">{st.assigned_name}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No sub-tasks yet. Break down this task into smaller pieces.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="time" className="mt-4">
            <TaskTimeTracking 
              task={task} 
              currentUser={currentUser} 
              onUpdateTask={onUpdateTask} 
            />
          </TabsContent>

          <TabsContent value="files" className="mt-4">
            <TaskAttachments 
              task={task} 
              onUpdateTask={onUpdateTask} 
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}