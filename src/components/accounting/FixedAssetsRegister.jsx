import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Package, Plus, Edit, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

export default function FixedAssetsRegister({ comparativePeriods = [] }) {
  const { selectedCompanyId } = useCompany();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const queryClient = useQueryClient();

  const currentPeriod = comparativePeriods.length > 0 ? comparativePeriods[0] : null;

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', selectedCompanyId],
    queryFn: () => base44.entities.Vehicle.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['purchases', selectedCompanyId],
    queryFn: () => base44.entities.Purchase.filter({ 
      company_id: selectedCompanyId, 
      purchase_type: 'equipment' 
    }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  // Calculate depreciation (simple straight-line for demo)
  const calculateDepreciation = (purchasePrice, purchaseDate, usefulLife = 5) => {
    // Use period end date if available, otherwise current date
    const endDate = currentPeriod ? currentPeriod.to : new Date();
    const yearsSincePurchase = (endDate - new Date(purchaseDate)) / (365 * 24 * 60 * 60 * 1000);
    const annualDepreciation = purchasePrice / usefulLife;
    const accumulatedDepreciation = Math.min(annualDepreciation * yearsSincePurchase, purchasePrice);
    const netBookValue = purchasePrice - accumulatedDepreciation;
    return { accumulatedDepreciation, netBookValue, annualDepreciation };
  };

  // Filter assets by period if provided
  const filteredVehicles = currentPeriod
    ? vehicles.filter(v => new Date(v.created_date) <= currentPeriod.to)
    : vehicles;
  
  const filteredPurchases = currentPeriod
    ? purchases.filter(p => new Date(p.order_date) <= currentPeriod.to)
    : purchases;

  // Combine vehicles and equipment into fixed assets
  const fixedAssets = [
    ...filteredVehicles.map(v => ({
      id: v.id,
      type: 'Vehicle',
      description: `${v.year} ${v.make} ${v.model}`,
      purchaseDate: v.created_date,
      purchasePrice: v.purchase_price || 0,
      serialNumber: v.vin,
      status: v.status
    })),
    ...filteredPurchases.filter(p => p.purchase_type === 'equipment').map(p => ({
      id: p.id,
      type: 'Equipment',
      description: p.items?.[0]?.description || 'Equipment',
      purchaseDate: p.order_date,
      purchasePrice: p.total_amount || 0,
      serialNumber: p.purchase_number,
      status: p.status
    }))
  ];

  const totalCost = fixedAssets.reduce((sum, asset) => sum + (asset.purchasePrice || 0), 0);
  const totalDepreciation = fixedAssets.reduce((sum, asset) => {
    const dep = calculateDepreciation(asset.purchasePrice, asset.purchaseDate);
    return sum + dep.accumulatedDepreciation;
  }, 0);
  const totalNetValue = totalCost - totalDepreciation;

  const handleExport = () => {
    const csv = [
      ['Fixed Assets Register'],
      ['Asset Type', 'Description', 'Serial Number', 'Purchase Date', 'Purchase Price', 'Accumulated Depreciation', 'Net Book Value', 'Status'],
      ...fixedAssets.map(asset => {
        const dep = calculateDepreciation(asset.purchasePrice, asset.purchaseDate);
        return [
          asset.type,
          asset.description,
          asset.serialNumber,
          new Date(asset.purchaseDate).toLocaleDateString(),
          asset.purchasePrice.toFixed(2),
          dep.accumulatedDepreciation.toFixed(2),
          dep.netBookValue.toFixed(2),
          asset.status
        ];
      }),
      [''],
      ['TOTALS', '', '', '', totalCost.toFixed(2), totalDepreciation.toFixed(2), totalNetValue.toFixed(2), '']
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fixed-assets-register-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Fixed Assets Register
            </CardTitle>
            {currentPeriod && (
              <p className="text-sm text-gray-500 mt-1">
                As of {new Date(currentPeriod.to).toLocaleDateString()}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total Cost</p>
              <p className="text-2xl font-bold text-blue-600">${totalCost.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Accumulated Depreciation</p>
              <p className="text-2xl font-bold text-red-600">${totalDepreciation.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Net Book Value</p>
              <p className="text-2xl font-bold text-green-600">${totalNetValue.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Assets Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 text-sm font-semibold">Type</th>
                <th className="text-left p-3 text-sm font-semibold">Description</th>
                <th className="text-left p-3 text-sm font-semibold">Serial Number</th>
                <th className="text-left p-3 text-sm font-semibold">Purchase Date</th>
                <th className="text-right p-3 text-sm font-semibold">Cost</th>
                <th className="text-right p-3 text-sm font-semibold">Depreciation</th>
                <th className="text-right p-3 text-sm font-semibold">Net Value</th>
                <th className="text-left p-3 text-sm font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {fixedAssets.map((asset) => {
                const dep = calculateDepreciation(asset.purchasePrice, asset.purchaseDate);
                return (
                  <tr key={asset.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm">
                      <Badge variant="outline">{asset.type}</Badge>
                    </td>
                    <td className="p-3 text-sm">{asset.description}</td>
                    <td className="p-3 text-sm font-mono text-xs">{asset.serialNumber}</td>
                    <td className="p-3 text-sm">{new Date(asset.purchaseDate).toLocaleDateString()}</td>
                    <td className="p-3 text-sm text-right font-mono">${asset.purchasePrice.toLocaleString()}</td>
                    <td className="p-3 text-sm text-right font-mono text-red-600">
                      ${dep.accumulatedDepreciation.toLocaleString()}
                    </td>
                    <td className="p-3 text-sm text-right font-mono font-semibold">
                      ${dep.netBookValue.toLocaleString()}
                    </td>
                    <td className="p-3 text-sm">
                      <Badge className={
                        asset.status === 'in_stock' || asset.status === 'ordered' ? 'bg-green-100 text-green-800' :
                        asset.status === 'sold' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {asset.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 font-bold">
              <tr>
                <td colSpan="4" className="p-3 text-sm">TOTALS</td>
                <td className="p-3 text-sm text-right">${totalCost.toLocaleString()}</td>
                <td className="p-3 text-sm text-right text-red-600">${totalDepreciation.toLocaleString()}</td>
                <td className="p-3 text-sm text-right text-green-600">${totalNetValue.toLocaleString()}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {fixedAssets.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No fixed assets found</p>
          </div>
        )}

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Depreciation is calculated using straight-line method over 5 years useful life.
            This is a simplified calculation for demonstration purposes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}