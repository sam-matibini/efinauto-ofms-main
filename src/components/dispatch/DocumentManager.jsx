import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function DocumentManager() {
  return (
    <Card>
      <CardContent className="py-12 text-center text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>Document management & digital signatures</p>
        <p className="text-sm mt-2">Upload BOL, delivery notes, and POD generation</p>
      </CardContent>
    </Card>
  );
}