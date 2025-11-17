import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Minus, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function StockAdjustmentDialog({ open, onClose, part, onSave }) {
  const [adjustmentType, setAdjustmentType] = useState("add");
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState("");

  React.useEffect(() => {
    if (open) {
      setAdjustmentType("add");
      setQuantity(0);
      setReason("");
    }
  }, [open]);

  const handleSave = () => {
    if (!part || quantity === 0) return;

    let newQuantity = part.quantity;
    if (adjustmentType === "add") {
      newQuantity += quantity;
    } else if (adjustmentType === "remove") {
      newQuantity = Math.max(0, newQuantity - quantity);
    } else if (adjustmentType === "set") {
      newQuantity = quantity;
    }

    onSave({ quantity: newQuantity });
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock Level</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-gray-600" />
              <h4 className="font-semibold">{part.name}</h4>
            </div>
            <p className="text-sm text-gray-600">Part #: {part.part_number}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-gray-600">Current Stock:</span>
              <Badge className="bg-blue-100 text-blue-700 text-lg">
                {part.quantity}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Adjustment Type</Label>
            <Select value={adjustmentType} onValueChange={setAdjustmentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-green-600" />
                    Add Stock (Received)
                  </div>
                </SelectItem>
                <SelectItem value="remove">
                  <div className="flex items-center gap-2">
                    <Minus className="w-4 h-4 text-red-600" />
                    Remove Stock (Used/Sold)
                  </div>
                </SelectItem>
                <SelectItem value="set">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    Set Exact Amount
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              {adjustmentType === "set" ? "New Quantity" : "Quantity"}
            </Label>
            <Input
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              placeholder="Enter quantity"
            />
          </div>

          <div className="space-y-2">
            <Label>Reason (Optional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Stock received from supplier, Used in repair #123"
              rows={2}
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-900">New Stock Level:</span>
              <Badge className="bg-blue-600 text-white text-lg">
                {getNewQuantity()}
              </Badge>
            </div>
            {getNewQuantity() <= part.reorder_level && (
              <p className="text-xs text-orange-600 mt-2">
                ⚠️ This is below the reorder level ({part.reorder_level})
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSave}
            disabled={quantity === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Save Adjustment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}