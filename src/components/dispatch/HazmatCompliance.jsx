import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function HazmatCompliance({ shipments }) {
  return (
    <Card>
      <CardContent className="py-12 text-center text-gray-500">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-orange-400" />
        <p>HAZMAT compliance dashboard</p>
        <p className="text-sm mt-2">{shipments.length} HAZMAT shipments to review</p>
      </CardContent>
    </Card>
  );
}