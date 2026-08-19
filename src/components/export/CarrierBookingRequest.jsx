import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, CheckCircle, AlertCircle } from "lucide-react";
import { getCarrierAPIService, isCarrierAPIEnabled } from "./CarrierAPIRegistry";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";

export default function CarrierBookingRequest({ order, onBookingConfirmed }) {
  const [loading, setLoading] = useState(false);
  const [bookingStatus, setBookingStatus] = useState(null);

  const apiEnabled = isCarrierAPIEnabled(order.carrier_code);
  const canSubmitBooking = !order.booking_reference && order.export_status === 'approved';

  const submitBookingRequest = async () => {
    setLoading(true);
    try {
      const apiService = getCarrierAPIService(order.carrier_code);
      
      // Prepare booking data
      const bookingData = {
        export_order_number: order.export_order_number,
        shipper: {
          name: order.company_id, // Should be company name
          address: "Shipper address"
        },
        consignee: {
          name: order.consignee_name,
          email: order.consignee_email,
          phone: order.consignee_phone,
          address: order.consignee_address
        },
        cargo: {
          description: (order.line_items || []).map(item => item.description).join(", "),
          weight: order.total_weight,
          volume: order.total_volume,
          value: order.total_value,
          currency: order.currency
        },
        route: {
          port_of_loading: order.port_of_loading,
          port_of_discharge: order.port_of_discharge,
          destination_country: order.destination_country
        },
        container: {
          type: order.container_type,
          quantity: 1
        },
        incoterms: order.incoterms,
        requested_departure: order.estimated_departure
      };

      const result = await apiService.submitBookingRequest(bookingData);

      if (result.success) {
        // Update export order with booking reference
        await supabase.entities.ExportOrder.update(order.id, {
          booking_reference: result.booking_reference,
          export_status: 'logistics_booked',
          notes: `${order.notes || ''}\n[Booking] Request submitted: ${result.booking_reference} at ${new Date().toISOString()}`
        });

        setBookingStatus({
          success: true,
          booking_reference: result.booking_reference,
          confirmation_number: result.confirmation_number
        });

        toast.success("Booking request submitted successfully");
        
        if (onBookingConfirmed) {
          onBookingConfirmed(result);
        }
      } else {
        setBookingStatus({
          success: false,
          error: result.error
        });
        toast.error(result.message || "Booking request failed");
      }
    } catch (error) {
      toast.error("Failed to submit booking request");
      console.error(error);
      setBookingStatus({
        success: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  if (!apiEnabled) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          <Send className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>Direct booking not available for this carrier</p>
          <p className="text-sm">Use manual booking entry</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Direct Carrier Booking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canSubmitBooking && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {order.booking_reference 
                ? "Booking already exists for this order"
                : "Order must be approved before submitting booking request"}
            </AlertDescription>
          </Alert>
        )}

        {bookingStatus?.success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <p className="font-semibold">Booking request submitted successfully</p>
              <p className="text-sm mt-1">
                Booking Reference: <span className="font-mono">{bookingStatus.booking_reference}</span>
              </p>
              {bookingStatus.confirmation_number && (
                <p className="text-sm">
                  Confirmation: <span className="font-mono">{bookingStatus.confirmation_number}</span>
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {bookingStatus?.success === false && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold">Booking request failed</p>
              <p className="text-sm mt-1">{bookingStatus.error}</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Booking Summary */}
        <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
          <h4 className="font-semibold">Booking Summary</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-gray-600">Carrier:</span>
              <p className="font-medium">{order.carrier_code}</p>
            </div>
            <div>
              <span className="text-gray-600">Container:</span>
              <p className="font-medium">{order.container_type || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-gray-600">Route:</span>
              <p className="font-medium">{order.port_of_loading} → {order.port_of_discharge}</p>
            </div>
            <div>
              <span className="text-gray-600">Total Weight:</span>
              <p className="font-medium">{order.total_weight || 0} kg</p>
            </div>
          </div>
        </div>

        <Button
          onClick={submitBookingRequest}
          disabled={!canSubmitBooking || loading || bookingStatus?.success}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting Booking Request...
            </>
          ) : bookingStatus?.success ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Booking Submitted
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Submit Booking Request to {order.carrier_code}
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          Phase 2: Direct API integration with carrier booking systems
        </p>
      </CardContent>
    </Card>
  );
}