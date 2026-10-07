import { compareCountLabel, compareRanges, dayStamp, presetRange, rangeLabel } from "./reportPeriods.js";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed += 1;
    return;
  }
  failed += 1;
  console.error(`FAIL ${message}`);
}

const today = new Date(2026, 9, 7);
const year = presetRange("this_year", today);
assert(dayStamp(year.from) === "2026-01-01" && dayStamp(year.to) === "2026-10-07", "this year is year to date");

const month = presetRange("this_month", today);
assert(dayStamp(month.from) === "2026-10-01" && dayStamp(month.to) === "2026-10-07", "this month is month to date");

const previousYear = compareRanges({ ...year, mode: "previous_year", count: 2, preset: "this_year" });
assert(dayStamp(previousYear[0].from) === "2025-01-01" && dayStamp(previousYear[0].to) === "2025-10-07", "previous year keeps the year-to-date cutoff");
assert(dayStamp(previousYear[1].from) === "2024-01-01", "the second previous year steps back again");

const previousPeriod = compareRanges({ ...month, mode: "previous_period", count: 1, preset: "this_month" });
assert(dayStamp(previousPeriod[0].from) === "2026-09-01" && dayStamp(previousPeriod[0].to) === "2026-09-07", "previous period for this month is the prior month to date");

const fullMonth = presetRange("previous_month", today);
assert(rangeLabel(fullMonth.from, fullMonth.to) === "September 2026", "a full month uses the month name");
const priorMonths = compareRanges({ ...fullMonth, mode: "previous_month", count: 1 });
assert(dayStamp(priorMonths[0].from) === "2026-08-01" && dayStamp(priorMonths[0].to) === "2026-08-31", "previous month steps a whole month");

assert(compareRanges({ ...year, mode: "none", count: 3 }).length === 0, "none adds no comparison columns");
assert(compareCountLabel("previous_year") === "Number of year(s)", "year count label");

console.log(`${passed} checks passed, ${failed} failed`);
if (failed > 0) process.exit(1);
