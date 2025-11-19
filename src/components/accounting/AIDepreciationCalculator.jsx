import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AIDepreciationCalculator({ asset, onCalculated, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState("auto");
  const [result, setResult] = useState(null);

  const calculateDepreciation = async () => {
    setLoading(true);
    try {
      const prompt = `You are a financial accounting expert. Calculate the depreciation for the following asset:

Asset Details:
- Type: ${asset.type}
- Description: ${asset.description}
- Purchase Price: $${asset.purchasePrice}
- Purchase Date: ${new Date(asset.purchaseDate).toLocaleDateString()}
- Current Date: ${new Date().toLocaleDateString()}
- Status: ${asset.status}
${asset.mileage ? `- Mileage: ${asset.mileage} km` : ''}
${asset.condition ? `- Condition: ${asset.condition}` : ''}

${method === "auto" ? `Analyze this asset and recommend the most appropriate depreciation method (straight-line, declining balance, or units of production). Consider the asset type, expected useful life, and industry standards.` : `Use ${method} depreciation method.`}

Provide:
1. Recommended/Used depreciation method with justification
2. Estimated useful life in years
3. Salvage value estimate
4. Annual depreciation amount
5. Accumulated depreciation to date
6. Current net book value
7. Monthly depreciation expense
8. Depreciation schedule for next 3 years

Be specific with numbers and provide clear reasoning for your calculations.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            method: { type: "string" },
            method_justification: { type: "string" },
            useful_life_years: { type: "number" },
            salvage_value: { type: "number" },
            annual_depreciation: { type: "number" },
            accumulated_depreciation: { type: "number" },
            net_book_value: { type: "number" },
            monthly_depreciation: { type: "number" },
            depreciation_schedule: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  year: { type: "number" },
                  depreciation: { type: "number" },
                  accumulated: { type: "number" },
                  book_value: { type: "number" }
                }
              }
            }
          }
        }
      });

      setResult(response);
      if (onCalculated) {
        onCalculated(response);
      }
      toast.success("AI depreciation calculation completed");
    } catch (error) {
      console.error("AI calculation error:", error);
      toast.error("Failed to calculate depreciation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Depreciation Calculator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Asset Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Asset Information</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Type:</span> {asset?.type}
              </div>
              <div>
                <span className="text-gray-600">Description:</span> {asset?.description}
              </div>
              <div>
                <span className="text-gray-600">Purchase Price:</span> ${asset?.purchasePrice?.toLocaleString()}
              </div>
              <div>
                <span className="text-gray-600">Purchase Date:</span> {asset?.purchaseDate && new Date(asset.purchaseDate).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Method Selection */}
          <div>
            <Label>Depreciation Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">AI Recommended (Automatic)</SelectItem>
                <SelectItem value="straight-line">Straight-Line</SelectItem>
                <SelectItem value="declining balance">Declining Balance</SelectItem>
                <SelectItem value="units of production">Units of Production</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Calculate Button */}
          <Button 
            onClick={calculateDepreciation} 
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Calculating with AI...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Calculate Depreciation
              </>
            )}
          </Button>

          {/* Results */}
          {result && (
            <div className="space-y-4 border-t pt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  Recommended Method: {result.method}
                </h3>
                <p className="text-sm text-blue-800">{result.method_justification}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Useful Life</p>
                  <p className="text-lg font-bold">{result.useful_life_years} years</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">Salvage Value</p>
                  <p className="text-lg font-bold">${result.salvage_value?.toLocaleString()}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-green-600">Annual Depreciation</p>
                  <p className="text-lg font-bold text-green-700">${result.annual_depreciation?.toLocaleString()}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <p className="text-xs text-orange-600">Monthly Depreciation</p>
                  <p className="text-lg font-bold text-orange-700">${result.monthly_depreciation?.toLocaleString()}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-xs text-red-600">Accumulated Depreciation</p>
                  <p className="text-lg font-bold text-red-700">${result.accumulated_depreciation?.toLocaleString()}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-blue-600">Net Book Value</p>
                  <p className="text-lg font-bold text-blue-700">${result.net_book_value?.toLocaleString()}</p>
                </div>
              </div>

              {result.depreciation_schedule && result.depreciation_schedule.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">3-Year Depreciation Schedule</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left p-2">Year</th>
                          <th className="text-right p-2">Depreciation</th>
                          <th className="text-right p-2">Accumulated</th>
                          <th className="text-right p-2">Book Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.depreciation_schedule.map((item, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="p-2">{item.year}</td>
                            <td className="text-right p-2">${item.depreciation?.toLocaleString()}</td>
                            <td className="text-right p-2">${item.accumulated?.toLocaleString()}</td>
                            <td className="text-right p-2 font-semibold">${item.book_value?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}