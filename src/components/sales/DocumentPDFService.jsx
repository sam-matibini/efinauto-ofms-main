// Core PDF Generation Service - Single Source of Truth
// Generates PDFs from finalized database records only

import { base44 } from "@/api/base44Client";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const validateDocumentForPDF = (document, type = "BOS") => {
  const errors = [];
  
  if (!document) errors.push("Document is null");
  if (!document.id) errors.push("Document ID missing");
  if (!document.company_id) errors.push("Company ID missing");
  
  // Status validation
  if (type === "BOS") {
    if (document.bos_status !== "finalized" && document.bos_status !== "voided") {
      errors.push("Document must be finalized before generating PDF");
    }
    if (!document.bos_number) errors.push("BOS number missing");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export const generateDocumentPDF = async (documentId, documentType = "BOS") => {
  try {
    // Step 1: Load fresh document from database
    let document;
    if (documentType === "BOS") {
      document = await base44.entities.Sale.get(documentId);
    }
    
    // Step 2: Validate status
    const validation = validateDocumentForPDF(document, documentType);
    if (!validation.valid) {
      throw new Error(`PDF validation failed: ${validation.errors.join(", ")}`);
    }
    
    // Step 3: Load company data
    const company = await base44.entities.Company.get(document.company_id);
    
    // Step 4: Generate clean HTML template (null-safe)
    const htmlContent = generateCleanHTMLTemplate(document, company, documentType);
    
    // Step 5: Render to PDF
    const pdfBlob = await renderHTMLToPDF(htmlContent);
    
    // Step 6: Upload PDF to secure storage
    const fileName = `${documentType}_${document.bos_number || document.id}_${Date.now()}.pdf`;
    const file = new File([pdfBlob], fileName, { type: "application/pdf" });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    // Step 7: Store PDF reference in document
    const updateData = {};
    if (documentType === "BOS") {
      updateData.pdf_file_url = file_url;
      updateData.pdf_generated_at = new Date().toISOString();
    }
    await base44.entities.Sale.update(documentId, updateData);
    
    // Step 8: Log generation
    await logDocumentAction(document, "PDF_GENERATED", { file_url });
    
    return {
      success: true,
      pdf_url: file_url,
      document
    };
    
  } catch (error) {
    console.error("PDF Generation Error:", error);
    throw error;
  }
};

const generateCleanHTMLTemplate = (document, company, type) => {
  // Null-safe helpers
  const safe = (value, fallback = "") => value || fallback;
  const safeNum = (value, fallback = 0) => typeof value === "number" ? value : fallback;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${type} - ${safe(document.bos_number, document.id)}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
        .company-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .company-info { font-size: 12px; color: #333; }
        .doc-title { font-size: 20px; font-weight: bold; margin: 20px 0; }
        .doc-number { border: 2px solid #000; padding: 10px; display: inline-block; background: #f9f9f9; }
        .section { margin: 20px 0; }
        .field { margin: 10px 0; padding: 5px 0; border-bottom: 1px solid #000; }
        .field-label { font-weight: bold; display: inline-block; min-width: 150px; }
        .vehicle-table { width: 100%; border-collapse: collapse; border: 2px solid #000; }
        .vehicle-table td { border: 1px solid #000; padding: 8px; }
        .price-table { width: 100%; border-collapse: collapse; border: 2px solid #000; margin-top: 20px; }
        .price-table td { border: 1px solid #000; padding: 8px; }
        .total-row { font-weight: bold; background: #f0f0f0; }
        .footer { margin-top: 40px; border-top: 2px solid #000; padding-top: 20px; font-size: 10px; text-align: center; }
        .signature-section { margin-top: 60px; }
        .signature-box { display: inline-block; width: 45%; vertical-align: top; }
        .signature-line { border-top: 1px solid #000; margin-top: 50px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">${safe(company.name)}</div>
        <div class="company-info">
          ${safe(company.address)}, ${safe(company.city)}, ${safe(company.province)} ${safe(company.postal_code)}<br>
          Tel: ${safe(company.phone)} | Email: ${safe(company.email)}<br>
          GST: ${safe(company.gst_number)} | PST: ${safe(company.pst_number)} | Dealer Permit: ${safe(company.dealer_permit_number)}
        </div>
      </div>

      <div style="text-align: center;">
        <div class="doc-title">BILL OF SALE</div>
        ${document.bos_number ? `<div class="doc-number">BOS #: ${document.bos_number}</div>` : ''}
        <div style="margin-top: 10px; font-size: 12px;">
          ${document.bos_status === 'finalized' ? '✓ FINALIZED' : document.bos_status === 'voided' ? '⚠ VOIDED' : 'DRAFT'}
          ${document.sale_type === 'export' ? ' | ☑ EXPORT SALE (Zero-Rated)' : ' | ☑ DOMESTIC SALE'}
        </div>
      </div>

      <div class="section">
        <div class="field"><span class="field-label">Purchaser's Name:</span> ${safe(document.customer_name)}</div>
        <div class="field"><span class="field-label">Address:</span> ${safe(document.customer_address)}</div>
        <div class="field"><span class="field-label">City:</span> ${safe(document.customer_city)} <span class="field-label">Province:</span> ${safe(document.province)} <span class="field-label">Postal:</span> ${safe(document.customer_postal_code)}</div>
        <div class="field"><span class="field-label">Phone:</span> ${safe(document.customer_phone)} <span class="field-label">Business Phone:</span> ${safe(document.customer_business_phone)}</div>
        <div class="field"><span class="field-label">Email:</span> ${safe(document.customer_email)}</div>
        <div class="field"><span class="field-label">Salesman:</span> ${safe(document.salesman)} <span class="field-label">Date:</span> ${safe(document.sale_date)}</div>
      </div>

      <table class="vehicle-table">
        <tr>
          <td colspan="2"><strong>Vehicle Purchased</strong></td>
          <td><strong>Year</strong></td>
          <td colspan="3"><strong>Make & Model</strong></td>
        </tr>
        <tr>
          <td colspan="2">${safe(document.vehicle_details)}</td>
          <td>${safe(document.vehicle_year)}</td>
          <td colspan="3">${safe(document.vehicle_make_model)}</td>
        </tr>
        <tr>
          <td colspan="2"><strong>Odometer</strong></td>
          <td><strong>Colour</strong></td>
          <td colspan="3"><strong>VIN: ${safe(document.vehicle_vin)}</strong></td>
        </tr>
        <tr>
          <td colspan="2">${safeNum(document.vehicle_mileage)}</td>
          <td>${safe(document.vehicle_color)}</td>
          <td colspan="3"></td>
        </tr>
      </table>

      <table class="price-table">
        <tr><td>Total Price</td><td style="text-align: right;">$${safeNum(document.sale_price).toLocaleString()}</td></tr>
        <tr><td>Less Trade</td><td style="text-align: right;">$${safeNum(document.trade_in?.net_trade_value).toLocaleString()}</td></tr>
        <tr><td>P.S.T ${document.pst_exempt ? '(EXEMPT)' : ''}</td><td style="text-align: right;">$${safeNum(document.tax_pst).toFixed(2)}</td></tr>
        <tr><td>G.S.T / H.S.T</td><td style="text-align: right;">$${safeNum(document.tax_gst || document.tax_hst).toFixed(2)}</td></tr>
        <tr class="total-row"><td>Total</td><td style="text-align: right;">$${safeNum(document.grand_total).toLocaleString()}</td></tr>
        <tr><td>Less Deposit</td><td style="text-align: right;">$${safeNum(document.deposit_amount).toLocaleString()}</td></tr>
        <tr class="total-row"><td>Balance Due</td><td style="text-align: right;">$${safeNum(document.balance_due).toLocaleString()}</td></tr>
      </table>

      <div style="text-align: center; margin: 20px 0; font-size: 10px; font-weight: bold;">
        ALL VEHICLES ARE SOLD WITHOUT ANY WARRANTIES OR GUARANTEES UNLESS STIPULATED IN WRITING
      </div>

      <div class="signature-section">
        <div class="signature-box">
          <div><strong>Purchaser's Signature:</strong></div>
          <div class="signature-line"></div>
          ${document.buyer_signed_at ? `<div style="font-size: 10px; margin-top: 5px;">Signed: ${new Date(document.buyer_signed_at).toLocaleDateString()}</div>` : ''}
        </div>
        <div class="signature-box" style="float: right;">
          <div><strong>Salesman/Seller Signature:</strong></div>
          <div class="signature-line"></div>
          ${document.seller_signed_at ? `<div style="font-size: 10px; margin-top: 5px;">Signed: ${new Date(document.seller_signed_at).toLocaleDateString()}</div>` : ''}
        </div>
      </div>

      <div class="footer">
        Document generated: ${new Date().toLocaleString()}<br>
        This is a legally binding document. For questions, contact ${safe(company.email)}
      </div>
    </body>
    </html>
  `;
};

const renderHTMLToPDF = async (htmlContent) => {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = htmlContent;
  tempDiv.style.position = "absolute";
  tempDiv.style.left = "-9999px";
  tempDiv.style.width = "800px";
  tempDiv.style.background = "#ffffff";
  document.body.appendChild(tempDiv);

  const canvas = await html2canvas(tempDiv, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff"
  });

  document.body.removeChild(tempDiv);

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "letter");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pdfWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 10;

  pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
  heightLeft -= pdfHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight + 10;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;
  }

  return pdf.output("blob");
};

const logDocumentAction = async (document, action, metadata = {}) => {
  try {
    const user = await base44.auth.me();
    await base44.entities.AuditLog.create({
      company_id: document.company_id,
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name,
      module: "Sale",
      action,
      record_id: document.id,
      record_identifier: document.bos_number || document.sale_number,
      metadata,
      status: "success"
    });
  } catch (error) {
    console.error("Audit log error:", error);
  }
};