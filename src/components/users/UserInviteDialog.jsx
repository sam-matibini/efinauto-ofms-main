import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function UserInviteDialog({ open, onClose }) {
  const [inviteData, setInviteData] = useState({
    email: "",
    full_name: "",
    role: "user",
    company_id: ""
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
    enabled: open,
    initialData: [],
  });
  const [isInviting, setIsInviting] = useState(false);

  const handleInvite = async () => {
    if (!inviteData.email || !inviteData.full_name) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsInviting(true);
    
    // In a real implementation, this would send an invitation email
    // For now, we'll show a message that the user should be invited through the dashboard
    toast.info("Please use the Base44 dashboard to invite users with email invitations.");
    
    setIsInviting(false);
    setInviteData({ email: "", full_name: "", role: "user", company_id: "" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Invite New User
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input
              placeholder="John Doe"
              value={inviteData.full_name}
              onChange={(e) => setInviteData({ ...inviteData, full_name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Email Address *</Label>
            <Input
              type="email"
              placeholder="john@example.com"
              value={inviteData.email}
              onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={inviteData.role} onValueChange={(value) => setInviteData({ ...inviteData, role: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Regular User</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {inviteData.role === 'admin' 
                ? 'Admins have full access to all features and can manage other users.'
                : 'Regular users have access to company data and standard features.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Assign to Company</Label>
            <Select value={inviteData.company_id} onValueChange={(value) => setInviteData({ ...inviteData, company_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select company (optional)..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>No company assigned</SelectItem>
                {companies.map(company => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Assign user to a specific company for data access. Regular users can only see data from their assigned company.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> To invite users with email invitations, please use the Base44 dashboard's user management section.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={isInviting}>
            {isInviting ? "Inviting..." : "Send Invitation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}