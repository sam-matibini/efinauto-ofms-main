import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Truck, Plus, Star, Phone, Mail, Shield, AlertCircle, FileCheck, Calendar } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import CarrierOnboardingDialog from "./CarrierOnboardingDialog";

export default function ThirdPartyCarriers() {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [onboardingDialogOpen, setOnboardingDialogOpen] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState(null);
  
  const [formData, setFormData] = useState({
    carrier_name: "",
    carrier_code: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    service_types: [],
    hazmat_certified: false,
    insurance_verified: false,
    insurance_expiry: "",
    rating: 0,
    base_rate_per_km: 0,
    status: "active",
    notes: ""
  });

  const { data: carriers = [] } = useQuery({
    queryKey: ['thirdPartyCarriers', selectedCompanyId],
    queryFn: () => base44.entities.ThirdPartyCarrier.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors', selectedCompanyId],
    queryFn: () => base44.entities.Vendor.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const saveCarrierMutation = useMutation({
    mutationFn: async (data) => {
      const carrierData = { ...data, company_id: selectedCompanyId };
      
      // Create vendor if checkbox is checked and no vendor_id
      if (data.create_vendor && !data.vendor_id) {
        const vendorId = await createVendorFromCarrier(carrierData);
        if (vendorId) {
          carrierData.vendor_id = vendorId;
        }
      }
      
      if (selectedCarrier) {
        return base44.entities.ThirdPartyCarrier.update(selectedCarrier.id, carrierData);
      }
      return base44.entities.ThirdPartyCarrier.create(carrierData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thirdPartyCarriers'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success(selectedCarrier ? "Carrier updated" : "Carrier added");
      setDialogOpen(false);
      setSelectedCarrier(null);
    },
    onError: () => toast.error("Failed to save carrier")
  });

  const openDialog = (carrier = null) => {
    if (carrier) {
      setSelectedCarrier(carrier);
      setFormData(carrier);
    } else {
      setSelectedCarrier(null);
      setFormData({
        carrier_name: "",
        carrier_code: "",
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        service_types: [],
        hazmat_certified: false,
        insurance_verified: false,
        insurance_expiry: "",
        rating: 0,
        base_rate_per_km: 0,
        status: "active",
        onboarding_status: "pending",
        vendor_id: "",
        notes: ""
      });
    }
    setDialogOpen(true);
  };

  const createVendorFromCarrier = async (carrierData) => {
    try {
      const vendor = await base44.entities.Vendor.create({
        company_id: selectedCompanyId,
        vendor_name: carrierData.carrier_name,
        vendor_type: "logistics",
        contact_person: carrierData.contact_name,
        email: carrierData.contact_email,
        phone: carrierData.contact_phone,
        status: "active",
        notes: `Linked to 3rd party carrier: ${carrierData.carrier_code}`
      });
      return vendor.id;
    } catch (error) {
      console.error("Failed to create vendor:", error);
      return null;
    }
  };

  const openOnboardingDialog = (carrier) => {
    setSelectedCarrier(carrier);
    setOnboardingDialogOpen(true);
  };

  const refreshCarriers = () => {
    queryClient.invalidateQueries({ queryKey: ['thirdPartyCarriers'] });
  };

  const toggleServiceType = (type) => {
    const current = formData.service_types || [];
    if (current.includes(type)) {
      setFormData({ ...formData, service_types: current.filter(t => t !== type) });
    } else {
      setFormData({ ...formData, service_types: [...current, type] });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">3rd Party Carriers</h2>
        <Button onClick={() => openDialog()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Carrier
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {carriers.map(carrier => (
          <Card key={carrier.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Truck className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold">{carrier.carrier_name}</h3>
                    <p className="text-xs text-gray-500">{carrier.carrier_code}</p>
                  </div>
                </div>
                <Badge className={
                  carrier.status === 'active' ? 'bg-green-100 text-green-800' :
                  carrier.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }>
                  {carrier.status}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                {carrier.onboarding_status && (
                  <Badge className={
                    carrier.onboarding_status === 'approved' ? 'bg-green-100 text-green-800' :
                    carrier.onboarding_status === 'review' ? 'bg-yellow-100 text-yellow-800' :
                    carrier.onboarding_status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }>
                    {carrier.onboarding_status.replace(/_/g, ' ')}
                  </Badge>
                )}

                <div className="flex items-center gap-2">
                  <Phone className="w-3 h-3 text-gray-500" />
                  <span className="text-xs">{carrier.contact_phone}</span>
                </div>
                {carrier.contact_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3 text-gray-500" />
                    <span className="text-xs">{carrier.contact_email}</span>
                  </div>
                )}

                {carrier.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs font-semibold">{carrier.rating.toFixed(1)}/5</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-1 mt-2">
                  {carrier.hazmat_certified && (
                    <Badge variant="outline" className="text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      HAZMAT
                    </Badge>
                  )}
                  {carrier.insurance_verified && (
                    <Badge variant="outline" className="text-xs bg-green-50">
                      ✓ Insured
                    </Badge>
                  )}
                  {carrier.insurance_expiry && new Date(carrier.insurance_expiry) < new Date() && (
                    <Badge className="bg-red-100 text-red-800 text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Expired
                    </Badge>
                  )}
                  {carrier.compliance_documents?.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <FileCheck className="w-3 h-3 mr-1" />
                      {carrier.compliance_documents.length} Docs
                    </Badge>
                  )}
                </div>

                {carrier.base_rate_per_km > 0 && (
                  <p className="text-xs text-gray-600 mt-2">
                    Rate: ${carrier.base_rate_per_km.toFixed(2)}/km
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <Button onClick={() => openDialog(carrier)} variant="outline" size="sm">
                  Edit
                </Button>
                <Button onClick={() => openOnboardingDialog(carrier)} size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <FileCheck className="w-3 h-3 mr-1" />
                  Onboarding
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {carriers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Truck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No 3rd party carriers added yet</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedCarrier ? "Edit Carrier" : "Add 3rd Party Carrier"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[600px] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Carrier Name *</Label>
                <Input value={formData.carrier_name} onChange={(e) => setFormData({ ...formData, carrier_name: e.target.value })} />
              </div>
              <div>
                <Label>Carrier Code</Label>
                <Input value={formData.carrier_code} onChange={(e) => setFormData({ ...formData, carrier_code: e.target.value })} placeholder="e.g., ABC-123" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Name</Label>
                <Input value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} />
              </div>
              <div>
                <Label>Contact Phone *</Label>
                <Input value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>Contact Email</Label>
              <Input type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} />
            </div>

            <div>
              <Label className="mb-2 block">Service Types</Label>
              <div className="grid grid-cols-2 gap-2">
                {["local_delivery", "long_haul", "expedited", "refrigerated", "hazmat_certified", "oversized"].map(type => (
                  <div key={type} className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.service_types?.includes(type)}
                      onCheckedChange={() => toggleServiceType(type)}
                      id={type}
                    />
                    <Label htmlFor={type} className="text-sm cursor-pointer">
                      {type.replace(/_/g, ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.hazmat_certified}
                  onCheckedChange={(checked) => setFormData({ ...formData, hazmat_certified: checked })}
                  id="hazmat"
                />
                <Label htmlFor="hazmat" className="cursor-pointer">HAZMAT Certified</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.insurance_verified}
                  onCheckedChange={(checked) => setFormData({ ...formData, insurance_verified: checked })}
                  id="insurance"
                />
                <Label htmlFor="insurance" className="cursor-pointer">Insurance Verified</Label>
              </div>
            </div>

            {formData.insurance_verified && (
              <div>
                <Label>Insurance Expiry Date</Label>
                <Input type="date" value={formData.insurance_expiry || ''} onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rating (0-5)</Label>
                <Input type="number" min="0" max="5" step="0.1" value={formData.rating} onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })} />
              </div>
              <div>
                <Label>Base Rate ($/km)</Label>
                <Input type="number" min="0" step="0.01" value={formData.base_rate_per_km} onChange={(e) => setFormData({ ...formData, base_rate_per_km: parseFloat(e.target.value) })} />
              </div>
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
                <Label>Onboarding Status</Label>
                <Select value={formData.onboarding_status || 'pending'} onValueChange={(value) => setFormData({ ...formData, onboarding_status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="documents_pending">Documents Pending</SelectItem>
                    <SelectItem value="review">Under Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded border">
              <Label className="text-xs font-semibold mb-2 block">Operating Authority</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">DOT Number</Label>
                  <Input
                    value={formData.operating_authority?.dot_number || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      operating_authority: { ...formData.operating_authority, dot_number: e.target.value }
                    })}
                    placeholder="DOT#"
                  />
                </div>
                <div>
                  <Label className="text-xs">MC Number</Label>
                  <Input
                    value={formData.operating_authority?.mc_number || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      operating_authority: { ...formData.operating_authority, mc_number: e.target.value }
                    })}
                    placeholder="MC#"
                  />
                </div>
                <div>
                  <Label className="text-xs">SCAC Code</Label>
                  <Input
                    value={formData.operating_authority?.scac_code || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      operating_authority: { ...formData.operating_authority, scac_code: e.target.value }
                    })}
                    placeholder="SCAC"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded border">
              <Label className="text-xs font-semibold mb-2 block">Insurance Details</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Provider</Label>
                  <Input
                    value={formData.insurance_details?.provider || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      insurance_details: { ...formData.insurance_details, provider: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Policy Number</Label>
                  <Input
                    value={formData.insurance_details?.policy_number || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      insurance_details: { ...formData.insurance_details, policy_number: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Coverage Amount ($)</Label>
                  <Input
                    type="number"
                    value={formData.insurance_details?.coverage_amount || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      insurance_details: { ...formData.insurance_details, coverage_amount: parseFloat(e.target.value) }
                    })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Expiry Date</Label>
                  <Input
                    type="date"
                    value={formData.insurance_details?.expiry_date || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      insurance_details: { ...formData.insurance_details, expiry_date: e.target.value }
                    })}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Link to Vendor (Accounting)</Label>
              <Select value={formData.vendor_id || ''} onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor or create new" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {vendors.map(vendor => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!selectedCarrier && !formData.vendor_id && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded">
                <Checkbox
                  checked={formData.create_vendor || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, create_vendor: checked })}
                  id="create_vendor"
                />
                <Label htmlFor="create_vendor" className="cursor-pointer text-sm">
                  Automatically create vendor record for accounting
                </Label>
              </div>
            )}

            <div>
              <Label>Notes</Label>
              <Input value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes..." />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveCarrierMutation.mutate(formData)} disabled={saveCarrierMutation.isPending}>
                {saveCarrierMutation.isPending ? "Saving..." : "Save Carrier"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CarrierOnboardingDialog
        carrier={selectedCarrier}
        open={onboardingDialogOpen}
        onClose={() => setOnboardingDialogOpen(false)}
        onUpdate={refreshCarriers}
      />
    </div>
  );
}