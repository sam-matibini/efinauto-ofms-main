import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save } from "lucide-react";
import DocumentAutoscan from "@/components/shared/DocumentAutoscan";
import { mergeDocumentFields } from "@/lib/documentAutoscan";
import { supabase } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "../shared/CompanyContext";

export default function PartDialog({ open, onClose, part, onSave, isSaving }) {
  const { selectedCompanyId } = useCompany();
  
  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors', selectedCompanyId],
    queryFn: () => supabase.entities.Vendor.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId && open,
    initialData: [],
  });

  const { data: company } = useQuery({
    queryKey: ['company', selectedCompanyId],
    queryFn: async () => {
      const companies = await supabase.entities.Company.filter({ id: selectedCompanyId });
      return companies[0];
    },
    enabled: !!selectedCompanyId && open,
  });

  const [formData, setFormData] = useState({
    part_number: "", 
    name: "", 
    description: "", 
    category: "other",
    compatible_makes: "", 
    compatible_models: "", 
    quantity: 0,
    reorder_level: 5, 
    cost_price: 0, 
    selling_price: 0,
    supplier: "", 
    location: "", 
    image_url: "",
    vendor_id: "", vendor_name: "", vendor_phone: "", vendor_email: "",
    invoice_number: "", purchase_date: "",
    province: "", tax_status: "taxable", pst_exempt: false, tax_gst: 0, tax_pst: 0, tax_hst: 0, tax_total: 0, total_cost: 0
  });

  React.useEffect(() => {
    if (open) {
      if (part) {
        setFormData({
          ...part,
          vendor_id: part.vendor_id || "",
          vendor_name: part.vendor_name || "",
          vendor_phone: part.vendor_phone || "",
          vendor_email: part.vendor_email || "",
          invoice_number: part.invoice_number || "",
          purchase_date: part.purchase_date || "",
          province: part.province || "",
          tax_status: part.tax_status || "taxable",
          pst_exempt: part.pst_exempt || false,
          tax_gst: part.tax_gst || 0,
          tax_pst: part.tax_pst || 0,
          tax_hst: part.tax_hst || 0,
          tax_total: part.tax_total || 0,
          total_cost: part.total_cost || 0
        });
      } else {
        setFormData({
          part_number: "", 
          name: "", 
          description: "", 
          category: "other",
          compatible_makes: "", 
          compatible_models: "", 
          quantity: 0,
          reorder_level: 5, 
          cost_price: 0, 
          selling_price: 0,
          supplier: "", 
          location: "", 
          image_url: "",
          vendor_id: "", vendor_name: "", vendor_phone: "", vendor_email: "",
          invoice_number: "", purchase_date: "",
          province: "", tax_status: "taxable", pst_exempt: false, tax_gst: 0, tax_pst: 0, tax_hst: 0, tax_total: 0, total_cost: 0
        });
      }
    }
  }, [part, open]);

  const calculateTaxes = (price, province, taxStatus, pstExempt = false) => {
    if (taxStatus !== "taxable" || !province || !price) {
      return { tax_gst: 0, tax_pst: 0, tax_hst: 0, tax_total: 0, total_cost: price || 0 };
    }
    const rates = company?.tax_rates?.[province] || { gst: 5, pst: 0, hst: 0 };
    const tax_gst = (price * (rates.gst || 0)) / 100;
    const tax_pst = pstExempt ? 0 : (price * (rates.pst || 0)) / 100;
    const tax_hst = (price * (rates.hst || 0)) / 100;
    const tax_total = tax_gst + tax_pst + tax_hst;
    return { tax_gst, tax_pst, tax_hst, tax_total, total_cost: price + tax_total };
  };

  const handleProvinceChange = (province) => {
    const taxes = calculateTaxes(formData.cost_price, province, formData.tax_status, formData.pst_exempt);
    setFormData({ ...formData, province, ...taxes });
  };

  const handleTaxStatusChange = (taxStatus) => {
    const taxes = calculateTaxes(formData.cost_price, formData.province, taxStatus, formData.pst_exempt);
    setFormData({ ...formData, tax_status: taxStatus, ...taxes });
  };

  const handleCostPriceChange = (price) => {
    const taxes = calculateTaxes(price, formData.province, formData.tax_status, formData.pst_exempt);
    setFormData({ ...formData, cost_price: price, ...taxes });
  };

  const handlePstExemptChange = (checked) => {
    const taxes = calculateTaxes(formData.cost_price, formData.province, formData.tax_status, checked);
    setFormData({ ...formData, pst_exempt: checked, ...taxes });
  };

  const handleVendorSelect = (vendorId) => {
    const vendor = vendors.find(v => v.id === vendorId);
    if (vendor) {
      setFormData({
        ...formData,
        vendor_id: vendor.id,
        vendor_name: vendor.vendor_name,
        vendor_phone: vendor.phone || "",
        vendor_email: vendor.email || "",
        supplier: vendor.vendor_name
      });
    }
  };

  const canSave = formData.part_number?.trim().length > 0 && formData.name?.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{part ? 'Edit Part' : 'Add New Part'}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="vendor">Vendor & Tax</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="compatibility">Compatibility</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Part Number *</Label>
                <Input 
                  value={formData.part_number || ""} 
                  onChange={(e) => setFormData({...formData, part_number: e.target.value})} 
                  placeholder="e.g., BRK-123-45"
                />
              </div>
              <div className="space-y-2">
                <Label>Part Name *</Label>
                <Input 
                  value={formData.name || ""} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g., Brake Pad Set"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={formData.description || ""} 
                onChange={(e) => setFormData({...formData, description: e.target.value})} 
                rows={3}
                placeholder="Detailed description of the part..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engine">Engine</SelectItem>
                    <SelectItem value="transmission">Transmission</SelectItem>
                    <SelectItem value="brakes">Brakes</SelectItem>
                    <SelectItem value="suspension">Suspension</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="body_parts">Body Parts</SelectItem>
                    <SelectItem value="interior">Interior</SelectItem>
                    <SelectItem value="exhaust">Exhaust</SelectItem>
                    <SelectItem value="cooling">Cooling</SelectItem>
                    <SelectItem value="fuel_system">Fuel System</SelectItem>
                    <SelectItem value="filters">Filters</SelectItem>
                    <SelectItem value="lights">Lights</SelectItem>
                    <SelectItem value="tires_wheels">Tires & Wheels</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Input 
                  value={formData.supplier || ""} 
                  onChange={(e) => setFormData({...formData, supplier: e.target.value})} 
                  placeholder="Supplier name"
                />
              </div>
            </div>
            <DocumentAutoscan
              profile="part"
              resetKey={open}
              onApply={(fields) => setFormData((prev) => mergeDocumentFields(prev, fields))}
            />
          </TabsContent>

          <TabsContent value="vendor" className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select Vendor</Label>
                <Select value={formData.vendor_id} onValueChange={handleVendorSelect}>
                  <SelectTrigger><SelectValue placeholder="Select a vendor" /></SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.vendor_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vendor Name</Label>
                <Input 
                  value={formData.vendor_name || ""} 
                  onChange={(e) => setFormData({...formData, vendor_name: e.target.value, supplier: e.target.value})} 
                  placeholder="Vendor name"
                />
              </div>
              <div className="space-y-2">
                <Label>Vendor Phone</Label>
                <Input 
                  value={formData.vendor_phone || ""} 
                  onChange={(e) => setFormData({...formData, vendor_phone: e.target.value})} 
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label>Vendor Email</Label>
                <Input 
                  value={formData.vendor_email || ""} 
                  onChange={(e) => setFormData({...formData, vendor_email: e.target.value})} 
                  placeholder="Email address"
                />
              </div>
              <div className="space-y-2">
                <Label>Invoice Number</Label>
                <Input 
                  value={formData.invoice_number || ""} 
                  onChange={(e) => setFormData({...formData, invoice_number: e.target.value})} 
                  placeholder="INV-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Input 
                  type="date"
                  value={formData.purchase_date || ""} 
                  onChange={(e) => setFormData({...formData, purchase_date: e.target.value})} 
                />
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold text-gray-900 mb-4">Sales Tax Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Province</Label>
                  <Select value={formData.province} onValueChange={handleProvinceChange}>
                    <SelectTrigger><SelectValue placeholder="Select province" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AB">Alberta</SelectItem>
                      <SelectItem value="BC">British Columbia</SelectItem>
                      <SelectItem value="MB">Manitoba</SelectItem>
                      <SelectItem value="NB">New Brunswick</SelectItem>
                      <SelectItem value="NL">Newfoundland</SelectItem>
                      <SelectItem value="NT">Northwest Territories</SelectItem>
                      <SelectItem value="NS">Nova Scotia</SelectItem>
                      <SelectItem value="NU">Nunavut</SelectItem>
                      <SelectItem value="ON">Ontario</SelectItem>
                      <SelectItem value="PE">Prince Edward Island</SelectItem>
                      <SelectItem value="QC">Quebec</SelectItem>
                      <SelectItem value="SK">Saskatchewan</SelectItem>
                      <SelectItem value="YT">Yukon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tax Status</Label>
                  <Select value={formData.tax_status} onValueChange={handleTaxStatusChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="taxable">Taxable</SelectItem>
                      <SelectItem value="zero_rated">Zero-Rated</SelectItem>
                      <SelectItem value="exempt">Exempt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="pst_exempt_part"
                    checked={formData.pst_exempt || false}
                    onChange={(e) => handlePstExemptChange(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="pst_exempt_part" className="cursor-pointer">PST Exempt</Label>
                </div>
                <div className="space-y-2">
                  <Label>GST Amount</Label>
                  <Input type="number" step="0.01" value={formData.tax_gst?.toFixed(2) || "0.00"} readOnly className="bg-gray-50" />
                </div>
                <div className="space-y-2">
                  <Label>PST Amount</Label>
                  <Input type="number" step="0.01" value={formData.tax_pst?.toFixed(2) || "0.00"} readOnly className="bg-gray-50" />
                </div>
                <div className="space-y-2">
                  <Label>HST Amount</Label>
                  <Input type="number" step="0.01" value={formData.tax_hst?.toFixed(2) || "0.00"} readOnly className="bg-gray-50" />
                </div>
                <div className="space-y-2">
                  <Label>Total Tax</Label>
                  <Input type="number" step="0.01" value={formData.tax_total?.toFixed(2) || "0.00"} readOnly className="bg-gray-50" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Total Cost (Price + Tax)</Label>
                  <Input type="number" step="0.01" value={formData.total_cost?.toFixed(2) || "0.00"} readOnly className="bg-gray-100 font-semibold" />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Quantity</Label>
                <Input 
                  type="number" 
                  value={formData.quantity || 0} 
                  onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Reorder Level</Label>
                <Input 
                  type="number" 
                  value={formData.reorder_level || 5} 
                  onChange={(e) => setFormData({...formData, reorder_level: parseInt(e.target.value) || 5})} 
                />
                <p className="text-xs text-gray-500">Alert when stock falls below this level</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost Price ($)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={formData.cost_price || 0} 
                  onChange={(e) => handleCostPriceChange(parseFloat(e.target.value) || 0)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Selling Price ($)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  value={formData.selling_price || 0} 
                  onChange={(e) => setFormData({...formData, selling_price: parseFloat(e.target.value) || 0})} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Storage Location</Label>
              <Input 
                value={formData.location || ""} 
                onChange={(e) => setFormData({...formData, location: e.target.value})} 
                placeholder="e.g., Warehouse A, Shelf 3"
              />
            </div>

            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input 
                value={formData.image_url || ""} 
                onChange={(e) => setFormData({...formData, image_url: e.target.value})} 
                placeholder="https://..."
              />
            </div>
          </TabsContent>

          <TabsContent value="compatibility" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Compatible Makes</Label>
              <Input 
                value={formData.compatible_makes || ""} 
                onChange={(e) => setFormData({...formData, compatible_makes: e.target.value})} 
                placeholder="e.g., Toyota, Honda, Ford (comma-separated)"
              />
              <p className="text-xs text-gray-500">Comma-separated list of vehicle manufacturers</p>
            </div>

            <div className="space-y-2">
              <Label>Compatible Models</Label>
              <Textarea 
                value={formData.compatible_models || ""} 
                onChange={(e) => setFormData({...formData, compatible_models: e.target.value})} 
                rows={4}
                placeholder="e.g., Camry 2015-2020, Accord 2016-2021"
              />
              <p className="text-xs text-gray-500">List specific models and years this part fits</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button 
            onClick={() => onSave(formData)} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isSaving || !canSave}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {part ? 'Update' : 'Add'} Part
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}