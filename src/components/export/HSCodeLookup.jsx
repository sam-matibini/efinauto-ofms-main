import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const HS_CODES = {
  vehicle: [
    { code: "8703.21", description: "Motor cars - Spark-ignition engine < 1000cc" },
    { code: "8703.22", description: "Motor cars - Spark-ignition engine 1000-1500cc" },
    { code: "8703.23", description: "Motor cars - Spark-ignition engine 1500-3000cc" },
    { code: "8703.24", description: "Motor cars - Spark-ignition engine > 3000cc" },
    { code: "8703.31", description: "Motor cars - Diesel engine < 1500cc" },
    { code: "8703.32", description: "Motor cars - Diesel engine 1500-2500cc" },
    { code: "8703.33", description: "Motor cars - Diesel engine > 2500cc" },
    { code: "8703.40", description: "Motor cars - Electric motor" },
    { code: "8703.50", description: "Motor cars - Spark-ignition + electric motor" },
    { code: "8703.60", description: "Motor cars - Compression-ignition + electric motor" },
    { code: "8704.21", description: "Commercial vehicles - Diesel < 5 tonnes" },
    { code: "8704.22", description: "Commercial vehicles - Diesel 5-20 tonnes" },
    { code: "8704.23", description: "Commercial vehicles - Diesel > 20 tonnes" },
    { code: "8704.31", description: "Commercial vehicles - Spark-ignition < 5 tonnes" },
    { code: "8704.90", description: "Commercial vehicles - Other" }
  ],
  part: [
    { code: "8708.10", description: "Bumpers and parts" },
    { code: "8708.21", description: "Safety seat belts" },
    { code: "8708.29", description: "Other body parts" },
    { code: "8708.30", description: "Brakes and servo-brakes" },
    { code: "8708.40", description: "Gear boxes and parts" },
    { code: "8708.50", description: "Drive-axles with differential" },
    { code: "8708.70", description: "Road wheels and parts" },
    { code: "8708.80", description: "Suspension systems and parts" },
    { code: "8708.91", description: "Radiators and parts" },
    { code: "8708.92", description: "Silencers and exhaust pipes" },
    { code: "8708.93", description: "Clutches and parts" },
    { code: "8708.94", description: "Steering wheels and columns" },
    { code: "8708.95", description: "Safety airbags with inflater" },
    { code: "8708.99", description: "Other vehicle parts" },
    { code: "8544.30", description: "Ignition wiring sets and harnesses" }
  ],
  commodity: [
    { code: "8481.80", description: "Taps, cocks, valves and similar appliances" },
    { code: "8483.10", description: "Transmission shafts and cranks" },
    { code: "8501.10", description: "Electric motors < 37.5W" },
    { code: "8507.60", description: "Lithium-ion batteries" },
    { code: "8512.20", description: "Lighting equipment for vehicles" },
    { code: "8536.50", description: "Switches for electrical circuits" },
    { code: "8544.49", description: "Electric conductors for voltage < 1000V" },
    { code: "3926.90", description: "Other articles of plastics" },
    { code: "4016.99", description: "Other articles of vulcanized rubber" },
    { code: "7318.15", description: "Screws and bolts" },
    { code: "7326.90", description: "Other articles of iron or steel" },
    { code: "8302.10", description: "Hinges of base metal" },
    { code: "8302.30", description: "Hat-racks, hooks and brackets" },
    { code: "9401.20", description: "Seats for motor vehicles" },
    { code: "9401.90", description: "Parts of seats" }
  ]
};

export default function HSCodeLookup({ value, onChange, itemType = "commodity", level = "6" }) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const codes = useMemo(() => {
    const allCodes = HS_CODES[itemType] || HS_CODES.commodity;
    return allCodes;
  }, [itemType]);

  const handleSelect = (code, description) => {
    onChange({
      hs_code: code,
      hs_code_level: level,
      hs_code_description: description
    });
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <Label>HS Code * (Min 6 digits)</Label>
          <Input
            value={value}
            onChange={(e) => {
              const code = e.target.value.replace(/[^0-9.]/g, '');
              onChange({
                hs_code: code,
                hs_code_level: code.replace(/\./g, '').length >= 10 ? '10' : code.replace(/\./g, '').length >= 8 ? '8' : '6'
              });
            }}
            placeholder="e.g., 8703.23.10.00"
            minLength={6}
            className={value && value.replace(/\./g, '').length < 6 ? 'border-red-300' : ''}
          />
        </div>
        <div className="pt-6">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <Search className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search HS codes..." />
                <CommandList>
                  <CommandEmpty>No HS codes found.</CommandEmpty>
                  <CommandGroup heading={`Common ${itemType} HS codes`}>
                    {codes.map((item) => (
                      <CommandItem
                        key={item.code}
                        value={`${item.code} ${item.description}`}
                        onSelect={() => handleSelect(item.code, item.description)}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{item.code}</span>
                          <span className="text-xs text-gray-500">{item.description}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <p className="text-xs text-gray-500">CBSA requires min 6 digits, 8-10 recommended</p>
    </div>
  );
}