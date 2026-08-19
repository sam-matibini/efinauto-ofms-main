import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Car, Wrench, ShoppingCart, DollarSign, Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function CustomerProfile({ customer, companyId }) {
  const { data: sales = [] } = useQuery({
    queryKey: ['customer-sales', customer.id],
    queryFn: () => supabase.entities.Sale.filter({ 
      company_id: companyId, 
      customer_id: customer.id 
    }),
    enabled: !!customer.id && !!companyId,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['customer-vehicles', customer.id],
    queryFn: async () => {
      const allVehicles = await supabase.entities.Vehicle.filter({ company_id: companyId });
      const customerSales = await supabase.entities.Sale.filter({ 
        company_id: companyId, 
        customer_id: customer.id 
      });
      const vehicleIds = customerSales.map(s => s.vehicle_id).filter(Boolean);
      return allVehicles.filter(v => vehicleIds.includes(v.id));
    },
    enabled: !!customer.id && !!companyId,
  });

  const { data: repairs = [] } = useQuery({
    queryKey: ['customer-repairs', customer.id],
    queryFn: () => supabase.entities.RepairOrder.filter({ 
      company_id: companyId, 
      customer_id: customer.id 
    }),
    enabled: !!customer.id && !!companyId,
  });

  const totalSpent = sales.reduce((sum, s) => sum + (s.grand_total || s.sale_price || 0), 0);
  const totalRepairSpent = repairs.reduce((sum, r) => sum + (r.total_cost || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Total Purchases</span>
            </div>
            <div className="text-2xl font-bold">{sales.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Lifetime Value</span>
            </div>
            <div className="text-2xl font-bold text-green-600">${(totalSpent + totalRepairSpent).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Car className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Vehicles Owned</span>
            </div>
            <div className="text-2xl font-bold">{vehicles.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Service Visits</span>
            </div>
            <div className="text-2xl font-bold">{repairs.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Purchase History</CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <p className="text-sm text-gray-500">No purchases yet</p>
          ) : (
            <div className="space-y-3">
              {sales.slice(0, 5).map((sale) => (
                <div key={sale.id} className="flex justify-between items-center pb-3 border-b last:border-0">
                  <div>
                    <p className="font-medium">{sale.vehicle_details}</p>
                    <p className="text-xs text-gray-500">
                      {sale.sale_date && format(new Date(sale.sale_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Badge variant="outline">${sale.grand_total?.toLocaleString() || sale.sale_price?.toLocaleString()}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service History</CardTitle>
        </CardHeader>
        <CardContent>
          {repairs.length === 0 ? (
            <p className="text-sm text-gray-500">No service records</p>
          ) : (
            <div className="space-y-3">
              {repairs.slice(0, 5).map((repair) => (
                <div key={repair.id} className="flex justify-between items-center pb-3 border-b last:border-0">
                  <div>
                    <p className="font-medium">{repair.service_type?.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-500">
                      {repair.vehicle_make} {repair.vehicle_model} - {repair.order_number}
                    </p>
                  </div>
                  <Badge variant="outline">${repair.total_cost?.toLocaleString()}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vehicles</CardTitle>
        </CardHeader>
        <CardContent>
          {vehicles.length === 0 ? (
            <p className="text-sm text-gray-500">No vehicles owned</p>
          ) : (
            <div className="space-y-3">
              {vehicles.map((vehicle) => (
                <div key={vehicle.id} className="flex items-center gap-3 pb-3 border-b last:border-0">
                  <Car className="w-8 h-8 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                    <p className="text-xs text-gray-500">VIN: {vehicle.vin}</p>
                  </div>
                  <Badge variant="outline">{vehicle.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}