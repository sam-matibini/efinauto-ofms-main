import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CustomerSelector({ value, onSelect, onCreateNew }) {
  const [open, setOpen] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date'),
    initialData: [],
  });

  const selectedCustomer = customers.find(c => c.id === value);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedCustomer ? (
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {selectedCustomer.full_name}
              </span>
            ) : (
              "Select customer..."
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search customer..." />
            <CommandEmpty>
              <div className="p-4 text-center">
                <p className="text-sm text-gray-500 mb-3">No customer found.</p>
                {onCreateNew && (
                  <Button 
                    onClick={() => {
                      setOpen(false);
                      onCreateNew();
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Create New Customer
                  </Button>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {customers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.full_name}
                  onSelect={() => {
                    onSelect(customer);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === customer.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{customer.full_name}</div>
                    <div className="text-xs text-gray-500">
                      {customer.phone} {customer.email && `• ${customer.email}`}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
      {onCreateNew && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCreateNew}
          className="w-full"
        >
          + Create New Customer
        </Button>
      )}
    </div>
  );
}