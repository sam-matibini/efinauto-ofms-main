import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Globe, MapPin, DollarSign, Anchor, Plus, Download, Upload, Shield } from "lucide-react";
import { toast } from "sonner";

export default function ISODataManagement() {
  const [activeTab, setActiveTab] = useState("countries");
  const queryClient = useQueryClient();

  const { data: countries = [] } = useQuery({
    queryKey: ['countries'],
    queryFn: () => supabase.entities.Country.list('-sort_order'),
  });

  const { data: subdivisions = [] } = useQuery({
    queryKey: ['subdivisions'],
    queryFn: () => supabase.entities.Subdivision.list('-sort_order'),
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => supabase.entities.Currency.list('-sort_order'),
  });

  const { data: ports = [] } = useQuery({
    queryKey: ['ports'],
    queryFn: () => supabase.entities.Port.list('-sort_order'),
  });

  const seedCanadaData = async () => {
    try {
      // Seed Canada
      await supabase.entities.Country.create({
        iso2_code: "CA",
        iso3_code: "CAN",
        country_name: "Canada",
        currency_iso_code: "CAD",
        phone_code: "+1",
        active: true,
        sort_order: 1
      });

      // Seed Canadian provinces
      const provinces = [
        { iso_code: "CA-AB", name: "Alberta" },
        { iso_code: "CA-BC", name: "British Columbia" },
        { iso_code: "CA-MB", name: "Manitoba" },
        { iso_code: "CA-NB", name: "New Brunswick" },
        { iso_code: "CA-NL", name: "Newfoundland and Labrador" },
        { iso_code: "CA-NS", name: "Nova Scotia" },
        { iso_code: "CA-ON", name: "Ontario" },
        { iso_code: "CA-PE", name: "Prince Edward Island" },
        { iso_code: "CA-QC", name: "Quebec" },
        { iso_code: "CA-SK", name: "Saskatchewan" },
        { iso_code: "CA-NT", name: "Northwest Territories" },
        { iso_code: "CA-NU", name: "Nunavut" },
        { iso_code: "CA-YT", name: "Yukon" }
      ];

      for (const prov of provinces) {
        await supabase.entities.Subdivision.create({
          iso_code: prov.iso_code,
          country_iso2: "CA",
          subdivision_name: prov.name,
          subdivision_type: prov.iso_code.includes("NT") || prov.iso_code.includes("NU") || prov.iso_code.includes("YT") ? "territory" : "province",
          active: true
        });
      }

      // Seed USA
      await supabase.entities.Country.create({
        iso2_code: "US",
        iso3_code: "USA",
        country_name: "United States",
        currency_iso_code: "USD",
        phone_code: "+1",
        active: true,
        sort_order: 2
      });

      // Seed common currencies
      const currenciesData = [
        { iso_code: "CAD", name: "Canadian Dollar", symbol: "$" },
        { iso_code: "USD", name: "US Dollar", symbol: "$" },
        { iso_code: "EUR", name: "Euro", symbol: "€" },
        { iso_code: "GBP", name: "British Pound", symbol: "£" },
        { iso_code: "JPY", name: "Japanese Yen", symbol: "¥" },
        { iso_code: "NGN", name: "Nigerian Naira", symbol: "₦" }
      ];

      for (const curr of currenciesData) {
        await supabase.entities.Currency.create({
          iso_code: curr.iso_code,
          currency_name: curr.name,
          symbol: curr.symbol,
          active: true
        });
      }

      // Seed major ports
      const portsData = [
        { un_locode: "CATOR", name: "Toronto", country: "CA" },
        { un_locode: "CAVAN", name: "Vancouver", country: "CA" },
        { un_locode: "CAMTR", name: "Montreal", country: "CA" },
        { un_locode: "USLAX", name: "Los Angeles", country: "US" },
        { un_locode: "USNYC", name: "New York", country: "US" },
        { un_locode: "JPYOK", name: "Yokohama", country: "JP" },
        { un_locode: "GBLHR", name: "London Heathrow", country: "GB" }
      ];

      for (const port of portsData) {
        await supabase.entities.Port.create({
          un_locode: port.un_locode,
          port_name: port.name,
          country_iso2: port.country,
          port_type: "seaport",
          active: true
        });
      }

      queryClient.invalidateQueries();
      toast.success("ISO master data seeded successfully");
    } catch (error) {
      toast.error("Failed to seed data: " + error.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            ISO Standards Management
          </h1>
          <p className="text-gray-600 mt-1">
            System-wide ISO code management for international compliance
          </p>
        </div>
        <Button onClick={seedCanadaData} className="bg-green-600 hover:bg-green-700">
          <Download className="w-4 h-4 mr-2" />
          Seed Master Data
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{countries.length}</div>
                <div className="text-sm text-gray-600">Countries</div>
              </div>
              <Globe className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{subdivisions.length}</div>
                <div className="text-sm text-gray-600">Provinces/States</div>
              </div>
              <MapPin className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{currencies.length}</div>
                <div className="text-sm text-gray-600">Currencies</div>
              </div>
              <DollarSign className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{ports.length}</div>
                <div className="text-sm text-gray-600">Ports</div>
              </div>
              <Anchor className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="countries">Countries (ISO 3166-1)</TabsTrigger>
          <TabsTrigger value="subdivisions">Provinces/States (ISO 3166-2)</TabsTrigger>
          <TabsTrigger value="currencies">Currencies (ISO 4217)</TabsTrigger>
          <TabsTrigger value="ports">Ports (UN/LOCODE)</TabsTrigger>
        </TabsList>

        <TabsContent value="countries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Countries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {countries.map((country) => (
                  <div key={country.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium">{country.country_name}</div>
                        <div className="text-sm text-gray-600">
                          {country.iso2_code} / {country.iso3_code} • {country.currency_iso_code}
                        </div>
                      </div>
                    </div>
                    <Badge variant={country.active ? "default" : "secondary"}>
                      {country.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subdivisions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Provinces & States</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {subdivisions.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="font-medium">{sub.subdivision_name}</div>
                        <div className="text-sm text-gray-600">
                          {sub.iso_code} • {sub.country_iso2}
                        </div>
                      </div>
                    </div>
                    <Badge variant={sub.active ? "default" : "secondary"}>
                      {sub.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currencies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Currencies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {currencies.map((currency) => (
                  <div key={currency.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-yellow-600" />
                      <div>
                        <div className="font-medium">{currency.currency_name}</div>
                        <div className="text-sm text-gray-600">
                          {currency.iso_code} • {currency.symbol}
                        </div>
                      </div>
                    </div>
                    <Badge variant={currency.active ? "default" : "secondary"}>
                      {currency.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ports & Terminals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ports.map((port) => (
                  <div key={port.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Anchor className="w-5 h-5 text-purple-600" />
                      <div>
                        <div className="font-medium">{port.port_name}</div>
                        <div className="text-sm text-gray-600">
                          {port.un_locode} • {port.country_iso2}
                        </div>
                      </div>
                    </div>
                    <Badge variant={port.active ? "default" : "secondary"}>
                      {port.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}