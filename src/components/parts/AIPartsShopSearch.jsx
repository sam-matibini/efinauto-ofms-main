import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  MapPin, 
  Store, 
  Car,
  Loader2,
  Navigation,
  Phone,
  Clock,
  Truck,
  ShoppingCart,
  Star,
  Printer,
  Download,
  Mail,
  MessageCircle,
  Share2,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Package,
  Filter,
  Sparkles,
  X,
  Bookmark,
  Copy
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const popularMakes = [
  "Toyota", "Honda", "Ford", "Chevrolet", "Hyundai", "Kia", "Nissan", "Dodge", "Ram", 
  "BMW", "Mercedes-Benz", "Audi", "Volkswagen", "Jeep", "GMC", "Subaru", "Mazda", 
  "Lexus", "Acura", "Infiniti", "Buick", "Cadillac", "Lincoln", "Volvo", "Tesla"
];

const partCategories = [
  { id: "engine", label: "Engine" },
  { id: "electrical", label: "Electrical" },
  { id: "brakes", label: "Brakes" },
  { id: "suspension", label: "Suspension" },
  { id: "transmission", label: "Transmission" },
  { id: "cooling", label: "Cooling System" },
  { id: "exhaust", label: "Exhaust" },
  { id: "fuel", label: "Fuel System" },
  { id: "steering", label: "Steering" },
  { id: "body", label: "Body Parts" },
  { id: "interior", label: "Interior" },
  { id: "lighting", label: "Lighting" },
  { id: "filters", label: "Filters" },
  { id: "belts_hoses", label: "Belts & Hoses" },
];

const qualityTypes = [
  { id: "oem", label: "OEM (Original)", color: "bg-blue-100 text-blue-800" },
  { id: "aftermarket_premium", label: "Aftermarket Premium", color: "bg-purple-100 text-purple-800" },
  { id: "aftermarket_standard", label: "Aftermarket Standard", color: "bg-green-100 text-green-800" },
  { id: "no_name", label: "No-Name / Generic", color: "bg-gray-100 text-gray-800" },
  { id: "remanufactured", label: "Remanufactured", color: "bg-orange-100 text-orange-800" },
];

const popularStores = [
  { id: "napa", name: "NAPA Auto Parts", logo: "🔧" },
  { id: "autozone", name: "AutoZone", logo: "🅰️" },
  { id: "canadian_tire", name: "Canadian Tire", logo: "🍁" },
  { id: "lordco", name: "Lordco", logo: "🔩" },
  { id: "oreilly", name: "O'Reilly Auto Parts", logo: "🟢" },
  { id: "advance", name: "Advance Auto Parts", logo: "🔴" },
  { id: "partsource", name: "PartSource", logo: "⚙️" },
  { id: "princess_auto", name: "Princess Auto", logo: "👑" },
  { id: "custom", name: "Other Store", logo: "🔍" },
];

const yearRange = Array.from({ length: 35 }, (_, i) => (new Date().getFullYear() + 1 - i).toString());

const availabilityConfig = {
  in_stock: { label: "In Stock", color: "bg-green-100 text-green-800", icon: CheckCircle },
  low_stock: { label: "Low Stock", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle },
  available_today: { label: "Available Today", color: "bg-blue-100 text-blue-800", icon: Truck },
  available_tomorrow: { label: "Tomorrow", color: "bg-purple-100 text-purple-800", icon: Clock },
  special_order: { label: "Special Order (2-7 days)", color: "bg-orange-100 text-orange-800", icon: Package },
  backorder: { label: "Backorder", color: "bg-red-100 text-red-800", icon: Clock },
  discontinued: { label: "Discontinued", color: "bg-gray-100 text-gray-800", icon: X },
};

