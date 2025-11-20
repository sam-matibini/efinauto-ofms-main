import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Phone, Send, Sparkles, Users } from "lucide-react";
import EmailComposer from "@/components/communications/EmailComposer";
import SMSComposer from "@/components/communications/SMSComposer";
import CommunicationHistory from "@/components/communications/CommunicationHistory";
import CustomerSegments from "@/components/communications/CustomerSegments";

export default function CustomerCommunications() {
  const { selectedCompanyId } = useCompany();
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [activeChannel, setActiveChannel] = useState("email");

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', selectedCompanyId],
    queryFn: () => base44.entities.Customer.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales', selectedCompanyId],
    queryFn: () => base44.entities.Sale.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: exports = [] } = useQuery({
    queryKey: ['exports', selectedCompanyId],
    queryFn: () => base44.entities.Export.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments', selectedCompanyId],
    queryFn: () => base44.entities.FreightShipment.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const { data: loadingDeclarations = [] } = useQuery({
    queryKey: ['loadingDeclarations', selectedCompanyId],
    queryFn: () => base44.entities.LoadingDeclaration.filter({ company_id: selectedCompanyId }),
    enabled: !!selectedCompanyId,
    initialData: [],
  });

  const stats = {
    totalCustomers: customers.length,
    activeCustomers: sales.filter(s => s.status === 'confirmed').length,
    emailsSent: 0, // Would track from communication logs
    smsSent: 0
  };

  if (!selectedCompanyId) {
    return (
      <div className="p-6">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <p className="text-yellow-800">Please select a company to access communications.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-6 h-6" />
              Customer Communications Hub
            </h1>
            <p className="text-sm text-gray-300 mt-1">AI-powered multi-channel customer engagement</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Customers</p>
                  <p className="text-2xl font-bold">{stats.totalCustomers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Emails Sent</p>
                  <p className="text-2xl font-bold">{stats.emailsSent}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">SMS Sent</p>
                  <p className="text-2xl font-bold">{stats.smsSent}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Phone className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Customers</p>
                  <p className="text-2xl font-bold">{stats.activeCustomers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-6">
          {/* Customer List */}
          <div className="col-span-3">
            <Card className="h-[calc(100vh-350px)]">
              <CardHeader>
                <CardTitle className="text-base">Customers</CardTitle>
              </CardHeader>
              <CardContent className="overflow-y-auto h-[calc(100%-80px)]">
                <div className="space-y-2">
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => setSelectedCustomer(customer)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedCustomer?.id === customer.id
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-white hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <p className="font-medium text-sm truncate">{customer.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                      <p className="text-xs text-gray-500">{customer.phone}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Communication Area */}
          <div className="col-span-9">
            <Tabs value={activeChannel} onValueChange={setActiveChannel}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="sms" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  SMS
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  History
                </TabsTrigger>
                <TabsTrigger value="segments" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Segments
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="mt-4">
                <EmailComposer 
                  customer={selectedCustomer} 
                  customers={customers}
                  exports={exports}
                  shipments={shipments}
                  loadingDeclarations={loadingDeclarations}
                />
              </TabsContent>

              <TabsContent value="sms" className="mt-4">
                <SMSComposer 
                  customer={selectedCustomer} 
                  customers={customers}
                  exports={exports}
                  shipments={shipments}
                  loadingDeclarations={loadingDeclarations}
                />
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <CommunicationHistory customer={selectedCustomer} />
              </TabsContent>

              <TabsContent value="segments" className="mt-4">
                <CustomerSegments customers={customers} sales={sales} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}