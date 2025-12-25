import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Sparkles, Search, TrendingDown, TrendingUp, ShieldCheck, AlertTriangle, FileText, Loader2, MapPin, Globe, ChevronDown, ChevronUp, Filter, Truck, Car, Printer, Download, Mail, MessageCircle, Share2, Heart } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareScope, setShareScope] = useState("single");
  const [shareListing, setShareListing] = useState(null);
  const [emailAddress, setEmailAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const queryClient = useQueryClient();

  const { data: favorites = [] } = useQuery({
    queryKey: ['favoriteListings'],
    queryFn: () => base44.entities.FavoriteVehicleListing.list(),
  });

  const addFavoriteMutation = useMutation({
    mutationFn: (listing) => base44.entities.FavoriteVehicleListing.create({
      listing_data: listing,
      search_query: searchQuery,
      search_type: searchType
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteListings'] });
      toast.success("Added to favorites");
    },
    onError: () => toast.error("Failed to add favorite")
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: (favoriteId) => base44.entities.FavoriteVehicleListing.delete(favoriteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoriteListings'] });
      toast.success("Removed from favorites");
    },
    onError: () => toast.error("Failed to remove favorite")
  });

  const isFavorite = (listing) => {
    return favorites.some(fav => fav.listing_data?.listing_id === listing.listing_id);
  };

  const getFavoriteId = (listing) => {
    return favorites.find(fav => fav.listing_data?.listing_id === listing.listing_id)?.id;
  };

  const toggleFavorite = (listing) => {
    if (isFavorite(listing)) {
      const favoriteId = getFavoriteId(listing);
      if (favoriteId) removeFavoriteMutation.mutate(favoriteId);
    } else {
      addFavoriteMutation.mutate(listing);
    }
  };

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

  const getShareListings = (scope, listing = null) => {
    if (scope === "single" && listing) {
      return [listing];
    }
    if (scope === "top_5") {
      return filteredListings.slice(0, 5);
    }
    if (scope === "all") {
      return filteredListings;
    }
    return [];
  };

  const generateShareContent = (singleListing = null) => {
    if (singleListing) {
      let content = `🚗 ${searchType === "vehicle" ? "VEHICLE" : "EQUIPMENT"} LISTING\n\n`;
      content += `${singleListing.year || 'N/A'} ${singleListing.make || 'N/A'} ${singleListing.model || 'N/A'}\n`;
      content += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      content += `💰 Price: ${singleListing.currency || 'USD'} $${(singleListing.asking_price || 0).toLocaleString()}\n`;
      if (singleListing.median_market_price) {
        content += `📊 Market Price: $${(singleListing.median_market_price || 0).toLocaleString()}\n`;
        content += `📈 Variance: ${(singleListing.price_variance_pct || 0) > 0 ? "+" : ""}${(singleListing.price_variance_pct || 0).toFixed(1)}%\n`;
      }
      content += `\n${searchType === "vehicle" ? "VIN" : "Serial"}: ${singleListing.vin_serial || 'N/A'}\n`;
      content += `${searchType === "vehicle" ? "Mileage" : "Hours"}: ${(singleListing.mileage_hours || 0).toLocaleString()}\n`;
      content += `Condition: ${singleListing.condition || 'N/A'}\n`;
      content += `\n📍 Location: ${singleListing.location_city || 'N/A'}, ${singleListing.location_state || 'N/A'}, ${singleListing.location_country || 'N/A'}\n`;
      content += `Distance: ${(singleListing.distance_km || 0).toLocaleString()} km\n`;
      content += `\n👤 Seller: ${singleListing.seller_name || 'N/A'}\n`;
      content += `Type: ${singleListing.seller_type || 'N/A'}\n`;
      content += `Rating: ⭐ ${(singleListing.seller_rating || 0).toFixed(2)}/1.0\n`;
      if (singleListing.seller_contact) {
        content += `Contact: ${singleListing.seller_contact}\n`;
      }
      content += `\n🤖 AI SCORES:\n`;
      content += `Overall: ${Math.round((singleListing.ai_scores?.overall_score || 0) * 100)}%\n`;
      content += `Relevance: ${Math.round((singleListing.ai_scores?.relevance_score || 0) * 100)}%\n`;
      content += `Price: ${Math.round((singleListing.ai_scores?.price_score || 0) * 100)}%\n`;
      content += `Condition: ${Math.round((singleListing.ai_scores?.condition_score || 0) * 100)}%\n`;
      content += `Seller: ${Math.round((singleListing.ai_scores?.seller_trust_score || 0) * 100)}%\n`;
      if (singleListing.recommendation) {
        content += `\n💡 AI Recommendation:\n${singleListing.recommendation}\n`;
      }
      if (singleListing.risk_flags?.length > 0) {
        content += `\n⚠️ Risk Flags:\n${singleListing.risk_flags.join(", ")}\n`;
      }
      content += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
      content += `Powered by eFinAuto OFMS AI Search Engine`;
      return content;
    }

    let content = `🔍 ${searchType === "vehicle" ? "VEHICLE" : "EQUIPMENT"} SEARCH RESULTS\n`;
    content += `Search: ${searchQuery}\n`;
    content += `Scope: ${geoScope.toUpperCase()}\n`;
    content += `Results: ${filteredListings.length}\n\n`;
    content += "━━━━━━━━━━━━━━━━━━━━━━\n\n";

    filteredListings.forEach((listing, idx) => {
      content += `${idx + 1}. ${listing.year || ''} ${listing.make || ''} ${listing.model || ''}\n`;
      content += `   ${listing.currency || 'USD'} $${(listing.asking_price || 0).toLocaleString()}\n`;
      content += `   📍 ${listing.location_city || ''}, ${listing.location_state || ''} (${listing.distance_km || 0} km)\n`;
      content += `   ${searchType === "vehicle" ? "VIN" : "Serial"}: ${listing.vin_serial || 'N/A'}\n`;
      content += `   ${searchType === "vehicle" ? "Mileage" : "Hours"}: ${(listing.mileage_hours || 0).toLocaleString()}\n`;
      content += `   Condition: ${listing.condition || 'N/A'} (${Math.round((listing.ai_scores?.condition_score || 0) * 100)}%)\n`;
      content += `   AI Score: ${Math.round((listing.ai_scores?.overall_score || 0) * 100)}%\n`;
      content += `   Seller: ${listing.seller_name || 'N/A'} (⭐ ${(listing.seller_rating || 0).toFixed(2)})\n`;
      if (listing.median_market_price) {
        content += `   Market Price: $${(listing.median_market_price || 0).toLocaleString()}\n`;
        content += `   Variance: ${(listing.price_variance_pct || 0) > 0 ? "+" : ""}${(listing.price_variance_pct || 0).toFixed(1)}%\n`;
      }
      if (listing.recommendation) {
        content += `   💡 ${listing.recommendation}\n`;
      }
      content += `\n`;
    });

    content += "━━━━━━━━━━━━━━━━━━━━━━\n";
    content += "Powered by eFinAuto OFMS AI Search Engine\n";
    return content;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Search Results - ${searchQuery}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #1e293b; margin-bottom: 10px; }
            .meta { color: #666; margin-bottom: 30px; }
            .listing { border: 1px solid #ddd; padding: 20px; margin-bottom: 20px; border-radius: 8px; }
            .listing h2 { margin: 0 0 10px 0; color: #1e293b; }
            .price { font-size: 24px; font-weight: bold; color: #2563eb; }
            .detail { margin: 5px 0; font-size: 14px; }
            .label { color: #666; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 5px; }
            .score-excellent { background: #d1fae5; color: #065f46; }
            .score-good { background: #dbeafe; color: #1e40af; }
            .score-fair { background: #fef3c7; color: #92400e; }
            .recommendation { background: #dbeafe; padding: 10px; border-radius: 4px; margin-top: 10px; }
            .risk { background: #fee2e2; padding: 10px; border-radius: 4px; margin-top: 10px; color: #991b1b; }
          </style>
        </head>
        <body>
          <h1>${searchType === "vehicle" ? "Vehicle" : "Equipment"} Search Results</h1>
          <div class="meta">
            <strong>Search:</strong> ${searchQuery}<br>
            <strong>Scope:</strong> ${geoScope.toUpperCase()}<br>
            <strong>Results:</strong> ${filteredListings.length}<br>
            <strong>Generated:</strong> ${new Date().toLocaleString()}
          </div>
    `;

    filteredListings.forEach((listing, idx) => {
      const overallBadge = getScoreBadge(listing.ai_scores?.overall_score || 0);
      html += `
        <div class="listing">
          <h2>${idx + 1}. ${listing.year || ''} ${listing.make || ''} ${listing.model || ''}</h2>
          <div class="price">${listing.currency || 'USD'} $${(listing.asking_price || 0).toLocaleString()}</div>
          ${listing.median_market_price ? `<div class="detail"><span class="label">Market Price:</span> $${(listing.median_market_price || 0).toLocaleString()} (${(listing.price_variance_pct || 0) > 0 ? "+" : ""}${(listing.price_variance_pct || 0).toFixed(1)}% variance)</div>` : ""}
          <div class="detail"><span class="label">${searchType === "vehicle" ? "VIN" : "Serial"}:</span> ${listing.vin_serial || 'N/A'}</div>
          <div class="detail"><span class="label">${searchType === "vehicle" ? "Mileage" : "Hours"}:</span> ${(listing.mileage_hours || 0).toLocaleString()}</div>
          <div class="detail"><span class="label">Condition:</span> ${listing.condition || 'N/A'}</div>
          <div class="detail"><span class="label">Location:</span> ${listing.location_city || ''}, ${listing.location_state || ''}, ${listing.location_country || ''} (${listing.distance_km || 0} km)</div>
          <div class="detail"><span class="label">Seller:</span> ${listing.seller_name || 'N/A'} (${listing.seller_type || 'N/A'}) - Rating: ${(listing.seller_rating || 0).toFixed(2)}/1.0</div>
          <div class="detail"><span class="label">AI Overall Score:</span> <span class="badge score-${overallBadge.label.toLowerCase()}">${Math.round((listing.ai_scores?.overall_score || 0) * 100)}% - ${overallBadge.label}</span></div>
          ${listing.recommendation ? `<div class="recommendation"><strong>AI Recommendation:</strong> ${listing.recommendation}</div>` : ""}
          ${listing.risk_flags?.length > 0 ? `<div class="risk"><strong>⚠️ Risk Flags:</strong> ${listing.risk_flags.join(", ")}</div>` : ""}
        </div>
      `;
    });

    html += `
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
            Powered by eFinAuto OFMS AI Search Engine
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
    toast.success("Opening print dialog...");
  };

  const handleDownloadPDF = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const element = document.getElementById('search-results-content');
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }
      
      pdf.save(`search-results-${Date.now()}.pdf`);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      toast.error("Failed to generate PDF");
      console.error(error);
    }
  };

  const formatEmailHTML = (listings) => {
    let html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #1e293b; color: white; }
            .price { font-weight: bold; color: #2563eb; }
            .score { color: #059669; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <h2>eFinAuto OFMS - AI Search Results</h2>
          <p><strong>Search:</strong> ${searchQuery}</p>
          <p><strong>Results:</strong> ${listings.length} ${searchType === "vehicle" ? "vehicles" : "equipment items"}</p>
          <table>
            <tr>
              <th>Item</th>
              <th>Price</th>
              <th>AI Fair Price</th>
              <th>Condition</th>
              <th>AI Score</th>
              <th>Seller</th>
              <th>Location</th>
            </tr>`;

    listings.forEach(listing => {
      html += `
        <tr>
          <td><strong>${listing.year || 'N/A'} ${listing.make || 'N/A'} ${listing.model || 'N/A'}</strong><br>
              <small>${listing.vin_serial || 'N/A'}</small></td>
          <td class="price">$${(listing.asking_price || 0).toLocaleString()}</td>
          <td>$${(listing.median_market_price || 0).toLocaleString()}<br>
              <small>${(listing.price_variance_pct || 0) > 0 ? "+" : ""}${(listing.price_variance_pct || 0).toFixed(1)}%</small></td>
          <td>${listing.condition || 'N/A'}<br>
              <small>${Math.round((listing.ai_scores?.condition_score || 0) * 100)}%</small></td>
          <td class="score">${Math.round((listing.ai_scores?.overall_score || 0) * 100)}%</td>
          <td>${listing.seller_name || 'N/A'}<br>
              <small>⭐ ${(listing.seller_rating || 0).toFixed(2)}</small></td>
          <td>${listing.location_city || 'N/A'}, ${listing.location_state || 'N/A'}<br>
              <small>${(listing.distance_km || 0).toLocaleString()} km</small></td>
        </tr>`;
    });

    html += `
          </table>
          <div class="footer">
            <p>Powered by eFinAuto OFMS AI Search Engine</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>`;

    return html;
  };

  const handleShare = async (channel) => {
    const listings = getShareListings(shareScope, shareListing);

    if (listings.length === 0) {
      toast.error("No results to share");
      return;
    }

    // Safeguard for large datasets
    if (listings.length > 20 && channel !== "email") {
      toast.error(`${listings.length} results is too many for ${channel}. Please use email or select fewer results.`);
      return;
    }

    try {
      if (channel === "email") {
        if (!emailAddress) {
          toast.error("Please enter an email address");
          return;
        }

        const subject = shareScope === "single" 
          ? `${listings[0].year || ''} ${listings[0].make || ''} ${listings[0].model || ''} - Listing`
          : `${searchType === "vehicle" ? "Vehicle" : "Equipment"} Search Results (${listings.length} items)`;

        await base44.integrations.Core.SendEmail({
          to: emailAddress,
          subject,
          body: formatEmailHTML(listings)
        });

        toast.success(`${listings.length} result(s) sent to ${emailAddress}`);
        setShareDialogOpen(false);
        setEmailAddress("");
      } else if (channel === "whatsapp") {
        const content = listings.length === 1 
          ? generateShareContent(listings[0])
          : generateShareContent(null);
        const message = encodeURIComponent(content);
        window.open(`https://wa.me/${phoneNumber ? phoneNumber : ''}?text=${message}`, '_blank');
        toast.success(`Sharing ${listings.length} result(s) via WhatsApp`);
        setShareDialogOpen(false);
      } else if (channel === "google_chat") {
        const content = listings.length === 1 
          ? generateShareContent(listings[0])
          : generateShareContent(null);
        const message = encodeURIComponent(content);
        window.open(`https://mail.google.com/chat/?text=${message}`, '_blank');
        toast.success(`Sharing ${listings.length} result(s) via Google Chat`);
        setShareDialogOpen(false);
      } else if (channel === "sms") {
        if (!phoneNumber) {
          toast.error("Please enter a phone number");
          return;
        }
        const content = listings.length === 1 
          ? generateShareContent(listings[0]).substring(0, 500)
          : generateShareContent(null).substring(0, 500);
        const message = encodeURIComponent(content + "...");
        window.open(`sms:${phoneNumber}?body=${message}`, '_blank');
        toast.success(`Sharing ${listings.length} result(s) via SMS`);
        setShareDialogOpen(false);
      }
    } catch (error) {
      toast.error("Failed to share");
      console.error(error);
    }
  };

  const openShareDialog = (scope, listing = null) => {
    setShareScope(scope);
    setShareListing(listing);
    setShareDialogOpen(true);
  };

  const handlePrintListing = (listing) => {
    const printWindow = window.open('', '_blank');
    const overallBadge = getScoreBadge(listing.ai_scores?.overall_score || 0);
    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${listing.year} ${listing.make} ${listing.model}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { color: #1e293b; margin-bottom: 20px; }
            .price { font-size: 32px; font-weight: bold; color: #2563eb; margin: 20px 0; }
            .section { margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px; }
            .section-title { font-weight: bold; margin-bottom: 10px; color: #374151; }
            .detail { margin: 8px 0; font-size: 14px; }
            .label { color: #666; display: inline-block; width: 150px; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
            .score-excellent { background: #d1fae5; color: #065f46; }
            .score-good { background: #dbeafe; color: #1e40af; }
            .score-fair { background: #fef3c7; color: #92400e; }
            .score-poor { background: #fee2e2; color: #991b1b; }
            .recommendation { background: #dbeafe; padding: 15px; border-radius: 4px; margin-top: 15px; }
            .risk { background: #fee2e2; padding: 15px; border-radius: 4px; margin-top: 15px; color: #991b1b; }
            .scores-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
          </style>
        </head>
        <body>
          <h1>${listing.year || ''} ${listing.make || ''} ${listing.model || ''}</h1>
          <div class="price">${listing.currency || 'USD'} $${(listing.asking_price || 0).toLocaleString()}</div>
          
          <div class="section">
            <div class="section-title">Vehicle Details</div>
            <div class="detail"><span class="label">${searchType === "vehicle" ? "VIN" : "Serial"}:</span> ${listing.vin_serial || 'N/A'}</div>
            <div class="detail"><span class="label">${searchType === "vehicle" ? "Mileage" : "Hours"}:</span> ${(listing.mileage_hours || 0).toLocaleString()}</div>
            <div class="detail"><span class="label">Condition:</span> ${listing.condition || 'N/A'}</div>
            ${listing.median_market_price ? `<div class="detail"><span class="label">Market Price:</span> $${(listing.median_market_price || 0).toLocaleString()} (${(listing.price_variance_pct || 0) > 0 ? "+" : ""}${(listing.price_variance_pct || 0).toFixed(1)}% variance)</div>` : ""}
          </div>

          <div class="section">
            <div class="section-title">Location</div>
            <div class="detail"><span class="label">City:</span> ${listing.location_city || ''}, ${listing.location_state || ''}</div>
            <div class="detail"><span class="label">Country:</span> ${listing.location_country || 'N/A'}</div>
            <div class="detail"><span class="label">Distance:</span> ${listing.distance_km || 0} km</div>
          </div>

          <div class="section">
            <div class="section-title">Seller Information</div>
            <div class="detail"><span class="label">Name:</span> ${listing.seller_name || 'N/A'}</div>
            <div class="detail"><span class="label">Type:</span> ${listing.seller_type || 'N/A'}</div>
            <div class="detail"><span class="label">Rating:</span> ${(listing.seller_rating || 0).toFixed(2)}/1.0</div>
          </div>

          <div class="section">
            <div class="section-title">AI Scores</div>
            <div class="scores-grid">
              <div class="detail"><span class="label">Overall:</span> <span class="badge score-${overallBadge.label.toLowerCase()}">${Math.round((listing.ai_scores?.overall_score || 0) * 100)}% - ${overallBadge.label}</span></div>
              <div class="detail"><span class="label">Relevance:</span> ${Math.round((listing.ai_scores?.relevance_score || 0) * 100)}%</div>
              <div class="detail"><span class="label">Price:</span> ${Math.round((listing.ai_scores?.price_score || 0) * 100)}%</div>
              <div class="detail"><span class="label">Condition:</span> ${Math.round((listing.ai_scores?.condition_score || 0) * 100)}%</div>
              <div class="detail"><span class="label">Seller Trust:</span> ${Math.round((listing.ai_scores?.seller_trust_score || 0) * 100)}%</div>
              <div class="detail"><span class="label">Geography:</span> ${Math.round((listing.ai_scores?.geography_score || 0) * 100)}%</div>
            </div>
          </div>

          ${listing.recommendation ? `<div class="recommendation"><strong>AI Recommendation:</strong><br>${listing.recommendation}</div>` : ""}
          ${listing.risk_flags?.length > 0 ? `<div class="risk"><strong>⚠️ Risk Flags:</strong><br>${listing.risk_flags.join(", ")}</div>` : ""}

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
            Generated: ${new Date().toLocaleString()}<br>
            Powered by eFinAuto OFMS AI Search Engine
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
    toast.success("Opening print dialog...");
  };

  const filteredListings = viewMode === "favorites" 
    ? favorites.map(fav => fav.listing_data)
    : listings.filter(listing => {
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
          <div className="space-y-4" id="search-results-content">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-gray-600">
                Found {listings.length} {searchType === "vehicle" ? "vehicles" : "equipment items"} • Showing {filteredListings.length}
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => openShareDialog("top_5")}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Best 5
                </Button>
                <Button variant="outline" size="sm" onClick={() => openShareDialog("all")}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share All
                </Button>
              </div>
            </div>
            
            <Tabs value={viewMode} onValueChange={setViewMode} className="w-auto">
              <TabsList className="grid grid-cols-6 w-auto">
                <TabsTrigger value="all" className="text-xs">All Results</TabsTrigger>
                <TabsTrigger value="best_price" className="text-xs">Best Deals</TabsTrigger>
                <TabsTrigger value="best_condition" className="text-xs">Best Condition</TabsTrigger>
                <TabsTrigger value="closest" className="text-xs">Closest</TabsTrigger>
                <TabsTrigger value="top_rated" className="text-xs">Top Sellers</TabsTrigger>
                <TabsTrigger value="favorites" className="text-xs">
                  <Heart className="w-3 h-3 mr-1 inline" />
                  Saved ({favorites.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

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
                            {listing.year || ''} {listing.make || ''} {listing.model || ''}
                          </h3>
                            {idx === 0 && (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                ⭐ Top AI Match
                              </Badge>
                            )}
                            <Badge className="bg-gray-100 text-gray-800 text-xs">
                              {listing.category || 'N/A'}
                            </Badge>
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              {listing.source_type || 'N/A'}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 font-mono mt-1">
                            {searchType === "vehicle" ? "VIN" : "Serial"}: {listing.vin_serial || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            📍 {listing.location_city || ''}, {listing.location_state || ''}, {listing.location_country || ''} • {listing.distance_km || 0} km away
                          </p>
                          <div className="mt-2 pt-2 border-t">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-gray-700">👤 Seller: {listing.seller_name || 'N/A'}</p>
                                {listing.seller_contact && (
                                  <p className="text-xs text-gray-600 mt-0.5">📞 {listing.seller_contact}</p>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const address = `${listing.location_city || ''}, ${listing.location_state || ''}, ${listing.location_country || ''}`;
                                  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
                                }}
                              >
                                <MapPin className="w-3 h-3 mr-1" />
                                Map
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">
                            {listing.currency || 'USD'} ${(listing.asking_price || 0).toLocaleString()}
                          </p>
                          {listing.median_market_price && (
                            <div className="text-xs mt-1 space-y-0.5">
                              <div>
                                <span className="text-gray-500">Market: ${(listing.median_market_price || 0).toLocaleString()}</span>
                              </div>
                              {listing.price_variance_pct !== undefined && (
                                <div className={(listing.price_variance_pct || 0) < -10 ? "text-green-600 font-semibold" : (listing.price_variance_pct || 0) > 10 ? "text-red-600 font-semibold" : "text-gray-600"}>
                                  {(listing.price_variance_pct || 0) < -10 && "💰 "}
                                  {(listing.price_variance_pct || 0) > 0 ? "+" : ""}{(listing.price_variance_pct || 0).toFixed(1)}% vs market
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
                        <Badge variant="outline" className="capitalize">{listing.condition || 'N/A'}</Badge>
                        <Badge variant="outline">
                          {searchType === "vehicle" ? "📏" : "⏱️"} {(listing.mileage_hours || 0).toLocaleString()} {searchType === "vehicle" ? "km" : "hrs"}
                        </Badge>
                        <Badge variant="outline">{listing.seller_type || 'N/A'}</Badge>
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
                                  <span className="font-medium">{listing.condition || 'N/A'}</span>
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
                                  <span className="font-medium">{listing.seller_name || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Type:</span>
                                  <span className="font-medium capitalize">{listing.seller_type || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Rating:</span>
                                  <span className="font-medium">{(listing.seller_rating || 0).toFixed(2)}/1.0</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Total Sales:</span>
                                  <span className="font-medium">{listing.seller_total_sales || 0}</span>
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
                          <span>{listing.seller_name || 'N/A'}</span>
                          <span className="text-gray-400">•</span>
                          <span>⭐ {(listing.seller_rating || 0).toFixed(2)}</span>
                          <span className="text-gray-400">•</span>
                          <span>{listing.seller_total_sales || 0} sales</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(listing);
                            }}
                            size="sm"
                            className={isFavorite(listing) ? "bg-red-50 hover:bg-red-100 border-red-300" : ""}
                          >
                            <Heart className={`w-4 h-4 mr-1 ${isFavorite(listing) ? "fill-red-500 text-red-500" : ""}`} />
                            {isFavorite(listing) ? "Saved" : "Save"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              openShareDialog("single", listing);
                            }}
                            size="sm"
                          >
                            <Share2 className="w-4 h-4 mr-1" />
                            Share
                          </Button>
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

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Search Results</DialogTitle>
            <DialogDescription>
              Choose what to share and where to send it
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Share Scope */}
            <div>
              <Label className="text-sm font-semibold mb-3 block">What to share?</Label>
              <RadioGroup value={shareScope} onValueChange={setShareScope}>
                <div className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50">
                  <RadioGroupItem value="single" id="single" disabled={!shareListing} />
                  <Label htmlFor="single" className="flex-1 cursor-pointer">
                    This listing only
                    {shareListing && <span className="block text-xs text-gray-500 mt-1">{shareListing.year} {shareListing.make} {shareListing.model}</span>}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50">
                  <RadioGroupItem value="top_5" id="top_5" />
                  <Label htmlFor="top_5" className="flex-1 cursor-pointer">
                    Best 5 AI-Recommended
                    <span className="block text-xs text-gray-500 mt-1">Top ranked by AI scores</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="flex-1 cursor-pointer">
                    All Results ({filteredListings.length} items)
                    <span className="block text-xs text-gray-500 mt-1">
                      {filteredListings.length > 20 ? "⚠️ Large dataset - Email recommended" : "Complete search results"}
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Email Address (for email sharing)</Label>
                <Input
                  type="email"
                  placeholder="recipient@example.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Phone Number (optional, for WhatsApp/SMS)</Label>
                <Input
                  type="tel"
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Share Channels */}
            <div>
              <Label className="text-sm font-semibold mb-3 block">Share via:</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleShare("email")}
                  variant="outline"
                  className="h-auto py-3 flex flex-col gap-1"
                >
                  <Mail className="w-5 h-5" />
                  <span className="text-xs">Email</span>
                </Button>
                <Button
                  onClick={() => handleShare("whatsapp")}
                  variant="outline"
                  className="h-auto py-3 flex flex-col gap-1 bg-green-50 hover:bg-green-100"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-xs">WhatsApp</span>
                </Button>
                <Button
                  onClick={() => handleShare("google_chat")}
                  variant="outline"
                  className="h-auto py-3 flex flex-col gap-1"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-xs">Google Chat</span>
                </Button>
                <Button
                  onClick={() => handleShare("sms")}
                  variant="outline"
                  className="h-auto py-3 flex flex-col gap-1"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-xs">SMS</span>
                </Button>
              </div>
            </div>

            {/* Safeguard Warning */}
            {shareScope === "all" && filteredListings.length > 20 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>⚠️ Large Dataset:</strong> {filteredListings.length} results detected. Email is recommended for sharing large datasets. Other channels may truncate or fail.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}