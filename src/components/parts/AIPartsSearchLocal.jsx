import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, Search, Loader2, ExternalLink, DollarSign, MapPin, Phone, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "../shared/CompanyContext";
import { useQueryClient } from "@tanstack/react-query";

export default function AIPartsSearchLocal() {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [vin, setVin] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const handleSearch = async () => {
    console.log("Local search button clicked");
    
    if (!searchQuery.trim()) {
      toast.error("Please enter a part name or description");
      return;
    }

    if (!location.trim()) {
      toast.error("Please enter your location");
      return;
    }

    setIsSearching(true);
    setDialogOpen(true);

    try {
      const vehicleInfo = [];
      if (vin) vehicleInfo.push(`VIN: ${vin}`);
      if (year) vehicleInfo.push(`Year: ${year}`);
      if (make) vehicleInfo.push(`Make: ${make}`);
      if (model) vehicleInfo.push(`Model: ${model}`);
      
      const vehicleContext = vehicleInfo.length > 0 
        ? `\n\nVehicle Information:\n${vehicleInfo.join('\n')}`
        : '';

      const response = await supabase.integrations.Core.InvokeLLM({
        prompt: `Search for automotive parts matching "${searchQuery}" from LOCAL auto parts stores near "${location}".
      ${vehicleContext}

      IMPORTANT: Find at least 3 different stores/sources for comparison to help identify the best price, availability, and quality.

      Find local independent auto parts stores, junkyards, salvage yards, and local retailers within 50km of the specified location.

      For each local store found, extract:
- Store name
- Part name/description (if available)
- Price (if available, otherwise indicate "Call for price")
- Part number (if available)
- Availability status (call to confirm, in stock, etc.)
- Full address
- Phone number
- Distance from location (approximate)
- Store hours (if available)
- Google Maps link or directions

Prioritize stores that are most likely to have the part in stock. Include both chain stores with local branches and independent shops. Provide recommendations on which stores to contact first.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            part_searched: { type: "string" },
            search_location: { type: "string" },
            stores: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  store_name: { type: "string" },
                  part_name: { type: "string" },
                  price: { type: "number" },
                  price_note: { type: "string" },
                  part_number: { type: "string" },
                  availability: { type: "string" },
                  address: { type: "string" },
                  phone: { type: "string" },
                  distance_km: { type: "number" },
                  store_hours: { type: "string" },
                  maps_url: { type: "string" }
                }
              }
            },
            recommendation: { type: "string" }
          }
        }
      });

      setResults(response);
    } catch (error) {
      console.error("AI search error:", error);
      toast.error("Failed to search for local parts. Please try again.");
      setDialogOpen(false);
    } finally {
      setIsSearching(false);
    }
  };

  const getAvailabilityColor = (availability) => {
    const avail = availability?.toLowerCase() || "";
    if (avail.includes("in stock") || avail.includes("available")) return "bg-green-100 text-green-800";
    if (avail.includes("call") || avail.includes("confirm")) return "bg-yellow-100 text-yellow-800";
    if (avail.includes("out") || avail.includes("not available")) return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const handleAddToParts = async (store) => {
    if (!selectedCompanyId) {
      toast.error("Please select a company first");
      return;
    }

    try {
      const partData = {
        company_id: selectedCompanyId,
        name: store.part_name || searchQuery,
        part_number: store.part_number || `LOCAL-${Date.now()}`,
        description: `Local source from ${store.store_name} - ${store.address}`,
        cost_price: store.price || 0,
        selling_price: (store.price || 0) * 1.3,
        quantity: 0,
        reorder_level: 5,
        supplier: `${store.store_name} - ${store.phone}`,
        category: "other"
      };

      await supabase.entities.Part.create(partData);
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      toast.success(`Part added to inventory from ${store.store_name}`);
    } catch (error) {
      console.error("Error adding part:", error);
      toast.error("Failed to add part to inventory");
    }
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Sparkles className="w-5 h-5 text-purple-600" />
            📍 Local Near Me Parts Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Find parts at local stores, junkyards, and salvage yards near your location
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
              <Input 
                placeholder="City, Province/State" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                className="text-sm md:col-span-2 lg:col-span-1"
              />
              <Input placeholder="VIN (optional)" value={vin} onChange={(e) => setVin(e.target.value)} className="text-sm" />
              <Input placeholder="Year" value={year} onChange={(e) => setYear(e.target.value)} className="text-sm" />
              <Input placeholder="Make" value={make} onChange={(e) => setMake(e.target.value)} className="text-sm" />
              <Input placeholder="Model" value={model} onChange={(e) => setModel(e.target.value)} className="text-sm" />
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Enter part name or number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button 
                onClick={handleSearch} 
                disabled={isSearching || !searchQuery.trim() || !location.trim()} 
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-2" />Search</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              📍 Local Parts Search Results
            </DialogTitle>
          </DialogHeader>

          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
              <p className="text-gray-600">Searching local stores near you...</p>
            </div>
          ) : results ? (
            <div className="space-y-6">
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 mb-1">Search: {results.part_searched}</h3>
                <p className="text-sm text-purple-700 mb-2">📍 Near: {results.search_location}</p>
                <p className="text-sm text-purple-700">{results.recommendation}</p>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Local Stores Found ({results.stores?.length || 0})</h3>
                {results.stores?.map((store, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-bold text-lg text-gray-900">{store.store_name}</h4>
                            <Badge className={getAvailabilityColor(store.availability)}>{store.availability}</Badge>
                          </div>
                          {store.part_name && <p className="text-gray-700 mb-2">{store.part_name}</p>}
                          {store.part_number && store.part_number !== "N/A" && (
                            <p className="text-sm text-gray-500">Part #: {store.part_number}</p>
                          )}
                          
                          <div className="mt-3 space-y-1 text-sm text-gray-600">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-600" />
                              <span>{store.address}</span>
                            </div>
                            {store.phone && store.phone !== "N/A" && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-purple-600" />
                                <span>{store.phone}</span>
                              </div>
                            )}
                            {store.distance_km && (
                              <p className="text-xs text-purple-600 font-semibold">
                                ~{store.distance_km} km away
                              </p>
                            )}
                            {store.store_hours && store.store_hours !== "N/A" && (
                              <p className="text-xs text-gray-500">Hours: {store.store_hours}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {store.price > 0 ? (
                            <>
                              <p className="text-3xl font-bold text-green-600">${store.price?.toFixed(2)}</p>
                              {store.price_note && <p className="text-xs text-gray-500">{store.price_note}</p>}
                            </>
                          ) : (
                            <p className="text-lg font-semibold text-gray-500">Call for price</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        {store.maps_url && store.maps_url !== "N/A" && (
                          <a 
                            href={store.maps_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800"
                          >
                            View on Map <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleAddToParts(store)} className="ml-auto">
                          <Plus className="w-4 h-4 mr-1" />Add to Inventory
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button onClick={() => setDialogOpen(false)} variant="outline">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}