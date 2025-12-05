import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  FolderKanban, Plus, Search, MoreVertical, Calendar, Users,
  DollarSign, BarChart3, Kanban, List, Brain, Edit2, Trash2,
  AlertTriangle, CheckCircle2, Clock, Pause
} from "lucide-react";

import ProjectDialog from "@/components/projects/ProjectDialog";
import TaskDialog from "@/components/projects/TaskDialog";
import ProjectKanban from "@/components/projects/ProjectKanban";
import AIProjectAssistant from "@/components/projects/AIProjectAssistant";
import ProjectProfitability from "@/components/projects/ProjectProfitability";

const STATUS_CONFIG = {
  planning: { label: "Planning", color: "bg-gray-100 text-gray-700", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700", icon: Clock },
  on_hold: { label: "On Hold", color: "bg-yellow-100 text-yellow-700", icon: Pause },
  completed: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: AlertTriangle }
};

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "bg-gray-200 text-gray-700" },
  medium: { label: "Medium", color: "bg-blue-200 text-blue-700" },
  high: { label: "High", color: "bg-orange-200 text-orange-700" },
  critical: { label: "Critical", color: "bg-red-200 text-red-700" }
};

export default function Projects() {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectDialog, setProjectDialog] = useState({ open: false, project: null });
  const [taskDialog, setTaskDialog] = useState({ open: false, task: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, project: null });
  const [activeTab, setActiveTab] = useState("list");
  const [taskView, setTaskView] = useState("kanban");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', selectedCompanyId],
    queryFn: () => base44.entities.Project.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['project-tasks', selectedCompanyId],
    queryFn: () => base44.entities.ProjectTask.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId
  });

  const createProjectMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setProjectDialog({ open: false, project: null });
      toast.success("Project created");
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setProjectDialog({ open: false, project: null });
      toast.success("Project updated");
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeleteDialog({ open: false, project: null });
      setSelectedProject(null);
      toast.success("Project deleted");
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectTask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      setTaskDialog({ open: false, task: null });
      toast.success("Task created");
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      setTaskDialog({ open: false, task: null });
      toast.success("Task updated");
    }
  });

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedProjectTasks = selectedProject 
    ? tasks.filter(t => t.project_id === selectedProject.id) 
    : [];

  const calculateProgress = (project) => {
    const projectTasks = tasks.filter(t => t.project_id === project.id);
    if (projectTasks.length === 0) return project.progress_percent || 0;
    const completed = projectTasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / projectTasks.length) * 100);
  };

  const handleSaveProject = (data) => {
    if (projectDialog.project) {
      updateProjectMutation.mutate({ id: projectDialog.project.id, data });
    } else {
      createProjectMutation.mutate(data);
    }
  };

  const handleSaveTask = (data) => {
    if (taskDialog.task) {
      updateTaskMutation.mutate({ id: taskDialog.task.id, data });
    } else {
      createTaskMutation.mutate(data);
    }
  };

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'in_progress').length,
    completed: projects.filter(p => p.status === 'completed').length,
    totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0)
  };

  if (!selectedCompanyId) {
    return (
      <div className="p-6">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6 text-center">
            <p className="text-yellow-800">Please select a company to manage projects.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FolderKanban className="w-6 h-6" />
              Project Management
            </h1>
            <p className="text-sm text-gray-300 mt-1">
              Manage projects, tasks, deadlines, and track profitability
            </p>
          </div>
          <Button onClick={() => setProjectDialog({ open: true, project: null })}>
            <Plus className="w-4 h-4 mr-2" /> New Project
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FolderKanban className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Projects</p>
                  <p className="text-xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active</p>
                  <p className="text-xl font-bold">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-xl font-bold">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Budget</p>
                  <p className="text-xl font-bold">${stats.totalBudget.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="w-4 h-4" /> Projects
            </TabsTrigger>
            <TabsTrigger value="profitability" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Profitability
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Projects List */}
              <div className="col-span-1 space-y-3">
                {filteredProjects.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-gray-500">
                      No projects found
                    </CardContent>
                  </Card>
                ) : (
                  filteredProjects.map((project) => {
                    const progress = calculateProgress(project);
                    const StatusIcon = STATUS_CONFIG[project.status]?.icon || Clock;
                    return (
                      <Card
                        key={project.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedProject?.id === project.id ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => setSelectedProject(project)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold">{project.name}</h3>
                              {project.customer_name && (
                                <p className="text-sm text-gray-500">{project.customer_name}</p>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setProjectDialog({ open: true, project }); }}>
                                  <Edit2 className="w-4 h-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); setDeleteDialog({ open: true, project }); }}>
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="flex gap-2 mt-2">
                            <Badge className={STATUS_CONFIG[project.status]?.color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {STATUS_CONFIG[project.status]?.label}
                            </Badge>
                            <Badge className={PRIORITY_CONFIG[project.priority]?.color} variant="secondary">
                              {project.priority}
                            </Badge>
                          </div>

                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Progress</span>
                              <span>{progress}%</span>
                            </div>
                            <Progress value={progress} />
                          </div>

                          {project.due_date && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              Due: {format(new Date(project.due_date), 'MMM d, yyyy')}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>

              {/* Project Details & Tasks */}
              <div className="col-span-2">
                {selectedProject ? (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle>{selectedProject.name}</CardTitle>
                          <div className="flex gap-2">
                            <Button
                              variant={taskView === "kanban" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setTaskView("kanban")}
                            >
                              <Kanban className="w-4 h-4" />
                            </Button>
                            <Button
                              variant={taskView === "list" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setTaskView("list")}
                            >
                              <List className="w-4 h-4" />
                            </Button>
                            <Button size="sm" onClick={() => setTaskDialog({ open: true, task: null })}>
                              <Plus className="w-4 h-4 mr-1" /> Task
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {selectedProject.description && (
                          <p className="text-sm text-gray-600 mb-4">{selectedProject.description}</p>
                        )}

                        <div className="grid grid-cols-4 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-gray-500">Budget</p>
                            <p className="font-medium">${(selectedProject.budget || 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Actual Cost</p>
                            <p className="font-medium">${(selectedProject.actual_cost || 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Tasks</p>
                            <p className="font-medium">{selectedProjectTasks.length}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Completed</p>
                            <p className="font-medium">
                              {selectedProjectTasks.filter(t => t.status === 'completed').length}
                            </p>
                          </div>
                        </div>

                        {taskView === "kanban" ? (
                          <ProjectKanban
                            tasks={selectedProjectTasks}
                            onTaskUpdate={(id, data) => updateTaskMutation.mutate({ id, data })}
                            onTaskEdit={(task) => setTaskDialog({ open: true, task })}
                          />
                        ) : (
                          <div className="space-y-2">
                            {selectedProjectTasks.length === 0 ? (
                              <p className="text-center text-gray-500 py-8">No tasks yet</p>
                            ) : (
                              selectedProjectTasks.map((task) => (
                                <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div>
                                    <p className="font-medium">{task.title}</p>
                                    <div className="flex gap-2 mt-1">
                                      <Badge variant="outline">{task.status}</Badge>
                                      <Badge className={PRIORITY_CONFIG[task.priority]?.color} variant="secondary">
                                        {task.priority}
                                      </Badge>
                                    </div>
                                  </div>
                                  <Button variant="ghost" size="sm" onClick={() => setTaskDialog({ open: true, task })}>
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <AIProjectAssistant
                      project={selectedProject}
                      tasks={selectedProjectTasks}
                    />
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center text-gray-500">
                      <FolderKanban className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Select a project to view details and tasks</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="profitability">
            <ProjectProfitability projects={projects} tasks={tasks} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <ProjectDialog
        open={projectDialog.open}
        onClose={() => setProjectDialog({ open: false, project: null })}
        project={projectDialog.project}
        onSave={handleSaveProject}
        isLoading={createProjectMutation.isPending || updateProjectMutation.isPending}
      />

      <TaskDialog
        open={taskDialog.open}
        onClose={() => setTaskDialog({ open: false, task: null })}
        task={taskDialog.task}
        projectId={selectedProject?.id}
        projectName={selectedProject?.name}
        existingTasks={selectedProjectTasks}
        onSave={handleSaveTask}
        isLoading={createTaskMutation.isPending || updateTaskMutation.isPending}
      />

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteDialog.project?.name}" and all associated tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteProjectMutation.mutate(deleteDialog.project?.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}