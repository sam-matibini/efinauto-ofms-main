import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Mail, Shield, Save, Info, CheckCircle, Image as ImageIcon, Building2, ExternalLink, Lock, Users } from "lucide-react";
import { toast } from "sonner";
import LogoUpload from "@/components/settings/LogoUpload";
import AssignedUsersTab from "@/components/settings/AssignedUsersTab";

export default function Settings() {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const { user: currentUser } = useAuth();

  const isAdmin = currentUser?.role === 'admin';

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', selectedCompanyId],
    queryFn: () => supabase.entities.Company.list().then(companies => 
      companies.find(c => c.id === selectedCompanyId)
    ),
    enabled: !!selectedCompanyId,
  });

  const [companyInfo, setCompanyInfo] = useState({
    name: "", address: "", city: "", province: "", postal_code: "", country: "",
    phone: "", email: "", dealer_permit_number: "", gst_number: "", pst_number: ""
  });

  React.useEffect(() => {
    if (company) {
      setCompanyInfo({
        name: company.name || "",
        address: company.address || "",
        city: company.city || "",
        province: company.province || "",
        postal_code: company.postal_code || "",
        country: company.country || "",
        phone: company.phone || "",
        email: company.email || "",
        dealer_permit_number: company.dealer_permit_number || "",
        gst_number: company.gst_number || "",
        pst_number: company.pst_number || "",
      });
    }
  }, [company]);

  const handleSaveCompanyInfo = () => {
    updateSettingsMutation.mutate(companyInfo);
  };

  const [smsProvider, setSmsProvider] = useState("");
  const [smsSettings, setSmsSettings] = useState({
    twilio_account_sid: "",
    twilio_auth_token: "",
    twilio_phone_number: "",
    vonage_api_key: "",
    vonage_api_secret: "",
    vonage_from_number: ""
  });

  React.useEffect(() => {
    if (company) {
      setSmsProvider(company.sms_provider || "none");
      setSmsSettings(company.sms_settings || {
        twilio_account_sid: "",
        twilio_auth_token: "",
        twilio_phone_number: "",
        vonage_api_key: "",
        vonage_api_secret: "",
        vonage_from_number: ""
      });
    }
  }, [company]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data) => {
      return await supabase.entities.Company.update(selectedCompanyId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', selectedCompanyId] });
      toast.success("Settings saved successfully");
    },
    onError: () => {
      toast.error("Failed to save settings");
    }
  });

  const handleSaveSMSSettings = () => {
    updateSettingsMutation.mutate({
      sms_provider: smsProvider,
      sms_settings: smsSettings
    });
  };

  if (!selectedCompanyId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Please select a company to manage settings</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: '#1e293b' }}>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-300 mt-1">Configure integrations and preferences</p>
      </div>

      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="company">
              <Building2 className="w-4 h-4 mr-2" />
              Company Info
            </TabsTrigger>
            <TabsTrigger value="branding">
              <ImageIcon className="w-4 h-4 mr-2" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="sms">
              <MessageSquare className="w-4 h-4 mr-2" />
              SMS Provider
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="w-4 h-4 mr-2" />
              Email Settings
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Assigned Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Company Information
                    </CardTitle>
                    <CardDescription className="mt-1">
                      This information appears on invoices, Bill of Sale documents, and all printed/shared documents.
                    </CardDescription>
                  </div>
                  {isAdmin && (
                    <Link to="/Companies">
                      <Button variant="outline" size="sm" className="flex items-center gap-2 text-blue-600 border-blue-300 hover:bg-blue-50">
                        <ExternalLink className="w-4 h-4" />
                        Full Company Edit
                      </Button>
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isAdmin && (
                  <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertDescription>
                      You have <strong>read-only</strong> access to company info. Contact an admin to make changes.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Company Name</Label>
                    <Input
                      value={companyInfo.name}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                      placeholder="Your Company Name"
                      readOnly={!isAdmin}
                      className={!isAdmin ? "bg-gray-50 text-gray-700" : ""}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Street Address</Label>
                    <Input
                      value={companyInfo.address}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                      placeholder="123 Main Street"
                      readOnly={!isAdmin}
                      className={!isAdmin ? "bg-gray-50 text-gray-700" : ""}
                    />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input
                      value={companyInfo.city}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, city: e.target.value })}
                      placeholder="City"
                      readOnly={!isAdmin}
                      className={!isAdmin ? "bg-gray-50 text-gray-700" : ""}
                    />
                  </div>
                  <div>
                    <Label>Province / State</Label>
                    <Input
                      value={companyInfo.province}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, province: e.target.value })}
                      placeholder="AB"
                      readOnly={!isAdmin}
                      className={!isAdmin ? "bg-gray-50 text-gray-700" : ""}
                    />
                  </div>
                  <div>
                    <Label>Postal Code</Label>
                    <Input
                      value={companyInfo.postal_code}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, postal_code: e.target.value })}
                      placeholder="T1A 1A1"
                      readOnly={!isAdmin}
                      className={!isAdmin ? "bg-gray-50 text-gray-700" : ""}
                    />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input
                      value={companyInfo.country}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, country: e.target.value })}
                      placeholder="Canada"
                      readOnly={!isAdmin}
                      className={!isAdmin ? "bg-gray-50 text-gray-700" : ""}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={companyInfo.phone}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      readOnly={!isAdmin}
                      className={!isAdmin ? "bg-gray-50 text-gray-700" : ""}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={companyInfo.email}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                      placeholder="info@company.com"
                      readOnly={!isAdmin}
                      className={!isAdmin ? "bg-gray-50 text-gray-700" : ""}
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-3">Tax & Permit Numbers</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Dealer Permit #</Label>
                      <Input
                        value={companyInfo.dealer_permit_number}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, dealer_permit_number: e.target.value })}
                        placeholder="DP-000000"
                        readOnly={!isAdmin}
                        className={!isAdmin ? "bg-gray-50 text-gray-700" : ""}
                      />
                    </div>
                    <div>
                      <Label>GST Number</Label>
                      <Input
                        value={companyInfo.gst_number}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, gst_number: e.target.value })}
                        placeholder="123456789RT0001"
                        readOnly={!isAdmin}
                        className={!isAdmin ? "bg-gray-50 text-gray-700" : ""}
                      />
                    </div>
                    <div>
                      <Label>PST Number</Label>
                      <Input
                        value={companyInfo.pst_number}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, pst_number: e.target.value })}
                        placeholder="PST-000000"
                        readOnly={!isAdmin}
                        className={!isAdmin ? "bg-gray-50 text-gray-700" : ""}
                      />
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveCompanyInfo}
                      disabled={updateSettingsMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {updateSettingsMutation.isPending ? "Saving..." : (
                        <><Save className="w-4 h-4 mr-2" />Save Company Info</>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding" className="space-y-6">
            <LogoUpload 
              company={company} 
              onUpdate={(data) => updateSettingsMutation.mutateAsync(data)}
              isUpdating={updateSettingsMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="sms" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>SMS Provider Configuration</CardTitle>
                <CardDescription>
                  Configure your SMS provider to enable text messaging from the communications hub
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Select a provider below and fill in your credentials. SMS messages will be sent
                    from this company's configured provider. All fields are stored securely.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <Label>SMS Provider</Label>
                    <Select value={smsProvider} onValueChange={setSmsProvider}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Logging Only)</SelectItem>
                        <SelectItem value="twilio">Twilio</SelectItem>
                        <SelectItem value="vonage">Vonage (Nexmo)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {smsProvider === "twilio" && (
                    <div className="space-y-4 border-t pt-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                        Twilio Configuration
                      </h3>
                      <p className="text-sm text-gray-600">
                        Get your credentials from <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Twilio Console</a>
                      </p>
                      
                      <div>
                        <Label>Account SID</Label>
                        <Input
                          type="password"
                          value={smsSettings.twilio_account_sid}
                          onChange={(e) => setSmsSettings({...smsSettings, twilio_account_sid: e.target.value})}
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        />
                      </div>
                      
                      <div>
                        <Label>Auth Token</Label>
                        <Input
                          type="password"
                          value={smsSettings.twilio_auth_token}
                          onChange={(e) => setSmsSettings({...smsSettings, twilio_auth_token: e.target.value})}
                          placeholder="Your Twilio auth token"
                        />
                      </div>
                      
                      <div>
                        <Label>Twilio Phone Number</Label>
                        <Input
                          value={smsSettings.twilio_phone_number}
                          onChange={(e) => setSmsSettings({...smsSettings, twilio_phone_number: e.target.value})}
                          placeholder="+15551234567"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Format: +1 followed by your Twilio number
                        </p>
                      </div>
                    </div>
                  )}

                  {smsProvider === "vonage" && (
                    <div className="space-y-4 border-t pt-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-purple-600" />
                        Vonage Configuration
                      </h3>
                      <p className="text-sm text-gray-600">
                        Get your credentials from <a href="https://dashboard.nexmo.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">Vonage Dashboard</a>
                      </p>
                      
                      <div>
                        <Label>API Key</Label>
                        <Input
                          type="password"
                          value={smsSettings.vonage_api_key}
                          onChange={(e) => setSmsSettings({...smsSettings, vonage_api_key: e.target.value})}
                          placeholder="Your Vonage API key"
                        />
                      </div>
                      
                      <div>
                        <Label>API Secret</Label>
                        <Input
                          type="password"
                          value={smsSettings.vonage_api_secret}
                          onChange={(e) => setSmsSettings({...smsSettings, vonage_api_secret: e.target.value})}
                          placeholder="Your Vonage API secret"
                        />
                      </div>
                      
                      <div>
                        <Label>From Number</Label>
                        <Input
                          value={smsSettings.vonage_from_number}
                          onChange={(e) => setSmsSettings({...smsSettings, vonage_from_number: e.target.value})}
                          placeholder="+15551234567 or Brand Name"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Can be a phone number or alphanumeric sender ID
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={handleSaveSMSSettings}
                    disabled={updateSettingsMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {updateSettingsMutation.isPending ? (
                      "Saving..."
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save SMS Settings
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle>Email Settings</CardTitle>
                <CardDescription>
                  Email configuration is managed through company settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Emails are sent through your configured SMTP provider. The sender name and address
                    are pulled from your company profile below. 
                  </AlertDescription>
                </Alert>
                
                <div className="mt-6 space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Current Email Configuration</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">From Name:</span>
                        <span className="font-medium">{company?.name || company?.display_name || "Not set"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">From Email:</span>
                        <span className="font-medium">{company?.email || "Not set"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Contact Person:</span>
                        <span className="font-medium">{company?.contact_person_name || "Not set"}</span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    To update these settings, go to <strong>Company Management</strong> and edit your company profile.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <AssignedUsersTab companyId={selectedCompanyId} isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}