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
import { Package, Plus, Edit, Trash2, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import AIDepreciationCalculator from "./AIDepreciationCalculator";

export default function FixedAssetsRegister({ comparativePeriods = [] }) {
  const { selectedCompanyId } = useCompany();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [aiCalcOpen, setAiCalcOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [aiDepreciations, setAiDepreciations] = useState({});
  const [drilldown, setDrilldown] = useState(null);
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

  // Calculate depreciation (simple straight-line for demo or use AI if available)
  const calculateDepreciation = (asset) => {
    const aiCalc = aiDepreciations[asset.id];
    if (aiCalc) {
      return {
        accumulatedDepreciation: aiCalc.accumulated_depreciation || 0,
        netBookValue: aiCalc.net_book_value || 0,
        annualDepreciation: aiCalc.annual_depreciation || 0,
        method: aiCalc.method || 'AI Calculated'
      };
    }
    
    // Fallback to simple straight-line
    const endDate = currentPeriod ? currentPeriod.to : new Date();
    const yearsSincePurchase = (endDate - new Date(asset.purchaseDate)) / (365 * 24 * 60 * 60 * 1000);
    const usefulLife = 5;
    const annualDepreciation = asset.purchasePrice / usefulLife;
    const accumulatedDepreciation = Math.min(annualDepreciation * yearsSincePurchase, asset.purchasePrice);
    const netBookValue = asset.purchasePrice - accumulatedDepreciation;
    return { accumulatedDepreciation, netBookValue, annualDepreciation, method: 'Straight-Line' };
  };

  const handleAICalculation = (assetData) => {
    setSelectedAsset(assetData);
    setAiCalcOpen(true);
  };

  const handleAICalculated = (result) => {
    setAiDepreciations(prev => ({
      ...prev,
      [selectedAsset.id]: result
    }));
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
    const dep = calculateDepreciation(asset);
    return sum + dep.accumulatedDepreciation;
  }, 0);
  const totalNetValue = totalCost - totalDepreciation;

  // Handle drilldown on summary cards
  const handleDrilldown = (category) => {
    let title = '';
    let items = [];

    switch (category) {
      case 'totalCost':
        title = 'Total Asset Cost';
        items = fixedAssets.map(a => ({
          date: a.purchaseDate,
          description: a.description,
          reference: a.serialNumber,
          amount: a.purchasePrice || 0
        }));
        break;
      case 'totalDepreciation':
        title = 'Accumulated Depreciation';
        items = fixedAssets.map(a => {
          const dep = calculateDepreciation(a);
          return {
            date: a.purchaseDate,
            description: a.description,
            reference: `${dep.method}`,
            amount: dep.accumulatedDepreciation
          };
        }).filter(i => i.amount > 0);
        break;
      case 'netBookValue':
        title = 'Net Book Value';
        items = fixedAssets.map(a => {
          const dep = calculateDepreciation(a);
          return {
            date: a.purchaseDate,
            description: a.description,
            reference: a.serialNumber,
            amount: dep.netBookValue
          };
        });
        break;
      default:
        items = [];
    }

    setDrilldown({ title, items, period: currentPeriod });
  };

  const handleExport = () => {
    const csv = [
      ['Fixed Assets Register'],
      ['Asset Type', 'Description', 'Serial Number', 'Purchase Date', 'Purchase Price', 'Depreciation Method', 'Accumulated Depreciation', 'Net Book Value', 'Status'],
      ...fixedAssets.map(asset => {
        const dep = calculateDepreciation(asset);
        return [
          asset.type,
          asset.description,
          asset.serialNumber,
          new Date(asset.purchaseDate).toLocaleDateString(),
          asset.purchasePrice.toFixed(2),
          dep.method || 'Straight-Line',
          dep.accumulatedDepreciation.toFixed(2),
          dep.netBookValue.toFixed(2),
          asset.status
        ];
      }),
      [''],
      ['TOTALS', '', '', '', '', totalCost.toFixed(2), totalDepreciation.toFixed(2), totalNetValue.toFixed(2), '']
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
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onDoubleClick={() => handleDrilldown('totalCost')}
            title="Double-click to view details"
          >
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total Cost</p>
              <p className="text-2xl font-bold text-blue-600">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onDoubleClick={() => handleDrilldown('totalDepreciation')}
            title="Double-click to view details"
          >
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Accumulated Depreciation</p>
              <p className="text-2xl font-bold text-red-600">${totalDepreciation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onDoubleClick={() => handleDrilldown('netBookValue')}
            title="Double-click to view details"
          >
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Net Book Value</p>
              <p className="text-2xl font-bold text-green-600">${totalNetValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
                <th className="text-left p-3 text-sm font-semibold">Method</th>
                <th className="text-right p-3 text-sm font-semibold">Depreciation</th>
                <th className="text-right p-3 text-sm font-semibold">Net Value</th>
                <th className="text-left p-3 text-sm font-semibold">Status</th>
                <th className="text-center p-3 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fixedAssets.map((asset) => {
                const dep = calculateDepreciation(asset);
                const hasAICalc = aiDepreciations[asset.id];
                return (
                  <tr key={asset.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm">
                      <Badge variant="outline">{asset.type}</Badge>
                    </td>
                    <td className="p-3 text-sm">{asset.description}</td>
                    <td className="p-3 text-sm font-mono text-xs">{asset.serialNumber}</td>
                    <td className="p-3 text-sm">{new Date(asset.purchaseDate).toLocaleDateString()}</td>
                    <td className="p-3 text-sm text-right font-mono">${asset.purchasePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-3 text-sm">
                      <Badge className={hasAICalc ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-600"} variant="outline">
                        {hasAICalc && <Sparkles className="w-3 h-3 mr-1 inline" />}
                        {dep.method}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-right font-mono text-red-600">
                      ${dep.accumulatedDepreciation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-sm text-right font-mono font-semibold">
                      ${dep.netBookValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    <td className="p-3 text-sm text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAICalculation(asset)}
                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                      >
                        <Sparkles className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 font-bold">
              <tr>
                <td colSpan="4" className="p-3 text-sm">TOTALS</td>
                <td className="p-3 text-sm text-right">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td></td>
                <td className="p-3 text-sm text-right text-red-600">${totalDepreciation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="p-3 text-sm text-right text-green-600">${totalNetValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td colSpan="2"></td>
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
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 font-semibold mb-1">
                AI-Powered Depreciation Available
              </p>
              <p className="text-sm text-blue-800">
                Click the <Sparkles className="w-3 h-3 inline text-purple-600" /> icon on any asset to calculate depreciation using AI. 
                The AI analyzes asset type, age, condition, and industry standards to recommend the optimal depreciation method and provide accurate calculations.
              </p>
            </div>
          </div>
        </div>
      </CardContent>

      <AIDepreciationCalculator
        asset={selectedAsset}
        open={aiCalcOpen}
        onClose={() => setAiCalcOpen(false)}
        onCalculated={handleAICalculated}
      />

      {/* Drilldown Dialog */}
      <Dialog open={!!drilldown} onOpenChange={() => setDrilldown(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{drilldown?.title}</DialogTitle>
          </DialogHeader>
          {drilldown && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-xl font-bold text-blue-600">
                  ${drilldown.items.reduce((sum, i) => sum + i.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 bg-gray-100">
                    <th className="text-left py-2 px-3">Date</th>
                    <th className="text-left py-2 px-3">Description</th>
                    <th className="text-left py-2 px-3">Reference</th>
                    <th className="text-right py-2 px-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {drilldown.items.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-4 text-gray-500">No items found</td></tr>
                  ) : (
                    drilldown.items.map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3">{format(new Date(item.date), 'MMM d, yyyy')}</td>
                        <td className="py-2 px-3">{item.description}</td>
                        <td className="py-2 px-3 text-gray-600">{item.reference || '-'}</td>
                        <td className="py-2 px-3 text-right font-medium">${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}