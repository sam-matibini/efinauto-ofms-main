import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, Search, Filter, Download, Eye, AlertTriangle, 
  CheckCircle, XCircle, Clock, User, Activity, FileText,
  Calendar, RefreshCw, ChevronLeft, ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

const modules = [
  "Vehicle", "Customer", "Sale", "Export", "FreightShipment", "Container",
  "Cargo", "ShippingDocument", "LoadingDeclaration", "Part", "Product",
  "Service", "RepairOrder", "Employee", "Payroll", "Invoice", "Quote",
  "Expense", "Bill", "BankAccount", "BankTransaction", "Company", "User",
  "Authentication", "System", "Other"
];

const actions = [
  "CREATE", "UPDATE", "DELETE", "VIEW", "EXPORT", "IMPORT", "UPLOAD",
  "DOWNLOAD", "LOGIN", "LOGOUT", "LOGIN_FAILED", "PERMISSION_DENIED",
  "STATUS_CHANGE", "PAYMENT", "EMAIL_SENT", "SMS_SENT", "API_CALL", "ERROR"
];

const actionColors = {
  CREATE: "bg-green-100 text-green-800",
  UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
  VIEW: "bg-gray-100 text-gray-800",
  EXPORT: "bg-purple-100 text-purple-800",
  IMPORT: "bg-purple-100 text-purple-800",
  UPLOAD: "bg-cyan-100 text-cyan-800",
  DOWNLOAD: "bg-cyan-100 text-cyan-800",
  LOGIN: "bg-green-100 text-green-800",
  LOGOUT: "bg-gray-100 text-gray-800",
  LOGIN_FAILED: "bg-red-100 text-red-800",
  PERMISSION_DENIED: "bg-orange-100 text-orange-800",
  STATUS_CHANGE: "bg-yellow-100 text-yellow-800",
  PAYMENT: "bg-emerald-100 text-emerald-800",
  EMAIL_SENT: "bg-indigo-100 text-indigo-800",
  SMS_SENT: "bg-indigo-100 text-indigo-800",
  API_CALL: "bg-slate-100 text-slate-800",
  ERROR: "bg-red-100 text-red-800"
};

const statusIcons = {
  success: <CheckCircle className="w-4 h-4 text-green-600" />,
  failure: <XCircle className="w-4 h-4 text-red-600" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-600" />
};

