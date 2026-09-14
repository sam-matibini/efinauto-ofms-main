// Compliance-safe BOS print service
// Validates payload before any print/PDF/email operation

export const validateBOSForPrint = (sale, company) => {
  const errors = [];
  
  // Critical fields
  if (!sale) errors.push("Sale record is null");
  if (!sale?.id) errors.push("Sale ID missing");
  if (!sale?.company_id) errors.push("Company ID missing");
  if (!company) errors.push("Company record is null");
  if (!company?.name) errors.push("Company name missing");
  
  // Required business fields
  if (!sale?.customer_name) errors.push("Customer name missing");
  if (!sale?.vehicle_details) errors.push("Vehicle details missing");
  if (sale?.sale_price === undefined || sale?.sale_price === null) errors.push("Sale price missing");
  
  // Ensure numeric fields are valid numbers
  const numericFields = ['sale_price', 'grand_total', 'balance_due', 'tax_gst', 'tax_pst', 'tax_hst', 'deposit_amount'];
  numericFields.forEach(field => {
    if (sale && sale[field] !== undefined && sale[field] !== null && typeof sale[field] !== 'number') {
      errors.push(`${field} must be a number`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export const sanitizeBOSForPrint = (sale) => {
  if (!sale) return null;
  
  // Strip all signature metadata and large objects for print
  return {
    // IDs
    id: sale.id,
    company_id: sale.company_id,
    
    // BOS info
    bos_number: sale.bos_number || '',
    bos_status: sale.bos_status || 'draft',
    bos_issued_date: sale.bos_issued_date || null,
    bos_issued_by: sale.bos_issued_by || '',
    
    // Customer
    customer_name: sale.customer_name || '',
    customer_address: sale.customer_address || '',
    customer_city: sale.customer_city || '',
    customer_postal_code: sale.customer_postal_code || '',
    customer_phone: sale.customer_phone || '',
    customer_business_phone: sale.customer_business_phone || '',
    customer_email: sale.customer_email || '',
    
    // Vehicle
    vehicle_details: sale.vehicle_details || '',
    vehicle_year: sale.vehicle_year || '',
    vehicle_make_model: sale.vehicle_make_model || '',
    vehicle_vin: sale.vehicle_vin || '',
    vehicle_color: sale.vehicle_color || '',
    vehicle_mileage: typeof sale.vehicle_mileage === 'number' ? sale.vehicle_mileage : 0,
    
    // Pricing (ensure numbers)
    sale_price: typeof sale.sale_price === 'number' ? sale.sale_price : 0,
    grand_total: typeof sale.grand_total === 'number' ? sale.grand_total : 0,
    balance_due: typeof sale.balance_due === 'number' ? sale.balance_due : 0,
    deposit_amount: typeof sale.deposit_amount === 'number' ? sale.deposit_amount : 0,
    
    // Taxes (ensure numbers)
    tax_gst: typeof sale.tax_gst === 'number' ? sale.tax_gst : 0,
    tax_pst: typeof sale.tax_pst === 'number' ? sale.tax_pst : 0,
    tax_hst: typeof sale.tax_hst === 'number' ? sale.tax_hst : 0,
    tax_total: typeof sale.tax_total === 'number' ? sale.tax_total : 0,
    
    // Other
    sale_date: sale.sale_date || null,
    sale_type: sale.sale_type || 'domestic',
    province: sale.province || '',
    salesman: sale.salesman || '',
    salesman_phone: sale.salesman_phone || '',
    
    // PST exemption
    pst_exempt: sale.pst_exempt || false,
    pst_exempt_reason: sale.pst_exempt_reason || '',
    pst_exempt_reference: sale.pst_exempt_reference || '',
    
    // Trade-in (simplified)
    trade_in: {
      net_trade_value: typeof sale.trade_in?.net_trade_value === 'number' ? sale.trade_in.net_trade_value : 0
    },
    
    // Signature indicators (NO IMAGE DATA)
    has_buyer_signature: !!(sale.buyer_signature_url || sale.buyer_signed_at),
    has_seller_signature: !!(sale.seller_signature_url || sale.seller_signed_at),
    buyer_name: sale.buyer_name || sale.customer_name || '',
    seller_name: sale.seller_name || sale.salesman || '',
    buyer_signed_at: sale.buyer_signed_at || null,
    seller_signed_at: sale.seller_signed_at || null
  };
};

export const prepareBOSForSecurityScan = (sale, company) => {
  // Validate first
  const validation = validateBOSForPrint(sale, company);
  if (!validation.valid) {
    throw new Error(`BOS validation failed: ${validation.errors.join(', ')}`);
  }
  
  // Sanitize and return clean payload
  return sanitizeBOSForPrint(sale);
};