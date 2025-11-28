import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subQuarters, subYears } from "date-fns";

export default function PeriodComparison({ onPeriodsChange, maxPeriods = 12 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [compareType, setCompareType] = useState("previous_period");
  const [numberOfPeriods, setNumberOfPeriods] = useState(1);
  const [arrangeLatestFirst, setArrangeLatestFirst] = useState(true);
  const [applied, setApplied] = useState(false);

  const generatePeriods = () => {
    const today = new Date();
    const periods = [];
    
    for (let i = 0; i < numberOfPeriods; i++) {
      let from, to, label;
      
      switch (compareType) {
        case "previous_period": {
          const targetMonth = subMonths(today, i);
          from = startOfMonth(targetMonth);
          to = i === 0 ? today : endOfMonth(targetMonth);
          label = format(from, 'MMM yyyy');
          break;
        }
        case "previous_quarter": {
          const targetQuarter = subQuarters(today, i);
          from = startOfQuarter(targetQuarter);
          to = i === 0 ? today : endOfQuarter(targetQuarter);
          const quarterNum = Math.floor(from.getMonth() / 3) + 1;
          label = `Q${quarterNum} ${from.getFullYear()}`;
          break;
        }
        case "previous_year": {
          const targetYear = subYears(today, i);
          from = startOfYear(targetYear);
          to = i === 0 ? today : endOfYear(targetYear);
          label = from.getFullYear().toString();
          break;
        }
        default: {
          const defaultMonth = subMonths(today, i);
          from = startOfMonth(defaultMonth);
          to = i === 0 ? today : endOfMonth(defaultMonth);
          label = format(from, 'MMM yyyy');
        }
      }
      
      periods.push({ label, from, to });
    }
    
    if (!arrangeLatestFirst) {
      periods.reverse();
    }
    
    return periods;
  };

  const handleApply = () => {
    const periods = generatePeriods();
    onPeriodsChange(periods);
    setApplied(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const clearComparison = () => {
    setApplied(false);
    onPeriodsChange([]);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10">
            Compare With: {applied ? "Applied" : "None"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Compare With</h4>
            
            <div className="space-y-2">
              <Label className="text-sm">Compare Based on Period/Year</Label>
              <Select value={compareType} onValueChange={setCompareType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="previous_period">Previous Period(s)</SelectItem>
                  <SelectItem value="previous_quarter">Previous Quarter(s)</SelectItem>
                  <SelectItem value="previous_year">Previous Year(s)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Number of Period(s)</Label>
              <Select value={numberOfPeriods.toString()} onValueChange={(v) => setNumberOfPeriods(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: maxPeriods }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="arrange-order"
                checked={arrangeLatestFirst}
                onCheckedChange={setArrangeLatestFirst}
              />
              <label
                htmlFor="arrange-order"
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Arrange period/year from latest to oldest
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleApply} size="sm" className="flex-1">
                Apply
              </Button>
              <Button onClick={handleCancel} size="sm" variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {applied && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearComparison}
          className="h-10 px-2"
        >
          <X className="w-4 h-4" />
        </Button>
      )}

      {applied && (
        <Button variant="outline" size="sm" className="h-10">
          Customize Report
        </Button>
      )}
    </div>
  );
}