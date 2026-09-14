// Core PDF Generation Service - Single Source of Truth
// Generates PDFs from finalized database records only

import { supabase } from "@/api/supabaseClient";
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
      const sales = await supabase.entities.Sale.filter({ id: documentId });
      document = sales[0];
      if (!document) throw new Error("Sale not found");
    }
    
    // Step 2: Validate status
    const validation = validateDocumentForPDF(document, documentType);
    if (!validation.valid) {
      throw new Error(`PDF validation failed: ${validation.errors.join(", ")}`);
    }
    
    // Step 3: Load company data
    const companies = await supabase.entities.Company.filter({ id: document.company_id });
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
  const safeNum = (value, fallback = 0) => (typeof value === "number" ? value : fallback);
  const fmt = (num) => `$${safeNum(num).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bill of Sale - ${safe(document.bos_number, document.id)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #222; background: #fff; width: 794px; padding: 32px 40px; }

    /* ── HEADER ── */
    .header { display: table; width: 100%; border-bottom: 2px solid #2c3e50; padding-bottom: 14px; margin-bottom: 18px; }
    .header-left { display: table-cell; vertical-align: middle; width: 60%; }
    .header-right { display: table-cell; vertical-align: middle; text-align: right; width: 40%; }
    .logo { max-height: 64px; max-width: 160px; }
    .company-name { font-size: 17px; font-weight: bold; color: #2c3e50; }
    .company-meta { font-size: 9.5px; color: #555; margin-top: 4px; line-height: 1.7; }
    .doc-title { font-size: 22px; font-weight: bold; color: #2c3e50; letter-spacing: 1px; }
    .doc-number { font-size: 11px; color: #444; margin-top: 4px; }
    .doc-badge { display: inline-block; margin-top: 6px; padding: 2px 10px; border-radius: 3px; font-size: 9.5px; font-weight: bold; background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
    .doc-badge.voided { background: #fce4ec; color: #b71c1c; border-color: #ef9a9a; }
    .doc-badge.draft { background: #fff3e0; color: #e65100; border-color: #ffcc80; }
    .sale-type { font-size: 9px; color: #666; margin-top: 3px; }

    /* ── BUYER INFO ── */
    .section-title { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #2c3e50; background: #ecf0f1; padding: 4px 8px; margin: 14px 0 6px; border-left: 3px solid #2c3e50; }
    .buyer-block { display: table; width: 100%; margin-bottom: 10px; }
    .buyer-col { display: table-cell; width: 50%; vertical-align: top; padding-right: 24px; }
    .buyer-col:last-child { padding-right: 0; padding-left: 8px; }
    .buyer-field { margin-bottom: 6px; }
    .buyer-label { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #888; letter-spacing: 0.4px; margin-bottom: 1px; }
    .buyer-value { font-size: 11px; color: #222; border-bottom: 1px solid #e0e0e0; padding-bottom: 3px; min-height: 16px; }

    /* ── VEHICLE TABLE ── */
    .veh-table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    .veh-table th { background: #2c3e50; color: #fff; font-size: 10px; padding: 6px 10px; text-align: left; border: 1px solid #2c3e50; }
    .veh-table td { border: 1px solid #ccc; padding: 6px 10px; font-size: 10.5px; }
    .veh-table tr:nth-child(even) td { background: #f9f9f9; }

    /* ── PRICING TABLE ── */
    .price-wrap { display: table; width: 100%; margin-top: 14px; }
    .price-spacer { display: table-cell; width: 55%; }
    .price-table-cell { display: table-cell; width: 45%; vertical-align: top; }
    .price-table { width: 100%; border-collapse: collapse; }
    .price-table td { padding: 5px 10px; font-size: 10.5px; border: 1px solid #ddd; }
    .price-table td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
    .price-table .lbl-col { color: #444; }
    .price-table tr.subtotal td { background: #f5f5f5; font-weight: bold; }
    .price-table tr.total td { background: #2c3e50; color: #fff; font-weight: bold; font-size: 11px; }
    .price-table tr.balance td { background: #e8f5e9; color: #1b5e20; font-weight: bold; }

    /* ── DISCLAIMER ── */
    .disclaimer { text-align: center; font-size: 8.5px; color: #555; margin: 16px 0 10px; padding: 6px; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; }

    /* ── SIGNATURES ── */
    .sig-section { display: table; width: 100%; margin-top: 20px; }
    .sig-box { display: table-cell; width: 48%; vertical-align: bottom; padding: 0 4px; }
    .sig-spacer { display: table-cell; width: 4%; }
    .sig-image { height: 44px; max-width: 180px; display: block; margin-bottom: 4px; }
    .sig-line { border-top: 1.5px solid #333; width: 100%; }
    .sig-name { font-size: 9.5px; color: #555; margin-top: 3px; }
    .sig-label { font-size: 10px; font-weight: bold; color: #333; margin-top: 8px; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      ${company.logo_url ? `<img src="${company.logo_url}" class="logo" crossorigin="anonymous" /><br/>` : ''}
      <div class="company-name">${safe(company.name)}</div>
      <div class="company-meta">
        ${[company.address, company.city, company.province, company.postal_code].filter(Boolean).join(' &bull; ')}<br>
        Tel: ${safe(company.phone, '—')} &nbsp;|&nbsp; Email: ${safe(company.email, '—')}<br>
        GST: ${safe(company.gst_number, '—')} &nbsp;|&nbsp; PST: ${safe(company.pst_number, '—')} &nbsp;|&nbsp; Dealer Permit: ${safe(company.dealer_permit_number, '—')}
      </div>
    </div>
    <div class="header-right">
      <div class="doc-title">BILL OF SALE</div>
      ${document.bos_number ? `<div class="doc-number"><strong>BOS #:</strong> ${document.bos_number}</div>` : ''}
      <div class="doc-number"><strong>Date:</strong> ${safe(document.sale_date, '—')}</div>
      <div>
        <span class="doc-badge${document.bos_status === 'voided' ? ' voided' : document.bos_status === 'draft' ? ' draft' : ''}">
          ${document.bos_status === 'finalized' ? '✓ FINALIZED' : document.bos_status === 'voided' ? '⚠ VOIDED' : 'DRAFT'}
        </span>
      </div>
      <div class="sale-type">${document.sale_type === 'export' ? '☑ Export Sale (Zero-Rated)' : '☑ Domestic Sale'}</div>
    </div>
  </div>

  <!-- PURCHASER INFO -->
  <div class="section-title">Purchaser Information</div>
  <div class="buyer-block">
    <div class="buyer-col">
      <div class="buyer-field">
        <div class="buyer-label">Name</div>
        <div class="buyer-value">${safe(document.customer_name)}</div>
      </div>
      <div class="buyer-field">
        <div class="buyer-label">Address</div>
        <div class="buyer-value">${safe(document.customer_address)}</div>
      </div>
      <div class="buyer-field">
        <div class="buyer-label">City</div>
        <div class="buyer-value">${safe(document.customer_city)}</div>
      </div>
      <div class="buyer-field">
        <div class="buyer-label">Province / State</div>
        <div class="buyer-value">${safe(document.province)}</div>
      </div>
      <div class="buyer-field">
        <div class="buyer-label">Postal Code</div>
        <div class="buyer-value">${safe(document.customer_postal_code)}</div>
      </div>
    </div>
    <div class="buyer-col">
      <div class="buyer-field">
        <div class="buyer-label">Salesman</div>
        <div class="buyer-value">${safe(document.salesman)}</div>
      </div>
      <div class="buyer-field">
        <div class="buyer-label">Salesman Telephone</div>
        <div class="buyer-value">${safe(document.salesman_phone)}</div>
      </div>
      <div class="buyer-field">
        <div class="buyer-label">Phone</div>
        <div class="buyer-value">${safe(document.customer_phone)}</div>
      </div>
      <div class="buyer-field">
        <div class="buyer-label">Business Phone</div>
        <div class="buyer-value">${safe(document.customer_business_phone)}</div>
      </div>
      <div class="buyer-field">
        <div class="buyer-label">Email</div>
        <div class="buyer-value">${safe(document.customer_email)}</div>
      </div>
      <div class="buyer-field">
        <div class="buyer-label">Country</div>
        <div class="buyer-value">${safe(document.customer_country)}</div>
      </div>
    </div>
  </div>

  <!-- VEHICLE INFO -->
  <div class="section-title">Vehicle Details</div>
  <table class="veh-table">
    <tr>
      <th style="width:35%">Vehicle Description</th>
      <th style="width:10%">Year</th>
      <th style="width:25%">Make &amp; Model</th>
      <th style="width:10%">Colour</th>
      <th style="width:20%">VIN</th>
    </tr>
    <tr>
      <td>${safe(document.vehicle_details)}</td>
      <td>${safe(document.vehicle_year, '—')}</td>
      <td>${safe(document.vehicle_make_model, '—')}</td>
      <td>${safe(document.vehicle_color, '—')}</td>
      <td>${safe(document.vehicle_vin, '—')}</td>
    </tr>
    <tr>
      <th colspan="5">Odometer Reading</th>
    </tr>
    <tr>
      <td colspan="5">${safeNum(document.vehicle_mileage) ? safeNum(document.vehicle_mileage).toLocaleString() + ' km' : '—'}</td>
    </tr>
  </table>

  <!-- PRICING -->
  <div class="price-wrap">
    <div class="price-spacer"></div>
    <div class="price-table-cell">
      <table class="price-table">
        <tr><td class="lbl-col">Sale Price</td><td>${fmt(document.sale_price)}</td></tr>
        <tr><td class="lbl-col">Less Trade-In</td><td>- ${fmt(document.trade_in?.net_trade_value)}</td></tr>
        <tr><td class="lbl-col">P.S.T ${document.pst_exempt ? '<span style="color:#b71c1c">(EXEMPT)</span>' : ''}</td><td>${fmt(document.tax_pst)}</td></tr>
        <tr><td class="lbl-col">G.S.T / H.S.T</td><td>${fmt(document.tax_gst || document.tax_hst)}</td></tr>
        <tr class="subtotal"><td>Total</td><td>${fmt(document.grand_total)}</td></tr>
        <tr><td class="lbl-col">Less Deposit</td><td>- ${fmt(document.deposit_amount)}</td></tr>
        <tr class="balance"><td>Balance Due</td><td>${fmt(document.balance_due)}</td></tr>
      </table>
    </div>
  </div>

  <!-- DISCLAIMER -->
  <div class="disclaimer">ALL VEHICLES ARE SOLD WITHOUT ANY WARRANTIES OR GUARANTEES UNLESS STIPULATED IN WRITING</div>

  <!-- SIGNATURES -->
  <div class="sig-section">
    <div class="sig-box">
      ${document.buyer_signature_url ? `<img src="${document.buyer_signature_url}" class="sig-image" />` : '<div style="height:44px;"></div>'}
      <div class="sig-line"></div>
      <div class="sig-label">Purchaser's Signature</div>
      ${document.buyer_signed_at ? `<div class="sig-name">Signed: ${new Date(document.buyer_signed_at).toLocaleDateString('en-CA')}</div>` : ''}
    </div>
    <div class="sig-spacer"></div>
    <div class="sig-box">
      ${document.seller_signature_url ? `<img src="${document.seller_signature_url}" class="sig-image" />` : '<div style="height:44px;"></div>'}
      <div class="sig-line"></div>
      <div class="sig-label">Salesman / Seller Signature</div>
      ${document.salesman || document.seller_name ? `<div class="sig-name">${safe(document.salesman || document.seller_name)}${document.salesman_phone ? ' · ' + safe(document.salesman_phone) : ''}</div>` : ''}
      ${document.seller_signed_at ? `<div class="sig-name">Signed: ${new Date(document.seller_signed_at).toLocaleDateString('en-CA')}</div>` : ''}
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
    const user = await supabase.auth.me();
    await supabase.entities.AuditLog.create({
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