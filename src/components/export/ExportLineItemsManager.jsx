import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Car, Settings, Trash2, Edit } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CommodityLineItemDialog from "./CommodityLineItemDialog";
import VehicleLineItemDialog from "./VehicleLineItemDialog";
import PartLineItemDialog from "./PartLineItemDialog";

export default function ExportLineItemsManager({ lineItems = [], onChange, currency = "USD", companyId }) {
  const [addDialogType, setAddDialogType] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const handleAddItem = (item) => {
    const newItem = {
      id: Date.now().toString(),
      ...item
    };
    onChange([...lineItems, newItem]);
    setAddDialogType(null);
  };

  const handleEditItem = (item) => {
    const updated = lineItems.map(li => li.id === item.id ? item : li);
    onChange(updated);
    setEditingItem(null);
  };

  const handleDeleteItem = (id) => {
    onChange(lineItems.filter(item => item.id !== id));
  };

  const getItemIcon = (type) => {
    switch (type) {
      case 'vehicle': return <Car className="w-4 h-4" />;
      case 'part': return <Settings className="w-4 h-4" />;
      case 'commodity': return <Package className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getItemTypeBadge = (type) => {
    const colors = {
      vehicle: 'bg-blue-100 text-blue-800',
      part: 'bg-purple-100 text-purple-800',
      commodity: 'bg-green-100 text-green-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const totalValue = lineItems.reduce((sum, item) => sum + (item.total_value || 0), 0);
  const totalWeight = lineItems.reduce((sum, item) => sum + (item.weight || 0), 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">Export Line Items</CardTitle>
            <Select value="" onValueChange={setAddDialogType}>
              <SelectTrigger className="w-[200px]">
                <Plus className="w-4 h-4 mr-2" />
                <span>Add Item</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="commodity">
                  <Package className="w-4 h-4 inline mr-2" />
                  Commodity
                </SelectItem>
                <SelectItem value="vehicle">
                  <Car className="w-4 h-4 inline mr-2" />
                  Vehicle
                </SelectItem>
                <SelectItem value="part">
                  <Settings className="w-4 h-4 inline mr-2" />
                  Part
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {lineItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No items added yet</p>
              <p className="text-sm">Use the dropdown above to add commodities, vehicles, or parts</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {lineItems.map((item, idx) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded">
                        {getItemIcon(item.item_type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{item.description}</span>
                          <Badge className={getItemTypeBadge(item.item_type)}>
                            {item.item_type}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600 space-x-3">
                          {item.hs_code && <span>HS: {item.hs_code}</span>}
                          <span>Qty: {item.quantity} {item.unit_of_measure || 'units'}</span>
                          <span>{currency} ${item.total_value?.toLocaleString()}</span>
                          {item.weight && <span>{item.weight} kg</span>}
                          {item.vin && <span>VIN: {item.vin}</span>}
                          {item.part_number && <span>P/N: {item.part_number}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingItem(item);
                          setAddDialogType(item.item_type);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Total Items:</span>
                  <span>{lineItems.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Total Value:</span>
                  <span>{currency} ${totalValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Total Weight:</span>
                  <span>{totalWeight.toFixed(2)} kg</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <CommodityLineItemDialog
        open={addDialogType === 'commodity'}
        onClose={() => {
          setAddDialogType(null);
          setEditingItem(null);
        }}
        onSave={editingItem ? handleEditItem : handleAddItem}
        item={editingItem}
        currency={currency}
      />

      <VehicleLineItemDialog
        open={addDialogType === 'vehicle'}
        onClose={() => {
          setAddDialogType(null);
          setEditingItem(null);
        }}
        onSave={editingItem ? handleEditItem : handleAddItem}
        item={editingItem}
        currency={currency}
        companyId={companyId}
      />

      <PartLineItemDialog
        open={addDialogType === 'part'}
        onClose={() => {
          setAddDialogType(null);
          setEditingItem(null);
        }}
        onSave={editingItem ? handleEditItem : handleAddItem}
        item={editingItem}
        currency={currency}
        companyId={companyId}
      />
    </>
  );
}