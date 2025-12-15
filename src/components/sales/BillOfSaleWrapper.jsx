import React from "react";
import BillOfSale from "./BillOfSale";
import { Loader2 } from "lucide-react";

export default function BillOfSaleWrapper({ sale, company, existingSignatures, onSignaturesUpdate }) {
  // Early validation to prevent 500 errors
  if (!sale) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-8 text-center text-amber-600">
        <p>Company information is required to generate Bill of Sale.</p>
        <p className="text-sm mt-2">Please ensure a company is selected.</p>
      </div>
    );
  }

  // Validate critical sale fields
  const missingFields = [];
  if (!sale.customer_name) missingFields.push("Customer Name");
  if (!sale.vehicle_details) missingFields.push("Vehicle Details");
  if (!sale.company_id) missingFields.push("Company ID");
  if (sale.sale_price === undefined || sale.sale_price === null) missingFields.push("Sale Price");

  if (missingFields.length > 0) {
    return (
      <div className="p-8 text-center text-red-600">
        <p className="font-semibold mb-2">Cannot Generate Bill of Sale</p>
        <p className="text-sm">Missing required fields:</p>
        <ul className="text-sm mt-2 list-disc list-inside">
          {missingFields.map(field => (
            <li key={field}>{field}</li>
          ))}
        </ul>
      </div>
    );
  }

  // Render the actual BillOfSale component with validated data
  return (
    <BillOfSale 
      sale={sale}
      company={company}
      existingSignatures={existingSignatures}
      onSignaturesUpdate={onSignaturesUpdate}
    />
  );
}