import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus } from "lucide-react";

export default function StockAdjustmentDialog({ open, onClose, part, onAdjust }) {
  const [adjustmentType, setAdjustmentType] = useState("add");
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    const adjustment = adjustmentType === "add" ? quantity : -quantity;
    const newQuantity = Math.max(0, (part?.quantity || 0) + adjustment);
    
    onAdjust({
      ...part,
      quantity: newQuantity
    }, reason);
    
    setQuantity(0);
    setReason("");
  };

  if (!part) return null;

  const newQuantity = adjustmentType === "add" 
    ? (part.quantity || 0) + quantity 
    : Math.max(0, (part.quantity || 0) - quantity);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock Level</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <h4 className="font-semibold mb-1">{part.name}</h4>
            <p className="text-sm text-gray-600">Part #: {part.part_number}</p>
            <p className="text-sm text-gray-600">Current Stock: <strong>{part.quantity}</strong></p>
          </div>

          <div className="space-y-2">
            <Label>Adjustment Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={adjustmentType === "add" ? "default" : "outline"}
                onClick={() => setAdjustmentType("add")}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Stock
              </Button>
              <Button
                variant={adjustmentType === "remove" ? "default" : "outline"}
                onClick={() => setAdjustmentType("remove")}
                className="w-full"
              >
                <Minus className="w-4 h-4 mr-2" />
                Remove Stock
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              placeholder="Enter quantity"
            />
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {adjustmentType === "add" ? (
                  <>
                    <SelectItem value="purchase">New Purchase</SelectItem>
                    <SelectItem value="return">Customer Return</SelectItem>
                    <SelectItem value="found">Found Item</SelectItem>
                    <SelectItem value="correction">Inventory Correction</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="used">Used in Repair</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                    <SelectItem value="lost">Lost/Missing</SelectItem>
                    <SelectItem value="sold">Direct Sale</SelectItem>
                    <SelectItem value="correction">Inventory Correction</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-gray-700">
              New Stock Level: <strong className="text-blue-700">{newQuantity}</strong>
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={quantity === 0 || !reason}>
            Apply Adjustment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}