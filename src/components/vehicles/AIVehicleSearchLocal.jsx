import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, Search, Loader2, ExternalLink, MapPin, Phone, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "../shared/CompanyContext";
import { useQueryClient } from "@tanstack/react-query";

export default function AIVehicleSearchLocal() {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [yearMin, setYearMin] = useState("");
  const [yearMax, setYearMax] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const handleSearch = async () => {
    if (!location.trim()) {
      toast.error("Please enter your location");
      return;
    }

    setIsSearching(true);
    setDialogOpen(true);

    try {
      const searchCriteria = [];
      if (make) searchCriteria.push(`Make: ${make}`);
      if (model) searchCriteria.push(`Model: ${model}`);
      if (yearMin) searchCriteria.push(`Year from: ${yearMin}`);
      if (yearMax) searchCriteria.push(`Year to: ${yearMax}`);
      if (maxPrice) searchCriteria.push(`Max price: $${maxPrice}`);
      if (searchQuery) searchCriteria.push(`Additional: ${searchQuery}`);
      
      const criteria = searchCriteria.length > 0 
        ? `\n\nSearch Criteria:\n${searchCriteria.join('\n')}`
        : '';

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Search for used vehicles for sale from LOCAL dealers, private sellers, and used car lots near "${location}".
${criteria}

IMPORTANT: Find at least 3 different vehicles for comparison to help identify the best price, features, and condition.

Find local dealerships, independent sellers, and used car lots within 50km of the specified location.

For each listing found, extract:
- Seller name/dealership
- Vehicle year, make, and model
- Price (if available, otherwise indicate "Call for price")
- Mileage
- Condition (excellent, good, fair, etc.)
- Key features or highlights
- VIN (if available)
- Full address or location
- Contact phone number
- Seller type (dealer, private, lot)
- Distance from location (approximate)
- Listing URL or directions

Prioritize listings that match the search criteria. Include both dealerships and private sellers.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            search_location: { type: "string" },
            listings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  seller_name: { type: "string" },
                  vehicle: { type: "string" },
                  year: { type: "number" },
                  make: { type: "string" },
                  model: { type: "string" },
                  price: { type: "number" },
                  price_note: { type: "string" },
                  mileage: { type: "number" },
                  condition: { type: "string" },
                  features: { type: "string" },
                  vin: { type: "string" },
                  address: { type: "string" },
                  phone: { type: "string" },
                  seller_type: { type: "string" },
                  distance_km: { type: "number" },
                  listing_url: { type: "string" }
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
      toast.error("Failed to search for local vehicles. Please try again.");
      setDialogOpen(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToInventory = async (listing) => {
    if (!selectedCompanyId) {
      toast.error("Please select a company first");
      return;
    }

    try {
      const vehicleData = {
        company_id: selectedCompanyId,
        make: listing.make || "Unknown",
        model: listing.model || "Unknown",
        year: listing.year || new Date().getFullYear(),
        vin: listing.vin || `LOCAL-${Date.now()}`,
        mileage: listing.mileage || 0,
        condition: "used",
        status: "in_stock",
        purchase_price: listing.price || 0,
        selling_price: (listing.price || 0) * 1.15,
        location: `Source: ${listing.seller_name} - ${listing.address}`,
        notes: `Found via local search. Seller: ${listing.seller_name}, Phone: ${listing.phone}. ${listing.features || ''}`,
        ownership_type: "dealership_owned"
      };

      await base44.entities.Vehicle.create(vehicleData);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success(`Vehicle added to inventory from ${listing.seller_name}`);
    } catch (error) {
      console.error("Error adding vehicle:", error);
      toast.error("Failed to add vehicle to inventory");
    }
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Sparkles className="w-5 h-5 text-purple-600" />
            📍 Local Vehicle Search (Near Me)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Find vehicles at local dealers, private sellers, and used car lots near you
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              <Input 
                placeholder="City, Province/State *" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                className="text-sm"
              />
              <Input placeholder="Make" value={make} onChange={(e) => setMake(e.target.value)} className="text-sm" />
              <Input placeholder="Model" value={model} onChange={(e) => setModel(e.target.value)} className="text-sm" />
              <Input placeholder="Max Price" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="text-sm" />
            </div>
            <div className="flex gap-2">
              <Input placeholder="Year Min" value={yearMin} onChange={(e) => setYearMin(e.target.value)} className="text-sm flex-1" />
              <Input placeholder="Year Max" value={yearMax} onChange={(e) => setYearMax(e.target.value)} className="text-sm flex-1" />
              <Input
                placeholder="Additional criteria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button 
                onClick={handleSearch} 
                disabled={isSearching || !location.trim()} 
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
              📍 Local Vehicle Search Results
            </DialogTitle>
          </DialogHeader>

          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
              <p className="text-gray-600">Searching local dealers and sellers near you...</p>
            </div>
          ) : results ? (
            <div className="space-y-6">
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-purple-700 mb-2">📍 Near: {results.search_location}</p>
                <p className="text-sm text-purple-700">{results.recommendation}</p>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Listings Found ({results.listings?.length || 0})</h3>
                {results.listings?.map((listing, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-bold text-lg text-gray-900">{listing.vehicle}</h4>
                            <Badge className="bg-purple-100 text-purple-800">{listing.seller_type}</Badge>
                          </div>
                          <p className="text-gray-700 font-semibold mb-2">{listing.seller_name}</p>
                          {listing.mileage > 0 && <p className="text-sm text-gray-600">📏 {listing.mileage.toLocaleString()} km</p>}
                          {listing.condition && <p className="text-sm text-gray-600">Condition: {listing.condition}</p>}
                          {listing.features && <p className="text-sm text-gray-500 mt-2">{listing.features}</p>}
                          {listing.vin && listing.vin !== "N/A" && <p className="text-xs text-gray-400 mt-1">VIN: {listing.vin}</p>}
                          
                          <div className="mt-3 space-y-1 text-sm text-gray-600">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-600" />
                              <span>{listing.address}</span>
                            </div>
                            {listing.phone && listing.phone !== "N/A" && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-purple-600" />
                                <span>{listing.phone}</span>
                              </div>
                            )}
                            {listing.distance_km && (
                              <p className="text-xs text-purple-600 font-semibold">~{listing.distance_km} km away</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {listing.price > 0 ? (
                            <>
                              <p className="text-3xl font-bold text-green-600">${listing.price?.toLocaleString()}</p>
                              {listing.price_note && <p className="text-xs text-gray-500">{listing.price_note}</p>}
                            </>
                          ) : (
                            <p className="text-lg font-semibold text-gray-500">Call for price</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        {listing.listing_url && listing.listing_url !== "N/A" && (
                          <a 
                            href={listing.listing_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800"
                          >
                            View Listing <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleAddToInventory(listing)} className="ml-auto">
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