/**
 * Carrier API Registry
 * Central registry for all carrier API integrations
 * Supports extensibility for future carriers
 */

import { MSCAPIService } from "./MSCAPIService";

export const CarrierAPIRegistry = {
  MSC: MSCAPIService,
  MAERSK: null, // Future implementation
  CMA_CGM: null, // Future implementation
  HAPAG: null, // Future implementation
};

/**
 * Get carrier API service by carrier code
 */
export const getCarrierAPIService = (carrierCode) => {
  const service = CarrierAPIRegistry[carrierCode];
  if (!service) {
    throw new Error(`No API service registered for carrier: ${carrierCode}`);
  }
  return service;
};

/**
 * Check if carrier supports API integration
 */
export const isCarrierAPIEnabled = (carrierCode) => {
  return CarrierAPIRegistry[carrierCode] !== null;
};

/**
 * Get list of API-enabled carriers
 */
export const getAPIEnabledCarriers = () => {
  return Object.keys(CarrierAPIRegistry).filter(
    (code) => CarrierAPIRegistry[code] !== null
  );
};