import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ship, TrendingDown, Clock, Calendar, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { RateComparisonService } from "./RateComparisonService";
import { toast } from "sonner";
import { format } from "date-fns";
import PortSelector from "../shared/PortSelector";

export default function RateShoppingDialog({ open, onClose, onSelectRate, exportOrder }) {
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);

  const [shipmentDetails, setShipmentDetails] = useState({
    origin_port: exportOrder?.port_of_loading || "",
    destination_port: exportOrder?.port_of_discharge || "",
    container_type: exportOrder?.container_type || "40HC",
    cargo_weight: exportOrder?.total_weight || 15000,
    cargo_volume: exportOrder?.total_volume || 50,
    departure_date: exportOrder?.estimated_departure || "",
    cargo_type: "general",
    hazardous: false
  });

  const handleCompareRates = async () => {
    if (!shipmentDetails.origin_port || !shipmentDetails.destination_port) {
      toast.error("Please select origin and destination ports");
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

  const handleSelectQuote = (quote) => {
    setSelectedQuote(quote);
  };

  const handleBookNow = async () => {
    if (!selectedQuote) {
      toast.error("Please select a rate first");
      return;
    }

    await RateComparisonService.saveComparison(
      exportOrder?.company_id,
      comparison,
      selectedQuote
    );

    onSelectRate(selectedQuote);
    onClose();
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Rate Shopping - Compare & Book
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Shipment Details Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Shipment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Origin Port *</Label>
                  <Input
                    placeholder="e.g., CATOR"
                    value={shipmentDetails.origin_port}
                    onChange={(e) => setShipmentDetails({...shipmentDetails, origin_port: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Destination Port *</Label>
                  <Input
                    placeholder="e.g., AEJEA"
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
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Comparing Rates...
                  </>
                ) : (
                  <>
                    <Ship className="w-4 h-4 mr-2" />
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
                <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                          <TrendingDown className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Best Rate Available</p>
                          <h3 className="text-2xl font-bold text-gray-900">
                            ${comparison.best_rate.total_rate.toLocaleString()}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {comparison.best_rate.carrier_name} • {comparison.best_rate.transit_time_days} days transit
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleSelectQuote(comparison.best_rate)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Select Best Rate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* All Rates */}
              <div className="grid gap-4">
                <h3 className="font-semibold text-lg">All Available Rates ({comparison.quotes.length})</h3>
                {comparison.quotes.map((quote) => (
                  <Card 
                    key={quote.quote_id}
                    className={`cursor-pointer transition-all ${
                      selectedQuote?.quote_id === quote.quote_id 
                        ? 'ring-2 ring-blue-500 shadow-lg' 
                        : 'hover:shadow-md'
                    } ${
                      quote === comparison.best_rate 
                        ? 'border-green-400' 
                        : ''
                    }`}
                    onClick={() => handleSelectQuote(quote)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-3xl">{getCarrierLogo(quote.carrier_code)}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-lg">{quote.carrier_name}</h4>
                                {quote === comparison.best_rate && (
                                  <Badge className="bg-green-600">Best Rate</Badge>
                                )}
                                <Badge variant="outline">{quote.service_type}</Badge>
                              </div>
                              <p className="text-sm text-gray-600">{quote.route}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-gray-600">Ocean Freight</p>
                              <p className="font-semibold">${quote.ocean_freight.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Fuel Surcharge</p>
                              <p className="font-semibold">${quote.fuel_surcharge.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">THC (Origin + Dest)</p>
                              <p className="font-semibold">${(quote.thc_origin + quote.thc_destination).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Other Fees</p>
                              <p className="font-semibold">${(quote.documentation_fee + quote.security_fee).toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {quote.transit_time_days} days
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              ETD: {format(new Date(quote.estimated_departure), 'MMM d')}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              ETA: {format(new Date(quote.estimated_arrival), 'MMM d')}
                            </div>
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              {quote.available_space} TEU available
                            </div>
                          </div>

                          {quote.special_conditions?.length > 0 && (
                            <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
                              <AlertCircle className="w-3 h-3 inline mr-1" />
                              {quote.special_conditions.join(", ")}
                            </div>
                          )}
                        </div>

                        <div className="text-right pl-6">
                          <p className="text-sm text-gray-600 mb-1">Total Rate</p>
                          <p className="text-3xl font-bold text-gray-900">
                            ${quote.total_rate.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Valid until {format(new Date(quote.valid_until), 'MMM d, yyyy')}
                          </p>
                          {selectedQuote?.quote_id === quote.quote_id && (
                            <Badge className="mt-2 bg-blue-600">Selected</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Failed Carriers */}
              {comparison.failed.length > 0 && (
                <Card className="bg-gray-50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">
                      Unable to get rates from: {comparison.failed.map(f => f.carrier).join(", ")}
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Action Buttons */}
          {comparison && (
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleBookNow}
                disabled={!selectedQuote}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Ship className="w-4 h-4 mr-2" />
                Book with {selectedQuote?.carrier_name || 'Selected Carrier'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}