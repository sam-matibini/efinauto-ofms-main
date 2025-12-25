import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import VendorCreditDialog from "./VendorCreditDialog";

export default function VendorCreditsTab({ vendorCredits, selectedCompanyId }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState(null);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.VendorCredit.create({ ...data, company_id: selectedCompanyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorCredits'] });
      setDialogOpen(false);
      setEditingCredit(null);
      toast.success("Vendor credit created!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VendorCredit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorCredits'] });
      setDialogOpen(false);
      setEditingCredit(null);
      toast.success("Vendor credit updated!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.VendorCredit.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorCredits'] });
      toast.success("Vendor credit deleted!");
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
        <h2 className="text-xl font-bold">Vendor Credits</h2>
        <Button onClick={() => { setEditingCredit(null); setDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Vendor Credit
        </Button>
      </div>

      <div className="space-y-4">
        {vendorCredits.map((credit) => (
          <Card key={credit.id} className="hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg">{credit.credit_number}</h3>
                    <Badge className={statusColors[credit.status]}>{credit.status}</Badge>
                    <Badge className={reasonColors[credit.reason]}>{credit.reason}</Badge>
                  </div>
                  <p className="text-gray-600"><strong>Vendor:</strong> {credit.vendor_name}</p>
                  <p className="text-sm text-gray-500">Credit Date: {credit.credit_date}</p>
                  {credit.related_bill_number && (
                    <p className="text-sm text-blue-600">Related Bill: {credit.related_bill_number}</p>
                  )}
                  {credit.notes && (
                    <p className="text-sm text-gray-500 mt-2">{credit.notes}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">${credit.total_amount?.toLocaleString()}</p>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingCredit(credit); setDialogOpen(true); }}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600" onClick={() => deleteMutation.mutate(credit.id)}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <VendorCreditDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingCredit(null); }}
        credit={editingCredit}
        onSave={(data) => {
          if (editingCredit) {
            updateMutation.mutate({ id: editingCredit.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />
    </>
  );
}