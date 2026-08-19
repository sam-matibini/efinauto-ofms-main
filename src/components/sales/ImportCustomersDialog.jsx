import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { toast } from "sonner";

export default function ImportCustomersDialog({ open, onClose, companyId, onSuccess }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.csv') || selectedFile.type === 'text/csv') {
        setFile(selectedFile);
        setResults(null);
      } else {
        toast.error("Please select a valid CSV file");
      }
    }
  };

  const parseCSV = (text) => {
    const lines = text.split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',').map(v => v.trim().replace(/['"]/g, ''));
      const row = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      rows.push(row);
    }
    
    return rows;
  };

  const parseFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const rows = parseCSV(text);
          resolve(rows);
        } catch (error) {
          reject(error);
        }
      };

      reader.readAsText(file);
    });
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setImporting(true);
    try {
      const rows = await parseFile(file);
      
      let created = 0;
      let failed = 0;
      const errors = [];

      for (const row of rows) {
        try {
          await supabase.entities.Customer.create({
            company_id: companyId,
            full_name: row.full_name || row['Full Name'] || row.name || row.Name,
            email: row.email || row.Email || '',
            phone: row.phone || row.Phone,
            address: row.address || row.Address || '',
            city: row.city || row.City || '',
            country: row.country || row.Country || '',
            customer_type: row.customer_type || row['Customer Type'] || 'individual',
            company_name: row.company_name || row['Company Name'] || '',
            tax_id: row.tax_id || row['Tax ID'] || '',
            notes: row.notes || row.Notes || ''
          });
          created++;
        } catch (error) {
          failed++;
          errors.push({ row: row.full_name || row.name || row.Name, error: error.message });
        }
      }

      setResults({ created, failed, errors });
      
      if (created > 0) {
        toast.success(`Successfully imported ${created} customer(s)`);
        onSuccess();
      }
      
      if (failed > 0) {
        toast.error(`Failed to import ${failed} customer(s)`);
      }
    } catch (error) {
      toast.error(`Import failed: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['full_name', 'email', 'phone', 'address', 'city', 'country', 'customer_type', 'company_name', 'tax_id', 'notes'];
    const sampleData = [
      ['John Doe', 'john@example.com', '555-1234', '123 Main St', 'Toronto', 'Canada', 'individual', '', '', 'Regular customer']
    ];

    const csv = [headers, ...sampleData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers_import_template.csv';
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Customers from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Template Download */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Download Template</p>
                <p className="text-xs text-blue-700 mt-1">
                  Use our template to ensure your data is formatted correctly
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={downloadTemplate}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <Label htmlFor="file-upload">Upload CSV File</Label>
            <div className="mt-2">
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
              >
                <div className="text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {file ? file.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">CSV files only</p>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Results */}
          {results && (
            <div className="space-y-3">
              {results.created > 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-800">
                    Successfully imported {results.created} customer(s)
                  </span>
                </div>
              )}
              
              {results.failed > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-red-800">
                      Failed to import {results.failed} customer(s)
                    </span>
                  </div>
                  {results.errors.length > 0 && (
                    <div className="ml-7 space-y-1">
                      {results.errors.slice(0, 5).map((err, idx) => (
                        <p key={idx} className="text-xs text-red-700">
                          • {err.row}: {err.error}
                        </p>
                      ))}
                      {results.errors.length > 5 && (
                        <p className="text-xs text-red-700">
                          ... and {results.errors.length - 5} more errors
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Required Fields Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900 mb-2">Required Fields:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <strong>full_name</strong> - Customer full name</li>
              <li>• <strong>phone</strong> - Customer phone number</li>
            </ul>
            <p className="text-xs text-gray-500 mt-3">
              Optional fields: email, address, city, country, customer_type (individual/business/government), company_name, tax_id, notes
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || importing}>
            {importing ? 'Importing...' : 'Import'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}