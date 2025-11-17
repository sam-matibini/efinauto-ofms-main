import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Clock } from "lucide-react";

export default function TimeTrackingTab({ timeTracking = [], totalHours, hourlyRate, onChange }) {
  const addTimeEntry = () => {
    const newEntry = {
      technician: "",
      start_time: "",
      end_time: "",
      hours: 0,
      task_description: "",
      billable: true
    };
    const updated = [...timeTracking, newEntry];
    onChange({
      time_tracking: updated,
      total_labor_hours: calculateTotalHours(updated)
    });
  };

  const updateTimeEntry = (index, field, value) => {
    const updated = [...timeTracking];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate hours if start and end time are provided
    if (field === 'start_time' || field === 'end_time') {
      const start = new Date(`2000-01-01T${updated[index].start_time}`);
      const end = new Date(`2000-01-01T${updated[index].end_time}`);
      if (updated[index].start_time && updated[index].end_time) {
        const hours = (end - start) / (1000 * 60 * 60);
        updated[index].hours = Math.max(0, hours);
      }
    }
    
    onChange({
      time_tracking: updated,
      total_labor_hours: calculateTotalHours(updated)
    });
  };

  const removeTimeEntry = (index) => {
    const updated = timeTracking.filter((_, i) => i !== index);
    onChange({
      time_tracking: updated,
      total_labor_hours: calculateTotalHours(updated)
    });
  };

  const calculateTotalHours = (entries) => {
    return entries
      .filter(e => e.billable)
      .reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label>Time Tracking</Label>
        <Button onClick={addTimeEntry} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Time Entry
        </Button>
      </div>

      <div className="space-y-3">
        {timeTracking.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No time entries yet</p>
            </CardContent>
          </Card>
        ) : (
          timeTracking.map((entry, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-sm">Entry #{index + 1}</h4>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTimeEntry(index)}
                      className="text-red-600 hover:text-red-700 h-6 w-6"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Technician</Label>
                      <Input
                        value={entry.technician}
                        onChange={(e) => updateTimeEntry(index, 'technician', e.target.value)}
                        placeholder="Tech name"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Start Time</Label>
                      <Input
                        type="time"
                        value={entry.start_time}
                        onChange={(e) => updateTimeEntry(index, 'start_time', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">End Time</Label>
                      <Input
                        type="time"
                        value={entry.end_time}
                        onChange={(e) => updateTimeEntry(index, 'end_time', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Hours</Label>
                      <Input
                        type="number"
                        value={entry.hours}
                        onChange={(e) => updateTimeEntry(index, 'hours', parseFloat(e.target.value) || 0)}
                        step="0.25"
                        min="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Billable</Label>
                      <select
                        value={entry.billable ? "true" : "false"}
                        onChange={(e) => updateTimeEntry(index, 'billable', e.target.value === "true")}
                        className="w-full h-10 px-3 border rounded-md"
                      >
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Task Description</Label>
                    <Textarea
                      value={entry.task_description}
                      onChange={(e) => updateTimeEntry(index, 'task_description', e.target.value)}
                      rows={2}
                      placeholder="What was done..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hourly Rate ($)</Label>
              <Input
                type="number"
                value={hourlyRate}
                onChange={(e) => onChange({ hourly_rate: parseFloat(e.target.value) || 0 })}
                step="1"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Total Billable Hours</Label>
              <Input
                type="number"
                value={totalHours}
                readOnly
                className="bg-white font-semibold"
              />
            </div>
          </div>
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <span className="font-semibold">Labor Cost:</span>
            <span className="text-lg font-bold">${((totalHours || 0) * (hourlyRate || 0)).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}