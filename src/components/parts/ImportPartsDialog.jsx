import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ImportPartsDialog({ open, onClose, companyId, onSuccess }) {
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
          await base44.entities.Part.create({
            company_id: companyId,
            part_number: row.part_number || row['Part Number'] || row.part_no,
            name: row.name || row.Name,
            description: row.description || row.Description || '',
            category: row.category || row.Category || 'other',
            compatible_makes: row.compatible_makes || row['Compatible Makes'] || '',
            compatible_models: row.compatible_models || row['Compatible Models'] || '',
            quantity: parseFloat(row.quantity || row.Quantity) || 0,
            reorder_level: parseFloat(row.reorder_level || row['Reorder Level']) || 5,
            cost_price: parseFloat(row.cost_price || row['Cost Price']) || 0,
            selling_price: parseFloat(row.selling_price || row['Selling Price'] || row.price || row.Price) || 0,
            supplier: row.supplier || row.Supplier || '',
            location: row.location || row.Location || ''
          });
          created++;
        } catch (error) {
          failed++;
          errors.push({ row: row.name || row.Name || row.part_number, error: error.message });
        }
      }

      setResults({ created, failed, errors });
      
      if (created > 0) {
        toast.success(`Successfully imported ${created} part(s)`);
        onSuccess();
      }
      
      if (failed > 0) {
        toast.error(`Failed to import ${failed} part(s)`);
      }
    } catch (error) {
      toast.error(`Import failed: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['part_number', 'name', 'description', 'category', 'compatible_makes', 'compatible_models', 'quantity', 'reorder_level', 'cost_price', 'selling_price', 'supplier', 'location'];
    const sampleData = [
      ['BRAKE-001', 'Brake Pad Set', 'Front brake pads', 'brakes', 'Toyota,Honda', 'Camry,Accord', '50', '10', '45.00', '89.99', 'Auto Parts Co', 'Shelf A3']
    ];

    const csv = [headers, ...sampleData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parts_import_template.csv';
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Parts from CSV</DialogTitle>
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
                    Successfully imported {results.created} part(s)
                  </span>
                </div>
              )}
              
              {results.failed > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-red-800">
                      Failed to import {results.failed} part(s)
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
              <li>• <strong>part_number</strong> - Unique part identifier</li>
              <li>• <strong>name</strong> - Part name</li>
              <li>• <strong>quantity</strong> - Current stock quantity</li>
            </ul>
            <p className="text-xs text-gray-500 mt-3">
              Optional fields: description, category, compatible_makes, compatible_models, reorder_level, cost_price, selling_price, supplier, location
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