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
        case "previous_period":
          const targetMonth = subMonths(today, i + 1);
          from = startOfMonth(targetMonth);
          to = endOfMonth(targetMonth);
          label = format(from, 'MMM yyyy');
          break;
        case "previous_quarter":
          const targetQuarter = subQuarters(today, i + 1);
          from = startOfQuarter(targetQuarter);
          to = endOfQuarter(targetQuarter);
          label = `Q${Math.floor(from.getMonth() / 3) + 1} ${from.getFullYear()}`;
          break;
        case "previous_year":
          const targetYear = subYears(today, i + 1);
          from = startOfYear(targetYear);
          to = endOfYear(targetYear);
          label = from.getFullYear().toString();
          break;
        default:
          from = startOfMonth(subMonths(today, i + 1));
          to = endOfMonth(subMonths(today, i + 1));
          label = format(from, 'MMM yyyy');
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
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Comparative Periods</Label>
            <Button
              onClick={addPeriod}
              size="sm"
              variant="outline"
              disabled={periods.length >= maxPeriods}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Period ({periods.length}/{maxPeriods})
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {periods.map((period, index) => {
              const dates = getPeriodDates(period, index);
              return (
                <div key={period.id} className="border rounded-lg p-3 space-y-2 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <Input
                      value={period.label}
                      onChange={(e) => updatePeriodLabel(period.id, e.target.value)}
                      className="h-8 text-sm font-medium"
                      placeholder="Period label"
                    />
                    {periods.length > 1 && (
                      <Button
                        onClick={() => removePeriod(period.id)}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 ml-2"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <Select value={period.type} onValueChange={(type) => updatePeriodType(period.id, type)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                      <SelectItem value="this_quarter">This Quarter</SelectItem>
                      <SelectItem value="last_quarter">Last Quarter</SelectItem>
                      <SelectItem value="this_year">This Year</SelectItem>
                      <SelectItem value="last_year">Last Year</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {period.type === "custom" && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs">
                              <Calendar className="w-3 h-3 mr-1" />
                              {period.customFrom ? format(period.customFrom, 'MMM d') : 'From'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={period.customFrom}
                              onSelect={(date) => updateCustomDate(period.id, 'customFrom', date)}
                            />
                          </PopoverContent>
                        </Popover>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs">
                              <Calendar className="w-3 h-3 mr-1" />
                              {period.customTo ? format(period.customTo, 'MMM d') : 'To'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={period.customTo}
                              onSelect={(date) => updateCustomDate(period.id, 'customTo', date)}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-600">
                    {format(dates.from, 'MMM d, yyyy')} - {format(dates.to, 'MMM d, yyyy')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}