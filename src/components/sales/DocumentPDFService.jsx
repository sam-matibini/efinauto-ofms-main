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
      const sales = await base44.entities.Sale.filter({ id: documentId });
      document = sales[0];
      if (!document) throw new Error("Sale not found");
    }
    
    // Step 2: Validate status
    const validation = validateDocumentForPDF(document, documentType);
    if (!validation.valid) {
      throw new Error(`PDF validation failed: ${validation.errors.join(", ")}`);
    }
    
    // Step 3: Load company data
    const companies = await base44.entities.Company.filter({ id: document.company_id });
    const company = companies[0];
    if (!company) throw new Error("Company not found");
    
    // Step 4: Generate PDF from clean HTML template (reliable, no DOM dependency)
    const pdfBlob = await renderHTMLToPDF(generateCleanHTMLTemplate(document, company, documentType));
    
    // Step 6: Return blob URL for download/print (no upload to save credits)
    const blobUrl = URL.createObjectURL(pdfBlob);
    
    // Step 7: Log generation (without upload)
    await logDocumentAction(document, "PDF_GENERATED", { client_side: true });
    
    return {
      success: true,
      pdf_blob: pdfBlob,
      pdf_url: blobUrl,
      document
    };
    
  } catch (error) {
    console.error("PDF Generation Error:", error);
    throw error;
  }
};

