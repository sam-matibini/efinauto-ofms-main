import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ExportDocumentGenerator({ order, sale, company }) {
  const [generating, setGenerating] = useState(null);
  const [generatedDocs, setGeneratedDocs] = useState({});

  const generateCertificateOfOrigin = async () => {
    setGenerating('coo');
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; margin: 10px 0; }
            .section { margin: 20px 0; }
            .section-title { font-weight: bold; background: #f0f0f0; padding: 8px; margin-bottom: 10px; }
            .field { margin: 10px 0; }
            .field-label { font-weight: bold; display: inline-block; width: 200px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            td, th { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background: #f0f0f0; }
            .footer { margin-top: 50px; border-top: 2px solid #000; padding-top: 20px; }
            .signature { margin-top: 60px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">CERTIFICATE OF ORIGIN</div>
            <p>Non-Preferential Origin Declaration</p>
          </div>

          <div class="section">
            <div class="section-title">1. EXPORTER (Name and Address)</div>
            <p>${company?.name || ''}<br>
            ${company?.address || ''}<br>
            ${company?.city || ''}, ${company?.province || ''} ${company?.postal_code || ''}<br>
            ${company?.country || 'Canada'}</p>
            <p><strong>Phone:</strong> ${company?.phone || ''}</p>
            <p><strong>Email:</strong> ${company?.email || ''}</p>
          </div>

          <div class="section">
            <div class="section-title">2. CONSIGNEE (Name and Address)</div>
            <p>${order.consignee_name}<br>
            ${order.consignee_address || ''}<br>
            ${order.destination_country}</p>
            <p><strong>Phone:</strong> ${order.consignee_phone || ''}</p>
            <p><strong>Email:</strong> ${order.consignee_email || ''}</p>
          </div>

          <div class="section">
            <div class="section-title">3. MEANS OF TRANSPORT AND ROUTE</div>
            <p><strong>Mode:</strong> ${order.shipping_mode?.toUpperCase() || ''}</p>
            <p><strong>Departure Port:</strong> ${company?.city || 'Canada'}</p>
            <p><strong>Destination Port:</strong> ${order.destination_port || order.destination_country}</p>
          </div>

          <div class="section">
            <div class="section-title">4. ITEM DESCRIPTION</div>
            <table>
              <tr>
                <th>Marks</th>
                <th>Description</th>
                <th>Type</th>
                <th>HS Code</th>
                <th>Quantity</th>
                <th>Origin</th>
              </tr>
              ${(order.line_items || order.items || []).map((item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>
                    ${item.description || ''}
                    ${item.vin ? `<br>VIN: ${item.vin}` : ''}
                    ${item.part_number ? `<br>P/N: ${item.part_number}` : ''}
                    ${item.item_condition ? `<br>Condition: ${item.item_condition}` : ''}
                  </td>
                  <td style="text-transform: capitalize;">${item.item_type || 'commodity'}</td>
                  <td>${item.hs_code || ''}<br><small>${item.hs_code_level ? item.hs_code_level + '-digit' : ''}</small></td>
                  <td>${item.quantity || 1} ${item.unit_of_measure || ''}</td>
                  <td>${item.country_of_origin || order.country_of_origin || company?.country || 'Canada'}</td>
                </tr>
              `).join('')}
            </table>
          </div>

          <div class="section">
            <div class="section-title">5. DECLARATION</div>
            <p>The undersigned hereby declares that the above details and statements are correct; 
            that all the goods were produced in <strong>${order.country_of_origin || company?.country || 'Canada'}</strong> 
            and that they comply with the origin requirements specified for those goods in the applicable 
            preferential trade agreement.</p>
          </div>

          <div class="footer">
            <div class="field">
              <span class="field-label">Place and Date:</span>
              ${company?.city || ''}, ${format(new Date(), 'MMMM d, yyyy')}
            </div>
            <div class="signature">
              <div class="field">
                <span class="field-label">Authorized Signature:</span>
                _________________________________
              </div>
              <div class="field">
                <span class="field-label">Name and Title:</span>
                ${company?.contact_person_name || ''}, ${company?.contact_person_title || 'Authorized Representative'}
              </div>
            </div>
          </div>

          <div style="margin-top: 30px; font-size: 10px; color: #666;">
            <p><strong>Document Number:</strong> COO-${order.export_order_number}</p>
            <p><strong>Generated:</strong> ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
          </div>
        </body>
        </html>
      `;

      // Convert to PDF and upload
      const blob = new Blob([html], { type: 'text/html' });
      const file = new File([blob], `COO_${order.export_order_number}.html`, { type: 'text/html' });
      const { file_url } = await supabase.integrations.Core.UploadFile({ file });

      // Update order with document
      const updatedDocs = [...(order.documents || []), {
        type: 'certificate_of_origin',
        name: `Certificate of Origin - ${order.export_order_number}`,
        url: file_url,
        generated_at: new Date().toISOString()
      }];

      await supabase.entities.ExportOrder.update(order.id, {
        documents: updatedDocs
      });

      setGeneratedDocs(prev => ({ ...prev, coo: file_url }));
      toast.success("Certificate of Origin generated");
      
      // Open in new tab
      window.open(file_url, '_blank');
    } catch (error) {
      toast.error("Failed to generate certificate: " + error.message);
    } finally {
      setGenerating(null);
    }
  };

  const generateCommercialInvoice = async () => {
    setGenerating('invoice');
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { display: flex; justify-content: space-between; border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 28px; font-weight: bold; color: #000; }
            .company-info { text-align: right; }
            .section { margin: 20px 0; }
            .section-title { font-weight: bold; background: #f0f0f0; padding: 8px; margin-bottom: 10px; }
            .party-box { border: 1px solid #000; padding: 15px; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            td, th { border: 1px solid #000; padding: 10px; text-align: left; }
            th { background: #e0e0e0; font-weight: bold; }
            .total-row { font-weight: bold; background: #f5f5f5; }
            .footer { margin-top: 40px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">COMMERCIAL INVOICE</div>
              <p style="margin: 5px 0;"><strong>Invoice #:</strong> ${order.export_order_number}</p>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${format(new Date(), 'MMMM d, yyyy')}</p>
            </div>
            <div class="company-info">
              ${company?.logo_url ? `<img src="${company.logo_url}" style="height: 60px; margin-bottom: 10px;">` : ''}
              <p style="margin: 2px 0; font-weight: bold;">${company?.name || ''}</p>
              <p style="margin: 2px 0;">${company?.address || ''}</p>
              <p style="margin: 2px 0;">${company?.city || ''}, ${company?.province || ''} ${company?.postal_code || ''}</p>
              <p style="margin: 2px 0;">${company?.country || 'Canada'}</p>
              <p style="margin: 2px 0;">Tel: ${company?.phone || ''}</p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0;">
            <div class="party-box">
              <div class="section-title">EXPORTER / SELLER</div>
              <p><strong>${company?.name || ''}</strong></p>
              <p>${company?.address || ''}</p>
              <p>${company?.city || ''}, ${company?.province || ''} ${company?.postal_code || ''}</p>
              <p>${company?.country || 'Canada'}</p>
              <p>VAT/TAX ID: ${company?.gst_number || ''}</p>
            </div>

            <div class="party-box">
              <div class="section-title">CONSIGNEE / BUYER</div>
              <p><strong>${order.consignee_name}</strong></p>
              <p>${order.consignee_address || ''}</p>
              <p>${order.destination_country}</p>
              <p>Phone: ${order.consignee_phone || ''}</p>
              <p>Email: ${order.consignee_email || ''}</p>
            </div>
          </div>

          <div class="section">
            <table>
              <tr>
                <th style="width: 50px;">#</th>
                <th>Description</th>
                <th style="width: 100px;">Type</th>
                <th style="width: 120px;">HS Code</th>
                <th style="width: 80px;">Qty</th>
                <th style="width: 100px;">Unit Price</th>
                <th style="width: 100px;">Total</th>
              </tr>
              ${(order.line_items || order.items || []).map((item, idx) => `
                <tr>
                  <td style="text-align: center;">${idx + 1}</td>
                  <td>
                    ${item.description || ''}
                    ${item.vin ? `<br><small>VIN: ${item.vin}</small>` : ''}
                    ${item.part_number ? `<br><small>P/N: ${item.part_number}</small>` : ''}
                    ${item.item_condition ? `<br><small>Condition: ${item.item_condition}</small>` : ''}
                  </td>
                  <td style="text-align: center; text-transform: capitalize;">${item.item_type || 'commodity'}</td>
                  <td>${item.hs_code || ''}<br><small>${item.hs_code_level ? item.hs_code_level + '-digit' : ''}</small></td>
                  <td style="text-align: center;">${item.quantity || 1} ${item.unit_of_measure || ''}</td>
                  <td style="text-align: right;">${order.currency} ${(item.unit_value || 0).toLocaleString()}</td>
                  <td style="text-align: right;">${order.currency} ${(item.total_value || 0).toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="5" style="text-align: right;">SUBTOTAL:</td>
                <td style="text-align: right;">${order.currency} ${(order.total_value || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td colspan="5" style="text-align: right;">Freight:</td>
                <td style="text-align: right;">${order.currency} ${(order.freight_cost || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td colspan="5" style="text-align: right;">Insurance:</td>
                <td style="text-align: right;">${order.currency} ${(order.insurance_cost || 0).toLocaleString()}</td>
              </tr>
              <tr class="total-row">
                <td colspan="5" style="text-align: right; font-size: 16px;">TOTAL INVOICE VALUE:</td>
                <td style="text-align: right; font-size: 16px;">${order.currency} ${((order.total_value || 0) + (order.freight_cost || 0) + (order.insurance_cost || 0)).toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <div class="section-title">SHIPMENT INFORMATION</div>
            <p><strong>Incoterms:</strong> ${order.incoterms || 'N/A'}</p>
            <p><strong>Mode of Transport:</strong> ${order.shipping_mode?.toUpperCase() || ''}</p>
            <p><strong>Port of Loading:</strong> ${company?.city || 'Canada'}</p>
            <p><strong>Port of Discharge:</strong> ${order.destination_port || order.destination_country}</p>
            <p><strong>Country of Origin:</strong> ${order.country_of_origin || company?.country || 'Canada'}</p>
          </div>

          <div class="footer">
            <p><strong>Terms:</strong> This invoice is issued for customs purposes only. All goods remain the property of ${company?.name} until payment is received in full.</p>
            <p><strong>Authorized by:</strong> ${company?.contact_person_name || ''}, ${company?.contact_person_title || 'Authorized Representative'}</p>
            <p style="margin-top: 20px;">Document generated on ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
          </div>
        </body>
        </html>
      `;

      const blob = new Blob([html], { type: 'text/html' });
      const file = new File([blob], `Commercial_Invoice_${order.export_order_number}.html`, { type: 'text/html' });
      const { file_url } = await supabase.integrations.Core.UploadFile({ file });

      const updatedDocs = [...(order.documents || []), {
        type: 'commercial_invoice',
        name: `Commercial Invoice - ${order.export_order_number}`,
        url: file_url,
        generated_at: new Date().toISOString()
      }];

      await supabase.entities.ExportOrder.update(order.id, {
        documents: updatedDocs
      });

      setGeneratedDocs(prev => ({ ...prev, invoice: file_url }));
      toast.success("Commercial Invoice generated");
      
      window.open(file_url, '_blank');
    } catch (error) {
      toast.error("Failed to generate invoice: " + error.message);
    } finally {
      setGenerating(null);
    }
  };

  const generatePackingList = async () => {
    setGenerating('packing');
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; }
            .section { margin: 20px 0; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .info-box { border: 1px solid #000; padding: 15px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            td, th { border: 1px solid #000; padding: 10px; }
            th { background: #e0e0e0; font-weight: bold; }
            .summary { background: #f5f5f5; padding: 15px; margin-top: 20px; border: 1px solid #000; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">PACKING LIST</div>
            <p>Document #: PKL-${order.export_order_number}</p>
            <p>Date: ${format(new Date(), 'MMMM d, yyyy')}</p>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <h3 style="margin-top: 0;">SHIPPER</h3>
              <p><strong>${company?.name || ''}</strong></p>
              <p>${company?.address || ''}</p>
              <p>${company?.city || ''}, ${company?.province || ''} ${company?.postal_code || ''}</p>
              <p>${company?.country || 'Canada'}</p>
            </div>
            <div class="info-box">
              <h3 style="margin-top: 0;">CONSIGNEE</h3>
              <p><strong>${order.consignee_name}</strong></p>
              <p>${order.consignee_address || ''}</p>
              <p>${order.destination_country}</p>
            </div>
          </div>

          <div class="section">
            <table>
              <tr>
                <th>Package #</th>
                <th>Description</th>
                <th>Type</th>
                <th>Packaging</th>
                <th>Quantity</th>
                <th>Weight (kg)</th>
                <th>Dimensions</th>
              </tr>
              ${(order.line_items || order.items || []).map((item, idx) => `
                <tr>
                  <td style="text-align: center;">${idx + 1}</td>
                  <td>
                    ${item.description || ''}
                    ${item.vin ? `<br>VIN: ${item.vin}` : ''}
                    ${item.part_number ? `<br>P/N: ${item.part_number}` : ''}
                  </td>
                  <td style="text-transform: capitalize;">${item.item_type || 'commodity'}</td>
                  <td style="text-transform: capitalize;">${item.packaging_type || 'N/A'}</td>
                  <td style="text-align: center;">${item.quantity || 1} ${item.unit_of_measure || ''}</td>
                  <td style="text-align: right;">${item.weight || 'N/A'}</td>
                  <td>${item.dimensions?.length && item.dimensions?.width && item.dimensions?.height ? 
                    `${item.dimensions.length}x${item.dimensions.width}x${item.dimensions.height} ${item.dimensions.unit}` : 'N/A'}</td>
                </tr>
              `).join('')}
            </table>
          </div>

          <div class="summary">
            <h3 style="margin-top: 0;">SHIPMENT SUMMARY</h3>
            <p><strong>Total Packages:</strong> ${(order.line_items || order.items || []).length}</p>
            <p><strong>Total Weight:</strong> ${order.total_weight || 'N/A'} kg</p>
            <p><strong>Total Volume:</strong> ${order.total_volume || 'N/A'} m³</p>
            <p><strong>Container Type:</strong> ${order.container_type || 'N/A'}</p>
            <p><strong>Container Number:</strong> ${order.container_number || 'TBD'}</p>
            <p><strong>Seal Number:</strong> ${order.seal_number || 'TBD'}</p>
          </div>

          <div style="margin-top: 40px;">
            <p><strong>Prepared by:</strong> ${company?.contact_person_name || ''}</p>
            <p><strong>Date:</strong> ${format(new Date(), 'MMMM d, yyyy')}</p>
          </div>
        </body>
        </html>
      `;

      const blob = new Blob([html], { type: 'text/html' });
      const file = new File([blob], `Packing_List_${order.export_order_number}.html`, { type: 'text/html' });
      const { file_url } = await supabase.integrations.Core.UploadFile({ file });

      const updatedDocs = [...(order.documents || []), {
        type: 'packing_list',
        name: `Packing List - ${order.export_order_number}`,
        url: file_url,
        generated_at: new Date().toISOString()
      }];

      await supabase.entities.ExportOrder.update(order.id, {
        documents: updatedDocs
      });

      setGeneratedDocs(prev => ({ ...prev, packing: file_url }));
      toast.success("Packing List generated");
      
      window.open(file_url, '_blank');
    } catch (error) {
      toast.error("Failed to generate packing list: " + error.message);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Document Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">Certificate of Origin</span>
            </div>
            <Button
              onClick={generateCertificateOfOrigin}
              disabled={generating === 'coo'}
              size="sm"
              variant="outline"
            >
              {generating === 'coo' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : generatedDocs.coo ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">Commercial Invoice</span>
            </div>
            <Button
              onClick={generateCommercialInvoice}
              disabled={generating === 'invoice'}
              size="sm"
              variant="outline"
            >
              {generating === 'invoice' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : generatedDocs.invoice ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">Packing List</span>
            </div>
            <Button
              onClick={generatePackingList}
              disabled={generating === 'packing'}
              size="sm"
              variant="outline"
            >
              {generating === 'packing' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : generatedDocs.packing ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}