import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function RecurringBillsTab({ recurringBills, selectedCompanyId }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RecurringBill.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringBills'] });
      toast.success("Recurring bill deleted!");
    },
  });

  const statusColors = {
    active: "bg-green-100 text-green-800",
    paused: "bg-yellow-100 text-yellow-800",
    completed: "bg-blue-100 text-blue-800",
    cancelled: "bg-gray-100 text-gray-800"
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Recurring Bills</h2>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Recurring Bill
        </Button>
      </div>

      <div className="space-y-4">
        {recurringBills.map((recurring) => (
          <Card key={recurring.id} className="hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg">{recurring.template_name}</h3>
                    <Badge className={statusColors[recurring.status]}>{recurring.status}</Badge>
                    <Badge variant="outline">{recurring.frequency}</Badge>
                  </div>
                  <p className="text-gray-600"><strong>Vendor:</strong> {recurring.vendor_name}</p>
                  <p className="text-sm text-gray-500">Start Date: {recurring.start_date}</p>
                  {recurring.next_bill_date && (
                    <p className="text-sm text-blue-600">Next Bill: {recurring.next_bill_date}</p>
                  )}
                  {recurring.end_date && (
                    <p className="text-sm text-gray-500">End Date: {recurring.end_date}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-red-600">${recurring.amount?.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">per {recurring.frequency}</p>
                  <Button variant="outline" size="sm" className="mt-2 text-red-600" onClick={() => deleteMutation.mutate(recurring.id)}>
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