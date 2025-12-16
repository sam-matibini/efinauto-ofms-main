import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

export default function ExportReportFilters({ filters, onChange, exportOrders }) {
  const uniqueCountries = [...new Set(exportOrders.map(o => o.destination_country).filter(Boolean))];
  const uniqueStatuses = [...new Set(exportOrders.map(o => o.export_status).filter(Boolean))];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <h4 className="font-semibold">Filters</h4>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <Label>Start Date</Label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
            />
          </div>
          
          <div>
            <Label>End Date</Label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
            />
          </div>
          
          <div>
            <Label>Destination</Label>
            <Select value={filters.destinationCountry} onValueChange={(v) => onChange({ ...filters, destinationCountry: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {uniqueCountries.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Item Type</Label>
            <Select value={filters.itemType} onValueChange={(v) => onChange({ ...filters, itemType: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="vehicle">Vehicles</SelectItem>
                <SelectItem value="part">Parts</SelectItem>
                <SelectItem value="commodity">Commodities</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Export Status</Label>
            <Select value={filters.exportStatus} onValueChange={(v) => onChange({ ...filters, exportStatus: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {uniqueStatuses.map(s => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>HS Code</Label>
            <Input
              value={filters.hsCode}
              onChange={(e) => onChange({ ...filters, hsCode: e.target.value })}
              placeholder="e.g., 8703"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}