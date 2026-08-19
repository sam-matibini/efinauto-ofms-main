import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wrench, 
  Clock, 
  CheckCircle, 
  Camera,
  Wifi,
  WifiOff,
  LogOut,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import TechnicianLogin from "@/components/technician-mobile/TechnicianLogin";
import RepairOrderMobile from "@/components/technician-mobile/RepairOrderMobile";
import TimeTracker from "@/components/technician-mobile/TimeTracker";
import { useCompany } from "@/components/shared/CompanyContext";

export default function TechnicianMobilePage() {
  const { selectedCompanyId } = useCompany();
  const [selectedTechnician, setSelectedTechnician] = useState(() => {
    const saved = localStorage.getItem('technicianSession');
    return saved ? JSON.parse(saved) : null;
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [pendingUpdates, setPendingUpdates] = useState(() => {
    const saved = localStorage.getItem('pendingUpdates');
    return saved ? JSON.parse(saved) : [];
  });

  const queryClient = useQueryClient();

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Back online! Syncing data...");
      syncPendingUpdates();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Offline mode - changes will sync when online");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save pending updates to localStorage
  useEffect(() => {
    localStorage.setItem('pendingUpdates', JSON.stringify(pendingUpdates));
  }, [pendingUpdates]);

  const { data: repairOrders = [], isLoading } = useQuery({
    queryKey: ['repairs-mobile', selectedCompanyId, selectedTechnician?.full_name],
    queryFn: async () => {
      if (!isOnline) {
        // Return cached data when offline
        const cached = localStorage.getItem('cachedRepairOrders');
        return cached ? JSON.parse(cached) : [];
      }
      const orders = await supabase.entities.RepairOrder.filter({ 
        company_id: selectedCompanyId,
        assigned_technician: selectedTechnician?.full_name 
      }, '-created_date');
      // Cache data for offline use
      localStorage.setItem('cachedRepairOrders', JSON.stringify(orders));
      return orders;
    },
    enabled: !!selectedCompanyId && !!selectedTechnician,
    initialData: [],
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => supabase.entities.RepairOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repairs-mobile'] });
      toast.success("Order updated successfully");
    },
  });

  const syncPendingUpdates = async () => {
    if (pendingUpdates.length === 0) return;

    for (const update of pendingUpdates) {
      try {
        await updateOrderMutation.mutateAsync(update);
        setPendingUpdates(prev => prev.filter(u => u.id !== update.id));
      } catch (error) {
        console.error('Failed to sync update:', error);
      }
    }
  };

  const handleOrderUpdate = (id, data) => {
    if (isOnline) {
      updateOrderMutation.mutate({ id, data });
    } else {
      // Queue update for later sync
      setPendingUpdates(prev => [...prev, { id, data, timestamp: Date.now() }]);
      toast.info("Update saved offline - will sync when online");
    }
  };

  const handleLogout = () => {
    if (pendingUpdates.length > 0) {
      toast.error("Cannot logout with pending updates. Wait for sync or go online.");
      return;
    }
    localStorage.removeItem('technicianSession');
    setSelectedTechnician(null);
    setSelectedOrder(null);
  };

  if (!selectedTechnician) {
    return <TechnicianLogin onLogin={setSelectedTechnician} />;
  }

  const myOrders = repairOrders.filter(o => 
    ['pending', 'in_progress', 'waiting_parts'].includes(o.status)
  );
  const completedToday = repairOrders.filter(o => {
    if (o.status !== 'completed') return false;
    const today = new Date().toISOString().split('T')[0];
    return o.completion_date?.startsWith(today);
  });

  if (selectedOrder) {
    return (
      <RepairOrderMobile
        order={selectedOrder}
        onBack={() => setSelectedOrder(null)}
        onUpdate={handleOrderUpdate}
        isOnline={isOnline}
        technician={selectedTechnician}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Fixed Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">Technician Dashboard</h1>
            <p className="text-sm text-blue-100">{selectedTechnician.full_name}</p>
          </div>
          <div className="flex gap-2">
            {isOnline ? (
              <Wifi className="w-6 h-6" />
            ) : (
              <WifiOff className="w-6 h-6 text-yellow-300" />
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-blue-500"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {pendingUpdates.length > 0 && (
          <div className="mt-2 bg-yellow-500 text-yellow-900 px-3 py-1 rounded text-xs flex items-center gap-2">
            <RefreshCw className="w-3 h-3" />
            {pendingUpdates.length} update(s) pending sync
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Wrench className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Active Jobs</p>
                <p className="text-2xl font-bold">{myOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Done Today</p>
                <p className="text-2xl font-bold">{completedToday.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Jobs List */}
      <div className="p-4 space-y-3">
        <h2 className="font-semibold text-gray-900">My Active Jobs</h2>
        
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : myOrders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No active jobs assigned</p>
            </CardContent>
          </Card>
        ) : (
          myOrders.map(order => (
            <Card 
              key={order.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedOrder(order)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{order.order_number}</h3>
                    <p className="text-sm text-gray-600">{order.customer_name}</p>
                  </div>
                  <Badge className={
                    order.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'waiting_parts' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }>
                    {order.status.replace('_', ' ')}
                  </Badge>
                </div>
                
                <div className="text-sm text-gray-700 mb-2">
                  {order.vehicle_year} {order.vehicle_make} {order.vehicle_model}
                </div>
                
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {order.service_type?.replace('_', ' ')}
                </div>

                {order.priority === 'urgent' && (
                  <Badge className="mt-2 bg-red-100 text-red-700 text-xs">
                    URGENT
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Quick Time Tracker */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
        <TimeTracker technician={selectedTechnician} isOnline={isOnline} />
      </div>
    </div>
  );
}