/**
 * Rate Comparison Service
 * Aggregates and compares shipping rates from multiple carriers
 */

import { base44 } from "@/api/base44Client";
import { MSCAPIService } from "./MSCAPIService";
import { MaerskAPIService } from "./MaerskAPIService";
import { CMACGMAPIService } from "./CMACGMAPIService";
import { HapagLloydAPIService } from "./HapagLloydAPIService";

const CARRIER_SERVICES = {
  msc: MSCAPIService,
  maersk: MaerskAPIService,
  cma_cgm: CMACGMAPIService,
  hapag_lloyd: HapagLloydAPIService
};

export const RateComparisonService = {
  /**
   * Get rate quotes from all available carriers
   */
  async compareRates(shipmentDetails) {
    const {
      origin_port,
      destination_port,
      container_type,
      cargo_weight,
      cargo_volume,
      departure_date,
      cargo_type = "general",
      hazardous = false
    } = shipmentDetails;

    const carriers = Object.keys(CARRIER_SERVICES);
    const ratePromises = carriers.map(async (carrierCode) => {
      try {
        const service = CARRIER_SERVICES[carrierCode];
        const quote = await this.getCarrierRate(service, carrierCode, shipmentDetails);
        return {
          carrier: carrierCode,
          success: true,
          ...quote
        };
      } catch (error) {
        return {
          carrier: carrierCode,
          success: false,
          error: error.message
        };
      }
    });

    const results = await Promise.all(ratePromises);
    
    // Filter successful quotes and sort by total rate
    const validQuotes = results.filter(r => r.success);
    validQuotes.sort((a, b) => a.total_rate - b.total_rate);

    return {
      quotes: validQuotes,
      failed: results.filter(r => !r.success),
      best_rate: validQuotes[0] || null,
      comparison_date: new Date().toISOString()
    };
  },

  /**
   * Get rate from specific carrier
   */
  async getCarrierRate(service, carrierCode, details) {
    // Simulate API call with realistic data
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

    const baseRate = this.calculateBaseRate(details);
    const carrierMultiplier = this.getCarrierMultiplier(carrierCode);
    const transitTime = this.estimateTransitTime(carrierCode, details);

    const ocean_freight = Math.round(baseRate * carrierMultiplier);
    const fuel_surcharge = Math.round(ocean_freight * 0.15);
    const thc_origin = 150;
    const thc_destination = 150;
    const documentation = 75;
    const security = 50;
    
    const total_rate = ocean_freight + fuel_surcharge + thc_origin + thc_destination + documentation + security;

    return {
      quote_id: `QUOTE-${carrierCode.toUpperCase()}-${Date.now()}`,
      carrier_name: this.getCarrierName(carrierCode),
      carrier_code: carrierCode,
      ocean_freight,
      fuel_surcharge,
      thc_origin,
      thc_destination,
      documentation_fee: documentation,
      security_fee: security,
      total_rate,
      currency: "USD",
      transit_time_days: transitTime,
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_departure: details.departure_date || new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      estimated_arrival: new Date(Date.now() + (10 + transitTime) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      service_type: transitTime < 20 ? "Express" : "Standard",
      available_space: Math.floor(Math.random() * 500) + 100,
      route: `${details.origin_port} → ${details.destination_port}`,
      container_type: details.container_type,
      special_conditions: details.hazardous ? ["Hazardous cargo surcharge applies"] : []
    };
  },

  /**
   * Calculate base rate based on shipment details
   */
  calculateBaseRate(details) {
    let baseRate = 2000;

    // Container type multiplier
    const containerMultipliers = {
      "20GP": 1.0,
      "40GP": 1.8,
      "40HC": 2.0,
      "45HC": 2.2,
      "20RF": 1.5,
      "40RF": 2.5
    };
    baseRate *= containerMultipliers[details.container_type] || 1.0;

    // Weight factor
    if (details.cargo_weight > 20000) {
      baseRate *= 1.2;
    }

    // Hazardous cargo
    if (details.hazardous) {
      baseRate *= 1.5;
    }

    return baseRate;
  },

  /**
   * Get carrier-specific multiplier
   */
  getCarrierMultiplier(carrierCode) {
    const multipliers = {
      maersk: 1.1,
      msc: 0.95,
      cma_cgm: 1.0,
      hapag_lloyd: 1.05
    };
    return multipliers[carrierCode] || 1.0;
  },

  /**
   * Estimate transit time
   */
  estimateTransitTime(carrierCode, details) {
    const baseTimes = {
      maersk: 18,
      msc: 21,
      cma_cgm: 20,
      hapag_lloyd: 19
    };
    return baseTimes[carrierCode] || 20;
  },

  /**
   * Get carrier display name
   */
  getCarrierName(code) {
    const names = {
      maersk: "Maersk Line",
      msc: "Mediterranean Shipping Company",
      cma_cgm: "CMA CGM",
      hapag_lloyd: "Hapag-Lloyd"
    };
    return names[code] || code.toUpperCase();
  },

  /**
   * Save rate comparison for future reference
   */
  async saveComparison(companyId, comparison, selectedQuote) {
    try {
      await base44.integrations.Core.InvokeLLM({
        prompt: `Log rate comparison: ${comparison.quotes.length} quotes received, best rate: $${comparison.best_rate?.total_rate} from ${comparison.best_rate?.carrier_name}. Selected: ${selectedQuote?.carrier_name} at $${selectedQuote?.total_rate}`,
        response_json_schema: {
          type: "object",
          properties: {
            logged: { type: "boolean" }
          }
        }
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to save comparison:", error);
      return { success: false, error: error.message };
    }
  }
};