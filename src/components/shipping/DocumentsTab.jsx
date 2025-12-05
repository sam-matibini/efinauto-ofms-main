import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  FileText, Search, Upload, Eye, Download, Trash2, 
  LayoutGrid, List, Filter, Image, File
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useCompany } from "@/components/shared/CompanyContext";

const documentTypes = [
  { value: 'export_order', label: 'Export Order', icon: '📤' },
  { value: 'shipment_form', label: 'Shipment Form', icon: '📋' },
  { value: 'bill_of_lading', label: 'Bill of Lading (B/L)', icon: '📜' },
  { value: 'loading_declaration', label: 'Loading Declaration', icon: '📦' },
  { value: 'packing_list', label: 'Packing List', icon: '📝' },
  { value: 'commercial_invoice', label: 'Commercial Invoice', icon: '💰' },
  { value: 'certificate_of_origin', label: 'Certificate of Origin', icon: '🏛️' },
  { value: 'insurance_certificate', label: 'Insurance Certificate', icon: '🛡️' },
  { value: 'customs_declaration', label: 'Customs Declaration', icon: '🛃' },
  { value: 'vehicle_photo', label: 'Vehicle Photo', icon: '🚗' },
  { value: 'container_photo', label: 'Container Photo', icon: '📷' },
  { value: 'other', label: 'Other', icon: '📄' }
];

