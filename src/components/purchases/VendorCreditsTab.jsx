import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
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
    mutationFn: async (data) => {
      const credit = await supabase.entities.VendorCredit.create({ ...data, company_id: selectedCompanyId });
      
      // Create GL transaction for vendor credit (reduces AP)
      await supabase.entities.Transaction.create({
        company_id: selectedCompanyId,
        transaction_number: credit.credit_number || `VCREDIT-${credit.id.slice(0, 8)}`,
        transaction_type: 'other_income',
        category: 'liability',
        amount: credit.total_amount || 0,
        account_code: '2000',
        account_name: 'Accounts Payable',
        account_type: 'liability',
        reference_type: 'VendorCredit',
        reference_id: credit.id,
        reference_number: credit.credit_number,
        customer_name: credit.vendor_name,
        description: `Vendor credit from ${credit.vendor_name} - ${credit.reason}`,
        transaction_date: credit.credit_date,
        status: 'completed',
        tax_amount: credit.tax_amount || 0
      });
      
      return credit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorCredits'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setDialogOpen(false);
      setEditingCredit(null);
      toast.success("Vendor credit created!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => supabase.entities.VendorCredit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorCredits'] });
      setDialogOpen(false);
      setEditingCredit(null);
      toast.success("Vendor credit updated!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supabase.entities.VendorCredit.delete(id),
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