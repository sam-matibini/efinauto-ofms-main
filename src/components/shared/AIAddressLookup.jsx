import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Search, Loader2, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AIAddressLookup({ onAddressSelected }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter an address to search");
      return;
    }

    setSearching(true);
    setResults(null);

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a geocoding assistant. Look up this address and provide structured location data: "${searchQuery}"
        
Return the address components in a structured format. If the address is ambiguous, provide the most likely match.
If the address belongs to a business, include the business name and contact information if available.
If you cannot find the address, indicate that clearly.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            found: { type: "boolean", description: "Whether the address was found" },
            formatted_address: { type: "string", description: "Full formatted address" },
            street_address: { type: "string", description: "Street address line" },
            city: { type: "string" },
            province: { type: "string", description: "Province, state, or region" },
            postal_code: { type: "string", description: "Postal code or ZIP code" },
            country: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            business_name: { type: "string", description: "Business or company name if applicable" },
            contact_phone: { type: "string", description: "Phone number if available" },
            contact_person: { type: "string", description: "Contact person name if available" }
          }
        }
      });

      setResults(response);
    } catch (error) {
      console.error("Address lookup error:", error);
      toast.error("Failed to lookup address");
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = () => {
    if (results && results.found) {
      onAddressSelected({
        address: results.street_address || results.formatted_address,
        city: results.city || "",
        province: results.province || "",
        postal_code: results.postal_code || "",
        country: results.country || "",
        latitude: results.latitude,
        longitude: results.longitude,
        business_name: results.business_name || "",
        contact_phone: results.contact_phone || "",
        contact_person: results.contact_person || ""
      });
      setResults(null);
      setSearchQuery("");
      toast.success("Address applied!");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search address (e.g., 123 Main St, Toronto)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={searching || !searchQuery.trim()}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {searching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              AI Lookup
            </>
          )}
        </Button>
      </div>

      {results && (
        <Card className={results.found ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <CardContent className="p-4">
            {results.found ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-green-900">{results.formatted_address}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded">
                        {results.confidence} confidence
                      </span>
                      {results.latitude && results.longitude && (
                        <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded">
                          📍 {results.latitude.toFixed(4)}, {results.longitude.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  {results.business_name && <p className="col-span-2"><strong>Business:</strong> {results.business_name}</p>}
                  {results.contact_person && <p className="col-span-2"><strong>Contact:</strong> {results.contact_person}</p>}
                  {results.contact_phone && <p className="col-span-2"><strong>Phone:</strong> {results.contact_phone}</p>}
                  {results.city && <p><strong>City:</strong> {results.city}</p>}
                  {results.province && <p><strong>Province:</strong> {results.province}</p>}
                  {results.postal_code && <p><strong>Postal Code:</strong> {results.postal_code}</p>}
                  {results.country && <p><strong>Country:</strong> {results.country}</p>}
                </div>
                <Button onClick={handleSelect} className="w-full bg-green-600 hover:bg-green-700">
                  <MapPin className="w-4 h-4 mr-2" />
                  Use This Address
                </Button>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-red-800">Address not found. Please try a different search.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}