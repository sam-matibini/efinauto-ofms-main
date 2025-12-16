import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, DollarSign, Calendar, User, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import OpportunityDialog from "./OpportunityDialog";

export default function OpportunitiesPipeline({ companyId }) {
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities', companyId],
    queryFn: () => base44.entities.Opportunity.filter({ company_id: companyId }, '-created_date'),
    enabled: !!companyId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Opportunity.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities', companyId] });
    },
  });

  const stages = [
    { id: 'prospecting', label: 'Prospecting', color: 'bg-blue-100' },
    { id: 'qualification', label: 'Qualification', color: 'bg-purple-100' },
    { id: 'proposal', label: 'Proposal', color: 'bg-yellow-100' },
    { id: 'negotiation', label: 'Negotiation', color: 'bg-orange-100' },
    { id: 'closed_won', label: 'Closed Won', color: 'bg-green-100' },
    { id: 'closed_lost', label: 'Closed Lost', color: 'bg-red-100' }
  ];

  const opportunitiesByStage = stages.map(stage => ({
    ...stage,
    opportunities: opportunities.filter(opp => opp.stage === stage.id),
    totalValue: opportunities.filter(opp => opp.stage === stage.id)
      .reduce((sum, opp) => sum + (opp.amount || 0), 0)
  }));

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const { draggableId, destination } = result;
    const opportunity = opportunities.find(o => o.id === draggableId);
    const newStage = destination.droppableId;

    if (opportunity && opportunity.stage !== newStage) {
      const updates = { stage: newStage };
      if (newStage === 'closed_won' || newStage === 'closed_lost') {
        updates.actual_close_date = new Date().toISOString().split('T')[0];
        updates.probability = newStage === 'closed_won' ? 100 : 0;
      }
      updateMutation.mutate({ id: opportunity.id, data: updates });
      toast.success(`Opportunity moved to ${stages.find(s => s.id === newStage)?.label}`);
    }
  };

  const totalPipelineValue = opportunities
    .filter(o => !['closed_won', 'closed_lost'].includes(o.stage))
    .reduce((sum, o) => sum + (o.amount || 0), 0);

  const weightedValue = opportunities
    .filter(o => !['closed_won', 'closed_lost'].includes(o.stage))
    .reduce((sum, o) => sum + ((o.amount || 0) * (o.probability || 0) / 100), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold">Sales Pipeline</h3>
          <p className="text-sm text-gray-600">Visual pipeline management</p>
        </div>
        <Button onClick={() => { setSelectedOpportunity(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Opportunity
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">${totalPipelineValue.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Pipeline Value</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">${weightedValue.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Weighted Value</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{opportunities.length}</div>
            <div className="text-sm text-gray-600">Active Opportunities</div>
          </CardContent>
        </Card>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-6 gap-4">
          {opportunitiesByStage.map((stage) => (
            <div key={stage.id} className="space-y-2">
              <Card className={`${stage.color}`}>
                <CardHeader className="p-3">
                  <CardTitle className="text-sm font-semibold">
                    {stage.label}
                    <div className="text-xs font-normal text-gray-600 mt-1">
                      ${stage.totalValue.toLocaleString()}
                    </div>
                  </CardTitle>
                </CardHeader>
              </Card>

              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-2 min-h-[200px] p-2 rounded-lg ${
                      snapshot.isDraggingOver ? 'bg-gray-100' : ''
                    }`}
                  >
                    {stage.opportunities.map((opp, index) => (
                      <Draggable key={opp.id} draggableId={opp.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`cursor-pointer hover:shadow-md transition-shadow ${
                              snapshot.isDragging ? 'shadow-lg' : ''
                            }`}
                            onClick={() => { setSelectedOpportunity(opp); setDialogOpen(true); }}
                          >
                            <CardContent className="p-3 space-y-2">
                              <div className="font-semibold text-sm">{opp.opportunity_name}</div>
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <DollarSign className="w-3 h-3" />
                                ${opp.amount?.toLocaleString()}
                              </div>
                              {opp.expected_close_date && (
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(opp.expected_close_date), 'MMM d')}
                                </div>
                              )}
                              {opp.probability > 0 && (
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <TrendingUp className="w-3 h-3" />
                                  {opp.probability}%
                                </div>
                              )}
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

      <OpportunityDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setSelectedOpportunity(null); }}
        opportunity={selectedOpportunity}
        companyId={companyId}
      />
    </div>
  );
}