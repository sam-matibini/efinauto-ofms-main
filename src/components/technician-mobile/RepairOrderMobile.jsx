import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Clock, 
  Camera,
  Plus,
  Save,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import PhotoCapture from "./PhotoCapture";
import PartsLogger from "./PartsLogger";
import TimeLogger from "./TimeLogger";

export default function RepairOrderMobile({ order, onBack, onUpdate, isOnline, technician }) {
  const [notes, setNotes] = useState(order.notes || "");
  const [diagnosis, setDiagnosis] = useState(order.diagnosis || "");
  const [photos, setPhotos] = useState(order.photos || []);
  const [partsUsed, setPartsUsed] = useState(order.parts_used || []);
  const [timeTracking, setTimeTracking] = useState(order.time_tracking || []);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [showPartsLogger, setShowPartsLogger] = useState(false);
  const [showTimeLogger, setShowTimeLogger] = useState(false);

  const handleStatusChange = (newStatus) => {
    const updates = {
      status: newStatus,
      notes,
      diagnosis,
      photos,
      parts_used: partsUsed,
      time_tracking: timeTracking,
    };

    if (newStatus === 'completed') {
      updates.completion_date = new Date().toISOString().split('T')[0];
    }

    onUpdate(order.id, updates);
    toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
  };

  const handleSaveProgress = () => {
    onUpdate(order.id, {
      notes,
      diagnosis,
      photos,
      parts_used: partsUsed,
      time_tracking: timeTracking,
    });
    toast.success("Progress saved");
  };

  const handlePhotoCapture = (photoUrl) => {
    const newPhoto = {
      url: photoUrl,
      description: "",
      uploaded_date: new Date().toISOString(),
    };
    setPhotos([...photos, newPhoto]);
    toast.success("Photo added");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:bg-blue-500"
            onClick={onBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold">{order.order_number}</h1>
            <p className="text-sm text-blue-100">{order.customer_name}</p>
          </div>
          <Badge className={
            order.status === 'in_progress' ? 'bg-blue-200 text-blue-900' :
            order.status === 'waiting_parts' ? 'bg-yellow-200 text-yellow-900' :
            'bg-gray-200 text-gray-900'
          }>
            {order.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Vehicle Info */}
      <Card className="m-4">
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Vehicle Information</h3>
          <div className="space-y-1 text-sm">
            <p><span className="text-gray-600">Make/Model:</span> {order.vehicle_make} {order.vehicle_model}</p>
            <p><span className="text-gray-600">Year:</span> {order.vehicle_year}</p>
            {order.vehicle_vin && <p><span className="text-gray-600">VIN:</span> {order.vehicle_vin}</p>}
            {order.mileage && <p><span className="text-gray-600">Mileage:</span> {order.mileage.toLocaleString()} km</p>}
          </div>
        </CardContent>
      </Card>

      {/* Service Details */}
      <Card className="m-4">
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Service Details</h3>
          <p className="text-sm text-gray-700">{order.description}</p>
          {order.service_type && (
            <Badge className="mt-2 bg-blue-100 text-blue-700">
              {order.service_type.replace('_', ' ')}
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="diagnosis" className="m-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="diagnosis">Notes</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="parts">Parts</TabsTrigger>
          <TabsTrigger value="time">Time</TabsTrigger>
        </TabsList>

        <TabsContent value="diagnosis" className="space-y-3">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">
                  Diagnosis
                </label>
                <Textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Enter your diagnosis..."
                  rows={4}
                  className="text-base"
                />
              </div>
              
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">
                  Additional Notes
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter notes..."
                  rows={4}
                  className="text-base"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos" className="space-y-3">
          <Button 
            onClick={() => setShowPhotoCapture(true)}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Camera className="w-4 h-4 mr-2" />
            Capture Photo
          </Button>

          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo, index) => (
              <Card key={index}>
                <CardContent className="p-2">
                  <img 
                    src={photo.url} 
                    alt={`Repair ${index + 1}`}
                    className="w-full h-32 object-cover rounded"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(photo.uploaded_date).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {photos.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Camera className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No photos yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="parts" className="space-y-3">
          <Button 
            onClick={() => setShowPartsLogger(true)}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Part
          </Button>

          {partsUsed.length > 0 ? (
            partsUsed.map((part, index) => (
              <Card key={index}>
                <CardContent className="p-3">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold text-sm">{part.part_name}</p>
                      <p className="text-xs text-gray-600">{part.part_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">Qty: {part.quantity}</p>
                      <p className="text-xs text-gray-600">${part.total_cost}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-sm text-gray-500">No parts logged yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="time" className="space-y-3">
          <Button 
            onClick={() => setShowTimeLogger(true)}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Clock className="w-4 h-4 mr-2" />
            Log Time
          </Button>

          {timeTracking.length > 0 ? (
            timeTracking.map((entry, index) => (
              <Card key={index}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-sm">{entry.task_description}</p>
                      <p className="text-xs text-gray-600">
                        {entry.start_time} - {entry.end_time}
                      </p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700">
                      {entry.hours}h
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No time logged yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 space-y-2">
        <Button 
          onClick={handleSaveProgress}
          className="w-full bg-gray-600 hover:bg-gray-700"
          disabled={!isOnline}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Progress
        </Button>

        <div className="grid grid-cols-2 gap-2">
          {order.status === 'pending' && (
            <Button 
              onClick={() => handleStatusChange('in_progress')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Start Job
            </Button>
          )}
          
          {order.status === 'in_progress' && (
            <>
              <Button 
                onClick={() => handleStatusChange('waiting_parts')}
                variant="outline"
              >
                Need Parts
              </Button>
              <Button 
                onClick={() => handleStatusChange('completed')}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete
              </Button>
            </>
          )}

          {order.status === 'waiting_parts' && (
            <Button 
              onClick={() => handleStatusChange('in_progress')}
              className="col-span-2 bg-blue-600 hover:bg-blue-700"
            >
              Resume Job
            </Button>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <PhotoCapture
        open={showPhotoCapture}
        onClose={() => setShowPhotoCapture(false)}
        onCapture={handlePhotoCapture}
        isOnline={isOnline}
      />

      <PartsLogger
        open={showPartsLogger}
        onClose={() => setShowPartsLogger(false)}
        onAddPart={(part) => {
          setPartsUsed([...partsUsed, part]);
          toast.success("Part added");
        }}
        isOnline={isOnline}
      />

      <TimeLogger
        open={showTimeLogger}
        onClose={() => setShowTimeLogger(false)}
        onLogTime={(entry) => {
          setTimeTracking([...timeTracking, { ...entry, technician: technician.full_name }]);
          toast.success("Time logged");
        }}
      />
    </div>
  );
}