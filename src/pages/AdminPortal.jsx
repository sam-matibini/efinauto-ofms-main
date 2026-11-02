import { useSearchParams } from "react-router-dom";
import { Building2, DollarSign, FileText, Landmark, Settings as SettingsIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/AuthContext";
import { canAccessPage, isCompanyManager } from "@/lib/access";
import AdminDenied from "@/components/admin/AdminDenied";
import Companies from "./Companies";
import Settings from "./Settings";
import BOSSettings from "./BOSSettings";
import Pricing from "./Pricing";
import TaxSettings from "./TaxSettings";

const TABS = [
  { id: "companies", label: "Companies", icon: Building2, pageId: "Companies" },
  { id: "settings", label: "Settings", icon: SettingsIcon, pageId: "Settings" },
  { id: "bos", label: "BOS Settings", icon: FileText, pageId: "BOSSettings" },
  { id: "pricing", label: "Pricing", icon: DollarSign, pageId: "Pricing" },
  { id: "taxes", label: "Taxes", icon: Landmark, pageId: "TaxSettings" },
];

export default function AdminPortal() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tabs = TABS.filter((item) => canAccessPage(item.pageId, user));
  const requested = params.get("tab");
  const tab = tabs.some((item) => item.id === requested) ? requested : "companies";

  if (!isCompanyManager(user)) return <AdminDenied />;

  return (
    <div className="min-h-screen bg-[#F5F6F8]">
      <div className="bg-gradient-to-r from-[#0A1F44] to-slate-700 px-4 py-4 md:px-6">
        <h1 className="text-xl font-bold text-white md:text-2xl">Admin Portal</h1>
        <p className="mt-1 text-xs text-white/70 md:text-sm">
          Companies, pricing, taxes, and settings. User and client accounts cannot open this area.
        </p>
      </div>
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <Tabs value={tab} onValueChange={(value) => setParams({ tab: value })}>
          <TabsList className="mb-4 h-auto flex-wrap justify-start rounded-full bg-white p-1">
            {tabs.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTrigger key={item.id} value={item.id} className="rounded-full px-4 py-2">
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
          <TabsContent value="companies">
            <Companies embedded />
          </TabsContent>
          <TabsContent value="settings">
            <Settings embedded />
          </TabsContent>
          <TabsContent value="bos">
            <BOSSettings embedded />
          </TabsContent>
          {canAccessPage("Pricing", user) && (
            <TabsContent value="pricing">
              <Pricing embedded />
            </TabsContent>
          )}
          <TabsContent value="taxes">
            <TaxSettings embedded />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