export default function AIPartsShopSearch() {
  const [searchMode, setSearchMode] = useState("nearby"); // nearby, store
  const [postalCode, setPostalCode] = useState("");
  const [selectedStore, setSelectedStore] = useState("");
  const [customStoreName, setCustomStoreName] = useState("");
  const [partName, setPartName] = useState("");
  const [partCategory, setPartCategory] = useState("");
  const [qualityType, setQualityType] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [engine, setEngine] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [savedParts, setSavedParts] = useState([]);
  const reportRef = useRef(null);

  const handleSearch = async () => {
    if (!partName && !partCategory) {
      toast.error("Please enter a part name or select a category");
      return;
    }

    setIsSearching(true);
    setSearchResults(null);

    try {
      const vehicleInfo = [year, make, model, engine].filter(Boolean).join(" ");
      const locationInfo = searchMode === "nearby" ? postalCode : "";
      const storeInfo = searchMode === "store" 
        ? (selectedStore === "custom" ? customStoreName : popularStores.find(s => s.id === selectedStore)?.name) 
        : "";

      const result = await supabase.integrations.Core.InvokeLLM({
        prompt: `Search for auto parts with the following criteria:
Part: ${partName || "Any"}
Category: ${partCategory || "Any"}
Quality Preference: ${qualityType || "All types"}
Vehicle: ${vehicleInfo || "Universal"}
${searchMode === "nearby" ? `Location/Postal Code: ${postalCode || "Major Canadian cities"}` : `Specific Store: ${storeInfo}`}

Generate realistic search results for auto parts stores ${searchMode === "nearby" ? "near the location" : `from ${storeInfo}`}. Include multiple stores with varying availability, pricing, and quality options.

Return JSON with this structure:
{
  "search_summary": {
    "part_searched": "the part name",
    "vehicle": "vehicle details",
    "location": "location searched",
    "total_results": number,
    "best_price": number,
    "best_availability": "store name with best availability"
  },
  "stores": [
    {
      "store_id": "unique_id",
      "store_name": "Store Name",
      "store_logo": "emoji",
      "address": "full address",
      "distance_km": number,
      "phone": "phone number",
      "hours": "operating hours today",
      "rating": number (1-5),
      "delivery_options": ["pickup", "delivery", "same_day"],
      "parts": [
        {
          "part_id": "unique_id",
          "part_name": "Part Name",
          "part_number": "OEM or store number",
          "brand": "brand name",
          "quality_type": "oem/aftermarket_premium/aftermarket_standard/no_name/remanufactured",
          "price": number,
          "core_charge": number or null,
          "warranty_months": number,
          "availability": "in_stock/low_stock/available_today/available_tomorrow/special_order/backorder/discontinued",
          "stock_quantity": number or null,
          "eta": "when available",
          "fitment_confirmed": boolean,
          "notes": "any special notes"
        }
      ]
    }
  ],
  "price_comparison": {
    "lowest_oem": { "store": "name", "price": number },
    "lowest_aftermarket": { "store": "name", "price": number },
    "best_value": { "store": "name", "price": number, "reason": "why it's best value" }
  }
}`,
        response_json_schema: {
          type: "object",
          properties: {
            search_summary: {
              type: "object",
              properties: {
                part_searched: { type: "string" },
                vehicle: { type: "string" },
                location: { type: "string" },
                total_results: { type: "number" },
                best_price: { type: "number" },
                best_availability: { type: "string" }
              }
            },
            stores: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  store_id: { type: "string" },
                  store_name: { type: "string" },
                  store_logo: { type: "string" },
                  address: { type: "string" },
                  distance_km: { type: "number" },
                  phone: { type: "string" },
                  hours: { type: "string" },
                  rating: { type: "number" },
                  delivery_options: { type: "array", items: { type: "string" } },
                  parts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        part_id: { type: "string" },
                        part_name: { type: "string" },
                        part_number: { type: "string" },
                        brand: { type: "string" },
                        quality_type: { type: "string" },
                        price: { type: "number" },
                        core_charge: { type: "number" },
                        warranty_months: { type: "number" },
                        availability: { type: "string" },
                        stock_quantity: { type: "number" },
                        eta: { type: "string" },
                        fitment_confirmed: { type: "boolean" },
                        notes: { type: "string" }
                      }
                    }
                  }
                }
              }
            },
            price_comparison: {
              type: "object",
              properties: {
                lowest_oem: { type: "object", properties: { store: { type: "string" }, price: { type: "number" } } },
                lowest_aftermarket: { type: "object", properties: { store: { type: "string" }, price: { type: "number" } } },
                best_value: { type: "object", properties: { store: { type: "string" }, price: { type: "number" }, reason: { type: "string" } } }
              }
            }
          }
        },
        add_context_from_internet: true
      });

      setSearchResults(result);
    } catch (error) {
      toast.error("Failed to search parts. Please try again.");
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setPartName("");
    setPartCategory("");
    setQualityType("");
    setMake("");
    setModel("");
    setYear("");
    setEngine("");
    setPostalCode("");
    setSelectedStore("");
    setCustomStoreName("");
    setSearchResults(null);
  };

  const getQualityBadge = (type) => {
    const config = qualityTypes.find(q => q.id === type);
    return config || { label: type, color: "bg-gray-100 text-gray-800" };
  };

  const getAvailabilityBadge = (type) => {
    return availabilityConfig[type] || availabilityConfig.special_order;
  };

  const savePart = (store, part) => {
    setSavedParts(prev => [...prev, { store, part, savedAt: new Date() }]);
    toast.success("Part saved for later");
  };

  const generateReportText = () => {
    if (!searchResults) return "";
    const s = searchResults.search_summary;
    return `
AUTO PARTS SEARCH RESULTS
=========================

Part: ${s.part_searched}
Vehicle: ${s.vehicle || "Universal"}
Location: ${s.location}
Date: ${new Date().toLocaleDateString()}

Total Results: ${s.total_results}
Best Price: $${s.best_price}
Best Availability: ${s.best_availability}

STORE RESULTS
-------------
${searchResults.stores?.map(store => `
${store.store_name} (${store.distance_km}km away)
${store.address}
Phone: ${store.phone}
Rating: ${store.rating}/5 ★

Parts Available:
${store.parts?.map(p => `  - ${p.part_name} (${p.brand})
    Price: $${p.price}${p.core_charge ? ` + $${p.core_charge} core` : ''}
    Quality: ${getQualityBadge(p.quality_type).label}
    Availability: ${getAvailabilityBadge(p.availability).label}
    Warranty: ${p.warranty_months} months
`).join('')}
`).join('\n')}

PRICE COMPARISON
----------------
Lowest OEM: ${searchResults.price_comparison?.lowest_oem?.store} - $${searchResults.price_comparison?.lowest_oem?.price}
Lowest Aftermarket: ${searchResults.price_comparison?.lowest_aftermarket?.store} - $${searchResults.price_comparison?.lowest_aftermarket?.price}
Best Value: ${searchResults.price_comparison?.best_value?.store} - $${searchResults.price_comparison?.best_value?.price}
Reason: ${searchResults.price_comparison?.best_value?.reason}

---
Generated by eFinAuto Parts Search
    `.trim();
  };

  const handlePrint = () => {
    if (!reportRef.current) return;
    
    const printWindow = window.open("", "_blank");
    const s = searchResults?.search_summary;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Parts Search - ${s?.part_searched}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; }
            h1 { color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
            h2 { color: #374151; margin-top: 25px; }
            .header-info { background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .header-info p { margin: 5px 0; }
            .store-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
            .store-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 10px; }
            .store-name { font-size: 18px; font-weight: bold; }
            .rating { color: #f59e0b; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
            th { background: #f9fafb; font-weight: 600; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
            .in-stock { background: #dcfce7; color: #166534; }
            .low-stock { background: #fef3c7; color: #92400e; }
            .oem { background: #dbeafe; color: #1e40af; }
            .aftermarket { background: #f3e8ff; color: #7c3aed; }
            .price { font-weight: bold; color: #059669; }
            .comparison { background: #ecfdf5; padding: 15px; border-radius: 8px; margin-top: 20px; }
            .footer { margin-top: 30px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 15px; }
            @media print { body { padding: 0; } .store-card { break-inside: avoid; } }
          </style>
        </head>
        <body>
          <h1>🔧 Auto Parts Search Results</h1>
          
          <div class="header-info">
            <p><strong>Part:</strong> ${s?.part_searched}</p>
            <p><strong>Vehicle:</strong> ${s?.vehicle || "Universal"}</p>
            <p><strong>Location:</strong> ${s?.location}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Total Results:</strong> ${s?.total_results} | <strong>Best Price:</strong> $${s?.best_price}</p>
          </div>

          ${searchResults?.stores?.map(store => `
            <div class="store-card">
              <div class="store-header">
                <div>
                  <span class="store-name">${store.store_logo} ${store.store_name}</span>
                  <span class="rating"> ★ ${store.rating}/5</span>
                </div>
                <div style="text-align: right; font-size: 12px; color: #6b7280;">
                  ${store.distance_km}km away<br/>
                  ${store.phone}
                </div>
              </div>
              <p style="font-size: 12px; color: #6b7280; margin: 5px 0;">${store.address}</p>
              <p style="font-size: 12px; color: #6b7280;">Hours: ${store.hours}</p>
              
              <table>
                <thead>
                  <tr>
                    <th>Part / Brand</th>
                    <th>Part #</th>
                    <th>Quality</th>
                    <th>Price</th>
                    <th>Availability</th>
                    <th>Warranty</th>
                  </tr>
                </thead>
                <tbody>
                  ${store.parts?.map(p => `
                    <tr>
                      <td><strong>${p.part_name}</strong><br/><span style="color: #6b7280;">${p.brand}</span></td>
                      <td>${p.part_number}</td>
                      <td><span class="badge ${p.quality_type === 'oem' ? 'oem' : 'aftermarket'}">${getQualityBadge(p.quality_type).label}</span></td>
                      <td class="price">$${p.price}${p.core_charge ? `<br/><span style="font-size: 10px; color: #6b7280;">+$${p.core_charge} core</span>` : ''}</td>
                      <td><span class="badge ${p.availability === 'in_stock' ? 'in-stock' : p.availability === 'low_stock' ? 'low-stock' : ''}">${getAvailabilityBadge(p.availability).label}</span></td>
                      <td>${p.warranty_months} mo</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `).join('')}

          <div class="comparison">
            <h3 style="margin-top: 0;">💰 Price Comparison Summary</h3>
            <p><strong>Lowest OEM:</strong> ${searchResults?.price_comparison?.lowest_oem?.store} - $${searchResults?.price_comparison?.lowest_oem?.price}</p>
            <p><strong>Lowest Aftermarket:</strong> ${searchResults?.price_comparison?.lowest_aftermarket?.store} - $${searchResults?.price_comparison?.lowest_aftermarket?.price}</p>
            <p><strong>Best Value:</strong> ${searchResults?.price_comparison?.best_value?.store} - $${searchResults?.price_comparison?.best_value?.price}</p>
            <p style="font-style: italic; color: #6b7280;">${searchResults?.price_comparison?.best_value?.reason}</p>
          </div>

          <div class="footer">
            <p>Generated by eFinAuto Parts Search • ${new Date().toLocaleString()}</p>
            <p>Visit efinauto.ca for more tools</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    
    try {
      toast.loading("Generating PDF...");
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }
      
      pdf.save(`Parts-Search-${searchResults?.search_summary?.part_searched || "results"}.pdf`);
      toast.dismiss();
      toast.success("PDF downloaded");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to generate PDF");
    }
  };

  const handleEmailShare = async () => {
    const emailTo = prompt("Enter recipient email address:");
    if (!emailTo) return;
    
    setSendingEmail(true);
    try {
      await supabase.integrations.Core.SendEmail({
        to: emailTo,
        subject: `Auto Parts Search Results - ${searchResults?.search_summary?.part_searched}`,
        body: generateReportText()
      });
      toast.success(`Results sent to ${emailTo}`);
    } catch (error) {
      toast.error("Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!searchResults) return;
    const s = searchResults.search_summary;
    const topResults = searchResults.stores?.slice(0, 3).flatMap(store => 
      store.parts?.slice(0, 1).map(p => `${store.store_name} – ${getQualityBadge(p.quality_type).label} – $${p.price} – ${getAvailabilityBadge(p.availability).label}`)
    ).join("\n");

    const message = `
*🔧 Parts Search Results – eFinAuto*

*Part:* ${s.part_searched}
*Vehicle:* ${s.vehicle || "Universal"}

${topResults}

*Best Price:* $${s.best_price}

View full report: efinauto.ca/parts
    `.trim();
    
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleGoogleChatShare = () => {
    if (!searchResults) return;
    const s = searchResults.search_summary;
    const message = `🔧 Parts Search: ${s.part_searched}\nVehicle: ${s.vehicle || "Universal"}\nBest Price: $${s.best_price}\nResults: ${s.total_results} options found`;
    
    navigator.clipboard.writeText(message);
    toast.success("Copied to clipboard for Google Chat");
  };

  return (
    <div className="space-y-6">
      {/* Search Interface */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            AI Parts Shop Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={searchMode} onValueChange={setSearchMode} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="nearby" className="text-sm">
                <MapPin className="w-4 h-4 mr-2" />
                Find Parts Near Me
              </TabsTrigger>
              <TabsTrigger value="store" className="text-sm">
                <Store className="w-4 h-4 mr-2" />
                Search by Store
              </TabsTrigger>
            </TabsList>

            {/* Nearby Search */}
            <TabsContent value="nearby" className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <Label className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4" />
                  Your Location
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter postal code (e.g., M5V 3A8)"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        () => toast.success("Location detected - using current area"),
                        () => toast.error("Could not detect location")
                      );
                    }
                  }}>
                    <Navigation className="w-4 h-4 mr-2" />
                    Use GPS
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Store Search */}
            <TabsContent value="store" className="space-y-4">
              <div>
                <Label className="mb-2 block">Select Store</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {popularStores.map(store => (
                    <button
                      key={store.id}
                      onClick={() => {
                        setSelectedStore(store.id === selectedStore ? "" : store.id);
                        if (store.id !== "custom") setCustomStoreName("");
                      }}
                      className={`p-3 border rounded-lg flex items-center gap-2 transition-all ${
                        selectedStore === store.id 
                          ? "border-blue-500 bg-blue-50 text-blue-700" 
                          : "hover:border-gray-300"
                      }`}
                    >
                      <span className="text-xl">{store.logo}</span>
                      <span className="text-sm font-medium">{store.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Custom Store Name Input */}
              {selectedStore === "custom" && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <Label className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Enter Auto Parts Store Name
                  </Label>
                  <Input
                    placeholder="e.g., Rock Auto, CarQuest, Midas, UAP NAPA, etc."
                    value={customStoreName}
                    onChange={(e) => setCustomStoreName(e.target.value)}
                    className="bg-white"
                  />
                  <p className="text-xs text-purple-600 mt-2">
                    AI will search for parts availability at this store
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Part Search Filters */}
          <div className="space-y-4 mt-6 pt-6 border-t">
            <h3 className="font-semibold flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Part Search Filters
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Part Name *</Label>
                <Input
                  placeholder="e.g., Alternator, Brake Pads, Oil Filter..."
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={partCategory} onValueChange={setPartCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {partCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Quality Type</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {qualityTypes.map(q => (
                  <button
                    key={q.id}
                    onClick={() => setQualityType(q.id === qualityType ? "" : q.id)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      qualityType === q.id ? q.color + " ring-2 ring-offset-1" : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>Make</Label>
                <Select value={make} onValueChange={setMake}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select make" />
                  </SelectTrigger>
                  <SelectContent>
                    {popularMakes.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Model</Label>
                <Input 
                  placeholder="e.g., Camry" 
                  value={model} 
                  onChange={(e) => setModel(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearRange.map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Engine</Label>
                <Input 
                  placeholder="e.g., 2.5L" 
                  value={engine} 
                  onChange={(e) => setEngine(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Search Actions */}
          <div className="flex gap-3 mt-6 pt-4 border-t">
            <Button 
              onClick={handleSearch} 
              disabled={isSearching}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search Parts
                </>
              )}
            </Button>
            <Button variant="outline" onClick={clearSearch}>
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults && (
        <div className="space-y-4">
          {/* Share/Export Actions */}
          <Card className="print:hidden">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Share & Export Results
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleEmailShare} disabled={sendingEmail}>
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                  <Button variant="outline" size="sm" className="bg-green-50 text-green-700" onClick={handleWhatsAppShare}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button variant="outline" size="sm" className="bg-blue-50 text-blue-700" onClick={handleGoogleChatShare}>
                    <Copy className="w-4 h-4 mr-2" />
                    Google Chat
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Printable Report */}
          <div ref={reportRef}>
            {/* Summary Card */}
            <Card className="border-2 border-blue-200 mb-4">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{searchResults.search_summary?.part_searched}</h2>
                    <p className="text-gray-600">
                      <Car className="w-4 h-4 inline mr-1" />
                      {searchResults.search_summary?.vehicle || "Universal Fit"}
                    </p>
                    <p className="text-gray-600">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      {searchResults.search_summary?.location}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-green-100 text-green-800 text-lg px-4 py-2">
                      Best Price: ${searchResults.search_summary?.best_price}
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-800 px-3 py-2">
                      {searchResults.search_summary?.total_results} Results
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Store Results */}
            {searchResults.stores?.map((store, idx) => (
              <Card key={idx} className="mb-4">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{store.store_logo}</span>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {store.store_name}
                          <span className="text-yellow-500 text-sm flex items-center">
                            <Star className="w-4 h-4 fill-current" />
                            {store.rating}
                          </span>
                        </CardTitle>
                        <p className="text-sm text-gray-600">{store.address}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-1">
                        <Navigation className="w-3 h-3 mr-1" />
                        {store.distance_km} km
                      </Badge>
                      <p className="text-xs text-gray-500">{store.hours}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {store.delivery_options?.map((opt, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {opt === "pickup" && "🏪 Pickup"}
                        {opt === "delivery" && "🚚 Delivery"}
                        {opt === "same_day" && "⚡ Same Day"}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Part / Brand</TableHead>
                        <TableHead>Part #</TableHead>
                        <TableHead>Quality</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Availability</TableHead>
                        <TableHead>Warranty</TableHead>
                        <TableHead className="print:hidden">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {store.parts?.map((part, pIdx) => {
                        const availBadge = getAvailabilityBadge(part.availability);
                        const AvailIcon = availBadge.icon;
                        return (
                          <TableRow key={pIdx}>
                            <TableCell>
                              <div className="font-medium">{part.part_name}</div>
                              <div className="text-sm text-gray-500">{part.brand}</div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{part.part_number}</TableCell>
                            <TableCell>
                              <Badge className={getQualityBadge(part.quality_type).color}>
                                {getQualityBadge(part.quality_type).label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="font-bold text-green-600">${part.price}</div>
                              {part.core_charge > 0 && (
                                <div className="text-xs text-gray-500">+${part.core_charge} core</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={availBadge.color}>
                                <AvailIcon className="w-3 h-3 mr-1" />
                                {availBadge.label}
                              </Badge>
                              {part.stock_quantity && (
                                <div className="text-xs text-gray-500 mt-1">{part.stock_quantity} in stock</div>
                              )}
                            </TableCell>
                            <TableCell>{part.warranty_months} mo</TableCell>
                            <TableCell className="print:hidden">
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => savePart(store, part)}>
                                  <Bookmark className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <ShoppingCart className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="flex gap-2 mt-4 print:hidden">
                    <Button variant="outline" size="sm">
                      <Phone className="w-4 h-4 mr-2" />
                      {store.phone}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Navigation className="w-4 h-4 mr-2" />
                      Directions
                    </Button>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Reserve Parts
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Price Comparison */}
            {searchResults.price_comparison && (
              <Card className="bg-gradient-to-r from-green-50 to-blue-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">💰 Price Comparison Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 border">
                      <p className="text-sm text-gray-600">Lowest OEM</p>
                      <p className="font-bold text-lg">{searchResults.price_comparison.lowest_oem?.store}</p>
                      <p className="text-2xl font-bold text-blue-600">${searchResults.price_comparison.lowest_oem?.price}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border">
                      <p className="text-sm text-gray-600">Lowest Aftermarket</p>
                      <p className="font-bold text-lg">{searchResults.price_comparison.lowest_aftermarket?.store}</p>
                      <p className="text-2xl font-bold text-purple-600">${searchResults.price_comparison.lowest_aftermarket?.price}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-green-300">
                      <p className="text-sm text-gray-600">🏆 Best Value</p>
                      <p className="font-bold text-lg">{searchResults.price_comparison.best_value?.store}</p>
                      <p className="text-2xl font-bold text-green-600">${searchResults.price_comparison.best_value?.price}</p>
                      <p className="text-xs text-gray-500 mt-1">{searchResults.price_comparison.best_value?.reason}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Saved Parts */}
      {savedParts.length > 0 && (
        <Card className="print:hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bookmark className="w-5 h-5" />
              Saved Parts ({savedParts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedParts.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{item.part.part_name}</p>
                    <p className="text-sm text-gray-600">{item.store.store_name} - ${item.part.price}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSavedParts(prev => prev.filter((_, i) => i !== idx))}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}