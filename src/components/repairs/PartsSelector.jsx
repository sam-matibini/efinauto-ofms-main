import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Search } from "lucide-react";
import { useCompany } from "@/components/shared/CompanyContext";

export default function PartsSelector({ parts, onChange }) {
  const { selectedCompanyId } = useCompany();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: availableParts = [] } = useQuery({
    queryKey: ['parts', selectedCompanyId],
    queryFn: () => base44.entities.Part.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const addPart = (part) => {
    const newPart = {
      part_id: part.id,
      part_name: part.name,
      part_number: part.part_number,
      quantity: 1,
      unit_cost: part.selling_price || 0,
      total_cost: part.selling_price || 0
    };
    onChange([...parts, newPart]);
  };

  const updatePart = (index, field, value) => {
    const updated = [...parts];
    updated[index] = {
      ...updated[index],
      [field]: value,
      total_cost: field === 'quantity' || field === 'unit_cost' 
        ? (field === 'quantity' ? value : updated[index].quantity) * (field === 'unit_cost' ? value : updated[index].unit_cost)
        : updated[index].total_cost
    };
    onChange(updated);
  };

  const removePart = (index) => {
    onChange(parts.filter((_, i) => i !== index));
  };

  const filteredParts = availableParts.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.part_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Search Parts</Label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by part name or number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        {searchTerm && (
          <div className="max-h-40 overflow-y-auto border rounded-lg">
            {filteredParts.slice(0, 5).map(part => (
              <div
                key={part.id}
                className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                onClick={() => {
                  addPart(part);
                  setSearchTerm("");
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{part.name}</p>
                    <p className="text-xs text-gray-500">{part.part_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">${part.selling_price?.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{part.quantity} in stock</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Label>Parts Used</Label>
        {parts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">No parts added yet</p>
            </CardContent>
          </Card>
        ) : (
          parts.map((part, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex gap-3 items-start">
                  <div className="flex-1 grid grid-cols-4 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs">Part Name</Label>
                      <Input
                        value={part.part_name}
                        onChange={(e) => updatePart(index, 'part_name', e.target.value)}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">{part.part_number}</p>
                    </div>
                    <div>
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        value={part.quantity}
                        onChange={(e) => updatePart(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="mt-1"
                        min="1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Unit Cost</Label>
                      <Input
                        type="number"
                        value={part.unit_cost}
                        onChange={(e) => updatePart(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="text-right pt-6">
                    <p className="text-sm font-semibold">${part.total_cost?.toLocaleString()}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePart(index)}
                      className="text-red-600 hover:text-red-700 mt-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="flex justify-between items-center pt-3 border-t">
        <span className="font-semibold">Total Parts Cost:</span>
        <span className="text-lg font-bold">${parts.reduce((sum, p) => sum + (p.total_cost || 0), 0).toLocaleString()}</span>
      </div>
    </div>
  );
}