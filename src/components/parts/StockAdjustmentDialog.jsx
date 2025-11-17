import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, Save } from "lucide-react";
import { toast } from "sonner";

export default function StockAdjustmentDialog({ open, onClose, part }) {
  const [adjustmentType, setAdjustmentType] = useState("add"); // add, remove, set
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Part.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      toast.success("Stock adjusted successfully!");
      onClose();
    },
  });

  React.useEffect(() => {
    if (open && part) {
      setAdjustmentType("add");
      setQuantity(0);
      setReason("");
    }
  }, [open, part]);

  const handleSave = () => {
    if (!part) return;

    let newQuantity = part.quantity;
    
    if (adjustmentType === "add") {
      newQuantity = part.quantity + quantity;
    } else if (adjustmentType === "remove") {
      newQuantity = Math.max(0, part.quantity - quantity);
    } else if (adjustmentType === "set") {
      newQuantity = quantity;
    }

    updateMutation.mutate({
      id: part.id,
      data: {
        ...part,
        quantity: newQuantity,
      }
    });
  };

  if (!part) return null;

  const getNewQuantity = () => {
    if (adjustmentType === "add") {
      return part.quantity + quantity;
    } else if (adjustmentType === "remove") {
      return Math.max(0, part.quantity - quantity);
    } else {
      return quantity;
    }
  };

  const newQuantity = getNewQuantity();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock - {part.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Current Stock</p>
            <p className="text-3xl font-bold text-gray-900">{part.quantity}</p>
            <p className="text-xs text-gray-500 mt-1">
              Reorder level: {part.reorder_level}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Adjustment Type</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={adjustmentType === "add" ? "default" : "outline"}
                onClick={() => setAdjustmentType("add")}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
              <Button
                variant={adjustmentType === "remove" ? "default" : "outline"}
                onClick={() => setAdjustmentType("remove")}
                className="w-full"
              >
                <Minus className="w-4 h-4 mr-1" />
                Remove
              </Button>
              <Button
                variant={adjustmentType === "set" ? "default" : "outline"}
                onClick={() => setAdjustmentType("set")}
                className="w-full"
              >
                Set
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              min="0"
              placeholder={adjustmentType === "set" ? "New total quantity" : "Quantity to adjust"}
            />
          </div>

          <div className="space-y-2">
            <Label>Reason (Optional)</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="received">Received from supplier</SelectItem>
                <SelectItem value="used">Used in repair</SelectItem>
                <SelectItem value="damaged">Damaged/Defective</SelectItem>
                <SelectItem value="returned">Customer return</SelectItem>
                <SelectItem value="inventory">Inventory count</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">New Stock Level:</span>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{newQuantity}</p>
                <p className="text-xs text-gray-600">
                  {adjustmentType === "add" && `+${quantity}`}
                  {adjustmentType === "remove" && `-${quantity}`}
                  {adjustmentType === "set" && `Set to ${quantity}`}
                </p>
              </div>
            </div>
            {newQuantity <= part.reorder_level && (
              <p className="text-xs text-orange-600 mt-2">
                ⚠️ Stock will be at or below reorder level
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={quantity === 0 || updateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Adjustment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}