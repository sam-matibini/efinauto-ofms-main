import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Landmark, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/api/supabaseClient";
import AdminDenied from "@/components/admin/AdminDenied";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/AuthContext";
import { isAdminUser } from "@/lib/access";
import {
  lastTaxRefresh,
  payrollRules,
  refreshCanadianTaxes,
  salesRatesAsOf,
} from "@/lib/canadianTaxSchedule";

function cad(amount) {
  return Number(amount).toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

function percent(rate) {
  return `${Number((rate * 100).toFixed(3))}%`;
}

function rateLabel(rate) {
  return `${rate}%`;
}

export default function TaxSettings({ embedded = false }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [stamp, setStamp] = useState(() => lastTaxRefresh());
  const [refreshing, setRefreshing] = useState(false);
  const rules = payrollRules();
  const sales = salesRatesAsOf();

  const applyRefresh = async () => {
    setRefreshing(true);
    const result = refreshCanadianTaxes();
    setStamp(result);
    try {
      const companies = await supabase.entities.Company.list();
      await Promise.all(
        (companies || [])
          .filter((company) => company?.id)
          .map((company) => supabase.entities.Company.update(company.id, { tax_rates: result.companyRates }))
      );
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["company"] });
      toast.success(`Canadian tax rates refreshed for ${result.taxYear}`);
    } catch (error) {
      console.error(error);
      toast.error("The tax schedule is current, but company records could not be saved");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const saved = lastTaxRefresh();
    if (saved?.taxYear === payrollRules().taxYear) return;
    applyRefresh();
  }, []);

  if (!isAdminUser(user)) return <AdminDenied />;

  const refreshedLabel = stamp?.refreshedAt
    ? new Date(stamp.refreshedAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })
    : "Not yet refreshed in this browser";

  return (
    <div className={embedded ? "space-y-4" : "min-h-screen bg-[#F5F6F8] p-4 md:p-6"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-[#0A1F44]">
            <Landmark className="h-5 w-5" />
            Canadian tax rates
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Sales tax and payroll use the {rules.taxYear} CRA and Revenu Québec schedule.
            Invoices and pay runs read that schedule for the transaction date, including the Nova Scotia HST change on April 1, 2025.
            Refresh writes the current provincial rates onto every company.
          </p>
        </div>
        <Button onClick={applyRefresh} disabled={refreshing} className="bg-[#0A1F44] hover:bg-[#132c5c]">
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh rates
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales tax</CardTitle>
          <CardDescription>
            GST, HST, PST, and QST in effect today. Last company refresh: {refreshedLabel}.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b text-slate-500">
                <th className="py-2 pr-3 font-medium">Province</th>
                <th className="py-2 pr-3 font-medium">GST</th>
                <th className="py-2 pr-3 font-medium">PST / QST</th>
                <th className="py-2 pr-3 font-medium">HST</th>
                <th className="py-2 pr-3 font-medium">Combined</th>
                <th className="py-2 font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(sales).map(([code, rate]) => (
                <tr key={code} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium text-slate-900">{rate.name} ({code})</td>
                  <td className="py-2 pr-3">{rateLabel(rate.gst)}</td>
                  <td className="py-2 pr-3">{rateLabel(rate.pst)}</td>
                  <td className="py-2 pr-3">{rateLabel(rate.hst)}</td>
                  <td className="py-2 pr-3">{rateLabel(rate.total)}</td>
                  <td className="py-2">{rate.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>CPP and QPP, {rules.taxYear}</CardTitle>
            <CardDescription>Employee and employer rates. Quebec uses QPP instead of CPP.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>CPP {percent(rules.cpp.rate)} up to {cad(rules.cpp.ympe)}. Basic exemption {cad(rules.cpp.basicExemption)}. Maximum {cad(rules.cpp.maxEmployee)}.</p>
            <p>Second additional contribution {percent(rules.cpp.cpp2Rate)} between {cad(rules.cpp.ympe)} and {cad(rules.cpp.yampe)}. Maximum {cad(rules.cpp.cpp2Max)}.</p>
            <p>QPP {percent(rules.qpp.rate)} up to the same ceiling. Maximum {cad(rules.qpp.maxEmployee)}, plus the same second additional contribution.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>EI and QPIP, {rules.taxYear}</CardTitle>
            <CardDescription>Insurable earnings and Quebec parental insurance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>EI outside Quebec: employee {percent(rules.ei.employeeRate)}, maximum {cad(rules.ei.maxEmployee)}. Employer {percent(rules.ei.employerRate)}, maximum {cad(rules.ei.maxEmployer)}. Insurable earnings {cad(rules.ei.maxInsurable)}.</p>
            <p>EI in Quebec: employee {percent(rules.eiQuebec.employeeRate)}, maximum {cad(rules.eiQuebec.maxEmployee)}. Employer {percent(rules.eiQuebec.employerRate)}.</p>
            <p>QPIP: employee {percent(rules.qpip.employeeRate)}, maximum {cad(rules.qpip.maxEmployee)}. Employer {percent(rules.qpip.employerRate)}. Insurable earnings {cad(rules.qpip.maxInsurable)}.</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Income tax, {rules.taxYear}</CardTitle>
            <CardDescription>
              Federal basic personal amount {cad(rules.personal.federal.amount)}. Lowest federal rate {percent(rules.brackets.federal[0].rate)}.
              Quebec federal abatement {percent(rules.federalAbatement)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
              {rules.sources.map((source) => (
                <li key={source}>{source}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
