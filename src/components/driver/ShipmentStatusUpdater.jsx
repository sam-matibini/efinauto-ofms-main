import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PlayCircle, MapPin, CheckCircle, Truck } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ShipmentStatusUpdater({ shipment }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");

  const updateStatusMutation = useMutation({
    mutationFn: (status) => {
      const updateData = { status };
      
      if (status === 'in_transit' && !shipment.actual_pickup_time) {
        updateData.actual_pickup_time = new Date().toISOString();
      }
      
      if (status === 'delivered') {
        updateData.actual_delivery_time = new Date().toISOString();
      }

      if (notes.trim()) {
        updateData.special_instructions = `${shipment.special_instructions || ''}\n[${new Date().toLocaleString()}] ${notes}`;
      }

      return supabase.entities.LocalShipment.update(shipment.id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeShipment'] });
      queryClient.invalidateQueries({ queryKey: ['assignedShipments'] });
      setNotes("");
      toast.success("Status updated successfully");
    },
    onError: () => toast.error("Failed to update status")
  });

  const statusSteps = [
    { status: 'assigned', label: 'Assigned', icon: PlayCircle, color: 'blue' },
    { status: 'in_transit', label: 'En Route', icon: Truck, color: 'purple' },
    { status: 'near_destination', label: 'Near Destination', icon: MapPin, color: 'orange' },
    { status: 'delivered', label: 'Delivered', icon: CheckCircle, color: 'green' }
  ];

  const getCurrentStepIndex = () => {
    return statusSteps.findIndex(s => s.status === shipment.status);
  };

  const currentIndex = getCurrentStepIndex();

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold mb-3">Update Status</p>
          <div className="grid grid-cols-2 gap-3">
            {statusSteps.map((step, index) => {
              const Icon = step.icon;
              const isPast = index < currentIndex;
              const isCurrent = index === currentIndex;
              const isNext = index === currentIndex + 1;
              
              return (
                <Button
                  key={step.status}
                  onClick={() => updateStatusMutation.mutate(step.status)}
                  disabled={updateStatusMutation.isPending || (!isCurrent && !isNext && !isPast)}
                  variant={isCurrent ? "default" : "outline"}
                  className={`${
                    isCurrent ? `bg-${step.color}-600 hover:bg-${step.color}-700` :
                    isPast ? 'opacity-50' :
                    isNext ? 'border-2 border-blue-500' : ''
                  }`}
                  size="sm"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {step.label}
                  {isPast && " ✓"}
                </Button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-600 mb-1 block">Add Note (Optional)</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note about this status update..."
            rows={2}
            className="text-sm"
          />
        </div>

        {shipment.actual_pickup_time && (
          <div className="text-xs text-gray-600">
            ✓ Picked up: {new Date(shipment.actual_pickup_time).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}