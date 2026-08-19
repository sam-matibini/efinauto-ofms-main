import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompany } from "@/components/shared/CompanyContext";

export default function PartsLogger({ open, onClose, onAddPart, isOnline }) {
  const { selectedCompanyId } = useCompany();
  const [selectedPartId, setSelectedPartId] = useState("");
  const [quantity, setQuantity] = useState(1);

  const { data: parts = [] } = useQuery({
    queryKey: ['parts', selectedCompanyId],
    queryFn: async () => {
      if (!isOnline) {
        const cached = localStorage.getItem('cachedParts');
        return cached ? JSON.parse(cached) : [];
      }
      const result = await supabase.entities.Part.filter({ company_id: selectedCompanyId });
      localStorage.setItem('cachedParts', JSON.stringify(result));
      return result;
    },
    enabled: !!selectedCompanyId && open,
    initialData: [],
  });

  const handleAdd = () => {
    const part = parts.find(p => p.id === selectedPartId);
    if (!part) return;

    const partEntry = {
      part_id: part.id,
      part_name: part.name,
      part_number: part.part_number,
      quantity: quantity,
      unit_cost: part.selling_price || part.cost_price || 0,
      total_cost: (part.selling_price || part.cost_price || 0) * quantity,
    };

    onAddPart(partEntry);
    setSelectedPartId("");
    setQuantity(1);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Parts Used</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Part</Label>
            <Select value={selectedPartId} onValueChange={setSelectedPartId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a part..." />
              </SelectTrigger>
              <SelectContent>
                {parts.map(part => (
                  <SelectItem key={part.id} value={part.id}>
                    {part.name} - {part.part_number} (${part.selling_price || part.cost_price || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            />
          </div>

          {selectedPartId && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm font-semibold">Total Cost</p>
              <p className="text-2xl font-bold text-blue-600">
                ${((parts.find(p => p.id === selectedPartId)?.selling_price || 0) * quantity).toFixed(2)}
              </p>
            </div>
          )}

          <Button 
            onClick={handleAdd}
            disabled={!selectedPartId}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Add Part
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}