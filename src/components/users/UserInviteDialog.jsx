import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";

export default function UserInviteDialog({ open, onClose }) {
  const [inviteData, setInviteData] = useState({
    email: "",
    full_name: "",
    role: "user",
    company_id: "",
    department: "",
    employee_id: ""
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => supabase.entities.Company.list(),
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
    setInviteData({ email: "", full_name: "", role: "user", company_id: "", department: "", employee_id: "" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Send Invitation
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
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="sales">Sales Staff</SelectItem>
                <SelectItem value="technician">Technician</SelectItem>
                <SelectItem value="inventory_manager">Inventory Manager</SelectItem>
                <SelectItem value="accountant">Accountant</SelectItem>
                <SelectItem value="user">Regular User</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {inviteData.role === 'admin' && 'Full system access and user management'}
              {inviteData.role === 'manager' && 'Manage company operations and staff'}
              {inviteData.role === 'sales' && 'Handle sales, customers, and vehicles'}
              {inviteData.role === 'technician' && 'Manage repairs and service orders'}
              {inviteData.role === 'inventory_manager' && 'Manage parts and vehicle inventory'}
              {inviteData.role === 'accountant' && 'Access to financial reports and transactions'}
              {inviteData.role === 'user' && 'Standard access to company data'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Department</Label>
            <Input
              placeholder="e.g. Sales, Service, Parts"
              value={inviteData.department}
              onChange={(e) => setInviteData({ ...inviteData, department: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Employee ID</Label>
            <Input
              placeholder="e.g. EMP-001"
              value={inviteData.employee_id}
              onChange={(e) => setInviteData({ ...inviteData, employee_id: e.target.value })}
            />
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