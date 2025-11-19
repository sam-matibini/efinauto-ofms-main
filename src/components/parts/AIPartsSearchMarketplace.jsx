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

export default function AIPartsSearchMarketplace() {
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
    console.log("Marketplace search button clicked");
    
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

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Search for automotive parts matching "${searchQuery}" on Facebook Marketplace, Kijiji, and Amazon for location "${location}".
${vehicleContext}

Search these platforms:
1. Facebook Marketplace (used/new parts)
2. Kijiji (classifieds)
3. Amazon (new OEM/aftermarket parts)

For each listing found, extract:
- Platform (Facebook Marketplace, Kijiji, or Amazon)
- Part title/name
- Price
- Condition (new, used, refurbished)
- Seller location/distance
- Listing URL
- Seller rating (if available)
- Shipping availability
- Part number (if mentioned)
- Photos available (yes/no)

Organize results by platform, showing best matches first. Include at least 3-5 listings per platform if available.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            part_searched: { type: "string" },
            search_location: { type: "string" },
            facebook_marketplace: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  price: { type: "number" },
                  condition: { type: "string" },
                  location: { type: "string" },
                  distance: { type: "string" },
                  url: { type: "string" },
                  seller_rating: { type: "string" },
                  part_number: { type: "string" },
                  has_photos: { type: "boolean" }
                }
              }
            },
            kijiji: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  price: { type: "number" },
                  condition: { type: "string" },
                  location: { type: "string" },
                  distance: { type: "string" },
                  url: { type: "string" },
                  part_number: { type: "string" },
                  has_photos: { type: "boolean" }
                }
              }
            },
            amazon: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  price: { type: "number" },
                  condition: { type: "string" },
                  shipping: { type: "string" },
                  url: { type: "string" },
                  rating: { type: "string" },
                  part_number: { type: "string" },
                  prime_eligible: { type: "boolean" }
                }
              }
            },
            summary: { type: "string" }
          }
        }
      });

      setResults(response);
    } catch (error) {
      console.error("AI search error:", error);
      toast.error("Failed to search marketplaces. Please try again.");
      setDialogOpen(false);
    } finally {
      setIsSearching(false);
    }
  };

  const getConditionColor = (condition) => {
    const cond = condition?.toLowerCase() || "";
    if (cond.includes("new")) return "bg-green-100 text-green-800";
    if (cond.includes("used") || cond.includes("refurbished")) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  const getPlatformColor = (platform) => {
    if (platform === "Facebook Marketplace") return "bg-blue-100 text-blue-800";
    if (platform === "Kijiji") return "bg-red-100 text-red-800";
    if (platform === "Amazon") return "bg-orange-100 text-orange-800";
    return "bg-gray-100 text-gray-800";
  };

  const handleAddToParts = async (item, platform) => {
    if (!selectedCompanyId) {
      toast.error("Please select a company first");
      return;
    }

    try {
      const partData = {
        company_id: selectedCompanyId,
        name: item.title || searchQuery,
        part_number: item.part_number || `MKT-${Date.now()}`,
        description: `Found on ${platform} - ${item.location || "Online"}`,
        cost_price: item.price || 0,
        selling_price: (item.price || 0) * 1.3,
        quantity: 0,
        reorder_level: 5,
        supplier: platform,
        category: "other"
      };

      await base44.entities.Part.create(partData);
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      toast.success(`Part added to inventory from ${platform}`);
    } catch (error) {
      console.error("Error adding part:", error);
      toast.error("Failed to add part to inventory");
    }
  };

  const renderListings = (listings, platform) => {
    if (!listings || listings.length === 0) {
      return (
        <p className="text-sm text-gray-500 text-center py-4">No listings found on {platform}</p>
      );
    }

    return (
      <div className="space-y-3">
        {listings.map((item, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-2">
                    <Badge className={getPlatformColor(platform)}>{platform}</Badge>
                    <Badge className={getConditionColor(item.condition)}>{item.condition}</Badge>
                    {platform === "Amazon" && item.prime_eligible && (
                      <Badge className="bg-cyan-100 text-cyan-800">Prime</Badge>
                    )}
                  </div>
                  <h5 className="font-semibold text-gray-900 mb-1 line-clamp-2">{item.title}</h5>
                  {item.part_number && item.part_number !== "N/A" && (
                    <p className="text-xs text-gray-500 mb-1">Part #: {item.part_number}</p>
                  )}
                  <div className="text-xs text-gray-600 space-y-0.5">
                    {item.location && <p>📍 {item.location}</p>}
                    {item.distance && <p>🚗 {item.distance}</p>}
                    {item.rating && <p>⭐ {item.rating}</p>}
                    {item.seller_rating && <p>👤 Seller: {item.seller_rating}</p>}
                    {item.shipping && <p>📦 {item.shipping}</p>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {item.price > 0 ? (
                    <p className="text-2xl font-bold text-green-600">${item.price.toFixed(2)}</p>
                  ) : (
                    <p className="text-sm font-semibold text-gray-500">Price not listed</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {item.url && item.url !== "N/A" && (
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    View Listing <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <Button size="sm" variant="outline" onClick={() => handleAddToParts(item, platform)} className="ml-auto">
                  <Plus className="w-4 h-4 mr-1" />Add to Inventory
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <Sparkles className="w-5 h-5 text-orange-600" />
            🛒 Marketplace Search (Facebook, Kijiji, Amazon)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Search Facebook Marketplace, Kijiji classifieds, and Amazon for parts
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
              <Button onClick={handleSearch} disabled={isSearching} className="bg-orange-600 hover:bg-orange-700">
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-2" />Search</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-600" />
              🛒 Marketplace Search Results
            </DialogTitle>
          </DialogHeader>

          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-orange-600 mb-4" />
              <p className="text-gray-600">Searching marketplaces...</p>
            </div>
          ) : results ? (
            <div className="space-y-6">
              <div className="bg-orange-50 rounded-lg p-4">
                <h3 className="font-semibold text-orange-900 mb-1">Search: {results.part_searched}</h3>
                <p className="text-sm text-orange-700 mb-2">📍 Location: {results.search_location}</p>
                <p className="text-sm text-orange-700">{results.summary}</p>
              </div>

              {/* Facebook Marketplace */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800">Facebook Marketplace</Badge>
                  <span className="text-sm text-gray-500">({results.facebook_marketplace?.length || 0} listings)</span>
                </h3>
                {renderListings(results.facebook_marketplace, "Facebook Marketplace")}
              </div>

              {/* Kijiji */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Badge className="bg-red-100 text-red-800">Kijiji</Badge>
                  <span className="text-sm text-gray-500">({results.kijiji?.length || 0} listings)</span>
                </h3>
                {renderListings(results.kijiji, "Kijiji")}
              </div>

              {/* Amazon */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Badge className="bg-orange-100 text-orange-800">Amazon</Badge>
                  <span className="text-sm text-gray-500">({results.amazon?.length || 0} listings)</span>
                </h3>
                {renderListings(results.amazon, "Amazon")}
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