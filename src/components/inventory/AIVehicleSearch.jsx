import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Search, TrendingDown, TrendingUp, ShieldCheck, AlertTriangle, FileText, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AIVehicleSearch({ onSelectListing }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter search criteria");
      return;
    }

    setLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Search for available vehicles matching: "${searchQuery}"

Generate 5-8 realistic vehicle listings from various sellers/dealers with the following details:
- Make, model, year
- VIN (generate realistic format)
- Mileage/hours
- Asking price
- Seller information (name, location, rating 0-1)
- Condition score (0-1, based on age/mileage)
- Distance from buyer (km, random 10-500)
- Special notes or issues

For EACH listing, calculate AI scores:
1. relevance_score (0-1): How well it matches search criteria
2. price_score (0-1): Price fairness vs market (1 = excellent deal, 0.5 = fair, 0 = overpriced)
3. condition_score (0-1): Vehicle condition assessment
4. seller_trust_score (0-1): Seller reliability
5. overall_score (0-1): Weighted average of above

Make listings diverse with varying quality/prices.`,
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
                  make: { type: "string" },
                  model: { type: "string" },
                  year: { type: "number" },
                  vin: { type: "string" },
                  mileage_hours: { type: "number" },
                  asking_price: { type: "number" },
                  currency: { type: "string" },
                  condition: { type: "string" },
                  location: { type: "string" },
                  distance_km: { type: "number" },
                  seller_name: { type: "string" },
                  seller_rating: { type: "number" },
                  seller_total_sales: { type: "number" },
                  special_notes: { type: "string" },
                  ai_scores: {
                    type: "object",
                    properties: {
                      relevance_score: { type: "number" },
                      price_score: { type: "number" },
                      condition_score: { type: "number" },
                      seller_trust_score: { type: "number" },
                      overall_score: { type: "number" }
                    }
                  },
                  predicted_fair_price: { type: "number" },
                  price_variance_pct: { type: "number" }
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
      toast.success(`Found ${rankedListings.length} vehicles`);
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

  return (
    <Card className="border-purple-200">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI-Powered Vehicle Search & Purchase Order
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="flex gap-3">
          <Input
            placeholder="Search: e.g., 2020 Toyota Camry under $20k"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !loading && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Searching...</>
            ) : (
              <><Search className="w-4 h-4 mr-2" />AI Search</>
            )}
          </Button>
        </div>

        {listings.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Found {listings.length} vehicles (ranked by AI)
              </p>
              <Badge className="bg-purple-100 text-purple-800">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Ranked
              </Badge>
            </div>

            {listings.map((listing, idx) => {
              const overallBadge = getScoreBadge(listing.ai_scores?.overall_score || 0);
              const priceBadge = getScoreBadge(listing.ai_scores?.price_score || 0);
              const conditionBadge = getScoreBadge(listing.ai_scores?.condition_score || 0);
              const sellerBadge = getScoreBadge(listing.ai_scores?.seller_trust_score || 0);

              return (
                <Card key={listing.listing_id} className="hover:shadow-lg transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-lg">
                                {listing.year} {listing.make} {listing.model}
                              </h3>
                              {idx === 0 && (
                                <Badge className="bg-yellow-100 text-yellow-800">
                                  ⭐ Top Match
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 font-mono mt-1">VIN: {listing.vin}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-blue-600">
                              {listing.currency === "USD" ? "$" : "$"}{listing.asking_price.toLocaleString()}
                            </p>
                            {listing.predicted_fair_price && (
                              <div className="text-xs mt-1">
                                <span className="text-gray-500">Fair: ${listing.predicted_fair_price.toLocaleString()}</span>
                                {listing.price_variance_pct !== undefined && (
                                  <span className={listing.price_variance_pct < -10 ? "text-green-600 ml-1" : listing.price_variance_pct > 10 ? "text-red-600 ml-1" : "text-gray-600 ml-1"}>
                                    ({listing.price_variance_pct > 0 ? "+" : ""}{listing.price_variance_pct.toFixed(1)}%)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-sm">
                          <Badge variant="outline">{listing.condition}</Badge>
                          <Badge variant="outline">{listing.mileage_hours.toLocaleString()} km</Badge>
                          <Badge variant="outline">📍 {listing.distance_km} km away</Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div>
                            <p className="text-xs text-gray-500">Overall AI Score</p>
                            <Badge className={overallBadge.color}>
                              {overallBadge.label} ({Math.round((listing.ai_scores?.overall_score || 0) * 100)}%)
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Price Analysis</p>
                            <Badge className={priceBadge.color}>
                              {listing.price_variance_pct < -10 ? "Great Deal" : priceBadge.label}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Condition</p>
                            <Badge className={conditionBadge.color}>
                              {conditionBadge.label}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Seller Trust</p>
                            <Badge className={sellerBadge.color}>
                              {sellerBadge.label}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="text-sm">
                            <p className="text-gray-600">
                              <ShieldCheck className="w-3 h-3 inline mr-1" />
                              Seller: {listing.seller_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Rating: {listing.seller_rating.toFixed(2)}/1.0 • {listing.seller_total_sales} sales
                            </p>
                            <p className="text-xs text-gray-500">📍 {listing.location}</p>
                          </div>
                          <Button
                            onClick={() => onSelectListing(listing)}
                            className="bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Generate PO
                          </Button>
                        </div>

                        {listing.special_notes && (
                          <div className="bg-yellow-50 border border-yellow-200 p-2 rounded text-xs text-yellow-800">
                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                            {listing.special_notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {listings.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Enter your search criteria to find vehicles</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}