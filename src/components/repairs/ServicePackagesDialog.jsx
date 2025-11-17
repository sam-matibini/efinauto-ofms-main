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
import { Check, Plus, Edit, Trash2, Clock } from "lucide-react";
import { useCompany } from "@/components/shared/CompanyContext";
import { toast } from "sonner";

export default function ServicePackagesDialog({ open, onClose, onSelectPackage }) {
  const { selectedCompanyId } = useCompany();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const queryClient = useQueryClient();

  const { data: packages = [] } = useQuery({
    queryKey: ['service-packages', selectedCompanyId],
    queryFn: () => base44.entities.ServicePackage.filter({ company_id: selectedCompanyId, active: true }),
    enabled: !!selectedCompanyId && open,
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ServicePackage.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-packages'] });
      toast.success("Package deleted");
    },
  });

  const handleEdit = (pkg) => {
    setEditingPackage(pkg);
    setEditDialogOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this service package?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSelect = (pkg) => {
    if (onSelectPackage) {
      onSelectPackage(pkg);
      onClose();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Service Packages</span>
              <Button onClick={() => {
                setEditingPackage(null);
                setEditDialogOpen(true);
              }} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Package
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-4 py-4">
            {packages.length === 0 ? (
              <div className="col-span-2 text-center py-12 text-gray-500">
                <p>No service packages yet. Create your first package!</p>
              </div>
            ) : (
              packages.map((pkg) => (
                <Card key={pkg.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                      <div className="flex-1">
                        <span>{pkg.name}</span>
                        <Badge className="ml-2 bg-green-100 text-green-700">${pkg.price}</Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button onClick={() => handleEdit(pkg)} size="icon" variant="ghost" className="h-8 w-8">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => handleDelete(pkg.id)} size="icon" variant="ghost" className="h-8 w-8 text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-3 h-3" />
                      {pkg.duration_minutes} min
                      {pkg.labor_hours > 0 && <span>• {pkg.labor_hours} hrs labor</span>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {pkg.description && (
                      <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>
                    )}
                    {pkg.includes?.length > 0 && (
                      <ul className="space-y-2 mb-4">
                        {pkg.includes.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Button onClick={() => handleSelect(pkg)} className="w-full" variant="outline">
                      Use This Package
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PackageEditDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingPackage(null);
        }}
        package={editingPackage}
      />
    </>
  );
}

function PackageEditDialog({ open, onClose, package: pkg }) {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    company_id: selectedCompanyId,
    name: "",
    description: "",
    category: "maintenance",
    price: 0,
    duration_minutes: 60,
    labor_hours: 1,
    includes: [],
    active: true
  });
  const [newInclude, setNewInclude] = useState("");

  React.useEffect(() => {
    if (pkg) {
      setFormData(pkg);
    } else {
      setFormData({
        company_id: selectedCompanyId,
        name: "",
        description: "",
        category: "maintenance",
        price: 0,
        duration_minutes: 60,
        labor_hours: 1,
        includes: [],
        active: true
      });
    }
  }, [pkg, open, selectedCompanyId]);

  const saveMutation = useMutation({
    mutationFn: (data) => pkg 
      ? base44.entities.ServicePackage.update(pkg.id, data)
      : base44.entities.ServicePackage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-packages'] });
      toast.success(pkg ? "Package updated" : "Package created");
      onClose();
    },
  });

  const addInclude = () => {
    if (newInclude.trim()) {
      setFormData({ ...formData, includes: [...(formData.includes || []), newInclude.trim()] });
      setNewInclude("");
    }
  };

  const removeInclude = (index) => {
    setFormData({ ...formData, includes: formData.includes.filter((_, i) => i !== index) });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{pkg ? 'Edit' : 'Create'} Service Package</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Package Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Basic Oil Change"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="specialty">Specialty</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Price ($) *</Label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (min)</Label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Labor Hours</Label>
              <Input
                type="number"
                value={formData.labor_hours}
                onChange={(e) => setFormData({ ...formData, labor_hours: parseFloat(e.target.value) || 0 })}
                step="0.25"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>What's Included</Label>
            <div className="flex gap-2">
              <Input
                value={newInclude}
                onChange={(e) => setNewInclude(e.target.value)}
                placeholder="e.g., Oil change"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInclude())}
              />
              <Button onClick={addInclude} type="button" size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.includes?.length > 0 && (
              <div className="space-y-1 mt-2">
                {formData.includes.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="flex-1 text-sm">{item}</span>
                    <Button onClick={() => removeInclude(i)} size="icon" variant="ghost" className="h-6 w-6">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate(formData)}>
            {pkg ? 'Update' : 'Create'} Package
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}