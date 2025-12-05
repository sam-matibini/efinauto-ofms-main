import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/components/shared/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Mail, Shield, Save, Info, CheckCircle, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import LogoUpload from "@/components/settings/LogoUpload";

export default function Settings() {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', selectedCompanyId],
    queryFn: () => base44.entities.Company.list().then(companies => 
      companies.find(c => c.id === selectedCompanyId)
    ),
    enabled: !!selectedCompanyId,
  });

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
      return await base44.entities.Company.update(selectedCompanyId, data);
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
        <Tabs defaultValue="branding" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
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
          </TabsList>

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
                    <strong>Note:</strong> Backend functions must be enabled in Dashboard → Settings to send SMS. 
                    Currently, SMS messages are logged only. Once backend functions are enabled, actual SMS delivery will work.
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
                    Email sending is already configured and working through the Base44 SendEmail integration. 
                    You can customize sender details in Company Settings.
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
        </Tabs>
      </div>
    </div>
  );
}