import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DATE_RANGES = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "this_year", label: "This Year" },
  { value: "year_to_date", label: "Year To Date" },
  { value: "yesterday", label: "Yesterday" },
  { value: "previous_week", label: "Previous Week" },
  { value: "previous_month", label: "Previous Month" },
  { value: "previous_quarter", label: "Previous Quarter" },
  { value: "previous_year", label: "Previous Year" },
];

export function getDateRangeValues(rangeKey) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (rangeKey) {
    case "today":
      return { start: today, end: today };
    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: yesterday };
    }
    case "this_week": {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return { start: startOfWeek, end: today };
    }
    case "previous_week": {
      const startOfPrevWeek = new Date(today);
      startOfPrevWeek.setDate(today.getDate() - today.getDay() - 7);
      const endOfPrevWeek = new Date(startOfPrevWeek);
      endOfPrevWeek.setDate(startOfPrevWeek.getDate() + 6);
      return { start: startOfPrevWeek, end: endOfPrevWeek };
    }
    case "this_month": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: startOfMonth, end: today };
    }
    case "previous_month": {
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: startOfPrevMonth, end: endOfPrevMonth };
    }
    case "this_quarter": {
      const quarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), quarter * 3, 1);
      return { start: startOfQuarter, end: today };
    }
    case "previous_quarter": {
      const quarter = Math.floor(now.getMonth() / 3);
      const startOfPrevQuarter = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
      const endOfPrevQuarter = new Date(now.getFullYear(), quarter * 3, 0);
      return { start: startOfPrevQuarter, end: endOfPrevQuarter };
    }
    case "this_year": {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return { start: startOfYear, end: today };
    }
    case "year_to_date": {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return { start: startOfYear, end: today };
    }
    case "previous_year": {
      const startOfPrevYear = new Date(now.getFullYear() - 1, 0, 1);
      const endOfPrevYear = new Date(now.getFullYear() - 1, 11, 31);
      return { start: startOfPrevYear, end: endOfPrevYear };
    }
    default:
      return { start: null, end: null };
  }
}

export default function DateRangeFilter({ value, onChange }) {
  const selectedLabel = DATE_RANGES.find(r => r.value === value)?.label || "All Time";

  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-gray-500" />
      <span className="text-sm text-gray-600">Date Range:</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGES.map((range) => (
            <SelectItem key={range.value} value={range.value}>
              {range.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}