const generateCleanHTMLTemplate = (document, company, type) => {
  const safe = (value, fallback = "") => value || fallback;
  const safeNum = (value, fallback = 0) => typeof value === "number" ? value : fallback;
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${type} - ${safe(document.bos_number, document.id)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11px; padding: 24px 32px; color: #000; width: 816px; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 12px; }
    .logo { max-height: 60px; margin-bottom: 6px; }
    .company-name { font-size: 20px; font-weight: bold; }
    .company-info { font-size: 10px; color: #333; margin-top: 3px; line-height: 1.5; }
    .doc-center { text-align: center; margin: 10px 0 8px; }
    .doc-title { font-size: 16px; font-weight: bold; margin-bottom: 6px; }
    .doc-number { border: 1px solid #000; padding: 6px 16px; display: inline-block; font-size: 12px; }
    .doc-status { font-size: 10px; margin-top: 5px; }
    .fields { margin: 8px 0; }
    .field-row { display: flex; border-bottom: 1px solid #000; padding: 3px 0; gap: 8px; }
    .field-label { font-weight: bold; white-space: nowrap; min-width: 120px; }
    .field-value { flex: 1; }
    .field-inline { display: inline-flex; gap: 4px; margin-right: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    table td { border: 1px solid #000; padding: 5px 8px; font-size: 10.5px; }
    table th { border: 1px solid #000; padding: 5px 8px; font-weight: bold; background: #fff; }
    .price-right { text-align: right; }
    .bold-row td { font-weight: bold; }
    .disclaimer { text-align: center; font-size: 9px; font-weight: bold; margin: 8px 0; }
    .sig-section { display: flex; justify-content: space-between; margin-top: 16px; }
    .sig-box { width: 45%; }
    .sig-label { font-weight: bold; font-size: 11px; margin-bottom: 32px; }
    .sig-line { border-top: 1px solid #000; margin-top: 4px; }
    .sig-date { font-size: 9px; margin-top: 3px; color: #555; }
  </style>
</head>
<body>
  <div class="header">
    ${company.logo_url ? `<img src="${company.logo_url}" class="logo" crossorigin="anonymous" />` : ''}
    <div class="company-name">${safe(company.name)}</div>
    <div class="company-info">
      ${[company.address, company.city, company.province, company.postal_code].filter(Boolean).join(', ')}<br>
      Tel: ${safe(company.phone)} | Email: ${safe(company.email)}<br>
      GST: ${safe(company.gst_number)} | PST: ${safe(company.pst_number)} | Dealer Permit: ${safe(company.dealer_permit_number)}
    </div>
  </div>

  <div class="doc-center">
    <div class="doc-title">BILL OF SALE</div>
    ${document.bos_number ? `<div class="doc-number">BOS #: ${document.bos_number}</div>` : ''}
    <div class="doc-status">
      ${document.bos_status === 'finalized' ? '✓ FINALIZED' : document.bos_status === 'voided' ? '⚠ VOIDED' : 'DRAFT'}
      &nbsp;|&nbsp;
      ${document.sale_type === 'export' ? '☑ EXPORT SALE (Zero-Rated)' : '☑ DOMESTIC SALE'}
    </div>
  </div>

  <div class="fields">
    <div class="field-row"><span class="field-label">Purchaser's Name:</span><span class="field-value">${safe(document.customer_name)}</span></div>
    <div class="field-row"><span class="field-label">Address:</span><span class="field-value">${safe(document.customer_address)}</span></div>
    <div class="field-row">
      <span class="field-inline"><span class="field-label">City:</span><span>${safe(document.customer_city)}</span></span>
      <span class="field-inline"><span class="field-label">Province:</span><span>${safe(document.province)}</span></span>
      <span class="field-inline"><span class="field-label">Postal:</span><span>${safe(document.customer_postal_code)}</span></span>
    </div>
    <div class="field-row">
      <span class="field-inline"><span class="field-label">Phone:</span><span>${safe(document.customer_phone)}</span></span>
      <span class="field-inline"><span class="field-label">Business Phone:</span><span>${safe(document.customer_business_phone)}</span></span>
    </div>
    <div class="field-row"><span class="field-label">Email:</span><span class="field-value">${safe(document.customer_email)}</span></div>
    <div class="field-row">
      <span class="field-inline"><span class="field-label">Salesman:</span><span>${safe(document.salesman)}</span></span>
      <span class="field-inline"><span class="field-label">Date:</span><span>${safe(document.sale_date)}</span></span>
    </div>
  </div>

  <table>
    <tr><th style="width:40%">Vehicle Purchased</th><th style="width:12%">Year</th><th>Make &amp; Model</th></tr>
    <tr><td>${safe(document.vehicle_details)}</td><td>${safe(document.vehicle_year)}</td><td>${safe(document.vehicle_make_model)}</td></tr>
    <tr><th>Odometer</th><th>Colour</th><th>VIN: ${safe(document.vehicle_vin)}</th></tr>
    <tr><td>${safeNum(document.vehicle_mileage)}</td><td>${safe(document.vehicle_color)}</td><td></td></tr>
  </table>

  <table>
    <tr><td>Total Price</td><td class="price-right">$${safeNum(document.sale_price).toLocaleString()}</td></tr>
    <tr><td>Less Trade</td><td class="price-right">$${safeNum(document.trade_in?.net_trade_value).toLocaleString()}</td></tr>
    <tr><td>P.S.T ${document.pst_exempt ? '(EXEMPT)' : ''}</td><td class="price-right">$${safeNum(document.tax_pst).toFixed(2)}</td></tr>
    <tr><td>G.S.T / H.S.T</td><td class="price-right">$${safeNum(document.tax_gst || document.tax_hst).toFixed(2)}</td></tr>
    <tr class="bold-row"><td>Total</td><td class="price-right">$${safeNum(document.grand_total).toLocaleString()}</td></tr>
    <tr><td>Less Deposit</td><td class="price-right">$${safeNum(document.deposit_amount).toLocaleString()}</td></tr>
    <tr class="bold-row"><td>Balance Due</td><td class="price-right">$${safeNum(document.balance_due).toLocaleString()}</td></tr>
  </table>

  <div class="disclaimer">ALL VEHICLES ARE SOLD WITHOUT ANY WARRANTIES OR GUARANTEES UNLESS STIPULATED IN WRITING</div>

  <div class="sig-section">
    <div class="sig-box">
      <div class="sig-label">Purchaser's Signature:</div>
      ${document.buyer_signature_url ? `<img src="${document.buyer_signature_url}" style="height:40px;max-width:200px;" />` : ''}
      <div class="sig-line"></div>
      ${document.buyer_signed_at ? `<div class="sig-date">Signed: ${new Date(document.buyer_signed_at).toLocaleDateString()}</div>` : ''}
    </div>
    <div class="sig-box">
      <div class="sig-label">Salesman/Seller Signature:</div>
      ${document.seller_signature_url ? `<img src="${document.seller_signature_url}" style="height:40px;max-width:200px;" />` : ''}
      <div class="sig-line"></div>
      ${document.seller_signed_at ? `<div class="sig-date">Signed: ${new Date(document.seller_signed_at).toLocaleDateString()}</div>` : ''}
    </div>
  </div>
</body>
</html>`;
};

const renderHTMLToPDF = async (htmlContent) => {
  return new Promise((resolve, reject) => {
    const iframe = window.document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:816px;height:1056px;border:none;";
    window.document.body.appendChild(iframe);

    iframe.onload = async () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const element = iframeDoc.body;

        // Wait briefly for images (logo) to load
        await new Promise(r => setTimeout(r, 500));

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          allowTaint: true,
          imageTimeout: 3000,
          windowWidth: 816,
        });

        window.document.body.removeChild(iframe);

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "letter");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        // Fit entire content onto one page
        const margin = 10;
        const usableWidth = pdfWidth - margin * 2;
        const usableHeight = pdfHeight - margin * 2;
        const imgAspect = canvas.height / canvas.width;
        let imgW = usableWidth;
        let imgH = imgW * imgAspect;
        if (imgH > usableHeight) {
          imgH = usableHeight;
          imgW = imgH / imgAspect;
        }
        const xOffset = margin + (usableWidth - imgW) / 2;
        pdf.addImage(imgData, "PNG", xOffset, margin, imgW, imgH);

        resolve(pdf.output("blob"));
      } catch (err) {
        window.document.body.removeChild(iframe);
        reject(err);
      }
    };

    iframe.onerror = (err) => {
      window.document.body.removeChild(iframe);
      reject(err);
    };

    iframe.srcdoc = htmlContent;
  });
};

const renderElementToPDF = async (element) => {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    allowTaint: true,
    imageTimeout: 0
  });

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