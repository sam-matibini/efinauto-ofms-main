import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Package, Wrench, Plane, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProfitabilityReport({ sales, repairs, exports, shipments, vehicles }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Calculate profitability for sales
  const salesProfitability = sales.map(sale => {
    const revenue = sale.grand_total || sale.sale_price || 0;
    const vehicle = vehicles.find(v => v.id === sale.vehicle_id);
    const cost = vehicle?.purchase_price || 0;
    const profit = revenue - cost;
    const margin = cost > 0 ? (profit / cost) * 100 : 0;

    return {
      id: sale.id,
      type: 'sale',
      orderNumber: sale.sale_number || `S-${sale.id.slice(0, 8)}`,
      description: `${sale.vehicle_details} - ${sale.customer_name}`,
      date: sale.sale_date,
      revenue,
      cost,
      profit,
      margin,
      status: sale.payment_status
    };
  });

  // Calculate profitability for repairs
  const repairsProfitability = repairs.map(repair => {
    const revenue = repair.total_cost || 0;
    const partsCost = repair.parts_cost || 0;
    const laborCost = (repair.total_labor_hours || 0) * (repair.hourly_rate || 100);
    const cost = partsCost;
    const profit = revenue - cost - laborCost;
    const margin = cost > 0 ? (profit / cost) * 100 : 0;

    return {
      id: repair.id,
      type: 'repair',
      orderNumber: repair.order_number || `RO-${repair.id.slice(0, 8)}`,
      description: `${repair.vehicle_year} ${repair.vehicle_make} ${repair.vehicle_model} - ${repair.customer_name}`,
      date: repair.start_date,
      revenue,
      cost: cost + laborCost,
      profit,
      margin,
      status: repair.payment_status
    };
  });

  // Calculate profitability for exports
  const exportsProfitability = exports.map(exp => {
    const revenue = exp.total_value || 0;
    const cost = (exp.freight_cost || 0) + (exp.customs_value || 0) + (exp.insurance_cost || 0);
    const profit = revenue - cost;
    const margin = cost > 0 ? (profit / cost) * 100 : 0;

    return {
      id: exp.id,
      type: 'export',
      orderNumber: exp.export_number || `EX-${exp.id.slice(0, 8)}`,
      description: `${exp.destination_country} - ${exp.customer_name}`,
      date: exp.shipment_date,
      revenue,
      cost,
      profit,
      margin,
      status: exp.payment_status
    };
  });

  // Calculate profitability for shipments
  const shipmentsProfitability = (shipments || []).map(shipment => {
    const revenue = shipment.cargo_value || 0;
    const cost = (shipment.freight_cost || 0) + (shipment.insurance_cost || 0) + 
                 (shipment.handling_fees || 0) + (shipment.customs_fees || 0);
    const profit = revenue - cost;
    const margin = cost > 0 ? (profit / cost) * 100 : 0;

    return {
      id: shipment.id,
      type: 'shipment',
      orderNumber: shipment.shipment_number || `SH-${shipment.id.slice(0, 8)}`,
      description: `${shipment.origin_country} → ${shipment.destination_country} - ${shipment.customer_name}`,
      date: shipment.departure_date,
      revenue,
      cost,
      profit,
      margin,
      status: shipment.payment_status
    };
  });

  // Combine all profitability data
  const allProfitability = [
    ...salesProfitability,
    ...repairsProfitability,
    ...exportsProfitability,
    ...shipmentsProfitability
  ].filter(item => {
    const matchesSearch = item.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  // Calculate totals
  const totals = allProfitability.reduce((acc, item) => ({
    revenue: acc.revenue + item.revenue,
    cost: acc.cost + item.cost,
    profit: acc.profit + item.profit,
  }), { revenue: 0, cost: 0, profit: 0 });

  const avgMargin = totals.cost > 0 ? (totals.profit / totals.cost) * 100 : 0;

  const typeIcons = {
    sale: <DollarSign className="w-4 h-4" />,
    repair: <Wrench className="w-4 h-4" />,
    export: <Plane className="w-4 h-4" />,
    shipment: <Package className="w-4 h-4" />
  };

  const typeColors = {
    sale: 'bg-blue-100 text-blue-800',
    repair: 'bg-orange-100 text-orange-800',
    export: 'bg-purple-100 text-purple-800',
    shipment: 'bg-green-100 text-green-800'
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <h3 className="text-2xl font-bold text-green-600">${totals.revenue.toLocaleString()}</h3>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Cost</p>
                <h3 className="text-2xl font-bold text-red-600">${totals.cost.toLocaleString()}</h3>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Profit</p>
                <h3 className="text-2xl font-bold text-blue-600">${totals.profit.toLocaleString()}</h3>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-gray-600">Avg Margin</p>
              <h3 className={`text-2xl font-bold ${avgMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {avgMargin.toFixed(2)}%
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Profitability Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label>Search Order/Description</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by order number or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Filter by Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sale">Sales</SelectItem>
                  <SelectItem value="repair">Repairs</SelectItem>
                  <SelectItem value="export">Exports</SelectItem>
                  <SelectItem value="shipment">Shipments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Profitability Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allProfitability.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No profitability data found
                    </TableCell>
                  </TableRow>
                ) : (
                  allProfitability.map((item) => (
                    <TableRow key={`${item.type}-${item.id}`}>
                      <TableCell>
                        <Badge className={typeColors[item.type]}>
                          <span className="flex items-center gap-1">
                            {typeIcons[item.type]}
                            {item.type}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.orderNumber}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                      <TableCell>{item.date ? new Date(item.date).toLocaleDateString() : '-'}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        ${item.revenue.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        ${item.cost.toLocaleString()}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${item.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        ${item.profit.toLocaleString()}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${item.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.margin.toFixed(2)}%
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'paid' ? 'default' : 'outline'}>
                          {item.status || 'pending'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}