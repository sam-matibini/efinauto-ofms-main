import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const servicePackages = [
  {
    name: "Basic Oil Change",
    price: 49.99,
    duration: "30 min",
    includes: ["Oil change", "Oil filter replacement", "Fluid top-up", "Visual inspection"]
  },
  {
    name: "Standard Maintenance",
    price: 149.99,
    duration: "1.5 hours",
    includes: ["Oil change", "Filter replacement", "Tire rotation", "Brake inspection", "Fluid check", "Battery test"]
  },
  {
    name: "Premium Service",
    price: 299.99,
    duration: "3 hours",
    includes: ["Full oil service", "All filter replacement", "Tire rotation & balance", "Complete brake service", "Full inspection", "Diagnostic scan"]
  },
  {
    name: "Brake Service Package",
    price: 249.99,
    duration: "2 hours",
    includes: ["Brake pad replacement", "Rotor resurfacing", "Brake fluid flush", "Caliper inspection", "Test drive"]
  }
];

export default function ServicePackagesDialog({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Service Packages</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 py-4">
          {servicePackages.map((pkg, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{pkg.name}</span>
                  <Badge className="bg-green-100 text-green-700">${pkg.price}</Badge>
                </CardTitle>
                <p className="text-sm text-gray-500">{pkg.duration}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {pkg.includes.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full mt-4" variant="outline">
                  Use This Package
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}