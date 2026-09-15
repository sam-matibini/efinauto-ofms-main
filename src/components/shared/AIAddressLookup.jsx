import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { lookupAddresses } from "@/lib/addressLookup";

export default function AIAddressLookup({ onAddressSelected, initialQuery = "" }) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setSearchQuery(initialQuery || "");
    setResults([]);
    setNotFound(false);
  }, [initialQuery]);

  const handleSearch = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!searchQuery.trim()) {
      toast.error("Please enter an address to search");
      return;
    }

    setSearching(true);
    setResults([]);
    setNotFound(false);

    try {
      const matches = await lookupAddresses(searchQuery);
      if (!matches.length) {
        setNotFound(true);
        toast.error("Address not found. Try street, city, and province.");
        return;
      }
      setResults(matches);
    } catch (error) {
      console.error("Address lookup error:", error);
      toast.error(error.message || "Failed to lookup address");
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (match) => {
    if (!match) return;
    onAddressSelected?.({
      address: match.street_address || match.formatted_address,
      city: match.city || "",
      province: match.province || "",
      postal_code: match.postal_code || "",
      country: match.country || "",
      latitude: match.latitude,
      longitude: match.longitude,
      business_name: match.business_name || "",
      contact_phone: match.contact_phone || "",
      contact_person: match.contact_person || "",
    });
    setResults([]);
    setNotFound(false);
    toast.success("Address applied");
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
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                handleSearch(e);
              }
            }}
            className="pl-10"
          />
        </div>
        <Button
          type="button"
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

      {notFound && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center">
            <p className="text-red-800 text-sm">Address not found. Please try a different search.</p>
          </CardContent>
        </Card>
      )}

      {results.map((match, index) => (
        <Card key={`${match.formatted_address}-${index}`} className="border-green-200 bg-green-50">
          <CardContent className="p-4 space-y-3">
            <div>
              <p className="font-semibold text-green-900">{match.formatted_address}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded">
                  {match.confidence} confidence
                </span>
                {match.latitude && match.longitude && (
                  <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded">
                    {Number(match.latitude).toFixed(4)}, {Number(match.longitude).toFixed(4)}
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              {match.business_name && <p className="col-span-2"><strong>Business:</strong> {match.business_name}</p>}
              {match.city && <p><strong>City:</strong> {match.city}</p>}
              {match.province && <p><strong>Province:</strong> {match.province}</p>}
              {match.postal_code && <p><strong>Postal Code:</strong> {match.postal_code}</p>}
              {match.country && <p><strong>Country:</strong> {match.country}</p>}
            </div>
            <Button type="button" onClick={() => handleSelect(match)} className="w-full bg-green-600 hover:bg-green-700">
              <MapPin className="w-4 h-4 mr-2" />
              Use This Address
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
