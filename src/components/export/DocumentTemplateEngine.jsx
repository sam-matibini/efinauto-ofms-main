/**
 * Document Template Engine
 * Generates export documents with ISO/HS code integration and AI field suggestions
 */
import { format } from "date-fns";

export const generateCommercialInvoice = async (order, sale, company, aiSuggestions = {}) => {
  const { data: countries } = await import("@/api/base44Client").then(m => 
    m.base44.entities.Country.filter({ iso2_code: order.destination_country })
  );
  const destCountry = countries?.[0];

  return {
    documentType: "commercial_invoice",
    documentNumber: `CI-${order.export_order_number}`,
    issueDate: new Date().toISOString(),
    
    exporter: {
      name: company.name,
      address: [company.address, company.city, company.province, company.postal_code, company.country].filter(Boolean).join(', '),
      taxId: company.gst_number,
      phone: company.phone,
      email: company.email
    },
    
    consignee: {
      name: order.consignee_name,
      address: order.consignee_address,
      phone: order.consignee_phone,
      email: order.consignee_email,
      country: destCountry?.country_name || order.destination_country
    },
    
    invoiceDetails: {
      invoiceNumber: `INV-${order.export_order_number}`,
      invoiceDate: format(new Date(), 'yyyy-MM-dd'),
      currency: order.currency,
      paymentTerms: aiSuggestions.paymentTerms || "Paid in Full",
      incoterms: order.incoterms,
      portOfLoading: company.city || "Toronto, ON",
      portOfDischarge: order.destination_port,
      countryOfOrigin: order.country_of_origin,
      countryOfDestination: order.destination_country
    },
    
    lineItems: (order.line_items || []).map((item, idx) => ({
      itemNumber: idx + 1,
      description: item.description,
      hsCode: item.hs_code,
      countryOfOrigin: item.country_of_origin || order.country_of_origin,
      quantity: item.quantity,
      unitOfMeasure: item.unit_of_measure || 'EA',
      unitPrice: item.unit_value,
      totalValue: item.total_value,
      weight: item.weight,
      // Vehicle specifics
      vin: item.vin,
      make: item.make,
      model: item.model,
      year: item.year,
      // Part specifics
      partNumber: item.part_number,
      sku: item.sku
    })),
    
    totals: {
      subtotal: order.total_value,
      freight: order.freight_cost || 0,
      insurance: order.insurance_cost || 0,
      total: order.total_value + (order.freight_cost || 0) + (order.insurance_cost || 0)
    },
    
    declarations: {
      statement: aiSuggestions.declaration || "I declare that all information in this invoice is true and correct.",
      certifier: company.contact_person_name || company.name,
      date: format(new Date(), 'yyyy-MM-dd')
    }
  };
};

export const generateBillOfLading = async (order, company, aiSuggestions = {}) => {
  return {
    documentType: "bill_of_lading",
    blNumber: `BL-${order.export_order_number}`,
    issueDate: new Date().toISOString(),
    
    shipper: {
      name: company.name,
      address: [company.address, company.city, company.province, company.postal_code].filter(Boolean).join(', '),
      phone: company.phone
    },
    
    consignee: {
      name: order.consignee_name,
      address: order.consignee_address,
      phone: order.consignee_phone
    },
    
    notifyParty: {
      name: aiSuggestions.notifyParty || order.consignee_name,
      address: aiSuggestions.notifyAddress || order.consignee_address
    },
    
    vesselDetails: {
      vesselName: order.vessel_name || aiSuggestions.vesselName || "TBD",
      voyageNumber: aiSuggestions.voyageNumber || "TBD",
      portOfLoading: company.city || "Toronto",
      portOfDischarge: order.destination_port,
      placeOfDelivery: order.destination_address
    },
    
    cargoDetails: {
      numberOfPackages: (order.line_items || []).length,
      packageType: order.container_type || "Container",
      containerNumber: order.container_number,
      sealNumber: order.seal_number,
      marksAndNumbers: `${order.export_order_number} / ${order.container_number || 'N/A'}`,
      grossWeight: order.total_weight,
      volume: order.total_volume,
      freightTerms: order.incoterms
    },
    
    items: (order.line_items || []).map(item => ({
      description: item.description,
      quantity: item.quantity,
      weight: item.weight,
      hsCode: item.hs_code
    })),
    
    freightCharges: {
      prepaid: order.incoterms?.includes('FOB') || order.incoterms?.includes('FCA'),
      collect: !order.incoterms?.includes('FOB') && !order.incoterms?.includes('FCA')
    }
  };
};

