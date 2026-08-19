import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, User, Mail, Phone, DollarSign, Calendar } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import LeadDialog from "./LeadDialog";

export default function LeadsTab({ companyId }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', companyId],
    queryFn: () => supabase.entities.Lead.filter({ company_id: companyId }, '-created_date'),
    enabled: !!companyId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supabase.entities.Lead.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', companyId] });
      toast.success("Lead deleted");
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (lead) => {
      const customer = await supabase.entities.Customer.create({
        company_id: companyId,
        full_name: lead.full_name,
        email: lead.email,
        phone: lead.phone,
        company_name: lead.company_name,
        address: lead.address,
        city: lead.city,
        province: lead.province,
        postal_code: lead.postal_code,
        country: lead.country,
        notes: lead.notes,
        tags: lead.tags
      });
      await supabase.entities.Lead.update(lead.id, {
        status: 'won',
        converted_to_customer_id: customer.id,
        converted_date: new Date().toISOString()
      });
      return customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', companyId] });
      queryClient.invalidateQueries({ queryKey: ['customers', companyId] });
      toast.success("Lead converted to customer");
      setDialogOpen(false);
    },
  });

  const filteredLeads = leads.filter(lead =>
    lead.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone?.includes(searchTerm)
  );

  const statusColors = {
    new: "bg-blue-100 text-blue-800",
    contacted: "bg-purple-100 text-purple-800",
    qualified: "bg-green-100 text-green-800",
    proposal: "bg-yellow-100 text-yellow-800",
    negotiation: "bg-orange-100 text-orange-800",
    won: "bg-green-100 text-green-800",
    lost: "bg-red-100 text-red-800"
  };

  const sourceColors = {
    website: "bg-blue-100 text-blue-800",
    referral: "bg-green-100 text-green-800",
    cold_call: "bg-purple-100 text-purple-800",
    email: "bg-indigo-100 text-indigo-800",
    social_media: "bg-pink-100 text-pink-800",
    walk_in: "bg-amber-100 text-amber-800",
    trade_show: "bg-teal-100 text-teal-800",
    other: "bg-gray-100 text-gray-800"
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold">Lead Management</h3>
          <p className="text-sm text-gray-600">Track and convert potential customers</p>
        </div>
        <Button onClick={() => { setSelectedLead(null); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Lead
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search leads..."
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLeads.map((lead) => (
          <Card key={lead.id} className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => { setSelectedLead(lead); setDialogOpen(true); }}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {lead.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold">{lead.full_name}</h4>
                    {lead.company_name && (
                      <p className="text-xs text-gray-500">{lead.company_name}</p>
                    )}
                  </div>
                </div>
                <Badge className={statusColors[lead.status]}>
                  {lead.status}
                </Badge>
              </div>

              <div className="space-y-1 text-sm">
                {lead.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-3 h-3" />
                    <span className="truncate">{lead.email}</span>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-3 h-3" />
                    <span>{lead.phone}</span>
                  </div>
                )}
                {lead.budget > 0 && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <DollarSign className="w-3 h-3" />
                    <span>${lead.budget?.toLocaleString()}</span>
                  </div>
                )}
                {lead.expected_close_date && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(lead.expected_close_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Badge variant="outline" className={sourceColors[lead.lead_source]}>
                  {lead.lead_source?.replace(/_/g, ' ')}
                </Badge>
                {lead.assigned_to && (
                  <Badge variant="outline" className="text-xs">
                    {lead.assigned_to.split('@')[0]}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLeads.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No leads found</p>
          </CardContent>
        </Card>
      )}

      <LeadDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setSelectedLead(null); }}
        lead={selectedLead}
        companyId={companyId}
        onConvert={convertMutation.mutate}
        onDelete={deleteMutation.mutate}
      />
    </div>
  );
}