import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export default function TimeLogger({ open, onClose, onLogTime }) {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [billable, setBillable] = useState(true);

  const calculateHours = () => {
    if (!startTime || !endTime) return 0;
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diff = (end - start) / (1000 * 60 * 60);
    return Math.max(0, diff);
  };

  const handleLog = () => {
    const hours = calculateHours();
    
    if (hours <= 0) {
      return;
    }

    onLogTime({
      start_time: startTime,
      end_time: endTime,
      hours: hours,
      task_description: taskDescription,
      billable: billable,
    });

    setStartTime("");
    setEndTime("");
    setTaskDescription("");
    setBillable(true);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Time</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {startTime && endTime && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm font-semibold">Total Hours</p>
              <p className="text-2xl font-bold text-blue-600">
                {calculateHours().toFixed(2)}h
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Task Description</Label>
            <Textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="What did you work on?"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <Label>Billable Time</Label>
            <Switch checked={billable} onCheckedChange={setBillable} />
          </div>

          <Button 
            onClick={handleLog}
            disabled={!startTime || !endTime || !taskDescription}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Log Time
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}