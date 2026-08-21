import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Mail, Phone, User } from "lucide-react";

const defaultTaxRates = {
  AB: { gst: 5, pst: 0, hst: 0 },
  BC: { gst: 5, pst: 7, hst: 0 },
  MB: { gst: 5, pst: 7, hst: 0 },
  NB: { gst: 0, pst: 0, hst: 15 },
  NL: { gst: 0, pst: 0, hst: 15 },
  NT: { gst: 5, pst: 0, hst: 0 },
  NS: { gst: 0, pst: 0, hst: 15 },
  NU: { gst: 5, pst: 0, hst: 0 },
  ON: { gst: 0, pst: 0, hst: 13 },
  PE: { gst: 0, pst: 0, hst: 15 },
  QC: { gst: 5, pst: 9.975, hst: 0 },
  SK: { gst: 5, pst: 6, hst: 0 },
  YT: { gst: 5, pst: 0, hst: 0 }
};

const provinceNames = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NT: "Northwest Territories",
  NS: "Nova Scotia",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon"
};

const emptyForm = {
  name: "",
  display_name: "",
  code: "",
  dealer_permit_number: "",
  gst_number: "",
  pst_number: "",
  address: "",
  city: "",
  province: "",
  postal_code: "",
  country: "",
  phone: "",
  email: "",
  tax_id: "",
  logo_url: "",
  status: "active",
  contact_person_name: "",
  contact_person_title: "",
  contact_person_email: "",
  contact_person_phone: "",
  tax_rates: defaultTaxRates
};

export default function CompanyDialog({ open, onClose, company, onSave, isLoading }) {
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (company) {
      setFormData({ ...company, tax_rates: company.tax_rates || defaultTaxRates });
    } else {
      setFormData(emptyForm);
    }
  }, [company, open]);

  const canSave = formData.name?.trim() && formData.code?.trim();

  const updateTaxRate = (province, field, value) => {
    setFormData({
      ...formData,
      tax_rates: {
        ...formData.tax_rates,
        [province]: {
          ...formData.tax_rates[province],
          [field]: parseFloat(value) || 0
        }
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{company ? 'Edit Company' : 'Add New Company'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Information</TabsTrigger>
            <TabsTrigger value="tax">Tax Rates Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <p className="text-sm text-gray-600">Required fields are marked with *</p>
              </div>
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Oluspe Auto Sales and Parts Inc."
                />
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={formData.display_name || ""}
                  onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                  placeholder="e.g., Oluspe Auto"
                />
              </div>
              <div className="space-y-2">
                <Label>Company Code *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  placeholder="e.g., 1001"
                />
              </div>
              <div className="space-y-2">
                <Label>Dealer Permit Number</Label>
                <Input
                  value={formData.dealer_permit_number || ""}
                  onChange={(e) => setFormData({...formData, dealer_permit_number: e.target.value})}
                  placeholder="e.g., DPN-12345"
                />
              </div>
              <div className="space-y-2">
                <Label>GST Number</Label>
                <Input
                  value={formData.gst_number || ""}
                  onChange={(e) => setFormData({...formData, gst_number: e.target.value})}
                  placeholder="Enter GST number"
                />
              </div>
              <div className="space-y-2">
                <Label>PST Number</Label>
                <Input
                  value={formData.pst_number || ""}
                  onChange={(e) => setFormData({...formData, pst_number: e.target.value})}
                  placeholder="Enter PST number"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  Email (for communications)
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="e.g., cars@oluspeautos.ca"
                />
                <p className="text-xs text-gray-500">Used as sender address in email communications</p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-purple-600" />
                  Phone (for communications)
                </Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="e.g., 2045908387"
                />
                <p className="text-xs text-gray-500">Used as sender number in SMS communications</p>
              </div>

              <div className="space-y-2 col-span-2">
                <div className="flex items-center gap-2 pt-4 pb-2 border-t">
                  <User className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Contact Person Details</h3>
                </div>
                <p className="text-xs text-gray-500">Primary contact person for communications and signatures</p>
              </div>

              <div className="space-y-2">
                <Label>Contact Person Name</Label>
                <Input
                  value={formData.contact_person_name || ""}
                  onChange={(e) => setFormData({...formData, contact_person_name: e.target.value})}
                  placeholder="e.g., John Smith"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Person Title</Label>
                <Input
                  value={formData.contact_person_title || ""}
                  onChange={(e) => setFormData({...formData, contact_person_title: e.target.value})}
                  placeholder="e.g., Sales Manager"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Person Email</Label>
                <Input
                  type="email"
                  value={formData.contact_person_email || ""}
                  onChange={(e) => setFormData({...formData, contact_person_email: e.target.value})}
                  placeholder="e.g., john@oluspeautos.ca"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Person Phone</Label>
                <Input
                  value={formData.contact_person_phone || ""}
                  onChange={(e) => setFormData({...formData, contact_person_phone: e.target.value})}
                  placeholder="e.g., 2045551234"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Address</Label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows={2}
                  placeholder="e.g., 3-122 Kildare Ave East"
                />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="e.g., Winnipeg, MB"
                />
              </div>
              <div className="space-y-2">
                <Label>Province/State</Label>
                <Input
                  value={formData.province}
                  onChange={(e) => setFormData({...formData, province: e.target.value})}
                  placeholder="e.g., Manitoba"
                />
              </div>
              <div className="space-y-2">
                <Label>Postal Code/ZIP</Label>
                <Input
                  value={formData.postal_code}
                  onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                  placeholder="e.g., R2C 5G1"
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  placeholder="e.g., Canada"
                />
              </div>
              <div className="space-y-2">
                <Label>Tax ID</Label>
                <Input
                  value={formData.tax_id}
                  onChange={(e) => setFormData({...formData, tax_id: e.target.value})}
                  placeholder="e.g., 155027-6"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tax" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Tax Rates Configuration:</strong> Set GST, PST, and HST rates for each Canadian province/territory. These rates will be used for calculating sales tax. Zero-rated (0%) and exempt sales can be handled at the transaction level.
                </p>
              </div>

              <div className="space-y-3">
                {Object.entries(formData.tax_rates || {}).map(([provinceCode, rates]) => (
                  <Card key={provinceCode} className="p-4">
                    <div className="grid grid-cols-4 gap-4 items-center">
                      <div className="font-semibold text-gray-900">
                        {provinceNames[provinceCode]} ({provinceCode})
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">GST (%)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={rates.gst}
                          onChange={(e) => updateTaxRate(provinceCode, 'gst', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">PST/QST (%)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={rates.pst}
                          onChange={(e) => updateTaxRate(provinceCode, 'pst', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">HST (%)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={rates.hst}
                          onChange={(e) => updateTaxRate(provinceCode, 'hst', e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Quick Reference:</strong>
                </p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>GST-only provinces: AB, NT, NU, YT (5%)</li>
                  <li>GST + PST provinces: BC (5% + 7%), MB (5% + 7%), QC (5% + 9.975%), SK (5% + 6%)</li>
                  <li>HST provinces: NB, NL, NS, PE (15%), ON (13%)</li>
                  <li>Zero-rated: 0% GST/HST (eligible for ITC) - set at sale level</li>
                  <li>Exempt: No tax charged (no ITC) - set at sale level</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button
            onClick={() => onSave(formData)}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!canSave || isLoading}
          >
            {isLoading ? "Saving..." : company ? 'Update Company' : 'Add Company'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
