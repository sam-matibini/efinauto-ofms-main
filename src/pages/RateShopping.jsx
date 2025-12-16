import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ship, TrendingDown, Clock, Calendar, CheckCircle, Loader2, AlertCircle, Share2, Mail, Printer, Download, MessageCircle } from "lucide-react";
import { RateComparisonService } from "../components/export/RateComparisonService";
import { toast } from "sonner";
import { format } from "date-fns";
import DocumentAnalyzer from "../components/shipping/DocumentAnalyzer";
import RateShoppingAI from "../components/shipping/RateShoppingAI";
import { base44 } from "@/api/base44Client";

export default function RateShopping() {
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [emailAddress, setEmailAddress] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);

  const [shipmentDetails, setShipmentDetails] = useState({
    origin_city: "",
    origin_port: "",
    destination_port: "",
    destination_city: "",
    container_type: "40HC",
    cargo_weight: 15000,
    cargo_volume: 50,
    departure_date: "",
    cargo_type: "general",
    hazardous: false
  });

  const [inlandCosts, setInlandCosts] = useState(null);
  const [calculatingInland, setCalculatingInland] = useState(false);

  const calculateInlandCosts = async () => {
    if (!shipmentDetails.origin_city || !shipmentDetails.destination_city) {
      return;
    }

    setCalculatingInland(true);
    try {
      const prompt = `Estimate inland freight costs for container shipment:

Origin: ${shipmentDetails.origin_city} to ${shipmentDetails.origin_port}
Destination: ${shipmentDetails.destination_port} to ${shipmentDetails.destination_city}
Container: ${shipmentDetails.container_type}
Weight: ${shipmentDetails.cargo_weight} kg

Provide realistic cost estimates in USD for:
1. Inland transport from origin city to port (trucking/rail)
2. Inland transport from destination port to city (trucking/rail)

Consider typical rates, distance, and local market conditions.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            origin_inland_cost: { type: "number" },
            destination_inland_cost: { type: "number" },
            origin_notes: { type: "string" },
            destination_notes: { type: "string" }
          }
        }
      });

      setInlandCosts(response);
      toast.success("Inland costs calculated");
    } catch (error) {
      toast.error("Failed to calculate inland costs");
      console.error(error);
    } finally {
      setCalculatingInland(false);
    }
  };

  const handleCompareRates = async () => {
    if (!shipmentDetails.origin_port || !shipmentDetails.destination_port) {
      toast.error("Please enter origin and destination ports");
      return;
    }

    setLoading(true);
    try {
      const result = await RateComparisonService.compareRates(shipmentDetails);
      setComparison(result);
      
      if (result.quotes.length === 0) {
        toast.error("No rates available for this route");
      } else {
        toast.success(`Found ${result.quotes.length} rates. Best rate: $${result.best_rate.total_rate}`);
      }

      // Auto-calculate inland costs if cities are provided
      if (shipmentDetails.origin_city && shipmentDetails.destination_city) {
        calculateInlandCosts();
      }
    } catch (error) {
      toast.error("Failed to compare rates");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getCarrierLogo = (carrierCode) => {
    const logos = {
      maersk: "🇩🇰",
      msc: "🇨🇭",
      cma_cgm: "🇫🇷",
      hapag_lloyd: "🇩🇪"
    };
    return logos[carrierCode] || "🚢";
  };

  const generateShareContent = (allRates = false) => {
    if (allRates && comparison) {
      let content = `🚢 Shipping Rate Comparison\n\nRoute: ${shipmentDetails.origin_port} → ${shipmentDetails.destination_port}\nContainer: ${shipmentDetails.container_type}\n\n`;
      
      comparison.quotes.forEach((quote, idx) => {
        content += `\n${idx + 1}. ${quote.carrier_name} ${quote === comparison.best_rate ? '⭐ BEST RATE' : ''}\n`;
        content += `   Total: $${quote.total_rate.toLocaleString()} ${quote.currency}\n`;
        content += `   Transit: ${quote.transit_time_days} days\n`;
        content += `   ETD: ${format(new Date(quote.estimated_departure), 'MMM d, yyyy')}\n`;
        content += `   ETA: ${format(new Date(quote.estimated_arrival), 'MMM d, yyyy')}\n`;
      });
      
      content += `\n\n---\nRate Quotes are powered by eFinAuto OFMS\n\n⚠️ DISCLAIMER: These rates are estimates only and subject to change without notice. Final rates, terms, and conditions must be verified directly with the respective shipping carrier before booking. eFinAuto OFMS does not guarantee rate accuracy and assumes no liability for rate discrepancies or changes.`;
      
      return content.trim();
    }
    
    if (!selectedQuote) return "";
    
    return `
🚢 Shipping Rate Quote

Carrier: ${selectedQuote.carrier_name}
Route: ${selectedQuote.route}
Container: ${shipmentDetails.container_type}

💰 Rate Breakdown:
- Ocean Freight: $${selectedQuote.ocean_freight.toLocaleString()}
- Fuel Surcharge: $${selectedQuote.fuel_surcharge.toLocaleString()}
- THC: $${(selectedQuote.thc_origin + selectedQuote.thc_destination).toLocaleString()}
- Other Fees: $${(selectedQuote.documentation_fee + selectedQuote.security_fee).toLocaleString()}

Total Rate: $${selectedQuote.total_rate.toLocaleString()} ${selectedQuote.currency}

⏱️ Transit Time: ${selectedQuote.transit_time_days} days
📅 ETD: ${format(new Date(selectedQuote.estimated_departure), 'MMM d, yyyy')}
📅 ETA: ${format(new Date(selectedQuote.estimated_arrival), 'MMM d, yyyy')}

✅ Valid until: ${format(new Date(selectedQuote.valid_until), 'MMM d, yyyy')}

---
Rate Quotes are powered by eFinAuto OFMS

⚠️ DISCLAIMER: These rates are estimates only and subject to change without notice. Final rates, terms, and conditions must be verified directly with the respective shipping carrier before booking. eFinAuto OFMS does not guarantee rate accuracy and assumes no liability for rate discrepancies or changes.
    `.trim();
  };

  const handlePrint = (allRates = false) => {
    if (!allRates && !selectedQuote) {
      toast.error("Please select a rate first");
      return;
    }

    if (allRates && !comparison) {
      toast.error("No comparison data available");
      return;
    }

    const printWindow = window.open('', '_blank');
    
    let content = '';
    
    if (allRates) {
      content = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Rate Comparison - All Carriers</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; }
              h1 { color: #1e293b; }
              .section { margin: 20px 0; }
              .label { font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #1e293b; color: white; }
              .best { background-color: #d1fae5; }
              .total { font-weight: bold; color: #059669; }
            </style>
          </head>
          <body>
            <h1>Shipping Rate Comparison</h1>
            <div class="section">
              <p><span class="label">Route:</span> ${shipmentDetails.origin_port} → ${shipmentDetails.destination_port}</p>
              <p><span class="label">Container Type:</span> ${shipmentDetails.container_type}</p>
              <p><span class="label">Cargo Weight:</span> ${shipmentDetails.cargo_weight} kg</p>
            </div>
            
            <table>
              <tr>
                <th>Carrier</th>
                <th>Total Rate</th>
                <th>Transit Time</th>
                <th>ETD</th>
                <th>ETA</th>
                <th>Service</th>
              </tr>
              ${comparison.quotes.map(quote => `
                <tr class="${quote === comparison.best_rate ? 'best' : ''}">
                  <td>${quote.carrier_name}${quote === comparison.best_rate ? ' ⭐' : ''}</td>
                  <td class="total">$${quote.total_rate.toLocaleString()}</td>
                  <td>${quote.transit_time_days} days</td>
                  <td>${format(new Date(quote.estimated_departure), 'MMM d, yyyy')}</td>
                  <td>${format(new Date(quote.estimated_arrival), 'MMM d, yyyy')}</td>
                  <td>${quote.service_type}</td>
                </tr>
              `).join('')}
            </table>
            
            <div class="section">
              <p style="font-size: 12px; color: #666; margin-bottom: 10px;">Generated on ${format(new Date(), 'MMM d, yyyy h:mm a')}</p>
              <p style="font-size: 12px; color: #1e293b; font-weight: bold; margin-bottom: 20px;">Rate Quotes are powered by eFinAuto OFMS</p>
              <div style="padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                <p style="font-size: 11px; color: #856404; margin: 0; line-height: 1.6;"><strong>⚠️ DISCLAIMER:</strong> These rates are estimates only and subject to change without notice. Final rates, terms, and conditions must be verified directly with the respective shipping carrier before booking. eFinAuto OFMS does not guarantee rate accuracy and assumes no liability for rate discrepancies or changes.</p>
              </div>
            </div>
          </body>
        </html>
      `;
    } else {
      content = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Rate Quote - ${selectedQuote.carrier_name}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; }
              h1 { color: #1e293b; }
              .section { margin: 20px 0; }
              .label { font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #1e293b; color: white; }
              .total { font-size: 24px; font-weight: bold; color: #059669; }
            </style>
          </head>
          <body>
            <h1>Shipping Rate Quote</h1>
            <div class="section">
              <p><span class="label">Carrier:</span> ${selectedQuote.carrier_name}</p>
              <p><span class="label">Route:</span> ${selectedQuote.route}</p>
              <p><span class="label">Container Type:</span> ${shipmentDetails.container_type}</p>
              <p><span class="label">Service Type:</span> ${selectedQuote.service_type}</p>
            </div>
            
            <table>
              <tr>
                <th>Charge</th>
                <th>Amount</th>
              </tr>
              <tr>
                <td>Ocean Freight</td>
                <td>$${selectedQuote.ocean_freight.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Fuel Surcharge</td>
                <td>$${selectedQuote.fuel_surcharge.toLocaleString()}</td>
              </tr>
              <tr>
                <td>THC Origin</td>
                <td>$${selectedQuote.thc_origin.toLocaleString()}</td>
              </tr>
              <tr>
                <td>THC Destination</td>
                <td>$${selectedQuote.thc_destination.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Documentation Fee</td>
                <td>$${selectedQuote.documentation_fee.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Security Fee</td>
                <td>$${selectedQuote.security_fee.toLocaleString()}</td>
              </tr>
              <tr>
                <th>Total Rate</th>
                <th class="total">$${selectedQuote.total_rate.toLocaleString()} ${selectedQuote.currency}</th>
              </tr>
            </table>
            
            <div class="section">
              <p><span class="label">Transit Time:</span> ${selectedQuote.transit_time_days} days</p>
              <p><span class="label">Estimated Departure:</span> ${format(new Date(selectedQuote.estimated_departure), 'MMM d, yyyy')}</p>
              <p><span class="label">Estimated Arrival:</span> ${format(new Date(selectedQuote.estimated_arrival), 'MMM d, yyyy')}</p>
              <p><span class="label">Valid Until:</span> ${format(new Date(selectedQuote.valid_until), 'MMM d, yyyy')}</p>
            </div>
            
            <div class="section">
              <p style="font-size: 12px; color: #666; margin-bottom: 10px;">Generated on ${format(new Date(), 'MMM d, yyyy h:mm a')}</p>
              <p style="font-size: 12px; color: #1e293b; font-weight: bold; margin-bottom: 20px;">Rate Quotes are powered by eFinAuto OFMS</p>
              <div style="padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                <p style="font-size: 11px; color: #856404; margin: 0; line-height: 1.6;"><strong>⚠️ DISCLAIMER:</strong> These rates are estimates only and subject to change without notice. Final rates, terms, and conditions must be verified directly with the respective shipping carrier before booking. eFinAuto OFMS does not guarantee rate accuracy and assumes no liability for rate discrepancies or changes.</p>
              </div>
            </div>
          </body>
        </html>
      `;
    }
    
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
    
    toast.success("Opening print dialog...");
  };

  const handleDownloadPDF = async () => {
    if (!selectedQuote) {
      toast.error("Please select a rate first");
      return;
    }

    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const element = document.getElementById('rate-comparison-content');
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`rate-quote-${selectedQuote.carrier_code}-${Date.now()}.pdf`);
      
      toast.success("PDF downloaded successfully");
    } catch (error) {
      toast.error("Failed to generate PDF");
      console.error(error);
    }
  };

  const handleEmailShare = async (allRates = false) => {
    if (!allRates && !selectedQuote) {
      toast.error("Please select a rate first");
      return;
    }

    if (allRates && !comparison) {
      toast.error("No comparison data available");
      return;
    }

    if (!emailAddress) {
      setShowEmailInput(true);
      return;
    }

    try {
      const subject = allRates 
        ? `Shipping Rate Comparison - All Carriers`
        : `Shipping Rate Quote - ${selectedQuote.carrier_name}`;
      
      await base44.integrations.Core.SendEmail({
        to: emailAddress,
        subject,
        body: `<html><body><pre style="font-family: Arial, sans-serif;">${generateShareContent(allRates)}</pre></body></html>`
      });

      toast.success(`Rates sent to ${emailAddress}`);
      setShowEmailInput(false);
      setEmailAddress("");
    } catch (error) {
      toast.error("Failed to send email");
      console.error(error);
    }
  };

  const handleWhatsAppShare = (allRates = false) => {
    if (!allRates && !selectedQuote) {
      toast.error("Please select a rate first");
      return;
    }

    if (allRates && !comparison) {
      toast.error("No comparison data available");
      return;
    }

    const message = encodeURIComponent(generateShareContent(allRates));
    window.open(`https://wa.me/?text=${message}`, '_blank');
    toast.success("Opening WhatsApp...");
  };

  const handleGoogleChatShare = (allRates = false) => {
    if (!allRates && !selectedQuote) {
      toast.error("Please select a rate first");
      return;
    }

    if (allRates && !comparison) {
      toast.error("No comparison data available");
      return;
    }

    const message = encodeURIComponent(generateShareContent(allRates));
    window.open(`https://mail.google.com/chat/?text=${message}`, '_blank');
    toast.success("Opening Google Chat...");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <h1 className="text-2xl font-bold text-white">Rate Shopping</h1>
        <p className="text-sm text-gray-300 mt-1">Compare shipping rates from multiple carriers</p>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* AI Assistant & Document Analyzer */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Analyzer & Summarizer</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentAnalyzer />
            </CardContent>
          </Card>

          <RateShoppingAI 
            shipmentDetails={shipmentDetails}
            comparison={comparison}
            selectedQuote={selectedQuote}
          />
        </div>

        {/* Shipment Details Form */}
        <Card>
          <CardHeader>
            <CardTitle>Shipment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label>Origin City (Optional)</Label>
                <Input
                  placeholder="e.g., Detroit, MI"
                  value={shipmentDetails.origin_city}
                  onChange={(e) => setShipmentDetails({...shipmentDetails, origin_city: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">For inland cost estimate</p>
              </div>
              <div>
                <Label>Origin Port *</Label>
                <Input
                  placeholder="e.g., CATOR (Toronto)"
                  value={shipmentDetails.origin_port}
                  onChange={(e) => setShipmentDetails({...shipmentDetails, origin_port: e.target.value})}
                />
              </div>
              <div>
                <Label>Destination Port *</Label>
                <Input
                  placeholder="e.g., AEJEA (Jebel Ali)"
                  value={shipmentDetails.destination_port}
                  onChange={(e) => setShipmentDetails({...shipmentDetails, destination_port: e.target.value})}
                />
              </div>
              <div>
                <Label>Destination City (Optional)</Label>
                <Input
                  placeholder="e.g., Dubai"
                  value={shipmentDetails.destination_city}
                  onChange={(e) => setShipmentDetails({...shipmentDetails, destination_city: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">For inland cost estimate</p>
              </div>
              <div>
                <Label>Container Type</Label>
                <Select value={shipmentDetails.container_type} onValueChange={(value) => setShipmentDetails({...shipmentDetails, container_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20GP">20' General Purpose</SelectItem>
                    <SelectItem value="40GP">40' General Purpose</SelectItem>
                    <SelectItem value="40HC">40' High Cube</SelectItem>
                    <SelectItem value="45HC">45' High Cube</SelectItem>
                    <SelectItem value="20RF">20' Refrigerated</SelectItem>
                    <SelectItem value="40RF">40' Refrigerated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Departure Date</Label>
                <Input
                  type="date"
                  value={shipmentDetails.departure_date}
                  onChange={(e) => setShipmentDetails({...shipmentDetails, departure_date: e.target.value})}
                />
              </div>
              <div>
                <Label>Cargo Weight (kg)</Label>
                <Input
                  type="number"
                  value={shipmentDetails.cargo_weight}
                  onChange={(e) => setShipmentDetails({...shipmentDetails, cargo_weight: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label>Cargo Volume (m³)</Label>
                <Input
                  type="number"
                  value={shipmentDetails.cargo_volume}
                  onChange={(e) => setShipmentDetails({...shipmentDetails, cargo_volume: parseInt(e.target.value)})}
                />
              </div>
            </div>
            <Button 
              onClick={handleCompareRates} 
              disabled={loading}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Comparing Rates from 4 Carriers...
                </>
              ) : (
                <>
                  <TrendingDown className="w-5 h-5 mr-2" />
                  Compare Rates from All Carriers
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Inland Costs Summary */}
        {inlandCosts && (
          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ship className="w-5 h-5 text-blue-600" />
                Door-to-Door Cost Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <p className="text-sm font-semibold text-gray-700">Inland Origin</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">
                    ${inlandCosts.origin_inland_cost.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600">
                    {shipmentDetails.origin_city} → {shipmentDetails.origin_port}
                  </p>
                  {inlandCosts.origin_notes && (
                    <p className="text-xs text-gray-500 mt-2">{inlandCosts.origin_notes}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <p className="text-sm font-semibold text-gray-700">Ocean Freight</p>
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    {comparison?.best_rate ? `$${comparison.best_rate.total_rate.toLocaleString()}` : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {shipmentDetails.origin_port} → {shipmentDetails.destination_port}
                  </p>
                  {comparison?.best_rate && (
                    <p className="text-xs text-gray-500 mt-2">{comparison.best_rate.carrier_name} • {comparison.best_rate.transit_time_days} days</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <p className="text-sm font-semibold text-gray-700">Inland Destination</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">
                    ${inlandCosts.destination_inland_cost.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600">
                    {shipmentDetails.destination_port} → {shipmentDetails.destination_city}
                  </p>
                  {inlandCosts.destination_notes && (
                    <p className="text-xs text-gray-500 mt-2">{inlandCosts.destination_notes}</p>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-blue-200">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Total Door-to-Door Estimate</p>
                    <p className="text-xs text-gray-500 mt-1">Inland + Ocean Freight</p>
                  </div>
                  <p className="text-4xl font-bold text-gray-900">
                    ${(
                      inlandCosts.origin_inland_cost + 
                      (comparison?.best_rate?.total_rate || 0) + 
                      inlandCosts.destination_inland_cost
                    ).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>Note:</strong> Inland costs are AI-generated estimates based on typical market rates. 
                  Actual costs may vary based on specific routing, carrier, and current market conditions.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rate Comparison Results */}
        {comparison && (
          <>
            {/* Best Rate Banner */}
            {comparison.best_rate && (
              <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
                        <TrendingDown className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Best Rate Available</p>
                        <h3 className="text-3xl font-bold text-gray-900">
                          ${comparison.best_rate.total_rate.toLocaleString()}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {comparison.best_rate.carrier_name} • {comparison.best_rate.transit_time_days} days transit
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => setSelectedQuote(comparison.best_rate)}
                      className="bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Select Best Rate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sharing Options */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="pt-6 space-y-4">
                {/* Share Selected Rate */}
                {selectedQuote && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Share2 className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-blue-900">Share Selected Rate</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {showEmailInput ? (
                          <div className="flex gap-2">
                            <Input
                              type="email"
                              placeholder="Enter email address"
                              value={emailAddress}
                              onChange={(e) => setEmailAddress(e.target.value)}
                              className="w-64"
                            />
                            <Button onClick={() => handleEmailShare(false)} size="sm">
                              Send
                            </Button>
                            <Button onClick={() => setShowEmailInput(false)} variant="outline" size="sm">
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button onClick={() => setShowEmailInput(true)} variant="outline" size="sm">
                              <Mail className="w-4 h-4 mr-2" />
                              Email
                            </Button>
                            <Button onClick={() => handleWhatsAppShare(false)} variant="outline" size="sm" className="bg-green-50 hover:bg-green-100">
                              <MessageCircle className="w-4 h-4 mr-2" />
                              WhatsApp
                            </Button>
                            <Button onClick={() => handleGoogleChatShare(false)} variant="outline" size="sm">
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Google Chat
                            </Button>
                            <Button onClick={() => handlePrint(false)} variant="outline" size="sm">
                              <Printer className="w-4 h-4 mr-2" />
                              Print
                            </Button>
                            <Button onClick={handleDownloadPDF} variant="outline" size="sm">
                              <Download className="w-4 h-4 mr-2" />
                              PDF
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Share All Rates Comparison */}
                {comparison && (
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-purple-600" />
                        <span className="font-semibold text-purple-900">Share All Rates (Decision Support)</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button onClick={() => handleEmailShare(true)} variant="outline" size="sm">
                          <Mail className="w-4 h-4 mr-2" />
                          Email All
                        </Button>
                        <Button onClick={() => handleWhatsAppShare(true)} variant="outline" size="sm" className="bg-green-50 hover:bg-green-100">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          WhatsApp All
                        </Button>
                        <Button onClick={() => handleGoogleChatShare(true)} variant="outline" size="sm">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Chat All
                        </Button>
                        <Button onClick={() => handlePrint(true)} variant="outline" size="sm">
                          <Printer className="w-4 h-4 mr-2" />
                          Print All
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* All Rates */}
            <div id="rate-comparison-content" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">All Available Rates ({comparison.quotes.length})</h3>
                {selectedQuote && (
                  <Badge className="bg-blue-600 text-white">
                    Selected: {selectedQuote.carrier_name}
                  </Badge>
                )}
              </div>

              <div className="grid gap-4">
                {comparison.quotes.map((quote) => (
                  <Card 
                    key={quote.quote_id}
                    className={`cursor-pointer transition-all ${
                      selectedQuote?.quote_id === quote.quote_id 
                        ? 'ring-2 ring-blue-500 shadow-lg' 
                        : 'hover:shadow-md'
                    } ${
                      quote === comparison.best_rate 
                        ? 'border-2 border-green-400' 
                        : ''
                    }`}
                    onClick={() => setSelectedQuote(quote)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="text-4xl">{getCarrierLogo(quote.carrier_code)}</span>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-xl">{quote.carrier_name}</h4>
                                {quote === comparison.best_rate && (
                                  <Badge className="bg-green-600">Best Rate</Badge>
                                )}
                                <Badge variant="outline">{quote.service_type}</Badge>
                              </div>
                              <p className="text-sm text-gray-600">{quote.route}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Ocean Freight</p>
                              <p className="font-semibold text-lg">${quote.ocean_freight.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Fuel Surcharge</p>
                              <p className="font-semibold text-lg">${quote.fuel_surcharge.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-1">THC (Origin + Dest)</p>
                              <p className="font-semibold text-lg">${(quote.thc_origin + quote.thc_destination).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Other Fees</p>
                              <p className="font-semibold text-lg">${(quote.documentation_fee + quote.security_fee).toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span className="font-medium">{quote.transit_time_days} days</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>ETD: {format(new Date(quote.estimated_departure), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>ETA: {format(new Date(quote.estimated_arrival), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>{quote.available_space} TEU available</span>
                            </div>
                          </div>

                          {quote.special_conditions?.length > 0 && (
                            <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-yellow-800 flex items-start gap-1">
                              <AlertCircle className="w-3 h-3 mt-0.5" />
                              <span>{quote.special_conditions.join(", ")}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-right pl-6">
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs text-gray-500">Ocean Freight</p>
                              <p className="text-2xl font-bold text-gray-900">
                                ${quote.total_rate.toLocaleString()}
                              </p>
                            </div>
                            {inlandCosts && (
                              <div className="pt-2 border-t">
                                <p className="text-xs text-gray-500 mb-1">Door-to-Door Total</p>
                                <p className="text-3xl font-bold text-blue-600">
                                  ${(quote.total_rate + inlandCosts.origin_inland_cost + inlandCosts.destination_inland_cost).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Incl. inland: ${(inlandCosts.origin_inland_cost + inlandCosts.destination_inland_cost).toLocaleString()}
                                </p>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-3">
                            Valid until {format(new Date(quote.valid_until), 'MMM d, yyyy')}
                          </p>
                          {selectedQuote?.quote_id === quote.quote_id && (
                            <Badge className="mt-3 bg-blue-600">✓ Selected</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Failed Carriers */}
            {comparison.failed.length > 0 && (
              <Card className="bg-gray-50 border-gray-300">
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Unable to get rates from: {comparison.failed.map(f => f.carrier).join(", ")}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}