import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Ship, DollarSign, Clock, TrendingUp } from "lucide-react";
import { CarrierAPIService } from "./CarrierAPIService";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { format, addDays } from "date-fns";

export default function ShipmentBookingDialog({ open, onClose, exportOrder }) {
  const [step, setStep] = useState(1); // 1: Get Quotes, 2: Select Quote, 3: Confirm
  const [quotes, setQuotes] = useState([]);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const bookingMutation = useMutation({
    mutationFn: async (bookingData) => {
      // Book with carrier
      const booking = await CarrierAPIService.bookShipment(
        bookingData.carrier,
        bookingData.shipmentData
      );

      // Create shipment tracking record
      const tracking = await supabase.entities.ShipmentTracking.create({
        company_id: exportOrder.company_id,
        export_order_id: exportOrder.id,
        tracking_number: booking.tracking_number,
        carrier: bookingData.carrier,
        current_status: 'booked',
        estimated_delivery: booking.estimated_arrival,
        tracking_events: [{
          timestamp: new Date().toISOString(),
          status: 'booked',
          location: bookingData.shipmentData.origin,
          description: `Shipment booked with ${bookingData.carrier}`,
          event_code: 'BOOKED'
        }]
      });

      // Update export order
      await supabase.entities.ExportOrder.update(exportOrder.id, {
        carrier: bookingData.carrier,
        booking_reference: booking.booking_reference,
        tracking_number: booking.tracking_number,
        container_number: booking.container_number,
        estimated_departure: booking.estimated_departure,
        estimated_arrival: booking.estimated_arrival,
        freight_cost: booking.freight_cost,
        export_status: 'logistics_booked'
      });

      return { booking, tracking };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportOrders'] });
      queryClient.invalidateQueries({ queryKey: ['shipmentTracking'] });
      toast.success("Shipment booked successfully");
      onClose();
    },
    onError: (error) => {
      toast.error("Failed to book shipment: " + error.message);
    }
  });

  const handleGetQuotes = async () => {
    setLoading(true);
    try {
      const shipmentDetails = {
        origin: exportOrder.country_of_origin || 'CA',
        destination: exportOrder.destination_country,
        cargoType: exportOrder.export_type,
        weight: exportOrder.total_weight || 1000,
        containerType: exportOrder.container_type || '40ft'
      };

      const fetchedQuotes = await CarrierAPIService.getQuotes(shipmentDetails);
      setQuotes(fetchedQuotes);
      setStep(2);
    } catch (error) {
      toast.error("Failed to get quotes: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuote = (quote) => {
    setSelectedQuote(quote);
    setStep(3);
  };

  const handleConfirmBooking = async () => {
    setLoading(true);
    try {
      await bookingMutation.mutateAsync({
        carrier: selectedQuote.carrier,
        shipmentData: {
          origin: exportOrder.country_of_origin || 'CA',
          destination: exportOrder.destination_country,
          cargoType: exportOrder.export_type,
          weight: exportOrder.total_weight || 1000,
          containerType: exportOrder.container_type || '40ft',
          incoterms: exportOrder.incoterms
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship className="w-5 h-5" />
            Book Shipment - {exportOrder?.export_order_number}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Origin</Label>
                <Input value={exportOrder?.country_of_origin || 'CA'} disabled />
              </div>
              <div>
                <Label>Destination</Label>
                <Input value={exportOrder?.destination_country} disabled />
              </div>
              <div>
                <Label>Cargo Type</Label>
                <Input value={exportOrder?.export_type} disabled className="capitalize" />
              </div>
              <div>
                <Label>Weight (kg)</Label>
                <Input value={exportOrder?.total_weight || 1000} disabled />
              </div>
              <div>
                <Label>Container Type</Label>
                <Input value={exportOrder?.container_type || '40ft'} disabled />
              </div>
              <div>
                <Label>Incoterms</Label>
                <Input value={exportOrder?.incoterms || 'FOB'} disabled />
              </div>
            </div>
            <Button onClick={handleGetQuotes} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Ship className="w-4 h-4 mr-2" />}
              Get Freight Quotes
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Select a carrier from the quotes below:</p>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {quotes.map((quote, idx) => (
                <Card key={idx} className="cursor-pointer hover:border-blue-500 transition-colors" onClick={() => handleSelectQuote(quote)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-lg capitalize">{quote.carrier.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-gray-600">{quote.service_level || 'Standard Service'}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {quote.transit_days} days
                          </span>
                          <span className="text-gray-500">
                            Departs: {format(new Date(quote.estimated_departure), 'MMM d')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">
                          {quote.currency} ${quote.rate.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">Freight cost</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {step === 3 && selectedQuote && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Booking Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Carrier:</span>
                  <span className="font-medium capitalize">{selectedQuote.carrier.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium">{selectedQuote.service_level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Transit Time:</span>
                  <span className="font-medium">{selectedQuote.transit_days} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Departure:</span>
                  <span className="font-medium">{format(new Date(selectedQuote.estimated_departure), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Arrival:</span>
                  <span className="font-medium">{format(new Date(selectedQuote.estimated_arrival), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t pt-2 mt-2">
                  <span>Freight Cost:</span>
                  <span className="text-green-600">{selectedQuote.currency} ${selectedQuote.rate.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                Back to Quotes
              </Button>
              <Button onClick={handleConfirmBooking} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Confirm Booking
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}