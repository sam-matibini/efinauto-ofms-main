import { useEffect, useRef, useState } from "react";
import { endOfYear, startOfYear } from "date-fns";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildComparisonColumns, dayStamp } from "@/lib/reportPeriods";

const COMPARE_TYPES = [
  { value: "previous_period", label: "Previous Period(s)" },
  { value: "previous_quarter", label: "Previous Quarter(s)" },
  { value: "previous_year", label: "Previous Year(s)" },
];

function typeLabel(type, count) {
  const match = COMPARE_TYPES.find((option) => option.value === type);
  const name = match ? match.label.replace("(s)", count === 1 ? "" : "s") : "Applied";
  return `${name} (${count})`;
}

export default function PeriodComparison({ from, to, preset = "custom", currentLabel, onPeriodsChange, maxPeriods = 12 }) {
  const today = new Date();
  const baseFrom = from || startOfYear(today);
  const baseTo = to || endOfYear(today);
  const fromStamp = dayStamp(baseFrom);
  const toStamp = dayStamp(baseTo);
  const onChangeRef = useRef(onPeriodsChange);
  onChangeRef.current = onPeriodsChange;
  const rangeRef = useRef({ from: baseFrom, to: baseTo, preset, currentLabel });
  rangeRef.current = { from: baseFrom, to: baseTo, preset, currentLabel };

  const [isOpen, setIsOpen] = useState(false);
  const [compareType, setCompareType] = useState("previous_period");
  const [numberOfPeriods, setNumberOfPeriods] = useState(1);
  const [arrangeLatestFirst, setArrangeLatestFirst] = useState(true);
  const [committed, setCommitted] = useState(null);

  useEffect(() => {
    if (!committed) return;
    const range = rangeRef.current;
    onChangeRef.current(buildComparisonColumns({
      from: range.from,
      to: range.to,
      mode: committed.type,
      count: committed.count,
      preset: range.preset,
      currentLabel: range.currentLabel,
      latestFirst: committed.latestFirst,
    }));
  }, [committed, fromStamp, toStamp, preset, currentLabel]);

  const handleApply = () => {
    setCommitted({ type: compareType, count: numberOfPeriods, latestFirst: arrangeLatestFirst });
    setIsOpen(false);
  };

  const clearComparison = () => {
    setCommitted(null);
    onPeriodsChange?.([]);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10">
            Compare With: {committed ? typeLabel(committed.type, committed.count) : "None"}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80"
          align="start"
          onInteractOutside={(event) => {
            const target = event.target;
            if (target instanceof Element && target.closest("[role='listbox'], [data-radix-select-content]")) {
              event.preventDefault();
            }
          }}
        >
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Compare With</h4>

            <div className="space-y-2">
              <Label className="text-sm">Compare Based on Period/Year</Label>
              <Select value={compareType} onValueChange={setCompareType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPARE_TYPES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Number of Period(s)</Label>
              <Select value={numberOfPeriods.toString()} onValueChange={(value) => setNumberOfPeriods(parseInt(value, 10))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: maxPeriods }, (_, index) => index + 1).map((num) => (
                    <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="arrange-order"
                checked={arrangeLatestFirst}
                onCheckedChange={(checked) => setArrangeLatestFirst(checked === true)}
              />
              <label htmlFor="arrange-order" className="text-sm leading-none">
                Arrange period/year from latest to oldest
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleApply} size="sm" className="flex-1">Apply</Button>
              <Button onClick={() => setIsOpen(false)} size="sm" variant="outline" className="flex-1">Cancel</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {committed && (
        <Button variant="ghost" size="sm" onClick={clearComparison} className="h-10 px-2" aria-label="Clear comparison">
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
