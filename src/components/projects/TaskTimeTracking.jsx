import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Clock, Plus, Trash2, Play, Pause } from "lucide-react";
import { toast } from "sonner";

export default function TaskTimeTracking({ task, currentUser, onUpdateTask }) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingStart, setTrackingStart] = useState(null);
  const [newEntry, setNewEntry] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    hours: "",
    description: ""
  });

  const timeEntries = task.time_entries || [];
  const totalHours = timeEntries.reduce((sum, e) => sum + (e.hours || 0), 0);

  const handleAddEntry = () => {
    if (!newEntry.hours || Number(newEntry.hours) <= 0) {
      toast.error("Please enter valid hours");
      return;
    }

    const entry = {
      id: Date.now().toString(),
      user_email: currentUser?.email || "",
      user_name: currentUser?.full_name || "Unknown",
      date: newEntry.date,
      hours: Number(newEntry.hours),
      description: newEntry.description
    };

    const updatedEntries = [...timeEntries, entry];
    const newActualHours = updatedEntries.reduce((sum, e) => sum + e.hours, 0);

    onUpdateTask(task.id, {
      time_entries: updatedEntries,
      actual_hours: newActualHours
    });

    setNewEntry({ date: format(new Date(), 'yyyy-MM-dd'), hours: "", description: "" });
    setShowAddDialog(false);
    toast.success("Time entry added");
  };

  const handleDeleteEntry = (entryId) => {
    const updatedEntries = timeEntries.filter(e => e.id !== entryId);
    const newActualHours = updatedEntries.reduce((sum, e) => sum + e.hours, 0);

    onUpdateTask(task.id, {
      time_entries: updatedEntries,
      actual_hours: newActualHours
    });
    toast.success("Time entry deleted");
  };

  const toggleTracking = () => {
    if (isTracking) {
      // Stop tracking
      const elapsed = (Date.now() - trackingStart) / (1000 * 60 * 60); // hours
      if (elapsed >= 0.01) { // At least ~30 seconds
        setNewEntry({
          ...newEntry,
          hours: elapsed.toFixed(2),
          description: "Time tracked session"
        });
        setShowAddDialog(true);
      }
      setIsTracking(false);
      setTrackingStart(null);
    } else {
      // Start tracking
      setIsTracking(true);
      setTrackingStart(Date.now());
      toast.success("Time tracking started");
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm text-gray-500">Time Tracked</p>
            <p className="font-bold text-lg">
              {totalHours.toFixed(1)}h <span className="text-sm font-normal text-gray-500">/ {task.estimated_hours || 0}h estimated</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={isTracking ? "destructive" : "outline"}
            size="sm"
            onClick={toggleTracking}
          >
            {isTracking ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
            {isTracking ? "Stop" : "Start Timer"}
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-1" /> Log Time
          </Button>
        </div>
      </div>

      {/* Time Entries List */}
      {timeEntries.length > 0 ? (
        <div className="space-y-2">
          {timeEntries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{entry.hours}h</span>
                    <span className="text-sm text-gray-500">by {entry.user_name}</span>
                  </div>
                  <p className="text-sm text-gray-600">{entry.description || "No description"}</p>
                  <p className="text-xs text-gray-400">{format(new Date(entry.date), 'MMM d, yyyy')}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => handleDeleteEntry(entry.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-4">No time entries yet</p>
      )}

      {/* Add Entry Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Time</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={newEntry.date}
                onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Hours</Label>
              <Input
                type="number"
                step="0.25"
                min="0"
                value={newEntry.hours}
                onChange={(e) => setNewEntry({ ...newEntry, hours: e.target.value })}
                placeholder="e.g., 2.5"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newEntry.description}
                onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                placeholder="What did you work on?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddEntry}>Add Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}