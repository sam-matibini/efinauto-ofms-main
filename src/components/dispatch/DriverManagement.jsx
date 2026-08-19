import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, User, Phone, Shield, AlertCircle } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useCompany } from "@/components/shared/CompanyContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export default function DriverManagement() {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [formData, setFormData] = useState({
    driver_name: "",
    driver_license_number: "",
    driver_cellphone: "",
    driver_email: "",
    license_expiry_date: "",
    hazmat_certified: false,
    hazmat_cert_expiry: ""
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers', selectedCompanyId],
    queryFn: () => supabase.entities.Driver.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const driverData = { ...data, company_id: selectedCompanyId, status: data.status || 'active' };
      if (selectedDriver) {
        return supabase.entities.Driver.update(selectedDriver.id, driverData);
      }
      return supabase.entities.Driver.create(driverData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success(selectedDriver ? "Driver updated" : "Driver added");
      setDialogOpen(false);
      setSelectedDriver(null);
    },
    onError: () => toast.error("Failed to save driver")
  });

  const openDialog = (driver = null) => {
    if (driver) {
      setSelectedDriver(driver);
      setFormData(driver);
    } else {
      setSelectedDriver(null);
      setFormData({
        driver_name: "",
        driver_license_number: "",
        driver_cellphone: "",
        driver_email: "",
        license_expiry_date: "",
        hazmat_certified: false,
        hazmat_cert_expiry: ""
      });
    }
    setDialogOpen(true);
  };

  const isLicenseExpiring = (expiryDate) => {
    if (!expiryDate) return false;
    const days = Math.floor((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    return days <= 30 && days >= 0;
  };

  const isLicenseExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Driver Management</h2>
        <Button onClick={() => openDialog()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Driver
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {drivers.map(driver => (
          <Card key={driver.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold">{driver.driver_name}</h3>
                    <p className="text-xs text-gray-500">{driver.driver_license_number}</p>
                  </div>
                </div>
                <Badge className={
                  driver.status === 'on_duty' ? 'bg-green-100 text-green-800' :
                  driver.status === 'off_duty' ? 'bg-gray-100 text-gray-800' :
                  driver.status === 'active' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }>
                  {driver.status}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span>{driver.driver_cellphone}</span>
                </div>
                
                {driver.hazmat_certified && (
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="text-green-700">HAZMAT Certified</span>
                  </div>
                )}

                {driver.license_expiry_date && (
                  <div className={`flex items-center gap-2 ${
                    isLicenseExpired(driver.license_expiry_date) ? 'text-red-600' :
                    isLicenseExpiring(driver.license_expiry_date) ? 'text-orange-600' :
                    'text-gray-600'
                  }`}>
                    {(isLicenseExpired(driver.license_expiry_date) || isLicenseExpiring(driver.license_expiry_date)) && (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span>License: {new Date(driver.license_expiry_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <Button
                onClick={() => openDialog(driver)}
                variant="outline"
                size="sm"
                className="w-full mt-4"
              >
                Edit Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {drivers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No drivers added yet</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDriver ? "Edit Driver" : "Add New Driver"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Driver Name *</Label>
              <Input value={formData.driver_name} onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })} />
            </div>

            <div>
              <Label>License Number *</Label>
              <Input value={formData.driver_license_number} onChange={(e) => setFormData({ ...formData, driver_license_number: e.target.value })} />
            </div>

            <div>
              <Label>License Expiry Date</Label>
              <Input type="date" value={formData.license_expiry_date || ''} onChange={(e) => setFormData({ ...formData, license_expiry_date: e.target.value })} />
            </div>

            <div>
              <Label>Cell Phone *</Label>
              <Input value={formData.driver_cellphone} onChange={(e) => setFormData({ ...formData, driver_cellphone: e.target.value })} />
            </div>

            <div>
              <Label>Email</Label>
              <Input type="email" value={formData.driver_email || ''} onChange={(e) => setFormData({ ...formData, driver_email: e.target.value })} />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={formData.hazmat_certified} onCheckedChange={(checked) => setFormData({ ...formData, hazmat_certified: checked })} />
              <Label>HAZMAT Certified</Label>
            </div>

            {formData.hazmat_certified && (
              <div>
                <Label>HAZMAT Certification Expiry</Label>
                <Input type="date" value={formData.hazmat_cert_expiry || ''} onChange={(e) => setFormData({ ...formData, hazmat_cert_expiry: e.target.value })} />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save Driver"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}