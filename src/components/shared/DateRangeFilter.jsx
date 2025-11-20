import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Filter } from "lucide-react";
import { format, subDays, subWeeks, subMonths, subQuarters, subYears, startOfWeek, startOfMonth, startOfQuarter, startOfYear, endOfWeek, endOfMonth, endOfQuarter, endOfYear, startOfDay, endOfDay } from "date-fns";

export default function DateRangeFilter({ onChange, label = "Date Range" }) {
  const [preset, setPreset] = useState("this_month");
  const [customFrom, setCustomFrom] = useState(null);
  const [customTo, setCustomTo] = useState(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const presets = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "this_week", label: "This Week" },
    { value: "this_month", label: "This Month" },
    { value: "this_quarter", label: "This Quarter" },
    { value: "this_year", label: "This Year" },
    { value: "year_to_date", label: "Year To Date" },
    { value: "previous_week", label: "Previous Week" },
    { value: "previous_month", label: "Previous Month" },
    { value: "previous_quarter", label: "Previous Quarter" },
    { value: "previous_year", label: "Previous Year" },
    { value: "custom", label: "Custom" }
  ];

  const calculateDateRange = (presetValue) => {
    const today = new Date();
    let from, to;

    switch (presetValue) {
      case "today":
        from = startOfDay(today);
        to = endOfDay(today);
        break;
      case "yesterday":
        const yesterday = subDays(today, 1);
        from = startOfDay(yesterday);
        to = endOfDay(yesterday);
        break;
      case "this_week":
        from = startOfWeek(today);
        to = endOfWeek(today);
        break;
      case "this_month":
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case "this_quarter":
        from = startOfQuarter(today);
        to = endOfQuarter(today);
        break;
      case "this_year":
        from = startOfYear(today);
        to = endOfYear(today);
        break;
      case "year_to_date":
        from = startOfYear(today);
        to = endOfDay(today);
        break;
      case "previous_week":
        const prevWeekStart = subWeeks(today, 1);
        from = startOfWeek(prevWeekStart);
        to = endOfWeek(prevWeekStart);
        break;
      case "previous_month":
        const prevMonthStart = subMonths(today, 1);
        from = startOfMonth(prevMonthStart);
        to = endOfMonth(prevMonthStart);
        break;
      case "previous_quarter":
        const prevQuarterStart = subQuarters(today, 1);
        from = startOfQuarter(prevQuarterStart);
        to = endOfQuarter(prevQuarterStart);
        break;
      case "previous_year":
        const prevYearStart = subYears(today, 1);
        from = startOfYear(prevYearStart);
        to = endOfYear(prevYearStart);
        break;
      case "custom":
        from = customFrom || startOfMonth(today);
        to = customTo || endOfMonth(today);
        break;
      default:
        from = startOfMonth(today);
        to = endOfMonth(today);
    }

    return { from, to, label: presets.find(p => p.value === presetValue)?.label || "Date Range" };
  };

  const handlePresetChange = (value) => {
    setPreset(value);
    if (value !== "custom") {
      const range = calculateDateRange(value);
      onChange(range);
      setPopoverOpen(false);
    }
  };

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      onChange({
        from: customFrom,
        to: customTo,
        label: `${format(customFrom, "MMM d, yyyy")} - ${format(customTo, "MMM d, yyyy")}`
      });
      setPopoverOpen(false);
    }
  };

  React.useEffect(() => {
    const range = calculateDateRange("this_month");
    onChange(range);
  }, []);

  const currentRange = calculateDateRange(preset);
  const displayText = preset === "custom" && customFrom && customTo
    ? `${format(customFrom, "MMM d, yyyy")} - ${format(customTo, "MMM d, yyyy")}`
    : `${format(currentRange.from, "MMM d, yyyy")} - ${format(currentRange.to, "MMM d, yyyy")}`;

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start text-left font-normal">
          <Filter className="mr-2 h-4 w-4" />
          <span className="font-semibold">{label}:</span>
          <span className="ml-2">{presets.find(p => p.value === preset)?.label}</span>
          <span className="ml-2 text-gray-500 text-xs">({displayText})</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select Range</label>
            <Select value={preset} onValueChange={handlePresetChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presets.map(p => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {preset === "custom" && (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">From Date</label>
                <Calendar
                  mode="single"
                  selected={customFrom}
                  onSelect={setCustomFrom}
                  className="rounded-md border"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">To Date</label>
                <Calendar
                  mode="single"
                  selected={customTo}
                  onSelect={setCustomTo}
                  className="rounded-md border"
                />
              </div>
              <Button onClick={handleCustomApply} className="w-full" disabled={!customFrom || !customTo}>
                Apply Custom Range
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}