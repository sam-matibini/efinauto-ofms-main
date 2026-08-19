import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Save, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";

export default function MyProfile({ employee }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    email: employee?.email || "",
    phone: employee?.phone || "",
    address: employee?.address || "",
    city: employee?.city || "",
    province: employee?.province || "",
    postal_code: employee?.postal_code || "",
    emergency_contact: employee?.emergency_contact || { name: "", relationship: "", phone: "" },
    bank_account: employee?.bank_account || { institution_number: "", transit_number: "", account_number: "" }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => supabase.entities.Employee.update(employee.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myEmployee'] });
      toast.success("Profile updated successfully");
      setEditing(false);
    },
    onError: () => toast.error("Failed to update profile")
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  React.useEffect(() => {
    if (employee) {
      setFormData({
        email: employee.email || "",
        phone: employee.phone || "",
        address: employee.address || "",
        city: employee.city || "",
        province: employee.province || "",
        postal_code: employee.postal_code || "",
        emergency_contact: employee.emergency_contact || { name: "", relationship: "", phone: "" },
        bank_account: employee.bank_account || { institution_number: "", transit_number: "", account_number: "" }
      });
    }
  }, [employee]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Personal Information</CardTitle>
            {!editing ? (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First Name</Label>
              <Input value={employee?.first_name} disabled />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input value={employee?.last_name} disabled />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Email</Label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                disabled={!editing}
              />
            </div>
          </div>

          <div>
            <Label>Address</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              disabled={!editing}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>City</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Province</Label>
              <Input
                value={formData.province}
                onChange={(e) => setFormData({...formData, province: e.target.value})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Postal Code</Label>
              <Input
                value={formData.postal_code}
                onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                disabled={!editing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.emergency_contact?.name || ""}
                onChange={(e) => setFormData({...formData, emergency_contact: {...formData.emergency_contact, name: e.target.value}})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Relationship</Label>
              <Input
                value={formData.emergency_contact?.relationship || ""}
                onChange={(e) => setFormData({...formData, emergency_contact: {...formData.emergency_contact, relationship: e.target.value}})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.emergency_contact?.phone || ""}
                onChange={(e) => setFormData({...formData, emergency_contact: {...formData.emergency_contact, phone: e.target.value}})}
                disabled={!editing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Direct Deposit Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Institution Number</Label>
              <Input
                value={formData.bank_account?.institution_number || ""}
                onChange={(e) => setFormData({...formData, bank_account: {...formData.bank_account, institution_number: e.target.value}})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Transit Number</Label>
              <Input
                value={formData.bank_account?.transit_number || ""}
                onChange={(e) => setFormData({...formData, bank_account: {...formData.bank_account, transit_number: e.target.value}})}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Account Number</Label>
              <Input
                type="password"
                value={formData.bank_account?.account_number || ""}
                onChange={(e) => setFormData({...formData, bank_account: {...formData.bank_account, account_number: e.target.value}})}
                disabled={!editing}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}