import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Phone, MessageSquare, Send, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export default function DispatchCommunication({ open, onClose, shipment, driver }) {
  const [message, setMessage] = useState("");

  const { data: company } = useQuery({
    queryKey: ['company', shipment?.company_id],
    queryFn: () => base44.entities.Company.filter({ id: shipment.company_id }),
    enabled: !!shipment?.company_id,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      // Log communication
      await base44.entities.CommunicationLog.create({
        company_id: shipment.company_id,
        related_entity_type: 'LocalShipment',
        related_entity_id: shipment.id,
        communication_type: 'sms',
        direction: 'outbound',
        from_number: driver.driver_cellphone,
        to_number: company[0]?.phone || '',
        message_body: `[Driver ${driver.driver_name}] ${message}`,
        status: 'sent',
        sent_at: new Date().toISOString()
      });

      return true;
    },
    onSuccess: () => {
      toast.success("Message sent to dispatch");
      setMessage("");
      onClose();
    },
    onError: () => toast.error("Failed to send message")
  });

  const makeCall = () => {
    if (company?.[0]?.phone) {
      window.location.href = `tel:${company[0].phone}`;
    } else {
      toast.error("Dispatch phone number not available");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Contact Dispatch</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {company?.[0]?.phone && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-gray-600 mb-1">Dispatch Phone</p>
              <p className="font-semibold text-lg">{company[0].phone}</p>
            </div>
          )}

          <Button onClick={makeCall} className="w-full bg-green-600 hover:bg-green-700">
            <Phone className="w-4 h-4 mr-2" />
            Call Dispatch
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or send message</span>
            </div>
          </div>

          <div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message to dispatch..."
              rows={4}
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => sendMessageMutation.mutate()}
              disabled={!message.trim() || sendMessageMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Message
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}