export const generateCertificateOfOrigin = async (order, company, aiSuggestions = {}) => {
  return {
    documentType: "certificate_of_origin",
    certificateNumber: `COO-${order.export_order_number}`,
    issueDate: new Date().toISOString(),
    
    exporter: {
      name: company.name,
      address: [company.address, company.city, company.province, company.country].filter(Boolean).join(', '),
      country: "Canada"
    },
    
    consignee: {
      name: order.consignee_name,
      address: order.consignee_address,
      country: order.destination_country
    },
    
    transportDetails: {
      meansOfTransport: order.shipping_mode,
      departureDate: order.estimated_departure || aiSuggestions.departureDate,
      portOfLoading: company.city,
      portOfDischarge: order.destination_port
    },
    
    goods: (order.line_items || []).map(item => ({
      description: item.description,
      hsCode: item.hs_code,
      quantity: item.quantity,
      countryOfOrigin: item.country_of_origin || order.country_of_origin || "CA",
      manufacturerCountry: aiSuggestions.manufacturerCountry || item.country_of_origin || "CA"
    })),
    
    declaration: {
      statement: aiSuggestions.cooDeclaration || `We hereby certify that the goods described above originated in ${order.country_of_origin} and comply with the rules of origin for preferential treatment.`,
      certifierName: company.contact_person_name || company.name,
      certifierTitle: company.contact_person_title || "Authorized Representative",
      date: format(new Date(), 'yyyy-MM-dd'),
      signature: "Digital Signature"
    },
    
    additionalInfo: {
      invoiceNumber: `INV-${order.export_order_number}`,
      invoiceDate: format(new Date(), 'yyyy-MM-dd')
    }
  };
};

export const generatePackingList = async (order, company) => {
  return {
    documentType: "packing_list",
    documentNumber: `PL-${order.export_order_number}`,
    issueDate: new Date().toISOString(),
    
    shipper: {
      name: company.name,
      address: [company.address, company.city, company.province].filter(Boolean).join(', ')
    },
    
    consignee: {
      name: order.consignee_name,
      address: order.consignee_address
    },
    
    packingDetails: {
      invoiceNumber: `INV-${order.export_order_number}`,
      containerNumber: order.container_number,
      sealNumber: order.seal_number,
      totalPackages: (order.line_items || []).length,
      totalGrossWeight: order.total_weight,
      totalNetWeight: order.total_weight * 0.95, // Estimate
      totalVolume: order.total_volume
    },
    
    packages: (order.line_items || []).map((item, idx) => ({
      packageNumber: idx + 1,
      description: item.description,
      quantity: item.quantity,
      unitOfMeasure: item.unit_of_measure,
      grossWeight: item.weight,
      dimensions: item.dimensions,
      marksAndNumbers: `${order.export_order_number}-${idx + 1}`
    }))
  };
};

export const getAISuggestions = async (order, company, documentType) => {
  try {
    const { base44 } = await import("@/api/base44Client");
    
    const prompt = `Generate compliance field suggestions for a ${documentType} document:
    
Export Order: ${order.export_order_number}
Destination: ${order.destination_country}
Incoterms: ${order.incoterms}
Shipping Mode: ${order.shipping_mode}
Goods: ${(order.line_items || []).map(i => i.description).join(', ')}

Provide:
1. Payment terms recommendation
2. Notify party suggestion
3. Declaration statement
4. Certificate of origin statement
5. Any required compliance notes

Return JSON format.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          paymentTerms: { type: "string" },
          notifyParty: { type: "string" },
          notifyAddress: { type: "string" },
          declaration: { type: "string" },
          cooDeclaration: { type: "string" },
          complianceNotes: { type: "array", items: { type: "string" } },
          vesselName: { type: "string" },
          voyageNumber: { type: "string" }
        }
      }
    });

    return result;
  } catch (error) {
    console.error("AI suggestions failed:", error);
    return {};
  }
};