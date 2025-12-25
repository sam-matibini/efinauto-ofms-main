import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, Plus, Wrench, CheckCircle, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function FleetManagement() {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [truckDialogOpen, setTruckDialogOpen] = useState(false);
  const [trailerDialogOpen, setTrailerDialogOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [selectedTrailer, setSelectedTrailer] = useState(null);

  const [truckFormData, setTruckFormData] = useState({
    truck_number: "",
    truck_plate: "",
    vehicle_type: "semi_truck",
    vin: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    status: "available"
  });

  const [trailerFormData, setTrailerFormData] = useState({
    trailer_number: "",
    trailer_plate: "",
    trailer_type: "dry_van",
    capacity_kg: 20000,
    length_m: 13.6,
    status: "available"
  });

  const { data: trucks = [] } = useQuery({
    queryKey: ['trucks', selectedCompanyId],
    queryFn: () => base44.entities.TruckVehicle.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const { data: trailers = [] } = useQuery({
    queryKey: ['trailers', selectedCompanyId],
    queryFn: () => base44.entities.Trailer.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const saveTruckMutation = useMutation({
    mutationFn: (data) => {
      const truckData = { ...data, company_id: selectedCompanyId };
      if (selectedTruck) {
        return base44.entities.TruckVehicle.update(selectedTruck.id, truckData);
      }
      return base44.entities.TruckVehicle.create(truckData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      toast.success(selectedTruck ? "Truck updated" : "Truck added");
      setTruckDialogOpen(false);
      setSelectedTruck(null);
    },
    onError: () => toast.error("Failed to save truck")
  });

  const saveTrailerMutation = useMutation({
    mutationFn: (data) => {
      const trailerData = { ...data, company_id: selectedCompanyId };
      if (selectedTrailer) {
        return base44.entities.Trailer.update(selectedTrailer.id, trailerData);
      }
      return base44.entities.Trailer.create(trailerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trailers'] });
      toast.success(selectedTrailer ? "Trailer updated" : "Trailer added");
      setTrailerDialogOpen(false);
      setSelectedTrailer(null);
    },
    onError: () => toast.error("Failed to save trailer")
  });

  const openTruckDialog = (truck = null) => {
    if (truck) {
      setSelectedTruck(truck);
      setTruckFormData(truck);
    } else {
      setSelectedTruck(null);
      setTruckFormData({
        truck_number: "",
        truck_plate: "",
        vehicle_type: "semi_truck",
        vin: "",
        make: "",
        model: "",
        year: new Date().getFullYear(),
        status: "available"
      });
    }
    setTruckDialogOpen(true);
  };

  const openTrailerDialog = (trailer = null) => {
    if (trailer) {
      setSelectedTrailer(trailer);
      setTrailerFormData(trailer);
    } else {
      setSelectedTrailer(null);
      setTrailerFormData({
        trailer_number: "",
        trailer_plate: "",
        trailer_type: "dry_van",
        capacity_kg: 20000,
        length_m: 13.6,
        status: "available"
      });
    }
    setTrailerDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="trucks">
        <TabsList>
          <TabsTrigger value="trucks">Trucks ({trucks.length})</TabsTrigger>
          <TabsTrigger value="trailers">Trailers ({trailers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="trucks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Truck Fleet</h2>
            <Button onClick={() => openTruckDialog()} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Truck
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {trucks.map(truck => (
              <Card key={truck.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Truck className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold">{truck.truck_number}</h3>
                        <p className="text-xs text-gray-500">{truck.truck_plate}</p>
                      </div>
                    </div>
                    <Badge className={
                      truck.status === 'available' ? 'bg-green-100 text-green-800' :
                      truck.status === 'in_use' ? 'bg-blue-100 text-blue-800' :
                      truck.status === 'maintenance' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {truck.status}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-sm">
                    <p className="text-gray-600">{truck.year} {truck.make} {truck.model}</p>
                    <p className="text-xs text-gray-500">VIN: {truck.vin || 'N/A'}</p>
                    <p className="text-xs text-gray-500">Type: {truck.vehicle_type?.replace(/_/g, ' ')}</p>
                    {truck.last_inspection_date && (
                      <p className="text-xs text-gray-500">
                        Last Inspection: {new Date(truck.last_inspection_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <Button onClick={() => openTruckDialog(truck)} variant="outline" size="sm" className="w-full mt-3">
                    Edit Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {trucks.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Truck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No trucks in fleet yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="trailers" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Trailer Fleet</h2>
            <Button onClick={() => openTrailerDialog()} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Trailer
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {trailers.map(trailer => (
              <Card key={trailer.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold">{trailer.trailer_number}</h3>
                      <p className="text-xs text-gray-500">{trailer.trailer_plate}</p>
                    </div>
                    <Badge className={
                      trailer.status === 'available' ? 'bg-green-100 text-green-800' :
                      trailer.status === 'in_use' ? 'bg-blue-100 text-blue-800' :
                      trailer.status === 'maintenance' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {trailer.status}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-sm">
                    <p className="text-gray-600">{trailer.trailer_type?.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-500">Capacity: {trailer.capacity_kg?.toLocaleString()} kg</p>
                    <p className="text-xs text-gray-500">Length: {trailer.length_m} m</p>
                  </div>

                  <Button onClick={() => openTrailerDialog(trailer)} variant="outline" size="sm" className="w-full mt-3">
                    Edit Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {trailers.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No trailers in fleet yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Truck Dialog */}
      <Dialog open={truckDialogOpen} onOpenChange={setTruckDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTruck ? "Edit Truck" : "Add New Truck"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Truck Number *</Label>
                <Input value={truckFormData.truck_number} onChange={(e) => setTruckFormData({ ...truckFormData, truck_number: e.target.value })} />
              </div>
              <div>
                <Label>License Plate *</Label>
                <Input value={truckFormData.truck_plate} onChange={(e) => setTruckFormData({ ...truckFormData, truck_plate: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>Vehicle Type</Label>
              <Select value={truckFormData.vehicle_type} onValueChange={(value) => setTruckFormData({ ...truckFormData, vehicle_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semi_truck">Semi Truck</SelectItem>
                  <SelectItem value="straight_truck">Straight Truck</SelectItem>
                  <SelectItem value="box_truck">Box Truck</SelectItem>
                  <SelectItem value="flatbed">Flatbed</SelectItem>
                  <SelectItem value="tanker">Tanker</SelectItem>
                  <SelectItem value="reefer">Refrigerated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>VIN</Label>
              <Input value={truckFormData.vin || ''} onChange={(e) => setTruckFormData({ ...truckFormData, vin: e.target.value })} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Make</Label>
                <Input value={truckFormData.make || ''} onChange={(e) => setTruckFormData({ ...truckFormData, make: e.target.value })} />
              </div>
              <div>
                <Label>Model</Label>
                <Input value={truckFormData.model || ''} onChange={(e) => setTruckFormData({ ...truckFormData, model: e.target.value })} />
              </div>
              <div>
                <Label>Year</Label>
                <Input type="number" value={truckFormData.year} onChange={(e) => setTruckFormData({ ...truckFormData, year: parseInt(e.target.value) })} />
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={truckFormData.status} onValueChange={(value) => setTruckFormData({ ...truckFormData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in_use">In Use</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="out_of_service">Out of Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Last Inspection Date</Label>
              <Input type="date" value={truckFormData.last_inspection_date || ''} onChange={(e) => setTruckFormData({ ...truckFormData, last_inspection_date: e.target.value })} />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setTruckDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveTruckMutation.mutate(truckFormData)} disabled={saveTruckMutation.isPending}>
                {saveTruckMutation.isPending ? "Saving..." : "Save Truck"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trailer Dialog */}
      <Dialog open={trailerDialogOpen} onOpenChange={setTrailerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTrailer ? "Edit Trailer" : "Add New Trailer"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Trailer Number *</Label>
                <Input value={trailerFormData.trailer_number} onChange={(e) => setTrailerFormData({ ...trailerFormData, trailer_number: e.target.value })} />
              </div>
              <div>
                <Label>License Plate *</Label>
                <Input value={trailerFormData.trailer_plate} onChange={(e) => setTrailerFormData({ ...trailerFormData, trailer_plate: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>Trailer Type</Label>
              <Select value={trailerFormData.trailer_type} onValueChange={(value) => setTrailerFormData({ ...trailerFormData, trailer_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dry_van">Dry Van</SelectItem>
                  <SelectItem value="flatbed">Flatbed</SelectItem>
                  <SelectItem value="refrigerated">Refrigerated</SelectItem>
                  <SelectItem value="tanker">Tanker</SelectItem>
                  <SelectItem value="lowboy">Lowboy</SelectItem>
                  <SelectItem value="container_chassis">Container Chassis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Capacity (kg)</Label>
                <Input type="number" value={trailerFormData.capacity_kg} onChange={(e) => setTrailerFormData({ ...trailerFormData, capacity_kg: parseFloat(e.target.value) })} />
              </div>
              <div>
                <Label>Length (m)</Label>
                <Input type="number" step="0.1" value={trailerFormData.length_m} onChange={(e) => setTrailerFormData({ ...trailerFormData, length_m: parseFloat(e.target.value) })} />
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={trailerFormData.status} onValueChange={(value) => setTrailerFormData({ ...trailerFormData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in_use">In Use</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="out_of_service">Out of Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Last Inspection Date</Label>
              <Input type="date" value={trailerFormData.last_inspection_date || ''} onChange={(e) => setTrailerFormData({ ...trailerFormData, last_inspection_date: e.target.value })} />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setTrailerDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveTrailerMutation.mutate(trailerFormData)} disabled={saveTrailerMutation.isPending}>
                {saveTrailerMutation.isPending ? "Saving..." : "Save Trailer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}