import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Upload, Camera, Loader2, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { sendEmergencyAlert } from "./HazmatWeatherAlerts";

export default function IncidentReportDialog({ open, onClose, shipment, driver }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    incident_type: "spill",
    severity: "medium",
    description: "",
    immediate_actions_taken: "",
    emergency_services_notified: false,
    photos: []
  });

  const handleSubmit = async () => {
    if (!formData.description) {
      toast.error("Please describe the incident");
      return;
    }

    setLoading(true);
    try {
      // Get current location
      let location = null;
      if (navigator.geolocation) {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          address: `${shipment.destination_address}, ${shipment.destination_city}`
        };
      }

      // Create incident
      const incident = await base44.entities.HazmatIncident.create({
        company_id: shipment.company_id,
        shipment_id: shipment.id,
        driver_id: driver.id,
        incident_number: `INC-${Date.now()}`,
        incident_type: formData.incident_type,
        severity: formData.severity,
        description: formData.description,
        location,
        reported_by: driver.driver_email,
        reported_at: new Date().toISOString(),
        emergency_services_notified: formData.emergency_services_notified,
        immediate_actions_taken: formData.immediate_actions_taken,
        photos: formData.photos
      });

      // Send emergency alerts for high/critical incidents
      if (formData.severity === 'high' || formData.severity === 'critical') {
        await sendEmergencyAlert(incident, shipment, driver);
        toast.success("🚨 Emergency alert sent to dispatch and authorities");
      } else {
        toast.success("Incident reported successfully");
      }

      onClose();
    } catch (error) {
      toast.error("Failed to report incident");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            Report HAZMAT Safety Incident
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-900 font-semibold">⚠️ Critical Reporting</p>
            <p className="text-xs text-red-700 mt-1">
              For immediate emergencies, call 911 first, then report here. High/Critical incidents trigger automatic alerts to dispatch and authorities.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Incident Type *</Label>
              <Select value={formData.incident_type} onValueChange={(value) => setFormData({ ...formData, incident_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spill">Spill</SelectItem>
                  <SelectItem value="leak">Leak</SelectItem>
                  <SelectItem value="fire">Fire</SelectItem>
                  <SelectItem value="accident">Accident</SelectItem>
                  <SelectItem value="near_miss">Near Miss</SelectItem>
                  <SelectItem value="equipment_failure">Equipment Failure</SelectItem>
                  <SelectItem value="weather_emergency">Weather Emergency</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Severity Level *</Label>
              <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Minor concern</SelectItem>
                  <SelectItem value="medium">Medium - Attention needed</SelectItem>
                  <SelectItem value="high">High - Immediate action</SelectItem>
                  <SelectItem value="critical">Critical - Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Incident Description *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what happened, materials involved, and current situation..."
              rows={4}
            />
          </div>

          <div>
            <Label>Immediate Actions Taken</Label>
            <Textarea
              value={formData.immediate_actions_taken}
              onChange={(e) => setFormData({ ...formData, immediate_actions_taken: e.target.value })}
              placeholder="What actions did you take immediately? (e.g., contained spill, activated emergency kit, evacuated area)"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-3 p-3 border rounded">
            <input
              type="checkbox"
              id="emergency_services"
              checked={formData.emergency_services_notified}
              onChange={(e) => setFormData({ ...formData, emergency_services_notified: e.target.checked })}
              className="w-4 h-4"
            />
            <Label htmlFor="emergency_services" className="cursor-pointer">
              Emergency services (911) have been notified
            </Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className={
                formData.severity === 'critical' || formData.severity === 'high'
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-orange-600 hover:bg-orange-700"
              }
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Reporting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Report
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}