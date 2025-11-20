import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Phone, Clock } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function CommunicationHistory({ customer }) {
  const { data: communications = [] } = useQuery({
    queryKey: ['communicationHistory', customer?.id],
    queryFn: () => base44.entities.NotificationLog.filter({ customer_id: customer.id }, '-sent_at'),
    enabled: !!customer,
    initialData: [],
  });

  const getIcon = (type) => {
    switch (type) {
      case "email": return <Mail className="w-4 h-4" />;
      case "sms": return <MessageSquare className="w-4 h-4" />;
      case "call": return <Phone className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "sent": return "bg-blue-100 text-blue-800";
      case "delivered": return "bg-green-100 text-green-800";
      case "opened": return "bg-purple-100 text-purple-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Communication History</CardTitle>
      </CardHeader>
      <CardContent>
        {!customer ? (
          <div className="text-center py-12 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Select a customer to view communication history</p>
          </div>
        ) : communications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No communications yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {communications.map((comm) => (
              <div key={comm.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  {getIcon(comm.type)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{comm.subject}</p>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{comm.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {format(new Date(comm.sent_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                </div>
                <Badge className={getStatusColor(comm.status)}>
                  {comm.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}