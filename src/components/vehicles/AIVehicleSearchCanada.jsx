import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, Search, Loader2, ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "../shared/CompanyContext";
import { useQueryClient } from "@tanstack/react-query";

export default function AIVehicleSearchCanada() {
  const [searchQuery, setSearchQuery] = useState("");
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

      const response = await supabase.integrations.Core.InvokeLLM({
        prompt: `Search for used vehicles for sale from major Canadian automotive marketplaces:
1. AutoTrader.ca
2. Kijiji Autos
3. CarGurus.ca
4. Cars.com Canada
${criteria}

IMPORTANT: Find at least 3 different vehicles for comparison to help identify the best price, features, and condition.

For each marketplace, find relevant vehicle listings and extract:
- Marketplace name
- Vehicle year, make, and model
- Price (in CAD)
- Mileage
- Location (city, province)
- Condition
- Key features
- Seller type (dealer/private)
- Listing URL

Provide comparison and recommendations across marketplaces.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            listings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  marketplace: { type: "string" },
                  vehicle: { type: "string" },
                  year: { type: "number" },
                  make: { type: "string" },
                  model: { type: "string" },
                  price: { type: "number" },
                  mileage: { type: "number" },
                  location: { type: "string" },
                  condition: { type: "string" },
                  features: { type: "string" },
                  seller_type: { type: "string" },
                  listing_url: { type: "string" }
                }
              }
            },
            price_analysis: {
              type: "object",
              properties: {
                lowest_price: { type: "number" },
                highest_price: { type: "number" },
                average_price: { type: "number" }
              }
            },
            recommendation: { type: "string" }
          }
        }
      });

      setResults(response);
    } catch (error) {
      console.error("AI search error:", error);
      toast.error("Failed to search Canadian marketplaces. Please try again.");
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
        vin: `CA-${Date.now()}`,
        mileage: listing.mileage || 0,
        condition: listing.condition?.toLowerCase() || "used",
        status: "in_stock",
        purchase_price: listing.price || 0,
        selling_price: (listing.price || 0) * 1.15,
        location: listing.location || "Canada",
        notes: `Source: ${listing.marketplace}. ${listing.features || ''}`,
        ownership_type: "dealership_owned"
      };

      await supabase.entities.Vehicle.create(vehicleData);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success(`Vehicle added from ${listing.marketplace}`);
    } catch (error) {
      console.error("Error adding vehicle:", error);
      toast.error("Failed to add vehicle to inventory");
    }
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-red-50 to-white border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900">
            <Sparkles className="w-5 h-5 text-red-600" />
            🇨🇦 Canada-Wide Vehicle Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Search AutoTrader, Kijiji Autos, CarGurus, and other Canadian marketplaces
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
              <Input placeholder="Make" value={make} onChange={(e) => setMake(e.target.value)} className="text-sm" />
              <Input placeholder="Model" value={model} onChange={(e) => setModel(e.target.value)} className="text-sm" />
              <Input placeholder="Year Min" value={yearMin} onChange={(e) => setYearMin(e.target.value)} className="text-sm" />
              <Input placeholder="Year Max" value={yearMax} onChange={(e) => setYearMax(e.target.value)} className="text-sm" />
              <Input placeholder="Max Price" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="text-sm" />
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Additional criteria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button 
                onClick={handleSearch} 
                disabled={isSearching} 
                className="bg-red-600 hover:bg-red-700"
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
              <Sparkles className="w-5 h-5 text-red-600" />
              🇨🇦 Canada Vehicle Search Results
            </DialogTitle>
          </DialogHeader>

          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-red-600 mb-4" />
              <p className="text-gray-600">Searching Canadian marketplaces...</p>
            </div>
          ) : results ? (
            <div className="space-y-6">
              {results.recommendation && (
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-red-700">{results.recommendation}</p>
                </div>
              )}

              {results.price_analysis && (
                <Card>
                  <CardHeader><CardTitle className="text-lg">Price Analysis</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div><p className="text-sm text-gray-600">Lowest</p><p className="text-xl font-bold text-green-600">${results.price_analysis.lowest_price?.toLocaleString()}</p></div>
                      <div><p className="text-sm text-gray-600">Highest</p><p className="text-xl font-bold text-red-600">${results.price_analysis.highest_price?.toLocaleString()}</p></div>
                      <div><p className="text-sm text-gray-600">Average</p><p className="text-xl font-bold text-blue-600">${results.price_analysis.average_price?.toLocaleString()}</p></div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Listings Found ({results.listings?.length || 0})</h3>
                {results.listings?.map((listing, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-bold text-lg text-gray-900">{listing.vehicle}</h4>
                            <Badge className="bg-red-100 text-red-800">{listing.marketplace}</Badge>
                          </div>
                          {listing.mileage > 0 && <p className="text-sm text-gray-600">📏 {listing.mileage.toLocaleString()} km</p>}
                          {listing.location && <p className="text-sm text-gray-600">📍 {listing.location}</p>}
                          {listing.condition && <p className="text-sm text-gray-600">Condition: {listing.condition}</p>}
                          {listing.features && <p className="text-sm text-gray-500 mt-2">{listing.features}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-green-600">${listing.price?.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        {listing.listing_url && listing.listing_url !== "N/A" && (
                          <a 
                            href={listing.listing_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
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