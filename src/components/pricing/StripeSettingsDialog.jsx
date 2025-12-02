import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Key, Globe, Shield, ExternalLink, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = 'stripeGatewaySettings';

export default function StripeSettingsDialog({ open, onClose }) {
  const [settings, setSettings] = useState({
    enabled: false,
    testMode: true,
    publishableKey: "",
    secretKey: "",
    webhookSecret: "",
    testPublishableKey: "",
    testSecretKey: "",
    testWebhookSecret: ""
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load Stripe settings:", e);
      }
    }
  }, [open]);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    toast.success("Stripe settings saved successfully");
    onClose();
  };

  const activeKeys = settings.testMode 
    ? { publishable: settings.testPublishableKey, secret: settings.testSecretKey, webhook: settings.testWebhookSecret }
    : { publishable: settings.publishableKey, secret: settings.secretKey, webhook: settings.webhookSecret };

  const isConfigured = activeKeys.publishable && activeKeys.secret;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-600" />
            Stripe Payment Gateway Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Overview */}
          <Card className={isConfigured ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isConfigured ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  )}
                  <div>
                    <p className={`font-medium ${isConfigured ? "text-green-800" : "text-yellow-800"}`}>
                      {isConfigured ? "Stripe is configured" : "Stripe not configured"}
                    </p>
                    <p className={`text-sm ${isConfigured ? "text-green-600" : "text-yellow-600"}`}>
                      {settings.enabled 
                        ? `Payment processing is ${settings.testMode ? "in test mode" : "live"}` 
                        : "Payment processing is disabled"}
                    </p>
                  </div>
                </div>
                <Badge className={settings.testMode ? "bg-yellow-500" : "bg-green-600"}>
                  {settings.testMode ? "Test Mode" : "Live Mode"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="font-medium">Enable Stripe Payments</Label>
              <p className="text-sm text-gray-500">Allow customers to pay via Stripe</p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
            />
          </div>

          {/* Test/Live Mode Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="font-medium">Test Mode</Label>
              <p className="text-sm text-gray-500">Use test API keys for development</p>
            </div>
            <Switch
              checked={settings.testMode}
              onCheckedChange={(checked) => setSettings({ ...settings, testMode: checked })}
            />
          </div>

          {/* Test Keys */}
          {settings.testMode && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="w-4 h-4 text-yellow-600" />
                  Test API Keys
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Test Publishable Key</Label>
                  <Input
                    value={settings.testPublishableKey}
                    onChange={(e) => setSettings({ ...settings, testPublishableKey: e.target.value })}
                    placeholder="pk_test_..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Test Secret Key</Label>
                  <Input
                    type="password"
                    value={settings.testSecretKey}
                    onChange={(e) => setSettings({ ...settings, testSecretKey: e.target.value })}
                    placeholder="sk_test_..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Test Webhook Secret</Label>
                  <Input
                    type="password"
                    value={settings.testWebhookSecret}
                    onChange={(e) => setSettings({ ...settings, testWebhookSecret: e.target.value })}
                    placeholder="whsec_..."
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Live Keys */}
          {!settings.testMode && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  Live API Keys
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Live mode processes real payments. Handle keys securely.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Live Publishable Key</Label>
                  <Input
                    value={settings.publishableKey}
                    onChange={(e) => setSettings({ ...settings, publishableKey: e.target.value })}
                    placeholder="pk_live_..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Live Secret Key</Label>
                  <Input
                    type="password"
                    value={settings.secretKey}
                    onChange={(e) => setSettings({ ...settings, secretKey: e.target.value })}
                    placeholder="sk_live_..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Live Webhook Secret</Label>
                  <Input
                    type="password"
                    value={settings.webhookSecret}
                    onChange={(e) => setSettings({ ...settings, webhookSecret: e.target.value })}
                    placeholder="whsec_..."
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help Section */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Need API Keys?</p>
                  <p className="text-sm text-gray-600 mb-2">
                    Get your API keys from the Stripe Dashboard. Make sure to enable the appropriate webhooks for subscription events.
                  </p>
                  <a 
                    href="https://dashboard.stripe.com/apikeys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    Open Stripe Dashboard <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}