import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ship, TrendingDown, Clock, Calendar, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { RateComparisonService } from "../components/export/RateComparisonService";
import { toast } from "sonner";
import { format } from "date-fns";

export default function RateShopping() {
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);

  const [shipmentDetails, setShipmentDetails] = useState({
    origin_port: "",
    destination_port: "",
    container_type: "40HC",
    cargo_weight: 15000,
    cargo_volume: 50,
    departure_date: "",
    cargo_type: "general",
    hazardous: false
  });

  const handleCompareRates = async () => {
    if (!shipmentDetails.origin_port || !shipmentDetails.destination_port) {
      toast.error("Please enter origin and destination ports");
      return;
    }

    setLoading(true);
    try {
      const result = await RateComparisonService.compareRates(shipmentDetails);
      setComparison(result);
      
      if (result.quotes.length === 0) {
        toast.error("No rates available for this route");
      } else {
        toast.success(`Found ${result.quotes.length} rates. Best rate: $${result.best_rate.total_rate}`);
      }
    } catch (error) {
      toast.error("Failed to compare rates");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getCarrierLogo = (carrierCode) => {
    const logos = {
      maersk: "🇩🇰",
      msc: "🇨🇭",
      cma_cgm: "🇫🇷",
      hapag_lloyd: "🇩🇪"
    };
    return logos[carrierCode] || "🚢";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <h1 className="text-2xl font-bold text-white">Rate Shopping</h1>
        <p className="text-sm text-gray-300 mt-1">Compare shipping rates from multiple carriers</p>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Shipment Details Form */}
        <Card>
          <CardHeader>
            <CardTitle>Shipment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label>Origin Port *</Label>
                <Input
                  placeholder="e.g., CATOR (Toronto)"
                  value={shipmentDetails.origin_port}
                  onChange={(e) => setShipmentDetails({...shipmentDetails, origin_port: e.target.value})}
                />
              </div>
              <div>
                <Label>Destination Port *</Label>
                <Input
                  placeholder="e.g., AEJEA (Jebel Ali)"
                  value={shipmentDetails.destination_port}
                  onChange={(e) => setShipmentDetails({...shipmentDetails, destination_port: e.target.value})}
                />
              </div>
              <div>
                <Label>Container Type</Label>
                <Select value={shipmentDetails.container_type} onValueChange={(value) => setShipmentDetails({...shipmentDetails, container_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20GP">20' General Purpose</SelectItem>
                    <SelectItem value="40GP">40' General Purpose</SelectItem>
                    <SelectItem value="40HC">40' High Cube</SelectItem>
                    <SelectItem value="45HC">45' High Cube</SelectItem>
                    <SelectItem value="20RF">20' Refrigerated</SelectItem>
                    <SelectItem value="40RF">40' Refrigerated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Departure Date</Label>
                <Input
                  type="date"
                  value={shipmentDetails.departure_date}
                  onChange={(e) => setShipmentDetails({...shipmentDetails, departure_date: e.target.value})}
                />
              </div>
              <div>
                <Label>Cargo Weight (kg)</Label>
                <Input
                  type="number"
                  value={shipmentDetails.cargo_weight}
                  onChange={(e) => setShipmentDetails({...shipmentDetails, cargo_weight: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label>Cargo Volume (m³)</Label>
                <Input
                  type="number"
                  value={shipmentDetails.cargo_volume}
                  onChange={(e) => setShipmentDetails({...shipmentDetails, cargo_volume: parseInt(e.target.value)})}
                />
              </div>
            </div>
            <Button 
              onClick={handleCompareRates} 
              disabled={loading}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Comparing Rates from 4 Carriers...
                </>
              ) : (
                <>
                  <TrendingDown className="w-5 h-5 mr-2" />
                  Compare Rates from All Carriers
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Rate Comparison Results */}
        {comparison && (
          <>
            {/* Best Rate Banner */}
            {comparison.best_rate && (
              <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
                        <TrendingDown className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Best Rate Available</p>
                        <h3 className="text-3xl font-bold text-gray-900">
                          ${comparison.best_rate.total_rate.toLocaleString()}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {comparison.best_rate.carrier_name} • {comparison.best_rate.transit_time_days} days transit
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => setSelectedQuote(comparison.best_rate)}
                      className="bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Select Best Rate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Rates */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">All Available Rates ({comparison.quotes.length})</h3>
                {selectedQuote && (
                  <Badge className="bg-blue-600 text-white">
                    Selected: {selectedQuote.carrier_name}
                  </Badge>
                )}
              </div>

              <div className="grid gap-4">
                {comparison.quotes.map((quote) => (
                  <Card 
                    key={quote.quote_id}
                    className={`cursor-pointer transition-all ${
                      selectedQuote?.quote_id === quote.quote_id 
                        ? 'ring-2 ring-blue-500 shadow-lg' 
                        : 'hover:shadow-md'
                    } ${
                      quote === comparison.best_rate 
                        ? 'border-2 border-green-400' 
                        : ''
                    }`}
                    onClick={() => setSelectedQuote(quote)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="text-4xl">{getCarrierLogo(quote.carrier_code)}</span>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-xl">{quote.carrier_name}</h4>
                                {quote === comparison.best_rate && (
                                  <Badge className="bg-green-600">Best Rate</Badge>
                                )}
                                <Badge variant="outline">{quote.service_type}</Badge>
                              </div>
                              <p className="text-sm text-gray-600">{quote.route}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Ocean Freight</p>
                              <p className="font-semibold text-lg">${quote.ocean_freight.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Fuel Surcharge</p>
                              <p className="font-semibold text-lg">${quote.fuel_surcharge.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-1">THC (Origin + Dest)</p>
                              <p className="font-semibold text-lg">${(quote.thc_origin + quote.thc_destination).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Other Fees</p>
                              <p className="font-semibold text-lg">${(quote.documentation_fee + quote.security_fee).toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span className="font-medium">{quote.transit_time_days} days</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>ETD: {format(new Date(quote.estimated_departure), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>ETA: {format(new Date(quote.estimated_arrival), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>{quote.available_space} TEU available</span>
                            </div>
                          </div>

                          {quote.special_conditions?.length > 0 && (
                            <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-yellow-800 flex items-start gap-1">
                              <AlertCircle className="w-3 h-3 mt-0.5" />
                              <span>{quote.special_conditions.join(", ")}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-right pl-6">
                          <p className="text-sm text-gray-600 mb-1">Total Rate</p>
                          <p className="text-4xl font-bold text-gray-900">
                            ${quote.total_rate.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Valid until {format(new Date(quote.valid_until), 'MMM d, yyyy')}
                          </p>
                          {selectedQuote?.quote_id === quote.quote_id && (
                            <Badge className="mt-3 bg-blue-600">✓ Selected</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Failed Carriers */}
            {comparison.failed.length > 0 && (
              <Card className="bg-gray-50 border-gray-300">
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Unable to get rates from: {comparison.failed.map(f => f.carrier).join(", ")}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}