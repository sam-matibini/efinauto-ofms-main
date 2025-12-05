import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Calendar, Clock, AlertTriangle, Edit2 } from "lucide-react";

const COLUMNS = [
  { id: "todo", title: "To Do", color: "bg-gray-100" },
  { id: "in_progress", title: "In Progress", color: "bg-blue-100" },
  { id: "review", title: "Review", color: "bg-yellow-100" },
  { id: "completed", title: "Completed", color: "bg-green-100" },
  { id: "blocked", title: "Blocked", color: "bg-red-100" }
];

const PRIORITY_COLORS = {
  low: "bg-gray-200 text-gray-700",
  medium: "bg-blue-200 text-blue-700",
  high: "bg-orange-200 text-orange-700",
  critical: "bg-red-200 text-red-700"
};

export default function ProjectKanban({ tasks, onTaskUpdate, onTaskEdit }) {
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId;
    const task = tasks.find(t => t.id === taskId);
    
    if (task && task.status !== newStatus) {
      onTaskUpdate(taskId, { 
        status: newStatus,
        completed_date: newStatus === 'completed' ? format(new Date(), 'yyyy-MM-dd') : null
      });
    }
  };

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => t.status === col.id);
    return acc;
  }, {});

  const isOverdue = (task) => {
    if (task.status === 'completed') return false;
    if (!task.due_date) return false;
    return new Date(task.due_date) < new Date();
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((column) => (
          <div key={column.id} className="flex-shrink-0 w-72">
            <div className={`rounded-t-lg p-3 ${column.color}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{column.title}</h3>
                <Badge variant="secondary">{tasksByStatus[column.id].length}</Badge>
              </div>
            </div>
            
            <Droppable droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-96 p-2 space-y-2 bg-gray-50 rounded-b-lg transition-colors ${
                    snapshot.isDraggingOver ? 'bg-blue-50' : ''
                  }`}
                >
                  {tasksByStatus[column.id].map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(provided, snapshot) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`cursor-grab ${snapshot.isDragging ? 'shadow-lg rotate-2' : ''} ${
                            isOverdue(task) ? 'border-red-300' : ''
                          }`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-medium text-sm flex-1">{task.title}</h4>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => onTaskEdit(task)}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            </div>
                            
                            <div className="flex flex-wrap gap-1 mt-2">
                              <Badge className={PRIORITY_COLORS[task.priority]} variant="secondary">
                                {task.priority}
                              </Badge>
                              {task.category && (
                                <Badge variant="outline" className="text-xs">
                                  {task.category}
                                </Badge>
                              )}
                            </div>

                            {isOverdue(task) && (
                              <div className="flex items-center gap-1 text-red-600 text-xs mt-2">
                                <AlertTriangle className="w-3 h-3" />
                                Overdue
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                              <div className="flex items-center gap-2">
                                {task.due_date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(task.due_date), 'MMM d')}
                                  </span>
                                )}
                                {task.estimated_hours > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {task.estimated_hours}h
                                  </span>
                                )}
                              </div>
                              {task.assigned_name && (
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs bg-blue-100">
                                    {task.assigned_name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}