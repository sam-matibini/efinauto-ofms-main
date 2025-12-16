/**
 * Export Order Validation Service
 * Validates ISO standards and HS codes before finalization
 */

export const validateExportOrder = (order, lineItems = []) => {
  const errors = [];
  const warnings = [];

  // ISO 3166-1 Country Code Validation
  if (!order.destination_country || !/^[A-Z]{2}$/.test(order.destination_country)) {
    errors.push("Invalid destination country: Must be valid ISO 3166-1 alpha-2 code (e.g., CA, US, JP)");
  }

  if (!order.country_of_origin || !/^[A-Z]{2}$/.test(order.country_of_origin)) {
    errors.push("Invalid country of origin: Must be valid ISO 3166-1 alpha-2 code");
  }

  // ISO 3166-2 Subdivision Validation (if provided)
  if (order.destination_subdivision) {
    if (!/^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(order.destination_subdivision)) {
      errors.push("Invalid subdivision code: Must follow ISO 3166-2 format (e.g., CA-ON, US-CA)");
    }
    
    const subdivCountry = order.destination_subdivision.split('-')[0];
    if (subdivCountry !== order.destination_country) {
      errors.push("Subdivision country code must match destination country");
    }
  }

  // ISO 4217 Currency Code Validation
  if (!order.currency || !/^[A-Z]{3}$/.test(order.currency)) {
    errors.push("Invalid currency: Must be valid ISO 4217 code (e.g., CAD, USD, EUR)");
  }

  // UN/LOCODE Port Validation (if provided)
  if (order.destination_port) {
    if (!/^[A-Z]{5}$/.test(order.destination_port)) {
      warnings.push("Port code should follow UN/LOCODE format (5 letters, e.g., CATOR, USLAX)");
    }
  }

  // HS Code Validation for Line Items
  if (!lineItems || lineItems.length === 0) {
    errors.push("At least one line item is required");
  } else {
    lineItems.forEach((item, idx) => {
      const hsCodeClean = (item.hs_code || '').replace(/[\.\s]/g, '');
      
      if (!item.hs_code) {
        errors.push(`Line item #${idx + 1} (${item.description}): Missing HS code`);
      } else if (hsCodeClean.length < 6) {
        errors.push(`Line item #${idx + 1} (${item.description}): HS code must be at least 6 digits (CBSA requirement)`);
      } else if (!/^\d+$/.test(hsCodeClean)) {
        errors.push(`Line item #${idx + 1} (${item.description}): HS code must contain only digits`);
      } else if (hsCodeClean.length === 6) {
        warnings.push(`Line item #${idx + 1} (${item.description}): Using 6-digit HS code. Consider using 8 or 10 digits for better classification`);
      }

      // Country of Origin validation for line items
      if (item.country_of_origin && !/^[A-Z]{2}$/.test(item.country_of_origin)) {
        errors.push(`Line item #${idx + 1} (${item.description}): Invalid country of origin code`);
      }
    });
  }

  // Required Fields Validation
  if (!order.consignee_name || order.consignee_name.trim() === '') {
    errors.push("Consignee name is required");
  }

  if (!order.incoterms) {
    errors.push("Incoterms are required");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      iso3166Valid: errors.filter(e => e.includes('ISO 3166')).length === 0,
      iso4217Valid: errors.filter(e => e.includes('ISO 4217')).length === 0,
      hsCodesValid: errors.filter(e => e.includes('HS code')).length === 0,
    }
  };
};

export const validateBeforeFinalization = async (orderId, base44Client) => {
  try {
    const orders = await base44Client.entities.ExportOrder.filter({ id: orderId });
    const order = orders[0];
    
    if (!order) {
      return { isValid: false, errors: ["Order not found"] };
    }

    const validation = validateExportOrder(order, order.line_items || []);
    
    if (!validation.isValid) {
      return validation;
    }

    // Additional finalization checks
    if (order.export_status === 'finalized' || order.locked) {
      return { isValid: false, errors: ["Order is already finalized and locked"] };
    }

    return validation;
  } catch (error) {
    return {
      isValid: false,
      errors: [`Validation failed: ${error.message}`]
    };
  }
};