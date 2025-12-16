import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Plus, Edit, Trash2, Circle, Hexagon } from "lucide-react";
import { toast } from "sonner";
import { MapContainer, TileLayer, Circle as LeafletCircle, Polygon, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function GeofenceManager({ companyId }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    location_type: "warehouse",
    center_latitude: 43.6532,
    center_longitude: -79.3832,
    radius_km: 5,
    shape: "circle",
    trigger_on_entry: true,
    trigger_on_exit: false,
    alert_recipients: "",
    color: "#3b82f6",
    metadata: {}
  });

  const queryClient = useQueryClient();

  const { data: geofences = [], isLoading } = useQuery({
    queryKey: ['geofences', companyId],
    queryFn: () => base44.entities.Geofence.filter({ company_id: companyId }),
    enabled: !!companyId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Geofence.create({
      ...data,
      company_id: companyId,
      alert_recipients: data.alert_recipients ? data.alert_recipients.split(',').map(e => e.trim()) : []
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      toast.success("Geofence created");
      handleClose();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Geofence.update(id, {
      ...data,
      alert_recipients: data.alert_recipients ? data.alert_recipients.split(',').map(e => e.trim()) : []
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      toast.success("Geofence updated");
      handleClose();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Geofence.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      toast.success("Geofence deleted");
    }
  });

  const handleClose = () => {
    setDialogOpen(false);
    setEditingGeofence(null);
    setFormData({
      name: "",
      location_type: "warehouse",
      center_latitude: 43.6532,
      center_longitude: -79.3832,
      radius_km: 5,
      shape: "circle",
      trigger_on_entry: true,
      trigger_on_exit: false,
      alert_recipients: "",
      color: "#3b82f6",
      metadata: {}
    });
  };

  const handleEdit = (geofence) => {
    setEditingGeofence(geofence);
    setFormData({
      ...geofence,
      alert_recipients: geofence.alert_recipients?.join(', ') || ""
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingGeofence) {
      updateMutation.mutate({ id: editingGeofence.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const locationTypeIcons = {
    port: "⚓",
    warehouse: "🏢",
    customer_site: "👤",
    customs: "📋",
    distribution_center: "📦",
    other: "📍"
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Geofence Zones
            </CardTitle>
            <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Geofence
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {geofences.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No geofences defined</p>
            </div>
          ) : (
            <div className="space-y-3">
              {geofences.map((geofence) => (
                <div key={geofence.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{locationTypeIcons[geofence.location_type]}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{geofence.name}</span>
                        <Badge variant="outline" className="capitalize">
                          {geofence.location_type.replace(/_/g, ' ')}
                        </Badge>
                        {geofence.shape === 'circle' ? (
                          <Circle className="w-4 h-4 text-gray-500" />
                        ) : (
                          <Hexagon className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {geofence.shape === 'circle' ? `Radius: ${geofence.radius_km} km` : 'Custom polygon'}
                        {' • '}
                        {geofence.trigger_on_entry && 'Entry alerts'}
                        {geofence.trigger_on_entry && geofence.trigger_on_exit && ' & '}
                        {geofence.trigger_on_exit && 'Exit alerts'}
                      </div>
                      {geofence.alert_recipients?.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          Recipients: {geofence.alert_recipients.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={geofence.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {geofence.active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(geofence)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => deleteMutation.mutate(geofence.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map Preview */}
      {geofences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Geofence Map</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] rounded-lg overflow-hidden border">
              <MapContainer 
                center={[43.6532, -79.3832]} 
                zoom={4} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {geofences.filter(g => g.active).map((geofence) => (
                  <React.Fragment key={geofence.id}>
                    {geofence.shape === 'circle' ? (
                      <LeafletCircle
                        center={[geofence.center_latitude, geofence.center_longitude]}
                        radius={geofence.radius_km * 1000}
                        pathOptions={{ 
                          color: geofence.color, 
                          fillColor: geofence.color,
                          fillOpacity: 0.2 
                        }}
                      />
                    ) : geofence.polygon_coordinates ? (
                      <Polygon
                        positions={geofence.polygon_coordinates.map(c => [c.lat, c.lng])}
                        pathOptions={{ 
                          color: geofence.color,
                          fillColor: geofence.color,
                          fillOpacity: 0.2 
                        }}
                      />
                    ) : null}
                    <Marker position={[geofence.center_latitude, geofence.center_longitude]} />
                  </React.Fragment>
                ))}
              </MapContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGeofence ? 'Edit Geofence' : 'Create Geofence'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Geofence Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Port of Vancouver, Main Warehouse"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Location Type</Label>
                <Select value={formData.location_type} onValueChange={(v) => setFormData({ ...formData, location_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="port">Port</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    <SelectItem value="customer_site">Customer Site</SelectItem>
                    <SelectItem value="customs">Customs</SelectItem>
                    <SelectItem value="distribution_center">Distribution Center</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Shape</Label>
                <Select value={formData.shape} onValueChange={(v) => setFormData({ ...formData, shape: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="circle">Circle</SelectItem>
                    <SelectItem value="polygon">Polygon (Advanced)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Center Latitude</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={formData.center_latitude}
                  onChange={(e) => setFormData({ ...formData, center_latitude: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Center Longitude</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={formData.center_longitude}
                  onChange={(e) => setFormData({ ...formData, center_longitude: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            {formData.shape === 'circle' && (
              <div>
                <Label>Radius (km)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.radius_km}
                  onChange={(e) => setFormData({ ...formData, radius_km: parseFloat(e.target.value) })}
                />
              </div>
            )}

            <div>
              <Label>Display Color</Label>
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Trigger alert on entry</Label>
                <Switch
                  checked={formData.trigger_on_entry}
                  onCheckedChange={(checked) => setFormData({ ...formData, trigger_on_entry: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Trigger alert on exit</Label>
                <Switch
                  checked={formData.trigger_on_exit}
                  onCheckedChange={(checked) => setFormData({ ...formData, trigger_on_exit: checked })}
                />
              </div>
            </div>

            <div>
              <Label>Alert Recipients (comma-separated emails)</Label>
              <Input
                value={formData.alert_recipients}
                onChange={(e) => setFormData({ ...formData, alert_recipients: e.target.value })}
                placeholder="email1@example.com, email2@example.com"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={!formData.name}>
                {editingGeofence ? 'Update' : 'Create'} Geofence
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}