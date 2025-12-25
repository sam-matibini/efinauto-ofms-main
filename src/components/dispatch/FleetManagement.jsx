import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Truck } from "lucide-react";

export default function FleetManagement() {
  return (
    <Card>
      <CardContent className="py-12 text-center text-gray-500">
        <Truck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>Fleet management interface</p>
        <p className="text-sm mt-2">Truck and trailer configuration coming soon</p>
      </CardContent>
    </Card>
  );
}