import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subQuarters, subYears } from "date-fns";

export default function PeriodComparison({ onPeriodsChange, maxPeriods = 12 }) {
  const [periods, setPeriods] = useState([
    { id: 1, type: "this_month", label: "This Month" }
  ]);

  const getPeriodDates = (periodType, offset = 0) => {
    const today = new Date();
    
    switch (periodType) {
      case "this_month":
        const targetMonth = subMonths(today, offset);
        return { from: startOfMonth(targetMonth), to: endOfMonth(targetMonth) };
      case "last_month":
        const lastMonth = subMonths(today, 1 + offset);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      case "this_quarter":
        const targetQuarter = subQuarters(today, offset);
        return { from: startOfQuarter(targetQuarter), to: endOfQuarter(targetQuarter) };
      case "last_quarter":
        const lastQuarter = subQuarters(today, 1 + offset);
        return { from: startOfQuarter(lastQuarter), to: endOfQuarter(lastQuarter) };
      case "this_year":
        const targetYear = subYears(today, offset);
        return { from: startOfYear(targetYear), to: endOfYear(targetYear) };
      case "last_year":
        const lastYear = subYears(today, 1 + offset);
        return { from: startOfYear(lastYear), to: endOfYear(lastYear) };
      default:
        return { from: startOfMonth(today), to: endOfMonth(today) };
    }
  };

  const updatePeriods = (newPeriods) => {
    setPeriods(newPeriods);
    const periodsWithDates = newPeriods.map((period, index) => ({
      ...period,
      ...getPeriodDates(period.type, index)
    }));
    onPeriodsChange(periodsWithDates);
  };

  const addPeriod = () => {
    if (periods.length < maxPeriods) {
      const newPeriods = [...periods, { 
        id: Date.now(), 
        type: "this_month", 
        label: `Period ${periods.length + 1}` 
      }];
      updatePeriods(newPeriods);
    }
  };

  const removePeriod = (id) => {
    if (periods.length > 1) {
      const newPeriods = periods.filter(p => p.id !== id);
      updatePeriods(newPeriods);
    }
  };

  const updatePeriodType = (id, type) => {
    const typeLabels = {
      this_month: "This Month",
      last_month: "Last Month",
      this_quarter: "This Quarter",
      last_quarter: "Last Quarter",
      this_year: "This Year",
      last_year: "Last Year"
    };
    
    const newPeriods = periods.map(p => 
      p.id === id ? { ...p, type, label: typeLabels[type] } : p
    );
    updatePeriods(newPeriods);
  };

  const updatePeriodLabel = (id, label) => {
    const newPeriods = periods.map(p => 
      p.id === id ? { ...p, label } : p
    );
    setPeriods(newPeriods);
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
              const dates = getPeriodDates(period.type, index);
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
                    </SelectContent>
                  </Select>
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