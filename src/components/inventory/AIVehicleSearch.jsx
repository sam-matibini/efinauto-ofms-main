import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Search, TrendingDown, TrendingUp, ShieldCheck, AlertTriangle, FileText, Loader2, MapPin, Globe, ChevronDown, ChevronUp, Filter, Truck, Car } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function AIVehicleSearch({ onSelectListing }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState([]);
  const [searchType, setSearchType] = useState("vehicle");
  const [geoScope, setGeoScope] = useState("national");
  const [viewMode, setViewMode] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [yearRange, setYearRange] = useState({ min: "", max: "" });
  const [maxDistance, setMaxDistance] = useState("500");
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter search criteria");
      return;
    }

    setLoading(true);
    try {
      const scopeDescriptions = {
        local: "within 100km of Toronto, Ontario",
        provincial: "across Ontario, Canada",
        national: "across Canada",
        global: "across North America and international markets"
      };

      const itemType = searchType === "vehicle" ? "vehicles (cars, trucks, SUVs, commercial vehicles)" : "industrial equipment (excavators, loaders, forklifts, construction machinery, heavy equipment)";

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Search for ${itemType} matching: "${searchQuery}"

Geographic Scope: ${scopeDescriptions[geoScope]}
${priceRange.min || priceRange.max ? `Price Range: $${priceRange.min || "0"} - $${priceRange.max || "unlimited"}` : ""}
${yearRange.min || yearRange.max ? `Year Range: ${yearRange.min || "any"} - ${yearRange.max || "any"}` : ""}
Max Distance: ${maxDistance} km

Generate 8-12 realistic ${searchType} listings from various sellers/dealers/auctions with:
- Make, model, year
- ${searchType === "vehicle" ? "VIN" : "Serial number"} (realistic format)
- ${searchType === "vehicle" ? "Mileage" : "Operating hours"}
- Asking price (in CAD or USD, specify)
- Seller information (name, type: dealer/private/auction, location matching scope, rating 0-1)
- Condition description and score (0-1)
- Distance from Toronto (km, within max distance)
- Special features, notes, or issues
- Source type: marketplace/dealer/auction/classified

For EACH listing, calculate comprehensive AI scores:
1. relevance_score (0-1): Match to search criteria
2. price_score (0-1): 1=excellent deal, 0.5=fair, 0=overpriced vs market median
3. condition_score (0-1): Overall condition quality
4. seller_trust_score (0-1): Seller reliability & reputation
5. geographic_score (0-1): Proximity benefit
6. overall_score (0-1): Weighted average (40% price, 30% condition, 20% seller, 10% geo)

Also provide:
- Predicted fair/median market price
- Price variance percentage
- Market trend (stable/rising/falling)
- Risk flags if any (salvage, flood damage, title issues, seller warnings)
- Recommended action (buy/negotiate/inspect/avoid)

Make diverse listings with varying quality, prices, and locations.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            listings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  listing_id: { type: "string" },
                  item_type: { type: "string" },
                  category: { type: "string" },
                  make: { type: "string" },
                  model: { type: "string" },
                  year: { type: "number" },
                  vin_serial: { type: "string" },
                  mileage_hours: { type: "number" },
                  asking_price: { type: "number" },
                  currency: { type: "string" },
                  condition: { type: "string" },
                  condition_details: { type: "string" },
                  location_city: { type: "string" },
                  location_state: { type: "string" },
                  location_country: { type: "string" },
                  distance_km: { type: "number" },
                  seller_name: { type: "string" },
                  seller_type: { type: "string" },
                  seller_rating: { type: "number" },
                  seller_total_sales: { type: "number" },
                  seller_contact: { type: "string" },
                  source_type: { type: "string" },
                  special_features: { type: "string" },
                  special_notes: { type: "string" },
                  ai_scores: {
                    type: "object",
                    properties: {
                      relevance_score: { type: "number" },
                      price_score: { type: "number" },
                      condition_score: { type: "number" },
                      seller_trust_score: { type: "number" },
                      geographic_score: { type: "number" },
                      overall_score: { type: "number" }
                    }
                  },
                  predicted_fair_price: { type: "number" },
                  median_market_price: { type: "number" },
                  price_variance_pct: { type: "number" },
                  market_trend: { type: "string" },
                  risk_flags: { type: "array", items: { type: "string" } },
                  recommendation: { type: "string" }
                }
              }
            }
          }
        }
      });

      const rankedListings = response.listings.sort((a, b) => 
        (b.ai_scores?.overall_score || 0) - (a.ai_scores?.overall_score || 0)
      );

      setListings(rankedListings);
      toast.success(`Found ${rankedListings.length} ${searchType === "vehicle" ? "vehicles" : "equipment items"} ranked by AI`);
    } catch (error) {
      toast.error("Search failed");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreBadge = (score) => {
    if (score >= 0.8) return { color: "bg-green-100 text-green-800", label: "Excellent" };
    if (score >= 0.6) return { color: "bg-blue-100 text-blue-800", label: "Good" };
    if (score >= 0.4) return { color: "bg-yellow-100 text-yellow-800", label: "Fair" };
    return { color: "bg-red-100 text-red-800", label: "Poor" };
  };

  const filteredListings = listings.filter(listing => {
    if (viewMode === "best_price") return listing.ai_scores?.price_score >= 0.7;
    if (viewMode === "best_condition") return listing.ai_scores?.condition_score >= 0.8;
    if (viewMode === "closest") return listing.distance_km <= 100;
    if (viewMode === "top_rated") return listing.seller_rating >= 0.8;
    return true;
  });

  return (
    <Card className="border-purple-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI-Powered Multi-Market Search & Auto-PO System
          </CardTitle>
          <Badge className="bg-purple-100 text-purple-800">
            <Globe className="w-3 h-3 mr-1" />
            {geoScope.charAt(0).toUpperCase() + geoScope.slice(1)} Scope
          </Badge>
        </div>
        <p className="text-xs text-gray-600 mt-1">
          Search vehicles & equipment with AI ranking, price prediction, and automated purchase orders
        </p>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Search Controls */}
        <div className="space-y-4">
          <div className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <Input
                placeholder={`Search ${searchType}: e.g., 2020 Toyota Camry, Caterpillar excavator`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !loading && handleSearch()}
                className="w-full"
              />
            </div>
            <Select value={searchType} onValueChange={setSearchType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vehicle">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Vehicles
                  </div>
                </SelectItem>
                <SelectItem value="equipment">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Industrial Equipment
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={geoScope} onValueChange={setGeoScope}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Local (100km)
                  </div>
                </SelectItem>
                <SelectItem value="provincial">Provincial</SelectItem>
                <SelectItem value="national">National</SelectItem>
                <SelectItem value="global">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Global
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Advanced Filters
              {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
            <Button onClick={handleSearch} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Searching {geoScope} markets...</>
              ) : (
                <><Search className="w-4 h-4 mr-2" />AI Search</>
              )}
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <Card className="bg-gray-50">
              <CardContent className="pt-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs">Price Range</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                        className="text-sm"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Year Range</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={yearRange.min}
                        onChange={(e) => setYearRange({ ...yearRange, min: e.target.value })}
                        className="text-sm"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={yearRange.max}
                        onChange={(e) => setYearRange({ ...yearRange, max: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Max Distance (km)</Label>
                    <Input
                      type="number"
                      value={maxDistance}
                      onChange={(e) => setMaxDistance(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {listings.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-gray-600">
                Found {listings.length} {searchType === "vehicle" ? "vehicles" : "equipment items"} • Showing {filteredListings.length}
              </p>
              <Tabs value={viewMode} onValueChange={setViewMode} className="w-auto">
                <TabsList className="grid grid-cols-5 w-auto">
                  <TabsTrigger value="all" className="text-xs">All Results</TabsTrigger>
                  <TabsTrigger value="best_price" className="text-xs">Best Deals</TabsTrigger>
                  <TabsTrigger value="best_condition" className="text-xs">Best Condition</TabsTrigger>
                  <TabsTrigger value="closest" className="text-xs">Closest</TabsTrigger>
                  <TabsTrigger value="top_rated" className="text-xs">Top Sellers</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {filteredListings.map((listing, idx) => {
              const overallBadge = getScoreBadge(listing.ai_scores?.overall_score || 0);
              const priceBadge = getScoreBadge(listing.ai_scores?.price_score || 0);
              const conditionBadge = getScoreBadge(listing.ai_scores?.condition_score || 0);
              const sellerBadge = getScoreBadge(listing.ai_scores?.seller_trust_score || 0);
              const geoBadge = getScoreBadge(listing.ai_scores?.geographic_score || 0);
              const isExpanded = expandedId === listing.listing_id;

              return (
                <Card key={listing.listing_id} className="hover:shadow-lg transition-all border-l-4 border-l-purple-400">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-lg">
                              {listing.year} {listing.make} {listing.model}
                            </h3>
                            {idx === 0 && (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                ⭐ Top AI Match
                              </Badge>
                            )}
                            <Badge className="bg-gray-100 text-gray-800 text-xs">
                              {listing.category}
                            </Badge>
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              {listing.source_type}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 font-mono mt-1">
                            {searchType === "vehicle" ? "VIN" : "Serial"}: {listing.vin_serial}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            📍 {listing.location_city}, {listing.location_state}, {listing.location_country} • {listing.distance_km} km away
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">
                            {listing.currency} ${listing.asking_price.toLocaleString()}
                          </p>
                          {listing.median_market_price && (
                            <div className="text-xs mt-1 space-y-0.5">
                              <div>
                                <span className="text-gray-500">Market: ${listing.median_market_price.toLocaleString()}</span>
                              </div>
                              {listing.price_variance_pct !== undefined && (
                                <div className={listing.price_variance_pct < -10 ? "text-green-600 font-semibold" : listing.price_variance_pct > 10 ? "text-red-600 font-semibold" : "text-gray-600"}>
                                  {listing.price_variance_pct < -10 && "💰 "}
                                  {listing.price_variance_pct > 0 ? "+" : ""}{listing.price_variance_pct.toFixed(1)}% vs market
                                </div>
                              )}
                              {listing.market_trend && (
                                <Badge variant="outline" className="text-xs">
                                  {listing.market_trend === "falling" ? "📉" : listing.market_trend === "rising" ? "📈" : "➡️"} {listing.market_trend}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick Info */}
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline" className="capitalize">{listing.condition}</Badge>
                        <Badge variant="outline">
                          {searchType === "vehicle" ? "📏" : "⏱️"} {listing.mileage_hours.toLocaleString()} {searchType === "vehicle" ? "km" : "hrs"}
                        </Badge>
                        <Badge variant="outline">{listing.seller_type}</Badge>
                      </div>

                      {/* AI Scores Grid */}
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 bg-gray-50 p-3 rounded-lg">
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">Overall</p>
                          <Badge className={overallBadge.color}>
                            {Math.round((listing.ai_scores?.overall_score || 0) * 100)}%
                          </Badge>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">Price</p>
                          <Badge className={priceBadge.color}>
                            {Math.round((listing.ai_scores?.price_score || 0) * 100)}%
                          </Badge>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">Condition</p>
                          <Badge className={conditionBadge.color}>
                            {Math.round((listing.ai_scores?.condition_score || 0) * 100)}%
                          </Badge>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">Seller</p>
                          <Badge className={sellerBadge.color}>
                            {Math.round((listing.ai_scores?.seller_trust_score || 0) * 100)}%
                          </Badge>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">Location</p>
                          <Badge className={geoBadge.color}>
                            {Math.round((listing.ai_scores?.geographic_score || 0) * 100)}%
                          </Badge>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">Relevance</p>
                          <Badge className={getScoreBadge(listing.ai_scores?.relevance_score || 0).color}>
                            {Math.round((listing.ai_scores?.relevance_score || 0) * 100)}%
                          </Badge>
                        </div>
                      </div>

                      {/* AI Recommendation */}
                      {listing.recommendation && (
                        <div className={`p-3 rounded-lg border ${
                          listing.recommendation.toLowerCase().includes("buy") 
                            ? "bg-green-50 border-green-200" 
                            : listing.recommendation.toLowerCase().includes("negotiate")
                            ? "bg-blue-50 border-blue-200"
                            : "bg-orange-50 border-orange-200"
                        }`}>
                          <p className="text-xs font-semibold mb-1">
                            {listing.recommendation.toLowerCase().includes("buy") && "✅ "}
                            {listing.recommendation.toLowerCase().includes("negotiate") && "💬 "}
                            {listing.recommendation.toLowerCase().includes("inspect") && "🔍 "}
                            {listing.recommendation.toLowerCase().includes("avoid") && "⚠️ "}
                            AI Recommendation
                          </p>
                          <p className="text-sm">{listing.recommendation}</p>
                        </div>
                      )}

                      {/* Risk Flags */}
                      {listing.risk_flags?.length > 0 && (
                        <div className="bg-red-50 border border-red-200 p-2 rounded">
                          <p className="text-xs font-semibold text-red-900 mb-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Risk Flags
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {listing.risk_flags.map((flag, i) => (
                              <Badge key={i} className="bg-red-100 text-red-800 text-xs">
                                ⚠️ {flag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expandable Details */}
                      <Collapsible open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : listing.listing_id)}>
                        <CollapsibleTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full">
                            {isExpanded ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
                            {isExpanded ? "Hide" : "Show"} Full Details & AI Analysis
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-3 space-y-3">
                          {/* Detailed Info */}
                          <div className="grid md:grid-cols-2 gap-3 text-sm">
                            <div className="bg-blue-50 p-3 rounded">
                              <p className="font-semibold text-blue-900 mb-2">Vehicle Details</p>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Condition:</span>
                                  <span className="font-medium">{listing.condition}</span>
                                </div>
                                {listing.condition_details && (
                                  <p className="text-gray-600 mt-1">{listing.condition_details}</p>
                                )}
                                {listing.special_features && (
                                  <div className="mt-2">
                                    <span className="text-gray-600">Features:</span>
                                    <p className="text-gray-700 mt-1">{listing.special_features}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="bg-green-50 p-3 rounded">
                              <p className="font-semibold text-green-900 mb-2">Seller Information</p>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Name:</span>
                                  <span className="font-medium">{listing.seller_name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Type:</span>
                                  <span className="font-medium capitalize">{listing.seller_type}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Rating:</span>
                                  <span className="font-medium">{listing.seller_rating.toFixed(2)}/1.0</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Total Sales:</span>
                                  <span className="font-medium">{listing.seller_total_sales}</span>
                                </div>
                                {listing.seller_contact && (
                                  <div className="mt-2">
                                    <span className="text-gray-600">Contact:</span>
                                    <p className="text-gray-700">{listing.seller_contact}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Detailed AI Scores */}
                          <div className="bg-purple-50 p-3 rounded border border-purple-200">
                            <p className="font-semibold text-purple-900 mb-2 text-sm flex items-center gap-1">
                              <Sparkles className="w-4 h-4" />
                              AI Score Breakdown
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                              <div>
                                <p className="text-gray-600">Relevance Match</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-purple-600 h-2 rounded-full" 
                                      style={{ width: `${(listing.ai_scores?.relevance_score || 0) * 100}%` }}
                                    />
                                  </div>
                                  <span className="font-medium">{Math.round((listing.ai_scores?.relevance_score || 0) * 100)}%</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-gray-600">Price Fairness</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-green-600 h-2 rounded-full" 
                                      style={{ width: `${(listing.ai_scores?.price_score || 0) * 100}%` }}
                                    />
                                  </div>
                                  <span className="font-medium">{Math.round((listing.ai_scores?.price_score || 0) * 100)}%</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-gray-600">Condition Quality</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-blue-600 h-2 rounded-full" 
                                      style={{ width: `${(listing.ai_scores?.condition_score || 0) * 100}%` }}
                                    />
                                  </div>
                                  <span className="font-medium">{Math.round((listing.ai_scores?.condition_score || 0) * 100)}%</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-gray-600">Seller Trust</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-indigo-600 h-2 rounded-full" 
                                      style={{ width: `${(listing.ai_scores?.seller_trust_score || 0) * 100}%` }}
                                    />
                                  </div>
                                  <span className="font-medium">{Math.round((listing.ai_scores?.seller_trust_score || 0) * 100)}%</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-gray-600">Location Benefit</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-orange-600 h-2 rounded-full" 
                                      style={{ width: `${(listing.ai_scores?.geographic_score || 0) * 100}%` }}
                                    />
                                  </div>
                                  <span className="font-medium">{Math.round((listing.ai_scores?.geographic_score || 0) * 100)}%</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-gray-600">Overall AI Score</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full ${
                                        (listing.ai_scores?.overall_score || 0) >= 0.8 ? "bg-green-600" :
                                        (listing.ai_scores?.overall_score || 0) >= 0.6 ? "bg-blue-600" :
                                        (listing.ai_scores?.overall_score || 0) >= 0.4 ? "bg-yellow-600" : "bg-red-600"
                                      }`}
                                      style={{ width: `${(listing.ai_scores?.overall_score || 0) * 100}%` }}
                                    />
                                  </div>
                                  <span className="font-bold">{Math.round((listing.ai_scores?.overall_score || 0) * 100)}%</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {listing.special_features && (
                            <div className="bg-blue-50 border border-blue-200 p-2 rounded text-xs">
                              <p className="font-semibold text-blue-900">Special Features:</p>
                              <p className="text-blue-800 mt-1">{listing.special_features}</p>
                            </div>
                          )}

                          {listing.special_notes && (
                            <div className="bg-yellow-50 border border-yellow-200 p-2 rounded text-xs">
                              <p className="font-semibold text-yellow-900">Notes:</p>
                              <p className="text-yellow-800 mt-1">{listing.special_notes}</p>
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between pt-2 border-t gap-2">
                        <div className="text-xs text-gray-600 flex items-center gap-2">
                          <ShieldCheck className="w-3 h-3" />
                          <span>{listing.seller_name}</span>
                          <span className="text-gray-400">•</span>
                          <span>⭐ {listing.seller_rating.toFixed(2)}</span>
                          <span className="text-gray-400">•</span>
                          <span>{listing.seller_total_sales} sales</span>
                        </div>
                        <Button
                          onClick={() => onSelectListing(listing)}
                          className={`${
                            listing.recommendation?.toLowerCase().includes("avoid")
                              ? "bg-gray-500 hover:bg-gray-600"
                              : listing.recommendation?.toLowerCase().includes("buy")
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-blue-600 hover:bg-blue-700"
                          }`}
                          size="sm"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Generate Auto-PO
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {listings.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-700 mb-2">
              AI-Powered Multi-Market Search
            </h3>
            <p className="text-sm mb-4">
              Search for {searchType === "vehicle" ? "vehicles" : "industrial equipment"} across {geoScope} markets
            </p>
            <div className="max-w-md mx-auto text-left bg-gray-50 p-4 rounded-lg">
              <p className="text-xs font-semibold text-gray-700 mb-2">Search Features:</p>
              <ul className="text-xs space-y-1 text-gray-600">
                <li>✓ AI ranking & price prediction</li>
                <li>✓ Condition scoring & assessment</li>
                <li>✓ Seller trust analysis</li>
                <li>✓ Market trend insights</li>
                <li>✓ Automated PO generation</li>
                <li>✓ Risk & compliance checks</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}