export default function DocumentsTab({ documents = [], loadingDeclarations = [], shipments = [], containers = [], vehicles = [] }) {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewDocument, setViewDocument] = useState(null);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ShippingDocument.create({ ...data, company_id: selectedCompanyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-documents'] });
      setUploadDialogOpen(false);
      toast.success("Document uploaded!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ShippingDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-documents'] });
      toast.success("Document deleted!");
    },
  });

  // Combine documents with loading declarations
  const allDocuments = [
    ...documents,
    ...loadingDeclarations.map(ld => ({
      id: ld.id,
      document_type: 'loading_declaration',
      title: `Loading Declaration - ${ld.declaration_number || ld.booking_number}`,
      description: `Consignee: ${ld.consignee?.name || 'N/A'}`,
      shipment_number: ld.shipment_number,
      created_date: ld.created_date,
      status: ld.status,
      isLoadingDeclaration: true,
      original: ld
    }))
  ];

  const filteredDocuments = allDocuments.filter(d => {
    const matchesSearch = !searchTerm ||
      d.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.document_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.shipment_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || d.document_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getDocIcon = (type) => {
    const docType = documentTypes.find(dt => dt.value === type);
    return docType?.icon || '📄';
  };

  const getDocLabel = (type) => {
    const docType = documentTypes.find(dt => dt.value === type);
    return docType?.label || type;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-2 flex-1 w-full md:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {documentTypes.map(dt => (
                <SelectItem key={dt.value} value={dt.value}>
                  {dt.icon} {dt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 border rounded-lg p-1 bg-white">
            <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("grid")}>
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("list")}>
              <List className="w-4 h-4" />
            </Button>
          </div>
          <Button onClick={() => setUploadDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredDocuments.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card 
                className="border-none shadow-md hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => setViewDocument(doc)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="text-4xl mb-3">{getDocIcon(doc.document_type)}</div>
                    <p className="font-medium text-sm line-clamp-2 mb-1">{doc.title || getDocLabel(doc.document_type)}</p>
                    <Badge variant="outline" className="text-xs mb-2">{getDocLabel(doc.document_type)}</Badge>
                    {doc.created_date && (
                      <p className="text-xs text-gray-500">{format(new Date(doc.created_date), 'MMM d, yyyy')}</p>
                    )}
                    <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-7 w-7">
                        <Eye className="w-3 h-3" />
                      </Button>
                      {doc.file_url && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); window.open(doc.file_url, '_blank'); }}>
                          <Download className="w-3 h-3" />
                        </Button>
                      )}
                      {!doc.isLoadingDeclaration && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(doc.id); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {filteredDocuments.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No documents found</p>
            </div>
          )}
        </div>
      ) : (
        <Card className="border-none shadow-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Shipment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => (
                <TableRow key={doc.id} className="cursor-pointer hover:bg-gray-50">
                  <TableCell>
                    <span className="text-xl mr-2">{getDocIcon(doc.document_type)}</span>
                    <Badge variant="outline">{getDocLabel(doc.document_type)}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{doc.title || '-'}</TableCell>
                  <TableCell>{doc.shipment_number || '-'}</TableCell>
                  <TableCell className="text-sm">
                    {doc.created_date ? format(new Date(doc.created_date), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge className={doc.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}>
                      {doc.status || 'pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setViewDocument(doc)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {doc.file_url && (
                        <Button size="icon" variant="ghost" onClick={() => window.open(doc.file_url, '_blank')}>
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      {!doc.isLoadingDeclaration && (
                        <Button size="icon" variant="ghost" className="text-red-600" onClick={() => deleteMutation.mutate(doc.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* View Document Dialog */}
      <Dialog open={!!viewDocument} onOpenChange={() => setViewDocument(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{getDocIcon(viewDocument?.document_type)}</span>
              {viewDocument?.title || getDocLabel(viewDocument?.document_type)}
            </DialogTitle>
          </DialogHeader>
          {viewDocument && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Document Type</p>
                  <p className="font-semibold">{getDocLabel(viewDocument.document_type)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <Badge className={viewDocument.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}>
                    {viewDocument.status || 'pending'}
                  </Badge>
                </div>
                {viewDocument.shipment_number && (
                  <div>
                    <p className="text-xs text-gray-500">Shipment</p>
                    <p className="font-semibold">{viewDocument.shipment_number}</p>
                  </div>
                )}
                {viewDocument.created_date && (
                  <div>
                    <p className="text-xs text-gray-500">Created</p>
                    <p className="font-semibold">{format(new Date(viewDocument.created_date), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>
              {viewDocument.description && (
                <div>
                  <p className="text-xs text-gray-500">Description</p>
                  <p>{viewDocument.description}</p>
                </div>
              )}
              {viewDocument.file_url && (
                <div className="flex gap-3">
                  <Button onClick={() => window.open(viewDocument.file_url, '_blank')}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" onClick={() => window.open(viewDocument.file_url, '_blank')}>
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <UploadDocumentDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onSave={(data) => createMutation.mutate(data)}
        shipments={shipments}
        containers={containers}
        vehicles={vehicles}
      />
    </div>
  );
}

function UploadDocumentDialog({ open, onClose, onSave, shipments, containers, vehicles }) {
  const [formData, setFormData] = useState({
    document_type: "other",
    title: "",
    description: "",
    shipment_id: "",
    container_id: "",
    vehicle_id: "",
    status: "pending"
  });
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!formData.title) {
        setFormData({ ...formData, title: selectedFile.name });
      }
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const fileType = file.type.startsWith('image/') ? 'image' : 
                       file.type === 'application/pdf' ? 'pdf' : 'document';

      onSave({
        ...formData,
        file_url,
        file_type: fileType,
        upload_date: new Date().toISOString().split('T')[0],
        shipment_number: shipments.find(s => s.id === formData.shipment_id)?.shipment_number,
        container_number: containers.find(c => c.id === formData.container_id)?.container_number,
        vehicle_vin: vehicles.find(v => v.id === formData.vehicle_id)?.vin
      });
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Document Type *</Label>
            <Select value={formData.document_type} onValueChange={(v) => setFormData({...formData, document_type: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {documentTypes.map(dt => (
                  <SelectItem key={dt.value} value={dt.value}>
                    {dt.icon} {dt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>File *</Label>
            <Input type="file" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Link to Shipment</Label>
              <Select value={formData.shipment_id || ''} onValueChange={(v) => setFormData({...formData, shipment_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {shipments.map(s => <SelectItem key={s.id} value={s.id}>{s.shipment_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Link to Container</Label>
              <Select value={formData.container_id || ''} onValueChange={(v) => setFormData({...formData, container_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {containers.map(c => <SelectItem key={c.id} value={c.id}>{c.container_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={uploading || !file} className="bg-blue-600 hover:bg-blue-700">
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}