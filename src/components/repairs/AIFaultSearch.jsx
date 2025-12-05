import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Car, 
  AlertTriangle, 
  Wrench, 
  DollarSign, 
  Loader2,
  ChevronRight,
  Zap,
  Activity,
  Gauge,
  ThermometerSun,
  X,
  Sparkles,
  CheckCircle2,
  Info
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const vehicleTypes = [
  { id: "car", label: "Car", icon: Car },
  { id: "suv", label: "SUV", icon: Car },
  { id: "truck", label: "Truck", icon: Car },
  { id: "van", label: "Van", icon: Car },
  { id: "motorcycle", label: "Motorcycle", icon: Car },
  { id: "heavy_duty", label: "Heavy-duty / Diesel", icon: Car },
  { id: "ev_hybrid", label: "EV / Hybrid", icon: Zap },
];

const popularMakes = [
  "Toyota", "Honda", "Ford", "Chevrolet", "Hyundai", "Kia", "Nissan", "Dodge", "Ram", 
  "BMW", "Mercedes-Benz", "Audi", "Volkswagen", "Jeep", "GMC", "Subaru", "Mazda", 
  "Lexus", "Acura", "Infiniti", "Buick", "Cadillac", "Lincoln", "Volvo", "Tesla"
];

const commonSymptoms = [
  { id: "check_engine", label: "Check Engine Light", icon: AlertTriangle },
  { id: "rough_idle", label: "Rough Idle", icon: Activity },
  { id: "engine_shaking", label: "Engine Shaking", icon: Gauge },
  { id: "hard_start", label: "Hard Start / No Start", icon: Zap },
  { id: "poor_acceleration", label: "Poor Acceleration", icon: Gauge },
  { id: "overheating", label: "Overheating", icon: ThermometerSun },
  { id: "transmission_jerks", label: "Transmission Jerks", icon: Activity },
  { id: "stalling", label: "Stalling", icon: AlertTriangle },
  { id: "poor_fuel_economy", label: "Poor Fuel Economy", icon: Gauge },
  { id: "unusual_noise", label: "Unusual Noise", icon: Activity },
  { id: "vibration", label: "Vibration", icon: Activity },
  { id: "smoke_exhaust", label: "Smoke from Exhaust", icon: ThermometerSun },
];

const yearRange = Array.from({ length: 30 }, (_, i) => (new Date().getFullYear() - i).toString());

