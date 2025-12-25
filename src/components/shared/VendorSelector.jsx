import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "./CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function VendorSelector({ value, onSelect, onCreateNew }) {
  const [open, setOpen] = useState(false);
  const { selectedCompanyId } = useCompany();

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors', selectedCompanyId],
    queryFn: () => base44.entities.Vendor.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
  });

  const selectedVendor = vendors.find(v => v.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedVendor ? selectedVendor.vendor_name : "Select vendor..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search vendors..." />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 mb-3">No vendor found</p>
                {onCreateNew && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      onCreateNew();
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Vendor
                  </Button>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {vendors.map((vendor) => (
                <CommandItem
                  key={vendor.id}
                  value={`${vendor.vendor_name} ${vendor.contact_email || ''}`}
                  onSelect={() => {
                    onSelect(vendor);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === vendor.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{vendor.vendor_name}</p>
                    {vendor.contact_email && (
                      <p className="text-xs text-gray-500">{vendor.contact_email}</p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        {onCreateNew && vendors.length > 0 && (
          <div className="border-t p-2">
            <Button
              size="sm"
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                setOpen(false);
                onCreateNew();
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Vendor
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}