import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Save, X } from "lucide-react";
import ProfileTabs from "@/components/profile/ProfileTabs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";

export default function MyProfile({ employee }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [section, setSection] = useState("personal");
  const profileTabs = [
    { id: "personal", label: "Personal Info" },
    { id: "emergency", label: "Emergency Contact" },
    { id: "deposit", label: "Direct Deposit" },
  ];
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
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ProfileTabs tabs={profileTabs} value={section} onChange={setSection} />
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
            <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-[#0A1F44] text-white hover:bg-[#0A1F44]/90">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        )}
      </div>

      {section === "personal" && (
      <Card id="profile-panel-personal" role="tabpanel" aria-labelledby="profile-tab-personal">
        <CardHeader className="p-6">
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6 pt-0">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>First Name</Label>
              <Input value={employee?.first_name} disabled />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input value={employee?.last_name} disabled />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
      )}

      {section === "emergency" && (
      <Card id="profile-panel-emergency" role="tabpanel" aria-labelledby="profile-tab-emergency">
        <CardHeader className="p-6">
          <CardTitle>Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6 pt-0">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
      )}

      {section === "deposit" && (
      <Card id="profile-panel-deposit" role="tabpanel" aria-labelledby="profile-tab-deposit">
        <CardHeader className="p-6">
          <CardTitle>Direct Deposit Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6 pt-0">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
      )}
    </div>
  );
}