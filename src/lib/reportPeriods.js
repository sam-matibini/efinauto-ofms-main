import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subQuarters,
  subWeeks,
  subYears,
} from "date-fns";

const WEEK = { weekStartsOn: 1 };

export const DATE_PRESETS = [
  { id: "today", label: "Today" },
  { id: "this_week", label: "This Week" },
  { id: "this_month", label: "This Month" },
  { id: "this_quarter", label: "This Quarter" },
  { id: "this_year", label: "This Year" },
  { id: "yesterday", label: "Yesterday" },
  { id: "previous_week", label: "Previous Week" },
  { id: "previous_month", label: "Previous Month" },
  { id: "previous_quarter", label: "Previous Quarter" },
  { id: "previous_year", label: "Previous Year" },
  { id: "custom", label: "Custom" },
];

export const COMPARE_OPTIONS = [
  { id: "none", label: "None" },
  { id: "previous_period", label: "Previous Period(s)" },
  { id: "previous_year", label: "Previous Year(s)" },
  { id: "previous_quarter", label: "Previous Quarter(s)" },
  { id: "previous_month", label: "Previous Month(s)" },
];

export function dayStamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "yyyy-MM-dd");
}

function sameStamp(left, right) {
  return dayStamp(left) === dayStamp(right);
}

function span(from, to) {
  return {
    from,
    to: dayStamp(to) < dayStamp(from) ? from : to,
  };
}

export function presetRange(id, today = new Date()) {
  const current = new Date(today);
  switch (id) {
    case "today":
      return span(current, current);
    case "this_week":
      return span(startOfWeek(current, WEEK), current);
    case "this_month":
      return span(startOfMonth(current), current);
    case "this_quarter":
      return span(startOfQuarter(current), current);
    case "this_year":
      return span(startOfYear(current), current);
    case "yesterday": {
      const yesterday = subDays(current, 1);
      return span(yesterday, yesterday);
    }
    case "previous_week": {
      const previous = subWeeks(current, 1);
      return span(startOfWeek(previous, WEEK), endOfWeek(previous, WEEK));
    }
    case "previous_month": {
      const previous = subMonths(current, 1);
      return span(startOfMonth(previous), endOfMonth(previous));
    }
    case "previous_quarter": {
      const previous = subQuarters(current, 1);
      return span(startOfQuarter(previous), endOfQuarter(previous));
    }
    case "previous_year": {
      const previous = subYears(current, 1);
      return span(startOfYear(previous), endOfYear(previous));
    }
    default:
      return null;
  }
}

function isFullMonth(from, to) {
  return sameStamp(from, startOfMonth(from)) && sameStamp(to, endOfMonth(from));
}

function isFullQuarter(from, to) {
  return sameStamp(from, startOfQuarter(from)) && sameStamp(to, endOfQuarter(from));
}

function isFullYear(from, to) {
  return sameStamp(from, startOfYear(from)) && sameStamp(to, endOfYear(from));
}

function isFullWeek(from, to) {
  return sameStamp(from, startOfWeek(from, WEEK)) && sameStamp(to, endOfWeek(from, WEEK));
}

export function isFinancialYear(from, to) {
  return isFullYear(from, to);
}

export function rangeLabel(from, to) {
  if (!from || !to) return "";
  if (isFullYear(from, to)) return format(from, "yyyy");
  if (isFullQuarter(from, to)) return `Q${Math.floor(from.getMonth() / 3) + 1} ${format(from, "yyyy")}`;
  if (isFullMonth(from, to)) return format(from, "MMMM yyyy");
  if (sameStamp(from, to)) return format(from, "MMM d, yyyy");
  return `${format(from, "MMM d, yyyy")} - ${format(to, "MMM d, yyyy")}`;
}

function shiftBoth(from, to, steps, shift) {
  return span(shift(from, steps), shift(to, steps));
}

function shiftMonths(from, to, steps) {
  const start = startOfMonth(subMonths(from, steps));
  if (sameStamp(from, startOfMonth(from)) && sameStamp(to, endOfMonth(to))) return span(start, endOfMonth(start));
  return span(subMonths(from, steps), subMonths(to, steps));
}

function shiftQuarters(from, to, steps) {
  const start = startOfQuarter(subQuarters(from, steps));
  if (isFullQuarter(from, to)) return span(start, endOfQuarter(start));
  return span(subQuarters(from, steps), subQuarters(to, steps));
}

function previousEqualWindow(from, to, steps) {
  const length = differenceInCalendarDays(to, from) + 1;
  const end = addDays(from, -1 - (steps - 1) * length);
  return span(addDays(end, -(length - 1)), end);
}

function monthToDate(from, to) {
  return sameStamp(from, startOfMonth(from)) && from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
}

function previousPeriod(from, to, steps, preset) {
  if (sameStamp(from, to)) return span(subDays(from, steps), subDays(to, steps));
  if (isFullWeek(from, to) || preset === "this_week" || preset === "previous_week") {
    return shiftBoth(from, to, steps, (date, count) => subWeeks(date, count));
  }
  if (isFullMonth(from, to) || monthToDate(from, to) || preset === "this_month" || preset === "previous_month") {
    return shiftMonths(from, to, steps);
  }
  if (isFullQuarter(from, to) || preset === "this_quarter" || preset === "previous_quarter") {
    return shiftQuarters(from, to, steps);
  }
  if (isFullYear(from, to) || preset === "this_year" || preset === "previous_year" || sameStamp(from, startOfYear(from))) {
    return shiftBoth(from, to, steps, (date, count) => subYears(date, count));
  }
  if (sameStamp(from, startOfQuarter(from))) return shiftBoth(from, to, steps, (date, count) => subQuarters(date, count));
  return previousEqualWindow(from, to, steps);
}

export function compareRanges({ from, to, mode = "none", count = 1, preset = "custom" } = {}) {
  const periods = Math.min(12, Math.max(0, Number(count) || 0));
  if (!from || !to || mode === "none" || periods === 0) return [];
  const ranges = [];
  for (let step = 1; step <= periods; step += 1) {
    let range;
    if (mode === "previous_year") range = shiftBoth(from, to, step, (date, amount) => subYears(date, amount));
    else if (mode === "previous_month") range = shiftMonths(from, to, step);
    else if (mode === "previous_quarter") range = shiftQuarters(from, to, step);
    else range = previousPeriod(from, to, step, preset);
    ranges.push({ ...range, label: rangeLabel(range.from, range.to) });
  }
  return ranges;
}

export function compareCountLabel(mode) {
  if (mode === "previous_year") return "Number of year(s)";
  if (mode === "previous_month") return "Number of month(s)";
  if (mode === "previous_quarter") return "Number of quarter(s)";
  return "Number of period(s)";
}
