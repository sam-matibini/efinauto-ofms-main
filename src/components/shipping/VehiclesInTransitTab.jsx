import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Car, Search, LayoutGrid, List, Eye, MapPin, Package } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function VehiclesInTransitTab({ vehicles = [], shipments = [], containers = [], exports = [] }) {
  const [viewMode, setViewMode] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewVehicle, setViewVehicle] = useState(null);

  const statusColors = {
    in_stock: "bg-green-100 text-green-700 border border-green-300",
    sold: "bg-blue-100 text-blue-700 border border-blue-300",
    reserved: "bg-amber-100 text-amber-700 border border-amber-300",
    in_transit: "bg-purple-100 text-purple-700 border border-purple-300",
    exported: "bg-indigo-100 text-indigo-700 border border-indigo-300"
  };

  const filteredVehicles = vehicles.filter(v =>
    !searchTerm ||
    v.vin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get linked shipment/container info
  const getVehicleShipmentInfo = (vehicle) => {
    // Find export that contains this vehicle
    const exp = exports.find(e => 
      e.items?.some(item => item.vehicle_id === vehicle.id || item.vin === vehicle.vin)
    );
    if (exp) {
      const shipment = shipments.find(s => s.export_id === exp.id);
      return { export: exp, shipment };
    }
    return {};
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative flex-1 w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by VIN, make, model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 border rounded-lg p-1 bg-white">
          <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("list")}>
            <List className="w-4 h-4" />
          </Button>
          <Button variant={viewMode === "cards" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("cards")}>
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* List View */}
      {viewMode === "list" ? (
        <Card className="border-none shadow-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>VIN</TableHead>
                <TableHead>Make/Model/Year</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Container #</TableHead>
                <TableHead>Shipping Method</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.map((vehicle) => {
                const { export: exp, shipment } = getVehicleShipmentInfo(vehicle);
                return (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-mono text-xs">{vehicle.vin || '-'}</TableCell>
                    <TableCell>{vehicle.year} {vehicle.make} {vehicle.model}</TableCell>
                    <TableCell>{exp?.customer_name || '-'}</TableCell>
                    <TableCell>{shipment?.container_number || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{shipment?.shipment_type || 'Container'}</Badge>
                    </TableCell>
                    <TableCell>
                      {shipment?.expected_arrival ? format(new Date(shipment.expected_arrival), 'MMM d') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[vehicle.status]}>{vehicle.status?.replace(/_/g, ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => setViewVehicle({ vehicle, export: exp, shipment })}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredVehicles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-8">No vehicles in transit</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map((vehicle, index) => {
            const { export: exp, shipment } = getVehicleShipmentInfo(vehicle);
            return (
              <motion.div key={vehicle.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <Card className="border-none shadow-md hover:shadow-lg transition-all cursor-pointer" onClick={() => setViewVehicle({ vehicle, export: exp, shipment })}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Car className="w-5 h-5 text-blue-600" />
                        <span className="font-bold">{vehicle.year} {vehicle.make}</span>
                      </div>
                      <Badge className={statusColors[vehicle.status]}>{vehicle.status?.replace(/_/g, ' ')}</Badge>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p className="font-medium">{vehicle.model}</p>
                      <p className="font-mono text-xs">VIN: {vehicle.vin?.slice(-8) || 'N/A'}</p>
                      {exp && <p><strong>Customer:</strong> {exp.customer_name}</p>}
                      {shipment && (
                        <>
                          <p><strong>Container:</strong> {shipment.container_number || 'N/A'}</p>
                          <p><strong>ETA:</strong> {shipment.expected_arrival ? format(new Date(shipment.expected_arrival), 'MMM d, yyyy') : 'N/A'}</p>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* View Vehicle Dialog */}
      <Dialog open={!!viewVehicle} onOpenChange={() => setViewVehicle(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vehicle Details</DialogTitle>
          </DialogHeader>
          {viewVehicle && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Vehicle</p>
                  <p className="font-semibold">{viewVehicle.vehicle.year} {viewVehicle.vehicle.make} {viewVehicle.vehicle.model}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">VIN</p>
                  <p className="font-mono text-sm">{viewVehicle.vehicle.vin || 'N/A'}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><Car className="w-4 h-4" /> Vehicle Info</h3>
                  <div className="text-sm space-y-1">
                    <p><strong>Color:</strong> {viewVehicle.vehicle.color || 'N/A'}</p>
                    <p><strong>Mileage:</strong> {viewVehicle.vehicle.mileage?.toLocaleString() || 'N/A'} km</p>
                    <p><strong>Status:</strong> <Badge className={statusColors[viewVehicle.vehicle.status]}>{viewVehicle.vehicle.status}</Badge></p>
                  </div>
                </div>

                {viewVehicle.export && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4" /> Export Info</h3>
                    <div className="text-sm space-y-1">
                      <p><strong>Customer:</strong> {viewVehicle.export.customer_name}</p>
                      <p><strong>Destination:</strong> {viewVehicle.export.destination_country}</p>
                      <p><strong>Export #:</strong> {viewVehicle.export.export_number}</p>
                    </div>
                  </div>
                )}

                {viewVehicle.shipment && (
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2"><Package className="w-4 h-4" /> Shipment Info</h3>
                    <div className="text-sm space-y-1">
                      <p><strong>Shipment #:</strong> {viewVehicle.shipment.shipment_number}</p>
                      <p><strong>Container:</strong> {viewVehicle.shipment.container_number || 'N/A'}</p>
                      <p><strong>Carrier:</strong> {viewVehicle.shipment.carrier_name || 'N/A'}</p>
                      <p><strong>ETA:</strong> {viewVehicle.shipment.expected_arrival ? format(new Date(viewVehicle.shipment.expected_arrival), 'MMM d, yyyy') : 'N/A'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}