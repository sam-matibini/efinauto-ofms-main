import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/components/shared/CompanyContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { efinMoneyApi } from "@/api/efinmoney";

/**
 * Settings → Payments: eFinMoney connection used for invoice pay-links.
 * Each dealership connects its OWN eFinMoney account (the same connection
 * shown under Banking → eFinMoney), so customer payments land directly in
 * that dealership's eFinMoney wallet. eFinAuto only stores an encrypted
 * link token server-side, and payment links can only collect money — never
 * send or withdraw it.
 */
export default function PaymentsTab({ isAdmin = false }) {
  const { selectedCompanyId } = useCompany();
  const [connecting, setConnecting] = useState(false);

  const {
    data: conn,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    // Shared with Banking → eFinMoney so both views stay in sync.
    queryKey: ["efinmoney", "status", selectedCompanyId],
    queryFn: () => efinMoneyApi.status(selectedCompanyId),
    enabled: !!selectedCompanyId,
    staleTime: 30_000,
  });

  const connected = conn?.status === "connected";

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await efinMoneyApi.start(selectedCompanyId);
      if (!res?.link_url) {
        throw new Error("No eFinMoney connect link returned");
      }
      // eFinMoney-hosted consent screen; the customer approves payment links
      // there and is sent back to /settings/efinmoney/callback.
      window.location.href = res.link_url;
    } catch (error) {
      toast.error(error?.message || "Could not start eFinMoney connection");
      setConnecting(false);
    }
  };

  const status = (() => {
    if (isLoading) return { key: "loading", label: "Loading…", icon: Loader2, tone: "bg-gray-100 text-gray-600" };
    if (connected)
      return {
        key: "ready",
        label: "Ready to accept payments",
        icon: CheckCircle2,
        tone: "bg-green-100 text-green-700",
      };
    return {
      key: "not_connected",
      label: conn?.reconnect_required ? "Reconnect required" : "Not connected",
      icon: AlertTriangle,
      tone: "bg-red-100 text-red-700",
    };
  })();

  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>eFinMoney Payments</CardTitle>
                <CardDescription>
                  Click-to-pay links on bills of sale and sales &amp; repair invoices
                </CardDescription>
              </div>
            </div>
            <Badge className={status.tone}>
              <StatusIcon className="w-3.5 h-3.5 mr-1" />
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            <p className="font-medium text-gray-900 mb-1">
              Payments go straight to your eFinMoney wallet
            </p>
            <p>
              Connect your dealership's own eFinMoney account. When your
              customer pays an invoice, the money lands in your eFinMoney
              wallet for that currency — eFinAuto never holds your money.
              Payment links can only collect money; they can't send or
              withdraw it.
            </p>
          </div>

          {connected && conn?.account && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
              {(conn.account.legal_name || conn.account.name) && (
                <div>
                  <span className="text-gray-400">Account: </span>
                  <span>{conn.account.legal_name || conn.account.name}</span>
                </div>
              )}
              {conn.account.country && (
                <div>
                  <span className="text-gray-400">Country: </span>
                  <span>{conn.account.country}</span>
                </div>
              )}
              {conn.connected_at && (
                <div>
                  <span className="text-gray-400">Connected: </span>
                  <span>{new Date(conn.connected_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}

          {status.key === "not_connected" && (
            <p className="text-sm text-gray-500">
              Payment links on invoices will be unavailable until an admin
              connects eFinMoney.
            </p>
          )}

          {connected && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                Connected before payment links were available? Reconnect once
                and allow <b>payment links</b> on the eFinMoney screen, or
                creating a pay link will fail with a permission error. Your
                account also needs an active wallet in each invoice currency
                (CAD, USD, NGN, GHS, KES or ZMW).
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <Button onClick={handleConnect} disabled={connecting || !selectedCompanyId}>
                {connecting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wallet className="w-4 h-4 mr-2" />
                )}
                {connected ? "Reconnect eFinMoney" : "Connect eFinMoney"}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching || !selectedCompanyId}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh status
            </Button>
          </div>

          {!isAdmin && (
            <p className="text-xs text-gray-500">
              Only admins can connect or reconnect eFinMoney.
            </p>
          )}

          <div className="flex items-start gap-2 text-xs text-gray-500">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-green-600" />
            <p>
              eFinAuto never sees your eFinMoney login. The connection token
              is stored encrypted on the server and is never sent to the
              browser. You approve the connection on eFinMoney's own site.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How customers pay</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <ol className="list-decimal list-inside space-y-1">
            <li>
              Open a bill of sale, sales invoice or repair invoice and click{" "}
              <b>Payment Link</b>.
            </li>
            <li>
              Share the link or send the invoice email — it includes a{" "}
              <b>Pay Now</b> button.
            </li>
            <li>
              The customer pays on eFinMoney's secure page by card, Interac or
              bank transfer (depending on currency). Links expire after 7 days.
            </li>
            <li>
              The webhook marks the invoice paid and posts the double-entry
              ledger (Dr Cash / Cr A/R) automatically.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
