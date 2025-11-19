import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, Search, Loader2, ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "../shared/CompanyContext";
import { useQueryClient } from "@tanstack/react-query";

export default function AIVehicleSearchMarketplace() {
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
        prompt: `Search for used vehicles for sale on these online marketplaces near "${location}":
1. Facebook Marketplace
2. Kijiji
3. Craigslist
${criteria}

IMPORTANT: Find at least 3 different vehicles for comparison to help identify the best price, features, and condition.

For each marketplace, find relevant vehicle listings and extract:
- Platform name
- Vehicle year, make, and model
- Price (if available)
- Mileage
- Location
- Condition description
- Seller contact info
- Key features or notes from listing
- Listing URL

Focus on listings within 100km of the specified location.`,
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
                  platform: { type: "string" },
                  vehicle: { type: "string" },
                  year: { type: "number" },
                  make: { type: "string" },
                  model: { type: "string" },
                  price: { type: "number" },
                  mileage: { type: "number" },
                  location: { type: "string" },
                  condition: { type: "string" },
                  features: { type: "string" },
                  seller_contact: { type: "string" },
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
      toast.error("Failed to search online marketplaces. Please try again.");
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
        vin: `MKT-${Date.now()}`,
        mileage: listing.mileage || 0,
        condition: "used",
        status: "in_stock",
        purchase_price: listing.price || 0,
        selling_price: (listing.price || 0) * 1.15,
        location: listing.location || "",
        notes: `Source: ${listing.platform}. Contact: ${listing.seller_contact}. ${listing.features || ''}`,
        ownership_type: "dealership_owned"
      };

      await base44.entities.Vehicle.create(vehicleData);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success(`Vehicle added from ${listing.platform}`);
    } catch (error) {
      console.error("Error adding vehicle:", error);
      toast.error("Failed to add vehicle to inventory");
    }
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <Sparkles className="w-5 h-5 text-orange-600" />
            🛒 Online Marketplace Vehicle Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Search Facebook Marketplace, Kijiji, and Craigslist for vehicles
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
                className="bg-orange-600 hover:bg-orange-700"
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
              <Sparkles className="w-5 h-5 text-orange-600" />
              🛒 Online Marketplace Search Results
            </DialogTitle>
          </DialogHeader>

          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-orange-600 mb-4" />
              <p className="text-gray-600">Searching online marketplaces...</p>
            </div>
          ) : results ? (
            <div className="space-y-6">
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-sm text-orange-700 mb-2">📍 Near: {results.search_location}</p>
                <p className="text-sm text-orange-700">{results.recommendation}</p>
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
                            <Badge className="bg-orange-100 text-orange-800">{listing.platform}</Badge>
                          </div>
                          {listing.mileage > 0 && <p className="text-sm text-gray-600">📏 {listing.mileage.toLocaleString()} km</p>}
                          {listing.location && <p className="text-sm text-gray-600">📍 {listing.location}</p>}
                          {listing.condition && <p className="text-sm text-gray-600">Condition: {listing.condition}</p>}
                          {listing.features && <p className="text-sm text-gray-500 mt-2">{listing.features}</p>}
                          {listing.seller_contact && listing.seller_contact !== "N/A" && (
                            <p className="text-sm text-gray-600 mt-2">Contact: {listing.seller_contact}</p>
                          )}
                        </div>
                        <div className="text-right">
                          {listing.price > 0 ? (
                            <p className="text-3xl font-bold text-green-600">${listing.price?.toLocaleString()}</p>
                          ) : (
                            <p className="text-lg font-semibold text-gray-500">Contact seller</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        {listing.listing_url && listing.listing_url !== "N/A" && (
                          <a 
                            href={listing.listing_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1 text-sm text-orange-600 hover:text-orange-800"
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