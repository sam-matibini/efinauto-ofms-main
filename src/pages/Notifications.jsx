import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Bell, Mail, Settings, CheckCircle, XCircle, Clock, Loader2, Send } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useCompany } from "../components/shared/CompanyContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Notifications() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const { selectedCompanyId } = useCompany();

  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', selectedCompanyId],
    queryFn: () => supabase.entities.Customer.filter({ company_id: selectedCompanyId }, '-created_date'),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: preferences = [], isLoading } = useQuery({
    queryKey: ['notification-preferences', selectedCompanyId],
    queryFn: () => supabase.entities.NotificationPreference.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['notification-logs', selectedCompanyId],
    queryFn: () => supabase.entities.NotificationLog.filter({ company_id: selectedCompanyId }, '-created_date', 50),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      if (id) {
        return await supabase.entities.NotificationPreference.update(id, data);
      } else {
        return await supabase.entities.NotificationPreference.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', selectedCompanyId] }); // Invalidate with companyId
      setDialogOpen(false);
      setSelectedCustomer(null);
      toast.success("Notification preferences saved!");
    },
    onError: (error) => {
      console.error("Save error:", error);
      toast.error("Failed to save preferences");
    },
  });

  const filteredCustomers = customers.filter(c => 
    c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCustomerPreference = (customerId) => {
    return preferences.find(p => p.customer_id === customerId);
  };

  const openPreferences = (customer) => {
    setSelectedCustomer(customer);
    setDialogOpen(true);
  };

  if (!selectedCompanyId) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="text-center py-16">
          <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Company Selected</h3>
          <p className="text-gray-500">Please select a company to manage notifications</p>
        </div>
      </div>
    );
  }

  const statusColors = {
    sent: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    pending: "bg-yellow-100 text-yellow-800"
  };

  const statusIcons = {
    sent: CheckCircle,
    failed: XCircle,
    pending: Clock
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <h1 className="text-2xl font-bold text-white">Customer Notifications</h1>
        <p className="text-sm text-gray-300 mt-1">Manage automated notifications and preferences</p>
      </div>

      <div className="p-6 md:p-8 max-w-7xl mx-auto">

      <Tabs defaultValue="preferences" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="preferences">Notification Preferences</TabsTrigger>
          <TabsTrigger value="logs">Notification History</TabsTrigger>
        </TabsList>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Customer Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No customers found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCustomers.map((customer) => {
                    const pref = getCustomerPreference(customer.id);
                    return (
                      <Card key={customer.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                                <span className="text-white font-bold">
                                  {customer.full_name?.charAt(0)?.toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{customer.full_name}</h3>
                                <div className="flex gap-2 text-sm text-gray-500">
                                  {customer.email && (
                                    <span className="flex items-center gap-1">
                                      <Mail className="w-3 h-3" />
                                      {customer.email}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {pref ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  Configured
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-50 text-gray-600">
                                  Not Configured
                                </Badge>
                              )}
                              <Button
                                onClick={() => openPreferences(customer)}
                                size="sm"
                                variant="outline"
                              >
                                <Settings className="w-4 h-4 mr-2" />
                                Configure
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Recent Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No notifications sent yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log, index) => {
                    const StatusIcon = statusIcons[log.status] || Bell;
                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1">
                                <StatusIcon className={`w-5 h-5 mt-1 ${
                                  log.status === 'sent' ? 'text-green-600' :
                                  log.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                                }`} />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-gray-900">{log.subject}</h4>
                                    <Badge className={statusColors[log.status]}>
                                      {log.status}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">{log.customer_name}</p>
                                  <p className="text-sm text-gray-500 line-clamp-2">{log.message}</p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                    <span>{log.notification_type?.replace(/_/g, ' ')}</span>
                                    <span>•</span>
                                    <span>{log.delivery_method}</span>
                                    {log.sent_date && (
                                      <>
                                        <span>•</span>
                                        <span>{new Date(log.sent_date).toLocaleString()}</span>
                                      </>
                                    )}
                                  </div>
                                  {log.error_message && (
                                    <p className="text-xs text-red-600 mt-2">Error: {log.error_message}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedCustomer && (
        <NotificationPreferenceDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setSelectedCustomer(null);
          }}
          customer={selectedCustomer}
          preference={getCustomerPreference(selectedCustomer.id)}
          onSave={saveMutation.mutate}
          isSaving={saveMutation.isPending}
          companyId={selectedCompanyId}
        />
      )}
        </div>
      </div>
    );
  }

function NotificationPreferenceDialog({ open, onClose, customer, preference, onSave, isSaving, companyId }) {
  const [formData, setFormData] = useState({
    service_reminders: true,
    appointment_reminders: true,
    sale_status_updates: true,
    repair_status_updates: true,
    export_updates: false,
    notification_method: "email",
    reminder_days_before: 7
  });

  React.useEffect(() => {
    if (open) {
      if (preference) {
        setFormData({
          service_reminders: preference.service_reminders ?? true,
          appointment_reminders: preference.appointment_reminders ?? true,
          sale_status_updates: preference.sale_status_updates ?? true,
          repair_status_updates: preference.repair_status_updates ?? true,
          export_updates: preference.export_updates ?? false,
          notification_method: preference.notification_method || "email",
          reminder_days_before: preference.reminder_days_before || 7
        });
      } else {
        setFormData({
          service_reminders: true,
          appointment_reminders: true,
          sale_status_updates: true,
          repair_status_updates: true,
          export_updates: false,
          notification_method: "email",
          reminder_days_before: 7
        });
      }
    }
  }, [open, preference]);

  const handleSave = () => {
    const data = {
      company_id: companyId,
      customer_id: customer.id,
      customer_name: customer.full_name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      ...formData
    };

    onSave({ id: preference?.id, data });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Notification Preferences - {customer.full_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Card className="border-blue-100 bg-blue-50/30">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Service Reminders</Label>
                    <p className="text-sm text-gray-500">Notify about upcoming service appointments</p>
                  </div>
                  <Switch
                    checked={formData.service_reminders}
                    onCheckedChange={(checked) => setFormData({ ...formData, service_reminders: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Appointment Reminders</Label>
                    <p className="text-sm text-gray-500">Remind about scheduled appointments</p>
                  </div>
                  <Switch
                    checked={formData.appointment_reminders}
                    onCheckedChange={(checked) => setFormData({ ...formData, appointment_reminders: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Sale Status Updates</Label>
                    <p className="text-sm text-gray-500">Updates on vehicle purchase status</p>
                  </div>
                  <Switch
                    checked={formData.sale_status_updates}
                    onCheckedChange={(checked) => setFormData({ ...formData, sale_status_updates: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Repair Status Updates</Label>
                    <p className="text-sm text-gray-500">Updates on repair order progress</p>
                  </div>
                  <Switch
                    checked={formData.repair_status_updates}
                    onCheckedChange={(checked) => setFormData({ ...formData, repair_status_updates: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Export Updates</Label>
                    <p className="text-sm text-gray-500">Notifications for international shipments</p>
                  </div>
                  <Switch
                    checked={formData.export_updates}
                    onCheckedChange={(checked) => setFormData({ ...formData, export_updates: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Notification Method</Label>
              <Select 
                value={formData.notification_method} 
                onValueChange={(v) => setFormData({ ...formData, notification_method: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="sms">SMS Only</SelectItem>
                  <SelectItem value="both">Email & SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reminder Days Before Service</Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={formData.reminder_days_before}
                onChange={(e) => setFormData({ ...formData, reminder_days_before: parseInt(e.target.value) || 7 })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}