export default function AuditLogs() {
  const [filters, setFilters] = useState({
    module: "all",
    action: "all",
    status: "all",
    search: "",
    dateFrom: "",
    dateTo: ""
  });
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState(null);
  const pageSize = 50;

  // Check if user is admin
  const { user: currentUser } = useAuth();

  const isAdmin = currentUser?.role === 'admin';

  // Fetch audit logs
  const { data: auditLogs = [], isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', filters, page],
    queryFn: async () => {
      const query = {};
      if (filters.module !== "all") query.module = filters.module;
      if (filters.action !== "all") query.action = filters.action;
      if (filters.status !== "all") query.status = filters.status;
      
      const logs = await supabase.entities.AuditLog.filter(query, '-created_date', pageSize, page * pageSize);
      return logs;
    },
    enabled: isAdmin,
  });

  // Filter logs by search term (client-side for simplicity)
  const filteredLogs = auditLogs.filter(log => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      log.user_email?.toLowerCase().includes(searchLower) ||
      log.user_name?.toLowerCase().includes(searchLower) ||
      log.record_identifier?.toLowerCase().includes(searchLower) ||
      log.record_id?.toLowerCase().includes(searchLower) ||
      log.changes_summary?.toLowerCase().includes(searchLower)
    );
  });

  // Calculate stats
  const stats = {
    total: auditLogs.length,
    success: auditLogs.filter(l => l.status === 'success').length,
    failure: auditLogs.filter(l => l.status === 'failure').length,
    today: auditLogs.filter(l => {
      const logDate = new Date(l.created_date);
      const today = new Date();
      return logDate.toDateString() === today.toDateString();
    }).length
  };

  // Export logs
  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Module', 'Action', 'Record', 'Status', 'Changes', 'IP', 'User Agent'].join(','),
      ...filteredLogs.map(log => [
        log.created_date,
        log.user_email,
        log.module,
        log.action,
        log.record_identifier || log.record_id || '',
        log.status,
        `"${(log.changes_summary || '').replace(/"/g, '""')}"`,
        log.ip_address,
        `"${(log.user_agent || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
        <p className="text-gray-600">Only administrators can view audit logs.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Security Audit Logs</h1>
              <p className="text-sm text-slate-300">
                Complete audit trail of all system activities
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={exportLogs} className="bg-white text-slate-900 hover:bg-slate-100">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-gray-500">Total Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.success}</p>
                  <p className="text-xs text-gray-500">Successful</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.failure}</p>
                  <p className="text-xs text-gray-500">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.today}</p>
                  <p className="text-xs text-gray-500">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by user, record, or changes..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-9"
                />
              </div>
              <Select value={filters.module} onValueChange={(v) => setFilters({ ...filters, module: v })}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.action} onValueChange={(v) => setFilters({ ...filters, action: v })}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failure">Failure</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Audit Log Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin" />
                <p className="text-gray-500">Loading audit logs...</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Record</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-20">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log, index) => (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedLog(log)}
                      >
                        <TableCell className="text-xs text-gray-600">
                          {format(new Date(log.created_date), 'MMM d, yyyy HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium">{log.user_name || 'Unknown'}</p>
                              <p className="text-xs text-gray-500">{log.user_email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.module}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={actionColors[log.action] || 'bg-gray-100'}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {log.record_identifier || log.record_id || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {statusIcons[log.status]}
                            <span className="text-xs capitalize">{log.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-8 w-8">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Showing {filteredLogs.length} entries (Page {page + 1})
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={auditLogs.length < pageSize}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Audit Log Details
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6 py-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Timestamp (UTC)</p>
                    <p className="font-medium">{format(new Date(selectedLog.created_date), 'PPpp')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      {statusIcons[selectedLog.status]}
                      <span className="capitalize font-medium">{selectedLog.status}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">User</p>
                    <p className="font-medium">{selectedLog.user_name || 'Unknown'}</p>
                    <p className="text-sm text-gray-600">{selectedLog.user_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">User ID</p>
                    <p className="font-mono text-sm">{selectedLog.user_id}</p>
                  </div>
                </div>

                {/* Action Info */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge className={actionColors[selectedLog.action]}>{selectedLog.action}</Badge>
                    <Badge variant="outline">{selectedLog.module}</Badge>
                  </div>
                  {selectedLog.record_identifier && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-500">Record Identifier</p>
                      <p className="font-medium">{selectedLog.record_identifier}</p>
                    </div>
                  )}
                  {selectedLog.record_id && (
                    <div>
                      <p className="text-xs text-gray-500">Record ID</p>
                      <p className="font-mono text-sm">{selectedLog.record_id}</p>
                    </div>
                  )}
                </div>

                {/* Changes */}
                {selectedLog.changes_summary && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Changes Summary</p>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm">{selectedLog.changes_summary}</p>
                    </div>
                  </div>
                )}

                {/* Old Values */}
                {selectedLog.old_values && Object.keys(selectedLog.old_values).length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Previous Values</p>
                    <pre className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.old_values, null, 2)}
                    </pre>
                  </div>
                )}

                {/* New Values */}
                {selectedLog.new_values && Object.keys(selectedLog.new_values).length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">New Values</p>
                    <pre className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.new_values, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Error Message */}
                {selectedLog.error_message && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Error Message</p>
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">{selectedLog.error_message}</p>
                    </div>
                  </div>
                )}

                {/* Technical Info */}
                <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Technical Information</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">IP Address</p>
                      <p className="font-mono">{selectedLog.ip_address || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Company ID</p>
                      <p className="font-mono text-xs">{selectedLog.company_id || 'N/A'}</p>
                    </div>
                  </div>
                  {selectedLog.user_agent && (
                    <div>
                      <p className="text-xs text-gray-500">User Agent</p>
                      <p className="font-mono text-xs break-all">{selectedLog.user_agent}</p>
                    </div>
                  )}
                  {selectedLog.hash && (
                    <div>
                      <p className="text-xs text-gray-500">Integrity Hash (SHA-256)</p>
                      <p className="font-mono text-xs break-all text-green-700">{selectedLog.hash}</p>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Additional Metadata</p>
                    <pre className="p-3 bg-gray-100 rounded-lg text-xs overflow-auto max-h-32">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}