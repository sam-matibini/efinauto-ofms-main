import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompany } from "@/components/shared/CompanyContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";

export default function UserEditDialog({ open, onClose, user, onSave, isLoading }) {
  const { selectedCompanyId } = useCompany();
  const [userData, setUserData] = useState({
    full_name: "",
    role: "user",
    company_id: "",
    department: "",
    employee_id: "",
    accessible_modules: []
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => supabase.entities.Company.list(),
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
        employee_id: user.employee_id || "",
        accessible_modules: user.data?.accessible_modules || []
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
        company_id: userData.company_id || null,
        accessible_modules: userData.accessible_modules || []
      }
    };
    
    onSave(updateData);
    onClose();
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                  <p>✓ Financial reports • Transactions • Accounting • Banking</p>
                  <p>✓ View all financial data • Create entries • Manage bank transactions</p>
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

          <div className="space-y-2">
            <Label>Module Access</Label>
            <p className="text-xs text-gray-500 mb-3">
              Select which modules this user can access (leave empty for full access based on role)
            </p>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer hover:bg-gray-50 p-2 rounded mb-2 border-b">
              <input
                type="checkbox"
                checked={userData.accessible_modules?.length === 37}
                onChange={(e) => {
                  const allModules = ['Landing', 'Dashboard', 'Companies', 'Customers', 'InventoryManagement', 'Vehicles', 'Parts', 'ProductsServices', 'Purchases', 'Sales', 'Repairs', 'Technicians', 'Salvage', 'GlobalShipping', 'RateShopping', 'TrackShipment', 'CustomerTracking', 'ShipmentMonitoring', 'DispatchDashboard', 'DriverMobile', 'Projects', 'Reports', 'FinancialReports', 'Analytics', 'VehicleAnalytics', 'Accounting', 'Banking', 'BankingMobile', 'Payroll', 'EmployeePortal', 'CustomerCommunications', 'CustomerSupport', 'Notifications', 'UserManagement', 'Settings', 'BOSSettings', 'AuditLogs', 'Pricing', 'FinancialAssistant', 'IntegrationDiagram'];
                  setUserData({
                    ...userData,
                    accessible_modules: e.target.checked ? allModules : []
                  });
                }}
                className="rounded"
              />
              <span>Select All Modules</span>
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-lg p-3">
              {[
                { id: 'Landing', label: 'Home' },
                { id: 'Dashboard', label: 'Dashboard' },
                { id: 'Companies', label: 'Companies' },
                { id: 'Customers', label: 'Customers' },
                { id: 'InventoryManagement', label: 'Inventory Management' },
                { id: 'Vehicles', label: 'Vehicles' },
                { id: 'Parts', label: 'Parts' },
                { id: 'ProductsServices', label: 'Products & Services' },
                { id: 'Purchases', label: 'Purchases' },
                { id: 'Sales', label: 'Sales' },
                { id: 'Repairs', label: 'Auto Repair' },
                { id: 'Technicians', label: 'Technicians' },
                { id: 'Salvage', label: 'Salvage & Dismantling' },
                { id: 'GlobalShipping', label: 'Global Shipping & Logistics' },
                { id: 'RateShopping', label: 'Rate Shopping' },
                { id: 'TrackShipment', label: 'Track Shipment' },
                { id: 'CustomerTracking', label: 'Customer Tracking' },
                { id: 'ShipmentMonitoring', label: 'Shipment Monitoring' },
                { id: 'DispatchDashboard', label: 'Dispatch & Tracking' },
                { id: 'DriverMobile', label: 'Driver Mobile' },
                { id: 'Projects', label: 'Project Management' },
                { id: 'Reports', label: 'Reports' },
                { id: 'FinancialReports', label: 'Financial Reports' },
                { id: 'Analytics', label: 'Analytics' },
                { id: 'VehicleAnalytics', label: 'Vehicle Analytics' },
                { id: 'Accounting', label: 'Financials' },
                { id: 'Banking', label: 'Banking' },
                { id: 'BankingMobile', label: 'Mobile Banking' },
                { id: 'Payroll', label: 'Payroll & HR' },
                { id: 'EmployeePortal', label: 'Employee Portal' },
                { id: 'CustomerCommunications', label: 'Communications Hub' },
                { id: 'CustomerSupport', label: 'AI Support Chat' },
                { id: 'Notifications', label: 'Notifications' },
                { id: 'UserManagement', label: 'User Management' },
                { id: 'Settings', label: 'Settings' },
                { id: 'BOSSettings', label: 'BOS Settings' },
                { id: 'AuditLogs', label: 'Audit Logs' },
                { id: 'Pricing', label: 'Pricing' },
                { id: 'FinancialAssistant', label: 'AI Assistant' },
                { id: 'IntegrationDiagram', label: 'Integration Diagram' }
              ].map(module => (
                <label key={module.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={userData.accessible_modules?.includes(module.id) || false}
                    onChange={(e) => {
                      const modules = userData.accessible_modules || [];
                      if (e.target.checked) {
                        setUserData({
                          ...userData,
                          accessible_modules: [...modules, module.id]
                        });
                      } else {
                        setUserData({
                          ...userData,
                          accessible_modules: modules.filter(m => m !== module.id)
                        });
                      }
                    }}
                    className="rounded"
                  />
                  <span>{module.label}</span>
                </label>
              ))}
            </div>
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