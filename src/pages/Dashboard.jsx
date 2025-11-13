import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Package, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";
import StatsCard from "../components/dashboard/StatsCard";
import LowStockAlert from "../components/dashboard/LowStockAlert";
import RecentActivity from "../components/dashboard/RecentActivity";

export default function Dashboard() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-updated_date'),
    initialData: [],
  });

  const totalProducts = products.length;
  const lowStockCount = products.filter(p => p.quantity <= p.reorder_level).length;
  const totalValue = products.reduce((sum, p) => sum + ((p.unit_price || 0) * (p.quantity || 0)), 0);
  const averageStock = products.length > 0 
    ? Math.round(products.reduce((sum, p) => sum + (p.quantity || 0), 0) / products.length)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-400 animate-pulse mx-auto mb-4" />
          <p className="text-gray-500">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Inventory Dashboard</h1>
        <p className="text-gray-600">Monitor your stock levels and manage inventory</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Products"
          value={totalProducts}
          icon={Package}
          bgColor="bg-blue-500"
          textColor="text-blue-600"
          index={0}
        />
        <StatsCard
          title="Total Value"
          value={`$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          bgColor="bg-green-500"
          textColor="text-green-600"
          index={1}
        />
        <StatsCard
          title="Low Stock Items"
          value={lowStockCount}
          icon={AlertTriangle}
          bgColor="bg-orange-500"
          textColor="text-orange-600"
          trend={lowStockCount > 0 ? "Needs attention" : "All good"}
          index={2}
        />
        <StatsCard
          title="Avg Stock Level"
          value={averageStock}
          icon={TrendingUp}
          bgColor="bg-purple-500"
          textColor="text-purple-600"
          index={3}
        />
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity products={products} />
        </div>
        <div>
          <LowStockAlert products={products} />
        </div>
      </div>
    </div>
  );
}