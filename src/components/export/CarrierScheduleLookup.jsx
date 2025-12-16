import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Ship, Calendar, Clock, TrendingUp } from "lucide-react";
import { getCarrierAPIService, isCarrierAPIEnabled } from "./CarrierAPIRegistry";
import PortSelector from "@/components/shared/PortSelector";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CarrierScheduleLookup({ carrierCode, onSelectSchedule }) {
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [searchParams, setSearchParams] = useState({
    pol: "",
    pod: "",
    departure_date: new Date().toISOString().split('T')[0]
  });

  const apiEnabled = isCarrierAPIEnabled(carrierCode);

  const handleSearch = async () => {
    if (!searchParams.pol || !searchParams.pod) {
      toast.error("Please select both ports");
      return;
    }

    setLoading(true);
    try {
      const apiService = getCarrierAPIService(carrierCode);
      const result = await apiService.getVesselSchedule(
        searchParams.pol,
        searchParams.pod,
        searchParams.departure_date
      );

      if (result.success) {
        setSchedules(result.schedules);
        toast.success(`Found ${result.schedules.length} vessel schedules`);
      } else {
        toast.error(result.error || "Failed to fetch schedules");
        setSchedules([]);
      }
    } catch (error) {
      toast.error("Failed to fetch vessel schedules");
      console.error(error);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  if (!apiEnabled) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          <Ship className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>API schedule lookup not available for this carrier</p>
          <p className="text-sm">Use manual booking entry</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ship className="w-5 h-5" />
          Vessel Schedule Lookup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Form */}
        <div className="grid grid-cols-3 gap-4">
          <PortSelector
            label="Port of Loading"
            value={searchParams.pol}
            onChange={(v) => setSearchParams(prev => ({ ...prev, pol: v }))}
          />
          <PortSelector
            label="Port of Discharge"
            value={searchParams.pod}
            onChange={(v) => setSearchParams(prev => ({ ...prev, pod: v }))}
          />
          <div>
            <Label>Departure After</Label>
            <Input
              type="date"
              value={searchParams.departure_date}
              onChange={(e) => setSearchParams(prev => ({ ...prev, departure_date: e.target.value }))}
            />
          </div>
        </div>

        <Button onClick={handleSearch} disabled={loading} className="w-full">
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Search Schedules
        </Button>

        {/* Results */}
        {schedules.length > 0 && (
          <div className="space-y-3 mt-6">
            <h4 className="font-semibold text-sm">Available Sailings</h4>
            {schedules.map((schedule, idx) => (
              <div
                key={idx}
                className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onSelectSchedule(schedule)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h5 className="font-semibold flex items-center gap-2">
                      <Ship className="w-4 h-4 text-blue-600" />
                      {schedule.vessel_name}
                    </h5>
                    <p className="text-sm text-gray-600">
                      Voyage: {schedule.voyage_number} | Service: {schedule.service}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-green-600">
                    {schedule.available_space} TEU
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">ETD</p>
                      <p className="font-medium">{format(new Date(schedule.departure_date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">ETA</p>
                      <p className="font-medium">{format(new Date(schedule.arrival_date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Transit</p>
                      <p className="font-medium">{schedule.transit_time} days</p>
                    </div>
                  </div>
                </div>

                {schedule.routing && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500 mb-1">Route</p>
                    <p className="text-sm font-mono">{schedule.routing}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}