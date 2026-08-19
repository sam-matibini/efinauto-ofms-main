import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Phone, Mail, MessageSquare, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import CommunicationDialog from "./CommunicationDialog";

export default function CommunicationsTab({ companyId, customerId, leadId, opportunityId }) {
  const [selectedCommunication, setSelectedCommunication] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const filterCriteria = { company_id: companyId };
  if (customerId) filterCriteria.customer_id = customerId;
  if (leadId) filterCriteria.lead_id = leadId;
  if (opportunityId) filterCriteria.opportunity_id = opportunityId;

  const { data: communications = [] } = useQuery({
    queryKey: ['communications', companyId, customerId, leadId, opportunityId],
    queryFn: () => supabase.entities.CommunicationLog.filter(filterCriteria, '-communication_date'),
    enabled: !!companyId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supabase.entities.CommunicationLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      toast.success("Communication deleted");
    },
  });

  const typeIcons = {
    call: Phone,
    email: Mail,
    meeting: CalendarIcon,
    sms: MessageSquare,
    whatsapp: MessageSquare,
    social_media: MessageSquare,
    other: MessageSquare
  };

  const typeColors = {
    call: "bg-blue-100 text-blue-800",
    email: "bg-purple-100 text-purple-800",
    meeting: "bg-green-100 text-green-800",
    sms: "bg-yellow-100 text-yellow-800",
    whatsapp: "bg-green-100 text-green-800",
    social_media: "bg-pink-100 text-pink-800",
    other: "bg-gray-100 text-gray-800"
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold">Communications</h3>
          <p className="text-sm text-gray-600">Track all interactions</p>
        </div>
        <Button onClick={() => { setSelectedCommunication(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Log Communication
        </Button>
      </div>

      <div className="space-y-3">
        {communications.map((comm) => {
          const Icon = typeIcons[comm.communication_type];
          return (
            <Card key={comm.id} className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => { setSelectedCommunication(comm); setDialogOpen(true); }}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${typeColors[comm.communication_type]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{comm.subject || comm.communication_type}</h4>
                        <p className="text-xs text-gray-500">
                          {comm.communication_date && format(new Date(comm.communication_date), 'MMM d, yyyy h:mm a')}
                          {comm.logged_by && ` • ${comm.logged_by}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className={typeColors[comm.communication_type]}>
                          {comm.communication_type}
                        </Badge>
                        <Badge variant="outline">
                          {comm.direction}
                        </Badge>
                      </div>
                    </div>
                    {comm.notes && (
                      <p className="text-sm text-gray-600 line-clamp-2">{comm.notes}</p>
                    )}
                    {comm.outcome && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          Outcome: {comm.outcome}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {communications.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No communications logged yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      <CommunicationDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setSelectedCommunication(null); }}
        communication={selectedCommunication}
        companyId={companyId}
        customerId={customerId}
        leadId={leadId}
        opportunityId={opportunityId}
        onDelete={deleteMutation.mutate}
      />
    </div>
  );
}