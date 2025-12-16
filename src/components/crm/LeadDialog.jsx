import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, UserCheck, Trash2 } from "lucide-react";

export default function LeadDialog({ open, onClose, lead, companyId, onConvert, onDelete }) {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    company_name: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    country: "Canada",
    lead_source: "website",
    status: "new",
    interest: "",
    budget: "",
    expected_close_date: "",
    assigned_to: "",
    notes: ""
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (lead) {
      setFormData({ ...lead });
    } else {
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        company_name: "",
        address: "",
        city: "",
        province: "",
        postal_code: "",
        country: "Canada",
        lead_source: "website",
        status: "new",
        interest: "",
        budget: "",
        expected_close_date: "",
        assigned_to: "",
        notes: ""
      });
    }
  }, [lead, open]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (lead) {
        return base44.entities.Lead.update(lead.id, data);
      } else {
        return base44.entities.Lead.create({ ...data, company_id: companyId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', companyId] });
      toast.success(lead ? "Lead updated" : "Lead created");
      onClose();
    },
  });

  const handleSave = () => {
    if (!formData.full_name) {
      toast.error("Name is required");
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Full Name *</Label>
            <Input value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div>
            <Label>Company Name</Label>
            <Input value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} />
          </div>
          <div>
            <Label>Lead Source</Label>
            <Select value={formData.lead_source} onValueChange={(value) => setFormData({...formData, lead_source: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="cold_call">Cold Call</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="social_media">Social Media</SelectItem>
                <SelectItem value="walk_in">Walk-in</SelectItem>
                <SelectItem value="trade_show">Trade Show</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Interest</Label>
            <Input value={formData.interest} onChange={(e) => setFormData({...formData, interest: e.target.value})} 
                   placeholder="e.g., SUV, sedan, service" />
          </div>
          <div>
            <Label>Budget</Label>
            <Input type="number" value={formData.budget} onChange={(e) => setFormData({...formData, budget: e.target.value})} />
          </div>
          <div>
            <Label>Expected Close Date</Label>
            <Input type="date" value={formData.expected_close_date} 
                   onChange={(e) => setFormData({...formData, expected_close_date: e.target.value})} />
          </div>
          <div>
            <Label>Assigned To (Email)</Label>
            <Input value={formData.assigned_to} onChange={(e) => setFormData({...formData, assigned_to: e.target.value})} />
          </div>
          <div className="col-span-2">
            <Label>Address</Label>
            <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
          </div>
          <div>
            <Label>City</Label>
            <Input value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
          </div>
          <div>
            <Label>Province</Label>
            <Input value={formData.province} onChange={(e) => setFormData({...formData, province: e.target.value})} />
          </div>
          <div>
            <Label>Postal Code</Label>
            <Input value={formData.postal_code} onChange={(e) => setFormData({...formData, postal_code: e.target.value})} />
          </div>
          <div>
            <Label>Country</Label>
            <Input value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} />
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} />
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {lead && lead.status !== 'won' && (
              <Button variant="outline" onClick={() => onConvert(lead)} className="text-green-600 border-green-300">
                <UserCheck className="w-4 h-4 mr-2" />
                Convert to Customer
              </Button>
            )}
            {lead && (
              <Button variant="outline" onClick={() => { onDelete(lead.id); onClose(); }} className="text-red-600 border-red-300">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
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