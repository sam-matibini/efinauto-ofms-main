import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function CreditNotesTab({ creditNotes, selectedCompanyId }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CreditNote.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditNotes'] });
      toast.success("Credit note deleted!");
    },
  });

  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    issued: "bg-blue-100 text-blue-800",
    applied: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800"
  };

  const reasonColors = {
    return: "bg-orange-100 text-orange-800",
    discount: "bg-purple-100 text-purple-800",
    error: "bg-red-100 text-red-800",
    goodwill: "bg-blue-100 text-blue-800",
    other: "bg-gray-100 text-gray-800"
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Credit Notes</h2>
        <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Credit Note
        </Button>
      </div>

      <div className="space-y-4">
        {creditNotes.map((credit) => (
          <Card key={credit.id} className="hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg">{credit.credit_note_number}</h3>
                    <Badge className={statusColors[credit.status]}>{credit.status}</Badge>
                    <Badge className={reasonColors[credit.reason]}>{credit.reason}</Badge>
                  </div>
                  <p className="text-gray-600"><strong>Customer:</strong> {credit.customer_name}</p>
                  <p className="text-sm text-gray-500">Credit Date: {credit.credit_date}</p>
                  {credit.related_invoice_number && (
                    <p className="text-sm text-blue-600">Related Invoice: {credit.related_invoice_number}</p>
                  )}
                  {credit.notes && (
                    <p className="text-sm text-gray-500 mt-2">{credit.notes}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">-${credit.total_amount?.toLocaleString()}</p>
                  <Button variant="outline" size="sm" className="mt-2 text-red-600" onClick={() => deleteMutation.mutate(credit.id)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}