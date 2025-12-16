import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertCircle, Ship } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import ExportLineItemsManager from "./ExportLineItemsManager";
import CountrySelector from "../shared/CountrySelector";
import SubdivisionSelector from "../shared/SubdivisionSelector";
import CurrencySelector from "../shared/CurrencySelector";
import PortSelector from "../shared/PortSelector";
import { useQuery } from "@tanstack/react-query";

export default function CreateExportOrderDialog({ open, onClose, sale, onSuccess, companyId }) {
  const [loading, setLoading] = useState(false);
  const [lineItems, setLineItems] = useState([]);
  const [formData, setFormData] = useState({
    export_type: "vehicle",
    export_reason: "",
    destination_country: "",
    destination_subdivision: "",
    destination_port: "",
    destination_address: "",
    consignee_name: sale?.customer_name || "",
    consignee_email: sale?.customer_email || "",
    consignee_phone: sale?.customer_phone || "",
    consignee_address: sale?.customer_address || "",
    incoterms: "FOB",
    hs_code: "",
    country_of_origin: "CA",
    export_declaration_required: true,
    customs_value: sale?.grand_total || 0,
    currency: "USD",
    shipping_mode: "sea",
    container_type: "40ft",
    estimated_departure: "",
    estimated_arrival: "",
    notes: ""
  });

  // Auto-default currency when country changes
  const { data: countries = [] } = useQuery({
    queryKey: ['countries'],
    queryFn: () => base44.entities.Country.list(),
  });

  useEffect(() => {
    if (formData.destination_country && countries.length > 0) {
      const country = countries.find(c => c.iso2_code === formData.destination_country);
      if (country?.currency_iso_code && !formData.currency) {
        setFormData(prev => ({ ...prev, currency: country.currency_iso_code }));
      }
    }
  }, [formData.destination_country, countries]);

  useEffect(() => {
    if (open && sale) {
      setFormData(prev => ({
        ...prev,
        consignee_name: sale.customer_name || "",
        consignee_email: sale.customer_email || "",
        consignee_phone: sale.customer_phone || "",
        consignee_address: sale.customer_address || "",
        customs_value: sale.grand_total || 0
      }));
    }
  }, [open, sale]);

  const handleCreate = async () => {
    // ISO + HS Code Validation
    if (!formData.destination_country || formData.destination_country.length !== 2) {
      toast.error("Valid ISO 3166-1 destination country code is required (2 letters)");
      return;
    }
    if (!formData.country_of_origin || formData.country_of_origin.length !== 2) {
      toast.error("Valid ISO 3166-1 country of origin code is required");
      return;
    }
    if (!formData.currency || formData.currency.length !== 3) {
      toast.error("Valid ISO 4217 currency code is required (3 letters)");
      return;
    }
    if (!formData.consignee_name) {
      toast.error("Consignee name is required");
      return;
    }
    if (lineItems.length === 0) {
      toast.error("At least one line item is required");
      return;
    }

    // Validate all line items have HS codes (6+ digits)
    const missingHS = lineItems.filter(item => !item.hs_code || item.hs_code.replace(/\./g, '').length < 6);
    if (missingHS.length > 0) {
      toast.error(`${missingHS.length} line item(s) missing valid HS code (minimum 6 digits required)`);
      return;
    }

    // Validate subdivision if provided
    if (formData.destination_subdivision && !formData.destination_subdivision.includes('-')) {
      toast.error("Invalid subdivision code format (should be ISO 3166-2, e.g., CA-ON)");
      return;
    }

    setLoading(true);
    try {
      const user = await base44.auth.me();
      
      // Generate export order number
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      const exportOrderNumber = `EXP-${year}-${random}`;

      // Calculate totals from line items
      const totalValue = lineItems.reduce((sum, item) => sum + (item.total_value || 0), 0);
      const totalWeight = lineItems.reduce((sum, item) => sum + (item.weight || 0), 0);
      
      // Determine export type based on line items
      const itemTypes = [...new Set(lineItems.map(item => item.item_type))];
      const exportType = itemTypes.length > 1 ? 'mixed' : itemTypes[0];

      // Create export order
      const exportOrder = await base44.entities.ExportOrder.create({
        company_id: sale?.company_id || companyId,
        export_order_number: exportOrderNumber,
        linked_sales_document_id: sale?.id,
        linked_sale_number: sale?.bos_number || sale?.sale_number,
        export_status: "compliance_review",
        ...formData,
        export_type: exportType,
        line_items: lineItems,
        total_value: totalValue,
        total_weight: totalWeight,
        customs_value: totalValue
      });

      // Log creation
      await base44.entities.AuditLog.create({
        company_id: sale?.company_id || companyId,
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name,
        module: "Export",
        action: "EXPORT_ORDER_CREATED",
        record_id: exportOrder.id,
        record_identifier: exportOrderNumber,
        metadata: {
          from_sale: sale?.bos_number || sale?.sale_number,
          destination_country: formData.destination_country,
          line_items_count: lineItems.length,
          total_value: totalValue
        },
        status: "success"
      });

      toast.success("Export order created successfully");
      onSuccess?.(exportOrder);
      onClose();
    } catch (error) {
      console.error("Failed to create export order:", error);
      toast.error("Failed to create export order: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship className="w-5 h-5" />
            Create Export Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {sale && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                Converting sale <strong>{sale.bos_number || sale.sale_number}</strong> to export order. 
                This will apply zero-rated tax treatment and enable international shipping.
              </p>
            </div>
          )}

          {/* Line Items Manager */}
          <ExportLineItemsManager
            lineItems={lineItems}
            onChange={setLineItems}
            currency={formData.currency}
            companyId={companyId}
          />

          {/* Export Reason */}
          <div>
            <Label>Export Reason *</Label>
            <Input
              value={formData.export_reason}
              onChange={(e) => setFormData({...formData, export_reason: e.target.value})}
              placeholder="e.g., Commercial sale"
            />
          </div>

          {/* Destination */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Destination Country * (ISO 3166-1)</Label>
              <CountrySelector
                value={formData.destination_country}
                onChange={(v) => {
                  const country = countries.find(c => c.iso2_code === v);
                  setFormData({
                    ...formData, 
                    destination_country: v,
                    destination_subdivision: "",
                    currency: country?.currency_iso_code || formData.currency
                  });
                }}
              />
            </div>
            <div>
              <Label>Province/State (ISO 3166-2)</Label>
              <SubdivisionSelector
                countryIso2={formData.destination_country}
                value={formData.destination_subdivision}
                onChange={(v) => setFormData({...formData, destination_subdivision: v})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Destination Port (UN/LOCODE)</Label>
              <PortSelector
                countryIso2={formData.destination_country}
                value={formData.destination_port}
                onChange={(v) => setFormData({...formData, destination_port: v})}
                portType="seaport"
              />
            </div>
            <div>
              <Label>Destination Address</Label>
              <Input
                value={formData.destination_address}
                onChange={(e) => setFormData({...formData, destination_address: e.target.value})}
                placeholder="Street address"
              />
            </div>
          </div>

          {/* Consignee Details */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Consignee (Receiver)</h4>
            <div className="space-y-3">
              <div>
                <Label>Consignee Name *</Label>
                <Input
                  value={formData.consignee_name}
                  onChange={(e) => setFormData({...formData, consignee_name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.consignee_email}
                    onChange={(e) => setFormData({...formData, consignee_email: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={formData.consignee_phone}
                    onChange={(e) => setFormData({...formData, consignee_phone: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <Label>Consignee Address</Label>
                <Textarea
                  value={formData.consignee_address}
                  onChange={(e) => setFormData({...formData, consignee_address: e.target.value})}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Compliance Fields */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Customs & Compliance</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Country of Origin (ISO 3166-1)</Label>
                <CountrySelector
                  value={formData.country_of_origin}
                  onChange={(v) => setFormData({...formData, country_of_origin: v})}
                />
              </div>
              <div>
                <Label>Currency (ISO 4217)</Label>
                <CurrencySelector
                  value={formData.currency}
                  onChange={(v) => setFormData({...formData, currency: v})}
                />
              </div>
            </div>
          </div>

          {/* Shipping Details */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Shipping Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Incoterms</Label>
                <Select value={formData.incoterms} onValueChange={(v) => setFormData({...formData, incoterms: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXW">EXW - Ex Works</SelectItem>
                    <SelectItem value="FCA">FCA - Free Carrier</SelectItem>
                    <SelectItem value="FOB">FOB - Free On Board</SelectItem>
                    <SelectItem value="CFR">CFR - Cost and Freight</SelectItem>
                    <SelectItem value="CIF">CIF - Cost, Insurance, Freight</SelectItem>
                    <SelectItem value="DAP">DAP - Delivered at Place</SelectItem>
                    <SelectItem value="DDP">DDP - Delivered Duty Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Shipping Mode</Label>
                <Select value={formData.shipping_mode} onValueChange={(v) => setFormData({...formData, shipping_mode: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sea">Sea Freight</SelectItem>
                    <SelectItem value="air">Air Freight</SelectItem>
                    <SelectItem value="road">Road</SelectItem>
                    <SelectItem value="rail">Rail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.shipping_mode === "sea" && (
                <div>
                  <Label>Container Type</Label>
                  <Select value={formData.container_type} onValueChange={(v) => setFormData({...formData, container_type: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20ft">20ft Standard</SelectItem>
                      <SelectItem value="40ft">40ft Standard</SelectItem>
                      <SelectItem value="40ft_hc">40ft High Cube</SelectItem>
                      <SelectItem value="45ft">45ft</SelectItem>
                      <SelectItem value="reefer">Reefer (Refrigerated)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Estimated Departure</Label>
                <Input
                  type="date"
                  value={formData.estimated_departure}
                  onChange={(e) => setFormData({...formData, estimated_departure: e.target.value})}
                />
              </div>
              <div>
                <Label>Estimated Arrival</Label>
                <Input
                  type="date"
                  value={formData.estimated_arrival}
                  onChange={(e) => setFormData({...formData, estimated_arrival: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
              placeholder="Internal notes about this export..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Export Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}