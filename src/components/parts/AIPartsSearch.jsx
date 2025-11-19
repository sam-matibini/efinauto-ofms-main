import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, Search, Loader2, ExternalLink, TrendingUp, TrendingDown, DollarSign, Mail, Printer, Plus, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "../shared/CompanyContext";
import { useQueryClient } from "@tanstack/react-query";

export default function AIPartsSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [vin, setVin] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [isGeneratingPO, setIsGeneratingPO] = useState(false);
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a part name or description");
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
        prompt: `Search for automotive parts matching "${searchQuery}" from these Canadian auto parts retailers:
1. Princess Auto (https://www.princessauto.com)
2. Canadian Tire Auto Parts
3. NAPA Auto Parts Canada
4. PartsSource.ca
${vehicleContext}

For each retailer, find the most relevant part and extract:
- Part name/description
- Price (in CAD)
- Part number (if available)
- Availability status
- Store location or availability region (if available)
- Direct link to product page (if possible)

Provide price comparison and recommendations. If a part is not found at a retailer, indicate "Not Available".`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            part_searched: { type: "string" },
            sources: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  retailer: { type: "string" },
                  part_name: { type: "string" },
                  price: { type: "number" },
                  currency: { type: "string" },
                  part_number: { type: "string" },
                  availability: { type: "string" },
                  store_location: { type: "string" },
                  url: { type: "string" }
                }
              }
            },
            price_analysis: {
              type: "object",
              properties: {
                lowest_price: { type: "number" },
                highest_price: { type: "number" },
                average_price: { type: "number" },
                best_value_retailer: { type: "string" }
              }
            },
            recommendation: { type: "string" }
          }
        }
      });

      setResults(response);
    } catch (error) {
      console.error("AI search error:", error);
      toast.error("Failed to search for parts. Please try again.");
      setDialogOpen(false);
    } finally {
      setIsSearching(false);
    }
  };

  const getAvailabilityColor = (availability) => {
    const avail = availability?.toLowerCase() || "";
    if (avail.includes("in stock") || avail.includes("available")) return "bg-green-100 text-green-800";
    if (avail.includes("limited") || avail.includes("low")) return "bg-yellow-100 text-yellow-800";
    if (avail.includes("out") || avail.includes("not available")) return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const handleAddToParts = async (source) => {
    if (!selectedCompanyId) {
      toast.error("Please select a company first");
      return;
    }

    try {
      const partData = {
        company_id: selectedCompanyId,
        name: source.part_name,
        part_number: source.part_number || `AUTO-${Date.now()}`,
        description: `Auto-imported from ${source.retailer}`,
        cost_price: source.price,
        selling_price: source.price * 1.3,
        quantity: 0,
        reorder_level: 5,
        supplier: source.retailer,
        category: "other"
      };

      await base44.entities.Part.create(partData);
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      toast.success(`Part added to inventory from ${source.retailer}`);
    } catch (error) {
      console.error("Error adding part:", error);
      toast.error("Failed to add part to inventory");
    }
  };

  const handleGeneratePO = async (source, deliveryMethod) => {
    setIsGeneratingPO(true);

    try {
      const poData = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a professional purchase order document for the following part:

Supplier: ${source.retailer}
Part Name: ${source.part_name}
Part Number: ${source.part_number || 'N/A'}
Price: $${source.price} ${source.currency}
Quantity: 1

Include standard PO sections:
- PO Number (generate unique number)
- Date
- Supplier details
- Buyer details (eFinAuto Center)
- Item description with part number and price
- Total amount
- Terms and conditions
- Delivery instructions

Format as a professional business document.`,
        response_json_schema: {
          type: "object",
          properties: {
            po_number: { type: "string" },
            date: { type: "string" },
            supplier_name: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  part_number: { type: "string" },
                  quantity: { type: "number" },
                  unit_price: { type: "number" },
                  total: { type: "number" }
                }
              }
            },
            subtotal: { type: "number" },
            tax: { type: "number" },
            grand_total: { type: "number" },
            notes: { type: "string" }
          }
        }
      });

      const emailBody = `
Purchase Order: ${poData.po_number}
Date: ${poData.date}

Supplier: ${poData.supplier_name}

Items:
${poData.items.map(item => 
  `- ${item.description} (Part #: ${item.part_number})
  Qty: ${item.quantity} × $${item.unit_price} = $${item.total}`
).join('\n')}

Subtotal: $${poData.subtotal}
Tax: $${poData.tax}
Grand Total: $${poData.grand_total}

Notes: ${poData.notes || 'N/A'}
      `;

      if (deliveryMethod === 'email') {
        await base44.integrations.Core.SendEmail({
          to: "orders@example.com",
          subject: `Purchase Order ${poData.po_number} - ${source.retailer}`,
          body: emailBody
        });
        toast.success("Purchase order sent via email!");
      } else {
        toast.success("Purchase order generated! Ready for fax transmission.", {
          description: emailBody,
          duration: 10000
        });
      }

      setSelectedSource(null);
    } catch (error) {
      console.error("Error generating PO:", error);
      toast.error("Failed to generate purchase order");
    } finally {
      setIsGeneratingPO(false);
    }
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI-Powered Parts Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Search across multiple Canadian retailers to find the best prices and availability
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              <Input
                placeholder="VIN (optional)"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                className="text-sm"
              />
              <Input
                placeholder="Year (e.g., 2018)"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="text-sm"
              />
              <Input
                placeholder="Make (e.g., Toyota)"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className="text-sm"
              />
              <Input
                placeholder="Model (e.g., Corolla)"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Enter part name or number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button 
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </>
                )}
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
              AI Parts Search Results
            </DialogTitle>
          </DialogHeader>

          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
              <p className="text-gray-600">Searching across multiple retailers...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
            </div>
          ) : results ? (
            <div className="space-y-6">
              {/* Search Summary */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  Search: {results.part_searched}
                </h3>
                <p className="text-sm text-blue-700">{results.recommendation}</p>
              </div>

              {/* Price Analysis */}
              {results.price_analysis && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      Price Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Lowest Price</p>
                        <p className="text-xl font-bold text-green-600">
                          ${results.price_analysis.lowest_price?.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Highest Price</p>
                        <p className="text-xl font-bold text-red-600">
                          ${results.price_analysis.highest_price?.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Average Price</p>
                        <p className="text-xl font-bold text-blue-600">
                          ${results.price_analysis.average_price?.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Best Value</p>
                        <p className="text-sm font-bold text-purple-600">
                          {results.price_analysis.best_value_retailer}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Results from Each Retailer */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Results by Retailer</h3>
                {results.sources?.map((source, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-bold text-lg text-gray-900">{source.retailer}</h4>
                            <Badge className={getAvailabilityColor(source.availability)}>
                              {source.availability}
                            </Badge>
                          </div>
                          <p className="text-gray-700 mb-2">{source.part_name}</p>
                          {source.part_number && source.part_number !== "N/A" && (
                            <p className="text-sm text-gray-500">Part #: {source.part_number}</p>
                          )}
                          {source.store_location && source.store_location !== "N/A" && (
                            <p className="text-sm text-gray-500">📍 {source.store_location}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-green-600">
                            ${source.price?.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">{source.currency}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        {source.url && source.url !== "N/A" && (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                          >
                            View Product
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddToParts(source)}
                          className="ml-auto"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add to Inventory
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setSelectedSource(source)}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          <Mail className="w-4 h-4 mr-1" />
                          Create PO
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button onClick={() => setDialogOpen(false)} variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase Order Dialog */}
      <Dialog open={!!selectedSource} onOpenChange={() => setSelectedSource(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Purchase Order</DialogTitle>
          </DialogHeader>
          {selectedSource && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Part</p>
                <p className="font-semibold">{selectedSource.part_name}</p>
                <p className="text-sm text-gray-600 mt-2">Supplier</p>
                <p className="font-semibold">{selectedSource.retailer}</p>
                <p className="text-sm text-gray-600 mt-2">Price</p>
                <p className="font-semibold text-green-600">${selectedSource.price?.toFixed(2)}</p>
              </div>
              <p className="text-sm text-gray-600">
                Select delivery method for the purchase order:
              </p>
              <div className="space-y-2">
                <Button
                  onClick={() => handleGeneratePO(selectedSource, 'email')}
                  disabled={isGeneratingPO}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isGeneratingPO ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  Send via Email
                </Button>
                <Button
                  onClick={() => handleGeneratePO(selectedSource, 'fax')}
                  disabled={isGeneratingPO}
                  variant="outline"
                  className="w-full"
                >
                  {isGeneratingPO ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Printer className="w-4 h-4 mr-2" />
                  )}
                  Generate for Fax
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}