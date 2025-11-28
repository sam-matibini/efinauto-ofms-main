import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { GitCompare, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const COMPARE_OPTIONS = [
  { value: "previous_period", label: "Previous Period(s)" },
  { value: "previous_year", label: "Previous Year(s)" },
];

const PERIOD_COUNTS = [1, 2, 3, 4, 5];

export default function CompareWithFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [compareType, setCompareType] = useState(value?.type || "previous_period");
  const [periodCount, setPeriodCount] = useState(value?.count || 1);
  const [latestToOldest, setLatestToOldest] = useState(value?.latestToOldest ?? true);

  const handleApply = () => {
    onChange({
      type: compareType,
      count: periodCount,
      latestToOldest,
      applied: true
    });
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setOpen(false);
  };

  const isApplied = value?.applied;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={isApplied ? "border-blue-500 text-blue-600" : ""}>
          <GitCompare className="w-4 h-4 mr-2" />
          Compare With: {isApplied ? "Applied" : "None"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="font-medium text-sm border-b pb-2">Compare With</div>
          
          <div className="space-y-2">
            <Label className="text-sm">Compare Based on Period/Year</Label>
            <Select value={compareType} onValueChange={setCompareType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMPARE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Number of Period(s)</Label>
            <Select value={String(periodCount)} onValueChange={(v) => setPeriodCount(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_COUNTS.map((count) => (
                  <SelectItem key={count} value={String(count)}>
                    {count}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="latestToOldest" 
              checked={latestToOldest} 
              onCheckedChange={setLatestToOldest} 
            />
            <Label htmlFor="latestToOldest" className="text-sm">
              Arrange period/year from latest to oldest
            </Label>
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button onClick={handleApply} size="sm" className="bg-blue-600 hover:bg-blue-700">
              Apply
            </Button>
            <Button onClick={handleClear} variant="outline" size="sm">
              Cancel
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}