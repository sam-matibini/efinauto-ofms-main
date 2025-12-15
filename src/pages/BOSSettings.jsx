import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  FileText, Plus, Edit, Trash2, RefreshCw, 
  BarChart3, AlertCircle, CheckCircle2, Settings 
} from "lucide-react";
import { toast } from "sonner";
import { getBOSStatistics, previewNextBOSNumber } from "@/components/sales/BOSNumberingService";

export default function BOSSettings() {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [newLocation, setNewLocation] = useState({ code: '', name: '' });
  const [editingLocation, setEditingLocation] = useState(null);

  // Fetch company data
  const { data: company } = useQuery({
    queryKey: ['company', selectedCompanyId],
    queryFn: () => base44.entities.Company.filter({ id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    select: (data) => data[0],
  });

  // Fetch current sequences
  const { data: sequences, isLoading } = useQuery({
    queryKey: ['bos-sequences', selectedCompanyId],
    queryFn: () => base44.entities.DocumentSequence.filter({
      company_id: selectedCompanyId,
      document_type: 'bill_of_sale',
      year: new Date().getFullYear()
    }),
    enabled: !!selectedCompanyId,
  });

  // Fetch BOS statistics
  const { data: statistics } = useQuery({
    queryKey: ['bos-statistics', selectedCompanyId],
    queryFn: () => getBOSStatistics(selectedCompanyId),
    enabled: !!selectedCompanyId,
    refetchInterval: 30000 // Refresh every 30s
  });

  // Create location sequence
  const createLocationMutation = useMutation({
    mutationFn: async (locationData) => {
      return await base44.entities.DocumentSequence.create({
        company_id: selectedCompanyId,
        document_type: 'bill_of_sale',
        year: new Date().getFullYear(),
        location_code: locationData.code,
        last_sequence: 0,
        format_template: 'BOS-YYYY-LOC-NNNNNN',
        prefix: 'BOS',
        reset_yearly: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bos-sequences'] });
      queryClient.invalidateQueries({ queryKey: ['bos-statistics'] });
      toast.success("Location added successfully");
      setNewLocation({ code: '', name: '' });
    },
    onError: () => {
      toast.error("Failed to add location");
    }
  });

  // Update sequence
  const updateSequenceMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      return await base44.entities.DocumentSequence.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bos-sequences'] });
      queryClient.invalidateQueries({ queryKey: ['bos-statistics'] });
      toast.success("Sequence updated");
      setEditingLocation(null);
    },
    onError: () => {
      toast.error("Failed to update sequence");
    }
  });

  // Delete sequence (admin only)
  const deleteSequenceMutation = useMutation({
    mutationFn: async (sequenceId) => {
      return await base44.entities.DocumentSequence.delete({ id: sequenceId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bos-sequences'] });
      toast.success("Location removed");
    },
    onError: () => {
      toast.error("Failed to remove location");
    }
  });

  const handleAddLocation = () => {
    if (!newLocation.code || newLocation.code.length > 5) {
      toast.error("Location code must be 1-5 characters");
      return;
    }
    createLocationMutation.mutate(newLocation);
  };

  const handlePreviewNumber = async (locationCode) => {
    const preview = await previewNextBOSNumber(selectedCompanyId, locationCode);
    toast.info(`Next BOS number will be: ${preview}`);
  };

  if (!selectedCompanyId) {
    return (
      <div className="p-6">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <p className="text-yellow-800">Please select a company to manage Bill of Sale settings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Bill of Sale Settings
        </h1>
        <p className="text-sm text-gray-300 mt-1">
          {company?.name} • Configure BOS numbering and locations
        </p>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Statistics Overview */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Issued This Year</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.total_issued_this_year}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Voided</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.total_voided}</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Active Locations</p>
                    <p className="text-3xl font-bold text-gray-900">{sequences?.length || 0}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* BOS Format Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              BOS Number Format
            </CardTitle>
            <CardDescription>
              Current format: BOS-YYYY-LOC-NNNNNN (e.g., BOS-2025-TOR-000001)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Prefix</p>
                <p className="text-gray-600">BOS (Bill of Sale)</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Year Format</p>
                <p className="text-gray-600">YYYY (Full year)</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">Sequence</p>
                <p className="text-gray-600">6-digit zero-padded</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Management */}
        <Card>
          <CardHeader>
            <CardTitle>Location Sequences</CardTitle>
            <CardDescription>
              Manage Bill of Sale numbering by location or branch
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add New Location */}
            <div className="flex gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex-1">
                <Label htmlFor="location-code">Location Code *</Label>
                <Input
                  id="location-code"
                  placeholder="e.g., TOR, VAN, MTL"
                  value={newLocation.code}
                  onChange={(e) => setNewLocation({ ...newLocation, code: e.target.value.toUpperCase() })}
                  maxLength={5}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddLocation} disabled={createLocationMutation.isPending}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Location
                </Button>
              </div>
            </div>

            {/* Existing Locations */}
            {isLoading ? (
              <p className="text-center text-gray-500">Loading sequences...</p>
            ) : sequences && sequences.length > 0 ? (
              <div className="space-y-3">
                {sequences.map((seq) => (
                  <div key={seq.id} className="flex items-center justify-between p-4 bg-white border rounded-lg">
                    <div className="flex items-center gap-4 flex-1">
                      <Badge className="bg-slate-700 text-white text-sm px-3 py-1">
                        {seq.location_code}
                      </Badge>
                      <div>
                        <p className="font-semibold text-gray-900">
                          Last Sequence: {seq.last_sequence || 0}
                        </p>
                        <p className="text-sm text-gray-500">
                          Next: BOS-{seq.year}-{seq.location_code}-{String((seq.last_sequence || 0) + 1).padStart(6, '0')}
                        </p>
                      </div>
                      {statistics?.by_location[seq.location_code] && (
                        <div className="ml-auto mr-4">
                          <Badge variant="outline">
                            {statistics.by_location[seq.location_code].total_issued} issued
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreviewNumber(seq.location_code)}
                      >
                        Preview Next
                      </Button>
                      {seq.last_sequence === 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSequenceMutation.mutate(seq.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No locations configured yet. Add one to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Important Notes */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Important Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-yellow-800">
            <p>• BOS numbers are automatically generated when a Bill of Sale is finalized.</p>
            <p>• Once assigned, BOS numbers cannot be edited or reused.</p>
            <p>• Voided sales retain their BOS number for audit purposes.</p>
            <p>• Sequences reset annually on January 1st.</p>
            <p>• Location codes should be 2-5 uppercase characters (e.g., TOR, VAN).</p>
            <p>• Only delete location sequences that have never been used (sequence = 0).</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}