import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

export default function OpportunityDialog({ open, onClose, opportunity, companyId }) {
  const [formData, setFormData] = useState({
    opportunity_name: "",
    customer_id: "",
    stage: "prospecting",
    amount: "",
    probability: "",
    expected_close_date: "",
    opportunity_type: "vehicle_sale",
    assigned_to: "",
    next_step: "",
    description: "",
    notes: ""
  });

  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', companyId],
    queryFn: () => base44.entities.Customer.filter({ company_id: companyId }),
    enabled: !!companyId && open,
  });

  useEffect(() => {
    if (opportunity) {
      setFormData({ ...opportunity });
    } else {
      setFormData({
        opportunity_name: "",
        customer_id: "",
        stage: "prospecting",
        amount: "",
        probability: "",
        expected_close_date: "",
        opportunity_type: "vehicle_sale",
        assigned_to: "",
        next_step: "",
        description: "",
        notes: ""
      });
    }
  }, [opportunity, open]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (opportunity) {
        return base44.entities.Opportunity.update(opportunity.id, data);
      } else {
        return base44.entities.Opportunity.create({ ...data, company_id: companyId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities', companyId] });
      toast.success(opportunity ? "Opportunity updated" : "Opportunity created");
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Opportunity.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities', companyId] });
      toast.success("Opportunity deleted");
      onClose();
    },
  });

  const handleSave = () => {
    if (!formData.opportunity_name) {
      toast.error("Opportunity name is required");
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{opportunity ? 'Edit Opportunity' : 'Add New Opportunity'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Opportunity Name *</Label>
            <Input value={formData.opportunity_name} 
                   onChange={(e) => setFormData({...formData, opportunity_name: e.target.value})} 
                   placeholder="e.g., 2024 SUV Sale - John Doe" />
          </div>
          <div>
            <Label>Customer</Label>
            <Select value={formData.customer_id} onValueChange={(value) => setFormData({...formData, customer_id: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>{customer.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={formData.opportunity_type} onValueChange={(value) => setFormData({...formData, opportunity_type: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vehicle_sale">Vehicle Sale</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="parts">Parts</SelectItem>
                <SelectItem value="export">Export</SelectItem>
                <SelectItem value="wholesale">Wholesale</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Stage</Label>
            <Select value={formData.stage} onValueChange={(value) => setFormData({...formData, stage: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prospecting">Prospecting</SelectItem>
                <SelectItem value="qualification">Qualification</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="closed_won">Closed Won</SelectItem>
                <SelectItem value="closed_lost">Closed Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Amount</Label>
            <Input type="number" value={formData.amount} 
                   onChange={(e) => setFormData({...formData, amount: e.target.value})} />
          </div>
          <div>
            <Label>Probability (%)</Label>
            <Input type="number" min="0" max="100" value={formData.probability} 
                   onChange={(e) => setFormData({...formData, probability: e.target.value})} />
          </div>
          <div>
            <Label>Expected Close Date</Label>
            <Input type="date" value={formData.expected_close_date} 
                   onChange={(e) => setFormData({...formData, expected_close_date: e.target.value})} />
          </div>
          <div>
            <Label>Assigned To (Email)</Label>
            <Input value={formData.assigned_to} 
                   onChange={(e) => setFormData({...formData, assigned_to: e.target.value})} />
          </div>
          <div className="col-span-2">
            <Label>Next Step</Label>
            <Input value={formData.next_step} 
                   onChange={(e) => setFormData({...formData, next_step: e.target.value})} 
                   placeholder="e.g., Schedule test drive" />
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Textarea value={formData.description} 
                      onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} />
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea value={formData.notes} 
                      onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} />
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          {opportunity && (
            <Button variant="outline" onClick={() => deleteMutation.mutate(opportunity.id)} 
                    className="text-red-600 border-red-300">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}