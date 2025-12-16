import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useCompany } from "@/components/shared/CompanyContext";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Ship, Package, Car, FileText, MapPin, DollarSign, Plus,
  Search, LayoutGrid, List, Plane, Eye, Trash2, Clock,
  AlertTriangle, CheckCircle, TrendingUp, Loader2, Sparkles,
  Upload, Container as ContainerIcon, Globe, Anchor
} from "lucide-react";

// Import sub-components
import ShippingDashboard from "@/components/shipping/ShippingDashboard.jsx";
import ShipmentsTab from "@/components/shipping/ShipmentsTab.jsx";
import ContainersTab from "@/components/shipping/ContainersTab.jsx";
import ExportOrdersTab from "@/components/export/ExportOrdersTab";
import ExportReportsTab from "@/components/export/ExportReportsTab";
import VehiclesInTransitTab from "@/components/shipping/VehiclesInTransitTab.jsx";
import CargoTab from "@/components/shipping/CargoTab.jsx";
import TrackingTab from "@/components/shipping/TrackingTab.jsx";
import FeesChargesTab from "@/components/shipping/FeesChargesTab.jsx";
import DocumentsTab from "@/components/shipping/DocumentsTab.jsx";
import GeofenceManager from "@/components/shipping/GeofenceManager";

export default function GlobalShipping() {
  const { selectedCompanyId } = useCompany();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showShipmentDialog, setShowShipmentDialog] = useState(false);
  const [showContainerDialog, setShowContainerDialog] = useState(false);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all data
  const { data: shipments = [], isLoading: shipmentsLoading } = useQuery({
    queryKey: ['shipments', selectedCompanyId],
    queryFn: () => base44.entities.FreightShipment.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
  });

  const { data: exports = [], isLoading: exportsLoading } = useQuery({
    queryKey: ['exports', selectedCompanyId],
    queryFn: () => base44.entities.Export.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
  });

  const { data: containers = [] } = useQuery({
    queryKey: ['containers', selectedCompanyId],
    queryFn: () => base44.entities.Container.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', selectedCompanyId],
    queryFn: () => base44.entities.Vehicle.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const { data: cargo = [] } = useQuery({
    queryKey: ['cargo', selectedCompanyId],
    queryFn: () => base44.entities.Cargo.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
  });

  const { data: loadingDeclarations = [] } = useQuery({
    queryKey: ['loading-declarations', selectedCompanyId],
    queryFn: () => base44.entities.LoadingDeclaration.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
  });

  const { data: shippingDocuments = [] } = useQuery({
    queryKey: ['shipping-documents', selectedCompanyId],
    queryFn: () => base44.entities.ShippingDocument.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', selectedCompanyId],
    queryFn: () => base44.entities.Customer.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  // Vehicles in transit
  const vehiclesInTransit = vehicles.filter(v => 
    v.status === 'in_transit' || v.status === 'exported'
  );

  // Calculate KPIs
  const kpis = {
    carsInTransit: vehiclesInTransit.length,
    containersInTransit: containers.filter(c => c.status === 'in_transit' || c.status === 'loaded').length,
    arrivalsThisWeek: shipments.filter(s => {
      if (!s.expected_arrival) return false;
      const eta = new Date(s.expected_arrival);
      const now = new Date();
      const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return eta >= now && eta <= weekLater;
    }).length,
    pendingCustoms: shipments.filter(s => s.status === 'customs_clearance').length,
    avgShippingDays: 0,
    totalClearingFees: shipments.reduce((sum, s) => sum + (s.customs_fees || 0), 0)
  };

  if (!selectedCompanyId) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="text-center py-16">
          <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Company Selected</h3>
          <p className="text-gray-500">Please select a company to manage shipping & logistics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Globe className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Global Shipping & Logistics</h1>
              <p className="text-sm text-blue-200">
                {shipments.length} shipments • {containers.length} containers • {vehiclesInTransit.length} vehicles in transit
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              onClick={() => { setActiveTab("documents"); setShowDocumentDialog(true); }}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
            <Button 
              className="bg-white text-blue-900 hover:bg-blue-50"
              onClick={() => { setActiveTab("shipments"); setShowShipmentDialog(true); }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Shipment
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-10 lg:grid-cols-11 mb-6 h-auto p-1 bg-white shadow-sm">
            <TabsTrigger value="dashboard" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-xs">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="export-orders" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-xs">
              <Plane className="w-4 h-4" />
              <span className="hidden sm:inline">Exports</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-xs">
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="shipments" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-xs">
              <Ship className="w-4 h-4" />
              <span className="hidden sm:inline">Shipments</span>
            </TabsTrigger>
            <TabsTrigger value="containers" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-xs">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Containers</span>
            </TabsTrigger>
            <TabsTrigger value="vehicles" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-xs">
              <Car className="w-4 h-4" />
              <span className="hidden sm:inline">Vehicles</span>
            </TabsTrigger>
            <TabsTrigger value="cargo" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-xs">
              <ContainerIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Cargo</span>
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-xs">
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Tracking</span>
            </TabsTrigger>
            <TabsTrigger value="geofences" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-xs">
              <Anchor className="w-4 h-4" />
              <span className="hidden sm:inline">Geofences</span>
            </TabsTrigger>
            <TabsTrigger value="fees" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-xs">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Fees</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-xs">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <ShippingDashboard 
              kpis={kpis}
              shipments={shipments}
              containers={containers}
              vehicles={vehiclesInTransit}
              exports={exports}
              loadingDeclarations={loadingDeclarations}
              onCreateShipment={() => { setActiveTab("shipments"); setShowShipmentDialog(true); }}
              onAddContainer={() => { setActiveTab("containers"); setShowContainerDialog(true); }}
              onAddVehicle={() => setActiveTab("vehicles")}
              onUploadDocument={() => { setActiveTab("documents"); setShowDocumentDialog(true); }}
            />
          </TabsContent>

          <TabsContent value="export-orders">
            <ExportOrdersTab companyId={selectedCompanyId} />
          </TabsContent>

          <TabsContent value="reports">
            <ExportReportsTab companyId={selectedCompanyId} />
          </TabsContent>

          <TabsContent value="shipments">
            <ShipmentsTab 
              shipments={shipments}
              exports={exports}
              customers={customers}
              vehicles={vehicles}
              containers={containers}
              loadingDeclarations={loadingDeclarations}
              showCreateDialog={showShipmentDialog}
              onDialogClose={() => setShowShipmentDialog(false)}
            />
          </TabsContent>

          <TabsContent value="containers">
            <ContainersTab 
              containers={containers}
              shipments={shipments}
              vehicles={vehicles}
              showCreateDialog={showContainerDialog}
              onDialogClose={() => setShowContainerDialog(false)}
            />
          </TabsContent>

          <TabsContent value="vehicles">
            <VehiclesInTransitTab 
              vehicles={vehiclesInTransit}
              shipments={shipments}
              containers={containers}
              exports={exports}
            />
          </TabsContent>

          <TabsContent value="cargo">
            <CargoTab 
              cargo={cargo}
              shipments={shipments}
              containers={containers}
              customers={customers}
            />
          </TabsContent>

          <TabsContent value="tracking">
            <TrackingTab 
              shipments={shipments}
              containers={containers}
              vehicles={vehiclesInTransit}
            />
          </TabsContent>

          <TabsContent value="geofences">
            <GeofenceManager companyId={selectedCompanyId} />
          </TabsContent>

          <TabsContent value="fees">
            <FeesChargesTab 
              shipments={shipments}
              exports={exports}
              customers={customers}
            />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTab 
              documents={shippingDocuments}
              loadingDeclarations={loadingDeclarations}
              shipments={shipments}
              containers={containers}
              vehicles={vehicles}
              customers={customers}
              exports={exports}
              showUploadDialog={showDocumentDialog}
              onDialogClose={() => setShowDocumentDialog(false)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}