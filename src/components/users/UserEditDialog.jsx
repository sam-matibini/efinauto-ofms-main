import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompany } from "@/components/shared/CompanyContext";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function UserEditDialog({ open, onClose, user, onSave, isLoading }) {
  const { selectedCompanyId } = useCompany();
  const [userData, setUserData] = useState({
    full_name: "",
    role: "user",
    company_id: "",
    department: "",
    employee_id: ""
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
    enabled: open,
    initialData: [],
  });

  useEffect(() => {
    if (user) {
      setUserData({
        full_name: user.full_name || "",
        role: user.role || "user",
        company_id: user.data?.company_id || "",
        department: user.department || "",
        employee_id: user.employee_id || ""
      });
    }
  }, [user]);

  const handleSave = () => {
    if (!userData.full_name.trim()) {
      return;
    }
    
    const updateData = {
      full_name: userData.full_name,
      role: userData.role,
      department: userData.department,
      employee_id: userData.employee_id,
      data: {
        ...user?.data,
        company_id: userData.company_id || null
      }
    };
    
    onSave(updateData);
    onClose();
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              value={userData.full_name}
              onChange={(e) => setUserData({ ...userData, full_name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={user.email}
              disabled
              className="bg-gray-100"
            />
            <p className="text-xs text-gray-500">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={userData.role} onValueChange={(value) => setUserData({ ...userData, role: value })}>
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
            <div className="text-xs text-gray-500 space-y-1 mt-2">
              {userData.role === 'admin' && (
                <>
                  <p className="font-medium">Permissions:</p>
                  <p>✓ Full system access • User management • All data access</p>
                  <p>✓ Create, view, update, delete across all modules</p>
                </>
              )}
              {userData.role === 'manager' && (
                <>
                  <p className="font-medium">Permissions:</p>
                  <p>✓ Company operations • Staff management • Reports</p>
                  <p>✓ Create, view, update, delete within assigned company</p>
                </>
              )}
              {userData.role === 'sales' && (
                <>
                  <p className="font-medium">Permissions:</p>
                  <p>✓ Sales • Customers • Vehicles • Invoices</p>
                  <p>✓ Create, view, update sales records</p>
                </>
              )}
              {userData.role === 'technician' && (
                <>
                  <p className="font-medium">Permissions:</p>
                  <p>✓ Repairs • Service orders • Parts usage • Timesheets</p>
                  <p>✓ Create, view, update repair orders</p>
                </>
              )}
              {userData.role === 'inventory_manager' && (
                <>
                  <p className="font-medium">Permissions:</p>
                  <p>✓ Parts • Vehicles • Inventory • Stock adjustments</p>
                  <p>✓ Create, view, update, delete inventory items</p>
                </>
              )}
              {userData.role === 'accountant' && (
                <>
                  <p className="font-medium">Permissions:</p>
                  <p>✓ Financial reports • Transactions • Accounting</p>
                  <p>✓ View all financial data • Create entries</p>
                </>
              )}
              {userData.role === 'user' && (
                <>
                  <p className="font-medium">Permissions:</p>
                  <p>✓ View company data • Standard access</p>
                  <p>✓ Limited create/update abilities</p>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assigned Company</Label>
            <Select value={userData.company_id} onValueChange={(value) => setUserData({ ...userData, company_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select company..." />
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
              Assign user to a specific company for data access
            </p>
          </div>

          <div className="space-y-2">
            <Label>Department</Label>
            <Input
              placeholder="User's department"
              value={userData.department}
              onChange={(e) => setUserData({ ...userData, department: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Employee ID</Label>
            <Input
              placeholder="Employee identification number"
              value={userData.employee_id}
              onChange={(e) => setUserData({ ...userData, employee_id: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}