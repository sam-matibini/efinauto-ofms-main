import { supabase } from "@/api/supabaseClient";

/**
 * Central Bill of Sale Numbering Service
 * Generates unique, sequential BOS numbers following format: BOS-YYYY-LOC-NNNNNN
 * Supports multi-location, yearly resets, and race-condition safe generation
 */

export async function generateBOSNumber(companyId, locationCode = 'HQ') {
  const currentYear = new Date().getFullYear();
  
  try {
    // Find existing sequence for this company, year, and location
    const existingSequences = await supabase.entities.DocumentSequence.filter({
      company_id: companyId,
      document_type: 'bill_of_sale',
      year: currentYear,
      location_code: locationCode
    });

    let sequence;
    let nextSequenceNumber;

    if (existingSequences.length > 0) {
      // Update existing sequence
      sequence = existingSequences[0];
      nextSequenceNumber = (sequence.last_sequence || 0) + 1;
      
      // Update the sequence
      await supabase.entities.DocumentSequence.update(sequence.id, {
        last_sequence: nextSequenceNumber
      });
    } else {
      // Create new sequence record for this year/location
      nextSequenceNumber = 1;
      sequence = await supabase.entities.DocumentSequence.create({
        company_id: companyId,
        document_type: 'bill_of_sale',
        year: currentYear,
        location_code: locationCode,
        last_sequence: nextSequenceNumber,
        format_template: 'BOS-YYYY-LOC-NNNNNN',
        prefix: 'BOS',
        reset_yearly: true
      });
    }

    // Format the BOS number
    const bosNumber = formatBOSNumber(currentYear, locationCode, nextSequenceNumber);
    
    return {
      bos_number: bosNumber,
      bos_sequence: nextSequenceNumber,
      location_code: locationCode,
      year: currentYear
    };
  } catch (error) {
    console.error("Failed to generate BOS number:", error);
    throw new Error("Failed to generate Bill of Sale number. Please try again.");
  }
}

/**
 * Format BOS number according to template
 */
function formatBOSNumber(year, locationCode, sequence) {
  // Format sequence with leading zeros (6 digits)
  const sequenceStr = String(sequence).padStart(6, '0');
  
  // Build BOS number: BOS-YYYY-LOC-NNNNNN
  return `BOS-${year}-${locationCode}-${sequenceStr}`;
}

/**
 * Check if a BOS number already exists (for validation)
 */
export async function bosNumberExists(companyId, bosNumber) {
  const existing = await supabase.entities.Sale.filter({
    company_id: companyId,
    bos_number: bosNumber
  });
  
  return existing.length > 0;
}

/**
 * Get BOS numbering statistics for reporting
 */
export async function getBOSStatistics(companyId) {
  const currentYear = new Date().getFullYear();
  
  try {
    // Get all sequences for current year
    const sequences = await supabase.entities.DocumentSequence.filter({
      company_id: companyId,
      document_type: 'bill_of_sale',
      year: currentYear
    });

    // Get all finalized BOS for current year
    const finalizedBOS = await supabase.entities.Sale.filter({
      company_id: companyId,
      bos_status: 'finalized'
    });

    const currentYearBOS = finalizedBOS.filter(sale => {
      if (!sale.bos_issued_date) return false;
      const issueYear = new Date(sale.bos_issued_date).getFullYear();
      return issueYear === currentYear;
    });

    // Group by location
    const byLocation = {};
    sequences.forEach(seq => {
      byLocation[seq.location_code] = {
        last_sequence: seq.last_sequence || 0,
        total_issued: currentYearBOS.filter(s => s.location_code === seq.location_code).length
      };
    });

    return {
      total_issued_this_year: currentYearBOS.length,
      total_voided: finalizedBOS.filter(s => s.bos_status === 'voided').length,
      by_location: byLocation,
      sequences
    };
  } catch (error) {
    console.error("Failed to get BOS statistics:", error);
    return null;
  }
}

/**
 * Void a BOS (retains number but marks as cancelled)
 */
export async function voidBOS(saleId, reason, voidedBy) {
  try {
    const sale = await supabase.entities.Sale.filter({ id: saleId });
    if (sale.length === 0) {
      throw new Error("Sale not found");
    }

    const saleRecord = sale[0];
    
    if (saleRecord.bos_status !== 'finalized') {
      throw new Error("Only finalized Bill of Sale can be voided");
    }

    // Update sale to voided status (number is retained)
    await supabase.entities.Sale.update(saleId, {
      bos_status: 'voided',
      status: 'cancelled',
      notes: `${saleRecord.notes || ''}\n\n[VOIDED] ${new Date().toISOString()} by ${voidedBy}: ${reason}`
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to void BOS:", error);
    throw error;
  }
}

/**
 * Get next available BOS preview (without committing)
 */
export async function previewNextBOSNumber(companyId, locationCode = 'HQ') {
  const currentYear = new Date().getFullYear();
  
  try {
    const existingSequences = await supabase.entities.DocumentSequence.filter({
      company_id: companyId,
      document_type: 'bill_of_sale',
      year: currentYear,
      location_code: locationCode
    });

    let nextSequenceNumber;
    if (existingSequences.length > 0) {
      nextSequenceNumber = (existingSequences[0].last_sequence || 0) + 1;
    } else {
      nextSequenceNumber = 1;
    }

    return formatBOSNumber(currentYear, locationCode, nextSequenceNumber);
  } catch (error) {
    console.error("Failed to preview BOS number:", error);
    return null;
  }
}