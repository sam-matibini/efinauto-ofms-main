import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User } from "lucide-react";

export default function AppointmentDialog({ open, onClose }) {
  const [date, setDate] = useState(new Date());

  // Mock appointments data
  const appointments = [
    { time: "09:00", customer: "John Doe", service: "Oil Change", technician: "Mike" },
    { time: "11:00", customer: "Jane Smith", service: "Brake Service", technician: "Tom" },
    { time: "14:00", customer: "Bob Wilson", service: "Inspection", technician: "Mike" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Appointment Schedule</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 py-4">
          <div>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">
              Appointments for {date?.toLocaleDateString()}
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {appointments.map((apt, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold">{apt.time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="w-3 h-3" />
                          {apt.customer}
                        </div>
                        <p className="text-sm mt-1">{apt.service}</p>
                      </div>
                      <Badge variant="outline">{apt.technician}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button className="w-full">
              <Clock className="w-4 h-4 mr-2" />
              Schedule New Appointment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}