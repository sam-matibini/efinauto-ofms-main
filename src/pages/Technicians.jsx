import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Search, 
  Users,
  Clock,
  Calendar,
  Edit,
  Trash2,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCompany } from "@/components/shared/CompanyContext";
import { toast } from "sonner";
import TechnicianDialog from "@/components/technicians/TechnicianDialog";
import TimesheetView from "@/components/technicians/TimesheetView";

export default function TechniciansPage() {
  const { selectedCompanyId } = useCompany();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTech, setEditingTech] = useState(null);
  const queryClient = useQueryClient();

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians', selectedCompanyId],
    queryFn: () => base44.entities.Technician.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ['timesheets', selectedCompanyId],
    queryFn: () => base44.entities.Timesheet.filter({ company_id: selectedCompanyId }, '-date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Technician.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast.success("Technician added");
      setDialogOpen(false);
      setEditingTech(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Technician.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast.success("Technician updated");
      setDialogOpen(false);
      setEditingTech(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Technician.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast.success("Technician deleted");
    },
  });

  const handleSave = (data) => {
    if (editingTech) {
      updateMutation.mutate({ id: editingTech.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this technician?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredTechs = technicians.filter(tech =>
    tech.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tech.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeTechs = technicians.filter(t => t.status === 'active').length;
  const todayTimesheets = timesheets.filter(t => 
    t.date === new Date().toISOString().split('T')[0]
  );
  const todayHours = todayTimesheets.reduce((sum, t) => sum + (t.total_hours || 0), 0);

  if (!selectedCompanyId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please select a company.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Technicians</h1>
            <p className="text-sm text-gray-300 mt-1">Manage mechanics and track timesheets</p>
          </div>
          <Button onClick={() => {
            setEditingTech(null);
            setDialogOpen(true);
          }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Technician
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Technicians</p>
                <h3 className="text-2xl font-bold text-gray-900">{activeTechs}</h3>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today's Hours</p>
                <h3 className="text-2xl font-bold text-gray-900">{todayHours.toFixed(1)}</h3>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Clock-Ins Today</p>
                <h3 className="text-2xl font-bold text-gray-900">{todayTimesheets.length}</h3>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="technicians" className="space-y-4">
        <TabsList>
          <TabsTrigger value="technicians">Technicians</TabsTrigger>
          <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
        </TabsList>

        <TabsContent value="technicians" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search technicians..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-0 focus-visible:ring-0"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTechs.map((tech) => (
              <Card key={tech.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={tech.photo_url} />
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {tech.full_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{tech.full_name}</h3>
                        <p className="text-sm text-gray-500">{tech.employee_id}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setEditingTech(tech);
                          setDialogOpen(true);
                        }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(tech.id)} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2">
                    <Badge className={
                      tech.status === 'active' ? 'bg-green-100 text-green-700' :
                      tech.status === 'on_leave' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }>
                      {tech.status?.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline">{tech.certification_level?.replace('_', ' ')}</Badge>
                    
                    {tech.email && (
                      <p className="text-sm text-gray-600">{tech.email}</p>
                    )}
                    {tech.phone && (
                      <p className="text-sm text-gray-600">{tech.phone}</p>
                    )}
                    {tech.specialization?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tech.specialization.slice(0, 3).map((spec, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-sm font-semibold text-blue-600 mt-2">
                      ${tech.hourly_rate}/hr
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timesheets">
          <TimesheetView technicians={technicians} />
        </TabsContent>
      </Tabs>

      <TechnicianDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingTech(null);
        }}
        technician={editingTech}
        onSave={handleSave}
      />
      </div>
    </div>
  );
}