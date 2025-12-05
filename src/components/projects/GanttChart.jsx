import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, differenceInDays, addDays, startOfDay, isWithinInterval } from "date-fns";
import { ArrowRight, AlertTriangle } from "lucide-react";

const STATUS_COLORS = {
  todo: "bg-gray-400",
  in_progress: "bg-blue-500",
  review: "bg-yellow-500",
  completed: "bg-green-500",
  blocked: "bg-red-500"
};

const PRIORITY_COLORS = {
  low: "border-gray-300",
  medium: "border-blue-300",
  high: "border-orange-300",
  critical: "border-red-400"
};

export default function GanttChart({ tasks, projectStartDate, projectDueDate }) {
  const { chartData, dateRange, dayWidth } = useMemo(() => {
    if (tasks.length === 0) return { chartData: [], dateRange: [], dayWidth: 30 };

    // Find date range
    const dates = tasks.flatMap(t => [t.start_date, t.due_date]).filter(Boolean).map(d => new Date(d));
    if (projectStartDate) dates.push(new Date(projectStartDate));
    if (projectDueDate) dates.push(new Date(projectDueDate));
    
    if (dates.length === 0) return { chartData: [], dateRange: [], dayWidth: 30 };

    const minDate = startOfDay(new Date(Math.min(...dates)));
    const maxDate = startOfDay(new Date(Math.max(...dates)));
    const totalDays = differenceInDays(maxDate, minDate) + 1;
    
    // Generate date headers
    const dateRange = [];
    for (let i = 0; i <= totalDays; i++) {
      dateRange.push(addDays(minDate, i));
    }

    // Calculate day width based on total days
    const dayWidth = Math.max(20, Math.min(40, 800 / totalDays));

    // Process tasks for chart
    const chartData = tasks
      .filter(t => !t.parent_task_id) // Only parent tasks
      .map(task => {
        const subTasks = tasks.filter(t => t.parent_task_id === task.id);
        const taskStart = task.start_date ? startOfDay(new Date(task.start_date)) : minDate;
        const taskEnd = task.due_date ? startOfDay(new Date(task.due_date)) : taskStart;
        const startOffset = differenceInDays(taskStart, minDate);
        const duration = differenceInDays(taskEnd, taskStart) + 1;
        
        // Find dependencies
        const dependencies = (task.dependencies || []).map(depId => {
          const depTask = tasks.find(t => t.id === depId);
          return depTask ? { id: depId, title: depTask.title } : null;
        }).filter(Boolean);

        return {
          ...task,
          startOffset,
          duration,
          subTasks: subTasks.map(st => {
            const stStart = st.start_date ? startOfDay(new Date(st.start_date)) : minDate;
            const stEnd = st.due_date ? startOfDay(new Date(st.due_date)) : stStart;
            return {
              ...st,
              startOffset: differenceInDays(stStart, minDate),
              duration: differenceInDays(stEnd, stStart) + 1
            };
          }),
          dependencies
        };
      });

    return { chartData, dateRange, dayWidth };
  }, [tasks, projectStartDate, projectDueDate]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          No tasks with dates to display. Add start and due dates to tasks to see the Gantt chart.
        </CardContent>
      </Card>
    );
  }

  const today = startOfDay(new Date());
  const todayOffset = dateRange.findIndex(d => d.getTime() === today.getTime());

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Gantt Chart - Task Dependencies</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Date Header */}
            <div className="flex border-b">
              <div className="w-48 flex-shrink-0 p-2 bg-gray-50 font-medium text-sm border-r">
                Task
              </div>
              <div className="flex relative">
                {dateRange.map((date, idx) => (
                  <div
                    key={idx}
                    className={`text-center text-xs p-1 border-r ${
                      date.getTime() === today.getTime() ? 'bg-blue-100' : 
                      date.getDay() === 0 || date.getDay() === 6 ? 'bg-gray-50' : ''
                    }`}
                    style={{ width: dayWidth }}
                  >
                    <div className="font-medium">{format(date, 'd')}</div>
                    <div className="text-gray-400">{format(date, 'EEE')}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks */}
            <TooltipProvider>
              {chartData.map((task, taskIdx) => (
                <React.Fragment key={task.id}>
                  {/* Main Task Row */}
                  <div className="flex border-b hover:bg-gray-50">
                    <div className="w-48 flex-shrink-0 p-2 border-r">
                      <div className="font-medium text-sm truncate">{task.title}</div>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex relative" style={{ height: 50 }}>
                      {/* Grid lines */}
                      {dateRange.map((date, idx) => (
                        <div
                          key={idx}
                          className={`border-r ${
                            date.getTime() === today.getTime() ? 'bg-blue-50' : 
                            date.getDay() === 0 || date.getDay() === 6 ? 'bg-gray-50' : ''
                          }`}
                          style={{ width: dayWidth, height: '100%' }}
                        />
                      ))}
                      
                      {/* Task Bar */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`absolute top-2 h-6 rounded ${STATUS_COLORS[task.status]} cursor-pointer
                              border-2 ${PRIORITY_COLORS[task.priority]} flex items-center px-1`}
                            style={{
                              left: task.startOffset * dayWidth,
                              width: Math.max(task.duration * dayWidth - 2, 20)
                            }}
                          >
                            <span className="text-white text-xs truncate font-medium">
                              {task.title}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-sm">
                            <p className="font-medium">{task.title}</p>
                            <p>{task.start_date} → {task.due_date}</p>
                            <p>Status: {task.status}</p>
                            {task.dependencies.length > 0 && (
                              <p>Depends on: {task.dependencies.map(d => d.title).join(', ')}</p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>

                      {/* Dependency arrows */}
                      {task.dependencies.map(dep => {
                        const depTask = chartData.find(t => t.id === dep.id);
                        if (!depTask) return null;
                        const depEndX = (depTask.startOffset + depTask.duration) * dayWidth;
                        const taskStartX = task.startOffset * dayWidth;
                        
                        if (depEndX < taskStartX) {
                          return (
                            <svg
                              key={dep.id}
                              className="absolute pointer-events-none"
                              style={{
                                left: depEndX,
                                top: 14,
                                width: taskStartX - depEndX,
                                height: 20
                              }}
                            >
                              <line
                                x1="0" y1="10"
                                x2={taskStartX - depEndX - 5} y2="10"
                                stroke="#94a3b8"
                                strokeWidth="2"
                                strokeDasharray="4"
                              />
                              <polygon
                                points={`${taskStartX - depEndX - 5},5 ${taskStartX - depEndX},10 ${taskStartX - depEndX - 5},15`}
                                fill="#94a3b8"
                              />
                            </svg>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>

                  {/* Sub-tasks */}
                  {task.subTasks.map((subTask) => (
                    <div key={subTask.id} className="flex border-b hover:bg-gray-50 bg-gray-25">
                      <div className="w-48 flex-shrink-0 p-2 border-r pl-6">
                        <div className="text-sm text-gray-600 truncate">↳ {subTask.title}</div>
                      </div>
                      <div className="flex relative" style={{ height: 36 }}>
                        {dateRange.map((date, idx) => (
                          <div
                            key={idx}
                            className={`border-r ${
                              date.getTime() === today.getTime() ? 'bg-blue-50' : 
                              date.getDay() === 0 || date.getDay() === 6 ? 'bg-gray-50' : ''
                            }`}
                            style={{ width: dayWidth, height: '100%' }}
                          />
                        ))}
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`absolute top-1.5 h-4 rounded ${STATUS_COLORS[subTask.status]} opacity-80 cursor-pointer`}
                              style={{
                                left: subTask.startOffset * dayWidth,
                                width: Math.max(subTask.duration * dayWidth - 2, 16)
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{subTask.title}</p>
                            <p>{subTask.start_date} → {subTask.due_date}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </TooltipProvider>

            {/* Today indicator line */}
            {todayOffset >= 0 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                style={{ left: 192 + todayOffset * dayWidth + dayWidth / 2 }}
              />
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 pt-4 border-t text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-gray-400 rounded" /> To Do
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-blue-500 rounded" /> In Progress
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-yellow-500 rounded" /> Review
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-green-500 rounded" /> Completed
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-red-500 rounded" /> Blocked
          </div>
          <div className="flex items-center gap-2 ml-4">
            <ArrowRight className="w-4 h-4 text-gray-400" /> Dependency
          </div>
        </div>
      </CardContent>
    </Card>
  );
}