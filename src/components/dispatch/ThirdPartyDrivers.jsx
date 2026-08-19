import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Plus, Phone, Mail, Shield, MapPin, Navigation, Star } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useCompany } from "@/components/shared/CompanyContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ThirdPartyDrivers({ carrierId }) {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);

  const [formData, setFormData] = useState({
    driver_name: "",
    driver_license_number: "",
    license_expiry_date: "",
    driver_phone: "",
    driver_email: "",
    hazmat_certified: false,
    hazmat_cert_expiry: "",
    status: "active",
    tracking_enabled: false,
    performance_rating: 0
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['thirdPartyDrivers', carrierId],
    queryFn: () => supabase.entities.ThirdPartyDriver.filter({ carrier_id: carrierId }),
    enabled: !!carrierId,
  });

  const { data: gpsPoints = [] } = useQuery({
    queryKey: ['driverGPS', drivers.map(d => d.id)],
    queryFn: async () => {
      const activeDrivers = drivers.filter(d => d.current_shipment_id);
      const promises = activeDrivers.map(driver =>
        supabase.entities.GPSTrackingPoint.filter(
          { shipment_id: driver.current_shipment_id },
          '-timestamp',
          1
        )
      );
      return Promise.all(promises);
    },
    enabled: drivers.length > 0,
    refetchInterval: 30000
  });

  const saveDriverMutation = useMutation({
    mutationFn: (data) => {
      const driverData = { ...data, company_id: selectedCompanyId, carrier_id: carrierId };
      if (selectedDriver) {
        return supabase.entities.ThirdPartyDriver.update(selectedDriver.id, driverData);
      }
      return supabase.entities.ThirdPartyDriver.create(driverData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thirdPartyDrivers'] });
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
        license_expiry_date: "",
        driver_phone: "",
        driver_email: "",
        hazmat_certified: false,
        hazmat_cert_expiry: "",
        status: "active",
        tracking_enabled: false,
        performance_rating: 0
      });
    }
    setDialogOpen(true);
  };

  const isLicenseExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const days = Math.floor((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 30;
  };

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Carrier Drivers</h3>
        <Button onClick={() => openDialog()} size="sm" className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Driver
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {drivers.map(driver => {
          const hasActiveShipment = !!driver.current_shipment_id;
          const licenseExpiring = isLicenseExpiringSoon(driver.license_expiry_date);
          const licenseExpired = isExpired(driver.license_expiry_date);

          return (
            <Card key={driver.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{driver.driver_name}</h4>
                      <p className="text-xs text-gray-500">{driver.driver_license_number}</p>
                    </div>
                  </div>
                  <Badge className={
                    driver.status === 'active' ? 'bg-green-100 text-green-800' :
                    driver.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }>
                    {driver.status}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-gray-500" />
                    <span>{driver.driver_phone}</span>
                  </div>
                  {driver.driver_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-gray-500" />
                      <span>{driver.driver_email}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1 mt-2">
                    {driver.hazmat_certified && (
                      <Badge variant="outline" className="text-xs">
                        <Shield className="w-3 h-3 mr-1" />
                        HAZMAT
                      </Badge>
                    )}
                    {driver.tracking_enabled && (
                      <Badge variant="outline" className="text-xs bg-blue-50">
                        <Navigation className="w-3 h-3 mr-1" />
                        GPS Active
                      </Badge>
                    )}
                    {hasActiveShipment && (
                      <Badge className="bg-orange-100 text-orange-800 text-xs">
                        On Delivery
                      </Badge>
                    )}
                    {licenseExpired && (
                      <Badge className="bg-red-100 text-red-800 text-xs">
                        License Expired
                      </Badge>
                    )}
                    {licenseExpiring && !licenseExpired && (
                      <Badge className="bg-orange-100 text-orange-800 text-xs">
                        License Expiring
                      </Badge>
                    )}
                  </div>

                  {driver.performance_rating > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-semibold">{driver.performance_rating.toFixed(1)}/5</span>
                    </div>
                  )}

                  {driver.last_known_location && (
                    <div className="flex items-center gap-2 text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                      <MapPin className="w-3 h-3" />
                      <span className="text-xs">
                        Last seen: {new Date(driver.last_known_location.timestamp).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <Button onClick={() => openDialog(driver)} variant="outline" size="sm" className="w-full mt-3">
                  Edit Details
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {drivers.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <User className="w-10 h-10 mx-auto mb-3 text-gray-400" />
            <p className="text-sm">No drivers added for this carrier</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedDriver ? "Edit Driver" : "Add Carrier Driver"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Driver Name *</Label>
              <Input value={formData.driver_name} onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>License Number *</Label>
                <Input value={formData.driver_license_number} onChange={(e) => setFormData({ ...formData, driver_license_number: e.target.value })} />
              </div>
              <div>
                <Label>License Expiry</Label>
                <Input type="date" value={formData.license_expiry_date || ''} onChange={(e) => setFormData({ ...formData, license_expiry_date: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input value={formData.driver_phone} onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={formData.driver_email || ''} onChange={(e) => setFormData({ ...formData, driver_email: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.hazmat_certified}
                onCheckedChange={(checked) => setFormData({ ...formData, hazmat_certified: checked })}
                id="hazmat_driver"
              />
              <Label htmlFor="hazmat_driver" className="cursor-pointer">HAZMAT Certified</Label>
            </div>

            {formData.hazmat_certified && (
              <div>
                <Label>HAZMAT Cert Expiry</Label>
                <Input type="date" value={formData.hazmat_cert_expiry || ''} onChange={(e) => setFormData({ ...formData, hazmat_cert_expiry: e.target.value })} />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.tracking_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, tracking_enabled: checked })}
                id="tracking"
              />
              <Label htmlFor="tracking" className="cursor-pointer">Enable GPS Tracking</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Performance Rating</Label>
                <Input type="number" min="0" max="5" step="0.1" value={formData.performance_rating} onChange={(e) => setFormData({ ...formData, performance_rating: parseFloat(e.target.value) })} />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveDriverMutation.mutate(formData)} disabled={saveDriverMutation.isPending}>
                {saveDriverMutation.isPending ? "Saving..." : "Save Driver"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}