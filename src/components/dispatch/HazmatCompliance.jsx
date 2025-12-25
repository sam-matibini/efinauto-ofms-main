import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Shield, CheckCircle, XCircle, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function HazmatCompliance({ shipments }) {
  const queryClient = useQueryClient();
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [checklist, setChecklist] = useState({
    placards_displayed: false,
    driver_hazmat_certified: false,
    emergency_response_guide_available: false,
    spill_kit_onboard: false,
    vehicle_inspected: false,
    compliance_notes: ""
  });

  const updateComplianceMutation = useMutation({
    mutationFn: async (data) => {
      const complianceData = {
        hazmat_compliance: {
          ...data,
          compliance_checked_by: (await base44.auth.me()).email,
          compliance_checked_at: new Date().toISOString()
        }
      };
      return base44.entities.LocalShipment.update(selectedShipment.id, complianceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['localShipments'] });
      toast.success("HAZMAT compliance updated");
      setDialogOpen(false);
    },
    onError: () => toast.error("Failed to update compliance")
  });

  const openComplianceDialog = (shipment) => {
    setSelectedShipment(shipment);
    setChecklist(shipment.hazmat_compliance || {
      placards_displayed: false,
      driver_hazmat_certified: false,
      emergency_response_guide_available: false,
      spill_kit_onboard: false,
      vehicle_inspected: false,
      compliance_notes: ""
    });
    setDialogOpen(true);
  };

  const isCompliant = (compliance) => {
    if (!compliance) return false;
    return compliance.placards_displayed &&
           compliance.driver_hazmat_certified &&
           compliance.emergency_response_guide_available &&
           compliance.spill_kit_onboard &&
           compliance.vehicle_inspected;
  };

  const allChecked = checklist.placards_displayed &&
                     checklist.driver_hazmat_certified &&
                     checklist.emergency_response_guide_available &&
                     checklist.spill_kit_onboard &&
                     checklist.vehicle_inspected;

  return (
    <div className="space-y-4">
      <Card className="bg-red-50 border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900">
            <AlertTriangle className="w-5 h-5" />
            HAZMAT Compliance Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-700">
            All shipments containing hazardous materials require completed compliance checklist before dispatch.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {shipments.map(shipment => {
          const compliant = isCompliant(shipment.hazmat_compliance);
          const hasCompliance = shipment.hazmat_compliance;

          return (
            <Card key={shipment.id} className={`hover:shadow-lg transition-shadow ${
              compliant ? 'border-green-300' : 'border-red-300'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">{shipment.shipment_number}</h3>
                      <Badge className="bg-red-100 text-red-800">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        HAZMAT
                      </Badge>
                      {compliant ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Compliant
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-800">
                          <XCircle className="w-3 h-3 mr-1" />
                          Pending Review
                        </Badge>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 text-sm mt-3">
                      <div>
                        <p className="text-gray-600">Route:</p>
                        <p className="font-medium">{shipment.origin_city} → {shipment.destination_city}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Status:</p>
                        <p className="font-medium capitalize">{shipment.status?.replace(/_/g, ' ')}</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-xs font-semibold text-gray-700 mb-2">HAZMAT Commodities:</p>
                      <div className="space-y-1">
                        {shipment.commodities?.filter(c => c.hazmat).map((commodity, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                            <span>{commodity.product_name}</span>
                            <Badge variant="outline" className="text-xs">{commodity.hazmat_class}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {hasCompliance && (
                      <div className="mt-4 p-3 bg-gray-50 rounded text-xs space-y-1">
                        <p className="font-semibold">Compliance Checklist:</p>
                        <div className="grid grid-cols-2 gap-1">
                          <div className={shipment.hazmat_compliance.placards_displayed ? "text-green-700" : "text-red-700"}>
                            {shipment.hazmat_compliance.placards_displayed ? "✓" : "✗"} Placards Displayed
                          </div>
                          <div className={shipment.hazmat_compliance.driver_hazmat_certified ? "text-green-700" : "text-red-700"}>
                            {shipment.hazmat_compliance.driver_hazmat_certified ? "✓" : "✗"} Driver Certified
                          </div>
                          <div className={shipment.hazmat_compliance.emergency_response_guide_available ? "text-green-700" : "text-red-700"}>
                            {shipment.hazmat_compliance.emergency_response_guide_available ? "✓" : "✗"} Emergency Guide
                          </div>
                          <div className={shipment.hazmat_compliance.spill_kit_onboard ? "text-green-700" : "text-red-700"}>
                            {shipment.hazmat_compliance.spill_kit_onboard ? "✓" : "✗"} Spill Kit
                          </div>
                          <div className={shipment.hazmat_compliance.vehicle_inspected ? "text-green-700" : "text-red-700"}>
                            {shipment.hazmat_compliance.vehicle_inspected ? "✓" : "✗"} Vehicle Inspected
                          </div>
                        </div>
                        {shipment.hazmat_compliance.compliance_checked_at && (
                          <p className="text-gray-500 mt-2">
                            Checked by {shipment.hazmat_compliance.compliance_checked_by} on{' '}
                            {new Date(shipment.hazmat_compliance.compliance_checked_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => openComplianceDialog(shipment)}
                    className={compliant ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {compliant ? "Review Compliance" : "Complete Checklist"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {shipments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No HAZMAT shipments to review</p>
          </CardContent>
        </Card>
      )}

      {/* Compliance Checklist Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              HAZMAT Compliance Checklist - {selectedShipment?.shipment_number}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-900 font-semibold mb-2">⚠️ Regulatory Requirement</p>
              <p className="text-xs text-red-700">
                All items must be checked before shipment can be dispatched. Failure to comply may result in fines, penalties, or shipment rejection.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 border rounded hover:bg-gray-50">
                <Checkbox
                  checked={checklist.placards_displayed}
                  onCheckedChange={(checked) => setChecklist({ ...checklist, placards_displayed: checked })}
                  id="placards"
                />
                <div className="flex-1">
                  <Label htmlFor="placards" className="cursor-pointer font-semibold">
                    Proper placards displayed on vehicle
                  </Label>
                  <p className="text-xs text-gray-600 mt-1">
                    HAZMAT placards must be visible on all four sides of vehicle
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded hover:bg-gray-50">
                <Checkbox
                  checked={checklist.driver_hazmat_certified}
                  onCheckedChange={(checked) => setChecklist({ ...checklist, driver_hazmat_certified: checked })}
                  id="driver_cert"
                />
                <div className="flex-1">
                  <Label htmlFor="driver_cert" className="cursor-pointer font-semibold">
                    Driver is HAZMAT certified
                  </Label>
                  <p className="text-xs text-gray-600 mt-1">
                    Verify driver has valid HAZMAT endorsement on license
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded hover:bg-gray-50">
                <Checkbox
                  checked={checklist.emergency_response_guide_available}
                  onCheckedChange={(checked) => setChecklist({ ...checklist, emergency_response_guide_available: checked })}
                  id="erg"
                />
                <div className="flex-1">
                  <Label htmlFor="erg" className="cursor-pointer font-semibold">
                    Emergency Response Guide (ERG) available in cab
                  </Label>
                  <p className="text-xs text-gray-600 mt-1">
                    Current year ERG guidebook must be accessible to driver
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded hover:bg-gray-50">
                <Checkbox
                  checked={checklist.spill_kit_onboard}
                  onCheckedChange={(checked) => setChecklist({ ...checklist, spill_kit_onboard: checked })}
                  id="spill_kit"
                />
                <div className="flex-1">
                  <Label htmlFor="spill_kit" className="cursor-pointer font-semibold">
                    Spill containment kit onboard
                  </Label>
                  <p className="text-xs text-gray-600 mt-1">
                    Spill kit appropriate for material class must be present
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded hover:bg-gray-50">
                <Checkbox
                  checked={checklist.vehicle_inspected}
                  onCheckedChange={(checked) => setChecklist({ ...checklist, vehicle_inspected: checked })}
                  id="inspection"
                />
                <div className="flex-1">
                  <Label htmlFor="inspection" className="cursor-pointer font-semibold">
                    Vehicle pre-trip inspection completed
                  </Label>
                  <p className="text-xs text-gray-600 mt-1">
                    Visual inspection for leaks, damage, and safety equipment
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label>Compliance Notes</Label>
              <Textarea
                value={checklist.compliance_notes || ''}
                onChange={(e) => setChecklist({ ...checklist, compliance_notes: e.target.value })}
                placeholder="Additional compliance notes or observations..."
                rows={3}
              />
            </div>

            {allChecked ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">All Requirements Met</p>
                  <p className="text-xs text-green-700">Shipment is cleared for dispatch</p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
                <div>
                  <p className="font-semibold text-orange-900">Incomplete Checklist</p>
                  <p className="text-xs text-orange-700">All items must be checked before dispatch</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => updateComplianceMutation.mutate(checklist)}
                disabled={updateComplianceMutation.isPending}
                className={allChecked ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"}
              >
                {updateComplianceMutation.isPending ? "Saving..." : "Save Compliance"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}