export default function AIFaultSearch() {
  const [searchMode, setSearchMode] = useState("code"); // code, vehicle, symptom
  const [faultCode, setFaultCode] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [engineTrim, setEngineTrim] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [codeSuggestions, setCodeSuggestions] = useState([]);

  const handleFaultCodeChange = (value) => {
    setFaultCode(value.toUpperCase());
    // Auto-suggest fault codes
    if (value.length >= 2) {
      const suggestions = generateCodeSuggestions(value.toUpperCase());
      setCodeSuggestions(suggestions);
    } else {
      setCodeSuggestions([]);
    }
  };

  const generateCodeSuggestions = (prefix) => {
    const commonCodes = [
      "P0171", "P0172", "P0174", "P0175", "P0300", "P0301", "P0302", "P0303",
      "P0420", "P0430", "P0440", "P0441", "P0442", "P0446", "P0455", "P0456",
      "P0500", "P0505", "P0507", "P0520", "P0600", "P0700", "P0715", "P0720"
    ];
    return commonCodes.filter(code => code.startsWith(prefix)).slice(0, 5);
  };

  const toggleSymptom = (symptomId) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptomId) 
        ? prev.filter(id => id !== symptomId)
        : [...prev, symptomId]
    );
  };

  const buildSearchQuery = () => {
    let query = "";
    
    if (searchMode === "code" && faultCode) {
      query = `Provide comprehensive diagnostic information for OBD-II fault code ${faultCode}`;
      if (make || model || year) {
        query += ` specifically for a ${year} ${make} ${model}`.trim();
      }
      if (engineTrim) {
        query += ` with ${engineTrim} engine`;
      }
    } else if (searchMode === "vehicle") {
      query = `List the most common fault codes and issues for a ${year} ${make} ${model}`;
      if (vehicleType) query += ` (${vehicleType})`;
      if (engineTrim) query += ` with ${engineTrim} engine`;
      if (faultCode) query += `. Also provide specific details for fault code ${faultCode}`;
    } else if (searchMode === "symptom") {
      const symptomLabels = selectedSymptoms.map(id => 
        commonSymptoms.find(s => s.id === id)?.label
      ).filter(Boolean);
      query = `What are the most likely fault codes and causes for a vehicle showing these symptoms: ${symptomLabels.join(", ")}`;
      if (make || model || year) {
        query += `. The vehicle is a ${year} ${make} ${model}`.trim();
      }
    }

    return query;
  };

  const handleSearch = async () => {
    const query = buildSearchQuery();
    if (!query) {
      toast.error("Please enter a fault code, select a vehicle, or choose symptoms");
      return;
    }

    setIsSearching(true);
    setSearchResults(null);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${query}

Return a JSON response with the following structure:
{
  "fault_code": "the primary fault code being analyzed",
  "vehicle_info": "vehicle details if provided",
  "severity_level": 1-5 scale (5 being critical),
  "commonality_score": 1-10 scale (how common this issue is),
  "description": "clear explanation of what this code/issue means",
  "symptoms": ["list of common symptoms drivers experience"],
  "likely_causes": [
    {"cause": "cause description", "probability": "high/medium/low", "details": "more info"}
  ],
  "diagnostic_steps": [
    {"step": 1, "description": "what to check first", "tools_needed": "tools if any"}
  ],
  "repair_solutions": [
    {"solution": "repair description", "difficulty": "easy/medium/hard", "diy_possible": true/false}
  ],
  "repair_cost_range": {
    "parts_low": 0,
    "parts_high": 0,
    "labor_low": 0,
    "labor_high": 0,
    "total_low": 0,
    "total_high": 0
  },
  "related_codes": ["other codes that often appear together"],
  "prevention_tips": ["how to prevent this issue"],
  "urgency": "can wait/soon/immediate",
  "safety_concern": true/false,
  "emissions_related": true/false
}`,
        response_json_schema: {
          type: "object",
          properties: {
            fault_code: { type: "string" },
            vehicle_info: { type: "string" },
            severity_level: { type: "number" },
            commonality_score: { type: "number" },
            description: { type: "string" },
            symptoms: { type: "array", items: { type: "string" } },
            likely_causes: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  cause: { type: "string" },
                  probability: { type: "string" },
                  details: { type: "string" }
                }
              } 
            },
            diagnostic_steps: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  step: { type: "number" },
                  description: { type: "string" },
                  tools_needed: { type: "string" }
                }
              } 
            },
            repair_solutions: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  solution: { type: "string" },
                  difficulty: { type: "string" },
                  diy_possible: { type: "boolean" }
                }
              } 
            },
            repair_cost_range: { 
              type: "object",
              properties: {
                parts_low: { type: "number" },
                parts_high: { type: "number" },
                labor_low: { type: "number" },
                labor_high: { type: "number" },
                total_low: { type: "number" },
                total_high: { type: "number" }
              }
            },
            related_codes: { type: "array", items: { type: "string" } },
            prevention_tips: { type: "array", items: { type: "string" } },
            urgency: { type: "string" },
            safety_concern: { type: "boolean" },
            emissions_related: { type: "boolean" }
          }
        },
        add_context_from_internet: true
      });

      setSearchResults(result);
    } catch (error) {
      toast.error("Failed to search fault codes. Please try again.");
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setFaultCode("");
    setVehicleType("");
    setMake("");
    setModel("");
    setYear("");
    setEngineTrim("");
    setSelectedSymptoms([]);
    setSearchResults(null);
    setCodeSuggestions([]);
  };

  const getSeverityColor = (level) => {
    if (level >= 4) return "bg-red-100 text-red-800 border-red-200";
    if (level >= 3) return "bg-orange-100 text-orange-800 border-orange-200";
    if (level >= 2) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-green-100 text-green-800 border-green-200";
  };

  const getUrgencyColor = (urgency) => {
    if (urgency === "immediate") return "bg-red-600";
    if (urgency === "soon") return "bg-orange-500";
    return "bg-green-500";
  };

  return (
    <div className="space-y-6">
      {/* Search Mode Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI-Powered Fault Diagnosis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={searchMode} onValueChange={setSearchMode} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="code" className="text-xs sm:text-sm">
                <Search className="w-4 h-4 mr-2" />
                Fault Code
              </TabsTrigger>
              <TabsTrigger value="vehicle" className="text-xs sm:text-sm">
                <Car className="w-4 h-4 mr-2" />
                Vehicle First
              </TabsTrigger>
              <TabsTrigger value="symptom" className="text-xs sm:text-sm">
                <Activity className="w-4 h-4 mr-2" />
                By Symptoms
              </TabsTrigger>
            </TabsList>

            {/* Fault Code Search */}
            <TabsContent value="code" className="space-y-4">
              <div className="space-y-4">
                <div className="relative">
                  <Label>Enter Fault Code (e.g., P0420, P0171)</Label>
                  <Input
                    placeholder="Enter OBD-II code..."
                    value={faultCode}
                    onChange={(e) => handleFaultCodeChange(e.target.value)}
                    className="text-lg font-mono mt-1"
                  />
                  {codeSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
                      {codeSuggestions.map(code => (
                        <button
                          key={code}
                          onClick={() => { setFaultCode(code); setCodeSuggestions([]); }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 font-mono"
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Optional: Select your vehicle for more accurate results
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Make</Label>
                    <Select value={make} onValueChange={setMake}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select make" />
                      </SelectTrigger>
                      <SelectContent>
                        {popularMakes.map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Model</Label>
                    <Input 
                      placeholder="e.g., Camry" 
                      value={model} 
                      onChange={(e) => setModel(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Year</Label>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearRange.map(y => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Engine/Trim (Optional)</Label>
                    <Input 
                      placeholder="e.g., 2.0L Turbo" 
                      value={engineTrim} 
                      onChange={(e) => setEngineTrim(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Vehicle First Search */}
            <TabsContent value="vehicle" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">Vehicle Type</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {vehicleTypes.map(type => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.id}
                          onClick={() => setVehicleType(type.id === vehicleType ? "" : type.id)}
                          className={`p-3 border rounded-lg flex items-center gap-2 transition-all ${
                            vehicleType === type.id 
                              ? "border-blue-500 bg-blue-50 text-blue-700" 
                              : "hover:border-gray-300"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Make *</Label>
                    <Select value={make} onValueChange={setMake}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select make" />
                      </SelectTrigger>
                      <SelectContent>
                        {popularMakes.map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Model *</Label>
                    <Input 
                      placeholder="e.g., Camry" 
                      value={model} 
                      onChange={(e) => setModel(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Year *</Label>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearRange.map(y => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Engine/Trim</Label>
                    <Input 
                      placeholder="e.g., 2.0L Turbo" 
                      value={engineTrim} 
                      onChange={(e) => setEngineTrim(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Fault Code (Optional)</Label>
                  <Input
                    placeholder="Enter code if known (e.g., P0420)"
                    value={faultCode}
                    onChange={(e) => setFaultCode(e.target.value.toUpperCase())}
                    className="mt-1 font-mono"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Symptom-Based Search */}
            <TabsContent value="symptom" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">Select Symptoms You're Experiencing</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {commonSymptoms.map(symptom => {
                      const Icon = symptom.icon;
                      const isSelected = selectedSymptoms.includes(symptom.id);
                      return (
                        <button
                          key={symptom.id}
                          onClick={() => toggleSymptom(symptom.id)}
                          className={`p-3 border rounded-lg flex items-center gap-2 transition-all text-left ${
                            isSelected 
                              ? "border-purple-500 bg-purple-50 text-purple-700" 
                              : "hover:border-gray-300"
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="text-sm">{symptom.label}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 ml-auto" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-sm text-purple-800 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Optional: Add vehicle details for more accurate diagnosis
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Make</Label>
                    <Select value={make} onValueChange={setMake}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select make" />
                      </SelectTrigger>
                      <SelectContent>
                        {popularMakes.map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Model</Label>
                    <Input 
                      placeholder="e.g., Camry" 
                      value={model} 
                      onChange={(e) => setModel(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Year</Label>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearRange.map(y => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Engine/Trim</Label>
                    <Input 
                      placeholder="e.g., 2.0L Turbo" 
                      value={engineTrim} 
                      onChange={(e) => setEngineTrim(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Search Actions */}
          <div className="flex gap-3 mt-6 pt-4 border-t">
            <Button 
              onClick={handleSearch} 
              disabled={isSearching}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Search & Diagnose
                </>
              )}
            </Button>
            <Button variant="outline" onClick={clearSearch}>
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults && (
        <div className="space-y-4">
          {/* Header Card */}
          <Card className="border-2 border-purple-200">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold font-mono">{searchResults.fault_code}</h2>
                    {searchResults.vehicle_info && (
                      <Badge variant="outline">{searchResults.vehicle_info}</Badge>
                    )}
                  </div>
                  <p className="text-gray-600">{searchResults.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className={getSeverityColor(searchResults.severity_level)}>
                    Severity: {searchResults.severity_level}/5
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-800">
                    Commonality: {searchResults.commonality_score}/10
                  </Badge>
                  <Badge className={`${getUrgencyColor(searchResults.urgency)} text-white`}>
                    {searchResults.urgency?.replace("_", " ").toUpperCase()}
                  </Badge>
                  {searchResults.safety_concern && (
                    <Badge className="bg-red-600 text-white">⚠️ Safety Concern</Badge>
                  )}
                  {searchResults.emissions_related && (
                    <Badge className="bg-green-600 text-white">🌿 Emissions Related</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Symptoms */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-600" />
                  Common Symptoms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {searchResults.symptoms?.map((symptom, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 mt-0.5 text-orange-500" />
                      <span className="text-sm">{symptom}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Cost Estimate */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Repair Cost Estimate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Parts:</span>
                    <span className="font-medium">
                      ${searchResults.repair_cost_range?.parts_low} - ${searchResults.repair_cost_range?.parts_high}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Labor:</span>
                    <span className="font-medium">
                      ${searchResults.repair_cost_range?.labor_low} - ${searchResults.repair_cost_range?.labor_high}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-semibold">Total Estimate:</span>
                    <span className="font-bold text-lg text-green-600">
                      ${searchResults.repair_cost_range?.total_low} - ${searchResults.repair_cost_range?.total_high}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Likely Causes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                Most Likely Causes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {searchResults.likely_causes?.map((cause, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-gray-500">{idx + 1}.</span>
                        <div>
                          <p className="font-medium">{cause.cause}</p>
                          {cause.details && (
                            <p className="text-sm text-gray-600 mt-1">{cause.details}</p>
                          )}
                        </div>
                      </div>
                      <Badge className={
                        cause.probability === "high" ? "bg-red-100 text-red-800" :
                        cause.probability === "medium" ? "bg-yellow-100 text-yellow-800" :
                        "bg-gray-100 text-gray-800"
                      }>
                        {cause.probability}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Diagnostic Steps & Repair Solutions */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="w-5 h-5 text-blue-600" />
                  Diagnostic Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {searchResults.diagnostic_steps?.map((step, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                        {step.step}
                      </div>
                      <div>
                        <p className="text-sm">{step.description}</p>
                        {step.tools_needed && (
                          <p className="text-xs text-gray-500 mt-1">Tools: {step.tools_needed}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-purple-600" />
                  Repair Solutions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {searchResults.repair_solutions?.map((solution, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm">{solution.solution}</p>
                        <div className="flex gap-1 shrink-0">
                          <Badge variant="outline" className="text-xs">
                            {solution.difficulty}
                          </Badge>
                          {solution.diy_possible && (
                            <Badge className="bg-green-100 text-green-800 text-xs">DIY</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Related Codes & Prevention */}
          <div className="grid md:grid-cols-2 gap-4">
            {searchResults.related_codes?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Related Fault Codes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {searchResults.related_codes.map((code, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="font-mono"
                        onClick={() => { setFaultCode(code); handleSearch(); }}
                      >
                        {code}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {searchResults.prevention_tips?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Prevention Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {searchResults.prevention_tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500 shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}