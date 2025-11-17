import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useCompany } from "@/components/shared/CompanyContext";

const SPECIALIZATIONS = [
  "Engine Repair",
  "Transmission",
  "Brakes",
  "Electrical",
  "Suspension",
  "Air Conditioning",
  "Diagnostics",
  "Body Work",
  "Oil Change",
  "Tire Service"
];

export default function TechnicianDialog({ open, onClose, technician, onSave }) {
  const { selectedCompanyId } = useCompany();
  const [formData, setFormData] = useState({
    company_id: selectedCompanyId,
    employee_id: "",
    full_name: "",
    email: "",
    phone: "",
    specialization: [],
    certification_level: "journeyman",
    hourly_rate: 100,
    hire_date: new Date().toISOString().split('T')[0],
    status: "active",
    photo_url: ""
  });

  useEffect(() => {
    if (technician) {
      setFormData(technician);
    } else {
      setFormData({
        company_id: selectedCompanyId,
        employee_id: "",
        full_name: "",
        email: "",
        phone: "",
        specialization: [],
        certification_level: "journeyman",
        hourly_rate: 100,
        hire_date: new Date().toISOString().split('T')[0],
        status: "active",
        photo_url: ""
      });
    }
  }, [technician, open, selectedCompanyId]);

  const toggleSpecialization = (spec) => {
    const current = formData.specialization || [];
    if (current.includes(spec)) {
      setFormData({ ...formData, specialization: current.filter(s => s !== spec) });
    } else {
      setFormData({ ...formData, specialization: [...current, spec] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{technician ? 'Edit' : 'Add'} Technician</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Employee ID</Label>
              <Input
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Certification Level</Label>
              <Select value={formData.certification_level} onValueChange={(v) => setFormData({ ...formData, certification_level: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apprentice">Apprentice</SelectItem>
                  <SelectItem value="journeyman">Journeyman</SelectItem>
                  <SelectItem value="master">Master Technician</SelectItem>
                  <SelectItem value="ase_certified">ASE Certified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hourly Rate ($)</Label>
              <Input
                type="number"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>Hire Date</Label>
              <Input
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Specializations</Label>
            <div className="flex flex-wrap gap-2">
              {SPECIALIZATIONS.map((spec) => (
                <Badge
                  key={spec}
                  variant={formData.specialization?.includes(spec) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleSpecialization(spec)}
                >
                  {spec}
                  {formData.specialization?.includes(spec) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formData)}>
            {technician ? 'Update' : 'Add'} Technician
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}