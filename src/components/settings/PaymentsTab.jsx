import React, { useEffect, useState } from "react";
import { supabase } from "@/api/supabaseClient";
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
  CreditCard,
  Loader2,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { createConnectOnboarding } from "@/lib/paymentLinks";

/**
 * Settings → Payments: Stripe Connect (Standard) onboarding for this
 * company. Each dealership connects its OWN Stripe account, so customer
 * payments from invoice pay-links go directly to that dealership's bank.
 * eFinAuto only stores the account id + status — never tenant secret keys.
 */
export default function PaymentsTab({ isAdmin = false }) {
  const { selectedCompanyId } = useCompany();
  const [connecting, setConnecting] = useState(false);
  const [returning, setReturning] = useState(false);

  const {
    data: conn,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["stripe-connect", selectedCompanyId],
    queryFn: () =>
      supabase.entities.StripeConnectAccount.list().then((rows) =>
        (rows || []).find((r) => r.company_id === selectedCompanyId) ?? null,
      ),
    enabled: !!selectedCompanyId,
    staleTime: 30_000,
  });

  // Coming back from Stripe-hosted onboarding (?stripe=return|refresh).
  // The account.updated webhook may lag a few seconds, so poll briefly.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get("stripe");
    if (!outcome || !selectedCompanyId) return;

    // clean the URL immediately so a refresh doesn't re-run this
    window.history.replaceState({}, "", window.location.pathname);

    if (outcome === "refresh") {
      toast.warning(
        "Stripe onboarding was not completed. You can resume it below.",
      );
      refetch();
      return;
    }

    // outcome === "return"
    setReturning(true);
    let cancelled = false;
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      let ready = false;
      try {
        const rows = await supabase.entities.StripeConnectAccount.list();
        const row = (rows || []).find(
          (r) => r.company_id === selectedCompanyId,
        );
        ready = !!row?.charges_enabled;
        await refetch();
      } catch {
        /* keep polling */
      }
      if (ready || attempts >= 6 || cancelled) {
        clearInterval(timer);
        setReturning(false);
        if (ready) {
          toast.success("Stripe onboarding complete — ready to accept payments");
        } else {
          toast.info(
            "Stripe is reviewing the account. Status will update automatically.",
          );
        }
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [selectedCompanyId, refetch]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await createConnectOnboarding();
      if (!res?.url) {
        throw new Error(res?.error || "No onboarding link returned");
      }
      // Stripe-hosted onboarding (KYC + payouts handled by Stripe).
      window.location.href = res.url;
    } catch (error) {
      toast.error(error?.message || "Could not start Stripe onboarding");
      setConnecting(false);
    }
  };

  const status = (() => {
    if (isLoading) return { key: "loading", label: "Loading…", icon: Loader2, tone: "bg-gray-100 text-gray-600" };
    if (!conn?.stripe_account_id)
      return {
        key: "not_connected",
        label: "Not connected",
        icon: AlertTriangle,
        tone: "bg-red-100 text-red-700",
      };
    if (conn.charges_enabled && conn.payouts_enabled)
      return {
        key: "ready",
        label: "Ready to accept payments",
        icon: CheckCircle2,
        tone: "bg-green-100 text-green-700",
      };
    if (conn.charges_enabled && !conn.payouts_enabled)
      return {
        key: "payouts_pending",
        label: "Payments enabled · payouts pending",
        icon: Clock,
        tone: "bg-amber-100 text-amber-700",
      };
    return {
      key: "pending",
      label: "Onboarding incomplete",
      icon: Clock,
      tone: "bg-amber-100 text-amber-700",
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
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Stripe Payments</CardTitle>
                <CardDescription>
                  Click-to-pay buttons on sales &amp; repair invoices
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
              Payments go straight to your bank
            </p>
            <p>
              Connect your dealership's own Stripe account. When your customer
              pays an invoice, Stripe deposits the funds directly to your
              account — eFinAuto never holds your money. Stripe handles card
              fees, payouts, and verification.
            </p>
          </div>

          {conn?.stripe_account_id && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600">
              <div>
                <span className="text-gray-400">Account ID: </span>
                <span className="font-mono">{conn.stripe_account_id}</span>
              </div>
              {conn.business_name && (
                <div>
                  <span className="text-gray-400">Business: </span>
                  <span>{conn.business_name}</span>
                </div>
              )}
              <div>
                <span className="text-gray-400">Payouts: </span>
                <span>
                  {conn.payouts_enabled ? "Enabled" : "Not yet enabled"}
                </span>
              </div>
            </div>
          )}

          {status.key === "not_connected" && (
            <p className="text-sm text-gray-500">
              Payment links on invoices will be unavailable until Stripe
              onboarding is finished.
            </p>
          )}

          {status.key === "pending" && (
            <p className="text-sm text-amber-700">
              Stripe is still verifying this account
              {conn?.requirements_status
                ? ` (${conn.requirements_status.replaceAll("_", " ")})`
                : ""}
              . You can resume onboarding at any time — status refreshes
              automatically once Stripe approves the account.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <Button onClick={handleConnect} disabled={connecting || returning}>
                {connecting || returning ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                {conn?.stripe_account_id
                  ? "Manage / finish Stripe setup"
                  : "Connect with Stripe"}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh status
            </Button>

            {conn?.charges_enabled && (
              <Button
                variant="outline"
                onClick={() =>
                  window.open("https://dashboard.stripe.com/dashboard", "_blank")
                }
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Stripe dashboard
              </Button>
            )}
          </div>

          <div className="flex items-start gap-2 text-xs text-gray-500">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-green-600" />
            <p>
              eFinAuto never sees or stores your Stripe secret keys — only the
              public account id and connection status. Onboarding happens on
              Stripe's own site.
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
              Open a sales or repair invoice and click <b>Payment Link</b>.
            </li>
            <li>
              Share the link or send the invoice email — it includes a{" "}
              <b>Pay Now</b> button.
            </li>
            <li>
              The customer pays by card on Stripe's hosted checkout (no account
              needed).
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
