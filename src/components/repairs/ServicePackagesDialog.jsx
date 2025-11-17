import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Plus, Edit, Trash2, X } from "lucide-react";
import { useCompany } from "@/components/shared/CompanyContext";
import { toast } from "sonner";

export default function ServicePackagesDialog({ open, onClose, onSelectPackage }) {
  const { selectedCompanyId } = useCompany();
  const [editMode, setEditMode] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const queryClient = useQueryClient();

  const { data: packages = [] } = useQuery({
    queryKey: ['servicePackages', selectedCompanyId],
    queryFn: () => base44.entities.ServicePackage.filter({ company_id: selectedCompanyId, active: true }),
    enabled: !!selectedCompanyId && open,
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ServicePackage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicePackages'] });
      toast.success("Package created");
      setEditMode(false);
      setEditingPackage(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ServicePackage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicePackages'] });
      toast.success("Package updated");
      setEditMode(false);
      setEditingPackage(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ServicePackage.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicePackages'] });
      toast.success("Package deleted");
    },
  });

  const handleUsePackage = (pkg) => {
    if (onSelectPackage) {
      onSelectPackage(pkg);
      onClose();
    }
  };

  const handleEdit = (pkg) => {
    setEditingPackage(pkg);
    setEditMode(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this service package?")) {
      deleteMutation.mutate(id);
    }
  };

  if (editMode) {
    return (
      <PackageEditor
        open={open}
        onClose={() => {
          setEditMode(false);
          setEditingPackage(null);
        }}
        package={editingPackage}
        onSave={(data) => {
          if (editingPackage) {
            updateMutation.mutate({ id: editingPackage.id, data });
          } else {
            createMutation.mutate({ ...data, company_id: selectedCompanyId });
          }
        }}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Service Packages</DialogTitle>
            <Button onClick={() => setEditMode(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Package
            </Button>
          </div>
        </DialogHeader>

        {packages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No service packages yet</p>
            <Button onClick={() => setEditMode(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Package
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 py-4">
            {packages.map((pkg) => (
              <Card key={pkg.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <span>{pkg.name}</span>
                        <Badge className="bg-green-100 text-green-700">${pkg.price}</Badge>
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {pkg.duration_minutes ? `${pkg.duration_minutes} min` : 'Duration varies'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(pkg)} className="h-8 w-8">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(pkg.id)} className="h-8 w-8 text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {pkg.description && (
                    <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>
                  )}
                  <ul className="space-y-2 mb-4">
                    {(pkg.includes || []).map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" onClick={() => handleUsePackage(pkg)}>
                    Use This Package
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PackageEditor({ open, onClose, package: pkg, onSave }) {
  const [formData, setFormData] = useState(pkg || {
    name: "",
    price: 0,
    duration_minutes: 0,
    service_type: "routine_maintenance",
    description: "",
    includes: [],
    active: true
  });
  const [newItem, setNewItem] = useState("");

  React.useEffect(() => {
    if (pkg) {
      setFormData(pkg);
    }
  }, [pkg]);

  const addItem = () => {
    if (newItem.trim()) {
      setFormData({
        ...formData,
        includes: [...(formData.includes || []), newItem.trim()]
      });
      setNewItem("");
    }
  };

  const removeItem = (index) => {
    setFormData({
      ...formData,
      includes: formData.includes.filter((_, i) => i !== index)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{pkg ? 'Edit' : 'Create'} Service Package</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Package Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Basic Oil Change"
              />
            </div>
            <div className="space-y-2">
              <Label>Price ($) *</Label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                step="0.01"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Service Type</Label>
              <Select value={formData.service_type} onValueChange={(value) => setFormData({ ...formData, service_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine_maintenance">Routine Maintenance</SelectItem>
                  <SelectItem value="oil_change">Oil Change</SelectItem>
                  <SelectItem value="brake_service">Brake Service</SelectItem>
                  <SelectItem value="engine_repair">Engine Repair</SelectItem>
                  <SelectItem value="transmission_repair">Transmission Repair</SelectItem>
                  <SelectItem value="electrical_repair">Electrical Repair</SelectItem>
                  <SelectItem value="body_work">Body Work</SelectItem>
                  <SelectItem value="tire_service">Tire Service</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Brief description of the service package..."
            />
          </div>

          <div className="space-y-2">
            <Label>Services Included</Label>
            <div className="flex gap-2">
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Add service item..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
              />
              <Button type="button" onClick={addItem}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2 mt-3">
              {(formData.includes || []).map((item, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="flex-1 text-sm">{item}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(index)}
                    className="h-6 w-6"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(formData)} disabled={!formData.name || !formData.price}>
            {pkg ? 'Update' : 'Create'} Package
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}