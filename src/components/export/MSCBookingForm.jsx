import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ship, Package, Calendar, Anchor, CheckCircle, AlertCircle } from "lucide-react";
import PortSelector from "@/components/shared/PortSelector";

// ISO 6346 container validation
const validateContainerNumber = (containerNumber) => {
  if (!containerNumber) return { valid: false, message: "" };
  
  const pattern = /^[A-Z]{4}\d{7}$/;
  if (!pattern.test(containerNumber)) {
    return { 
      valid: false, 
      message: "Invalid format. Must be 4 letters + 7 digits (e.g., MSCU1234567)" 
    };
  }
  
  return { valid: true, message: "Valid ISO 6346 format" };
};

const CONTAINER_TYPES = [
  { code: "20GP", label: "20ft General Purpose" },
  { code: "40GP", label: "40ft General Purpose" },
  { code: "40HC", label: "40ft High Cube" },
  { code: "45HC", label: "45ft High Cube" },
  { code: "20RF", label: "20ft Reefer" },
  { code: "40RF", label: "40ft Reefer" },
  { code: "20OT", label: "20ft Open Top" },
  { code: "40OT", label: "40ft Open Top" },
  { code: "20FR", label: "20ft Flat Rack" },
  { code: "40FR", label: "40ft Flat Rack" }
];

export default function MSCBookingForm({ order, onUpdate, readOnly = false }) {
  const [bookingData, setBookingData] = useState({
    booking_reference: order.booking_reference || "",
    bill_of_lading_number: order.bill_of_lading_number || "",
    vessel_name: order.vessel_name || "",
    voyage_number: order.voyage_number || "",
    container_number: order.container_number || "",
    container_type: order.container_type || "40HC",
    seal_number: order.seal_number || "",
    port_of_loading: order.port_of_loading || "",
    port_of_discharge: order.port_of_discharge || "",
    estimated_departure: order.estimated_departure || "",
    estimated_arrival: order.estimated_arrival || ""
  });

  const containerValidation = validateContainerNumber(bookingData.container_number);
  const isBookingConfirmed = order.booking_confirmed;
  const isBlIssued = order.bl_issued;

  const handleChange = (field, value) => {
    setBookingData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onUpdate(bookingData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Ship className="w-5 h-5 text-blue-600" />
            MSC Booking Details
          </span>
          {isBookingConfirmed && (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              Booking Confirmed
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Booking Reference */}
        <div>
          <Label>Booking Reference Number *</Label>
          <Input
            value={bookingData.booking_reference}
            onChange={(e) => handleChange("booking_reference", e.target.value)}
            placeholder="e.g., MSCBKG12345678"
            disabled={readOnly || isBookingConfirmed}
          />
          <p className="text-xs text-gray-500 mt-1">
            MSC booking reference provided by carrier
          </p>
        </div>

        {/* Bill of Lading */}
        <div>
          <Label className="flex items-center gap-2">
            Bill of Lading Number
            {isBlIssued && <Badge variant="outline" className="text-green-600">Issued</Badge>}
          </Label>
          <Input
            value={bookingData.bill_of_lading_number}
            onChange={(e) => handleChange("bill_of_lading_number", e.target.value)}
            placeholder="e.g., MSCUXXXXXXXX"
            disabled={readOnly}
          />
          <p className="text-xs text-gray-500 mt-1">
            Original B/L number issued by MSC
          </p>
        </div>

        {/* Vessel & Voyage */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center gap-2">
              <Anchor className="w-4 h-4" />
              Vessel Name
            </Label>
            <Input
              value={bookingData.vessel_name}
              onChange={(e) => handleChange("vessel_name", e.target.value)}
              placeholder="e.g., MSC GÜLSÜN"
              disabled={readOnly}
            />
          </div>
          <div>
            <Label>Voyage Number</Label>
            <Input
              value={bookingData.voyage_number}
              onChange={(e) => handleChange("voyage_number", e.target.value)}
              placeholder="e.g., 251E"
              disabled={readOnly}
            />
          </div>
        </div>

        {/* Container Details */}
        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Package className="w-4 h-4" />
            Container Information
          </h4>

          <div>
            <Label>Container Type *</Label>
            <Select 
              value={bookingData.container_type} 
              onValueChange={(v) => handleChange("container_type", v)}
              disabled={readOnly || isBookingConfirmed}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTAINER_TYPES.map(ct => (
                  <SelectItem key={ct.code} value={ct.code}>
                    {ct.code} - {ct.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Container Number (ISO 6346) *</Label>
            <Input
              value={bookingData.container_number}
              onChange={(e) => handleChange("container_number", e.target.value.toUpperCase())}
              placeholder="MSCU1234567"
              disabled={readOnly || isBookingConfirmed}
              className={
                bookingData.container_number && !containerValidation.valid 
                  ? "border-red-500" 
                  : containerValidation.valid 
                    ? "border-green-500" 
                    : ""
              }
            />
            {bookingData.container_number && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${
                containerValidation.valid ? "text-green-600" : "text-red-600"
              }`}>
                {containerValidation.valid ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  <AlertCircle className="w-3 h-3" />
                )}
                {containerValidation.message}
              </p>
            )}
          </div>

          <div>
            <Label>Seal Number *</Label>
            <Input
              value={bookingData.seal_number}
              onChange={(e) => handleChange("seal_number", e.target.value)}
              placeholder="e.g., MSC123456"
              disabled={readOnly || isBookingConfirmed}
            />
          </div>
        </div>

        {/* Ports */}
        <div className="grid grid-cols-2 gap-4">
          <PortSelector
            label="Port of Loading (POL)"
            value={bookingData.port_of_loading}
            onChange={(v) => handleChange("port_of_loading", v)}
            disabled={readOnly || isBookingConfirmed}
          />
          <PortSelector
            label="Port of Discharge (POD)"
            value={bookingData.port_of_discharge}
            onChange={(v) => handleChange("port_of_discharge", v)}
            disabled={readOnly || isBookingConfirmed}
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Estimated Departure (ETD)
            </Label>
            <Input
              type="date"
              value={bookingData.estimated_departure}
              onChange={(e) => handleChange("estimated_departure", e.target.value)}
              disabled={readOnly}
            />
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Estimated Arrival (ETA)
            </Label>
            <Input
              type="date"
              value={bookingData.estimated_arrival}
              onChange={(e) => handleChange("estimated_arrival", e.target.value)}
              disabled={readOnly}
            />
          </div>
        </div>

        {!readOnly && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              onClick={handleSave}
              disabled={
                !bookingData.booking_reference || 
                !bookingData.container_number || 
                !containerValidation.valid ||
                !bookingData.seal_number ||
                !bookingData.container_type
              }
            >
              Save MSC Booking Details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}