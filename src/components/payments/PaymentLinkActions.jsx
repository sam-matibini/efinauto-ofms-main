import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link2, Copy, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/api/supabaseClient";
import { useCompany } from "@/components/shared/CompanyContext";
import {
  ACTIVE_LINK_STATUSES,
  copyToClipboard,
  createPaymentLink,
} from "@/lib/paymentLinks";

export const PAYMENT_LINKS_QUERY_KEY = "payment-links";

const linkKey = (sourceType, sourceId) => `${sourceType}:${sourceId}`;

/**
 * Open (payable, unexpired) payment links for the selected company, keyed by
 * `${source_type}:${source_id}` → newest link. One query per company,
 * shared by every PaymentLinkActions on the page.
 */
export function useActivePaymentLinks() {
  const { selectedCompanyId } = useCompany();
  return useQuery({
    queryKey: [PAYMENT_LINKS_QUERY_KEY, selectedCompanyId],
    queryFn: async () => {
      const rows = await supabase.entities.PaymentLink.filter(
        { company_id: selectedCompanyId, status: ACTIVE_LINK_STATUSES },
        "-created_at",
        500,
      );
      const now = Date.now();
      const map = {};
      for (const row of rows || []) {
        if (!row.url) continue;
        if (row.expires_at && new Date(row.expires_at).getTime() <= now) continue;
        const key = linkKey(row.source_type, row.source_id);
        if (!map[key]) map[key] = row; // rows are newest first
      }
      return map;
    },
    enabled: !!selectedCompanyId,
    staleTime: 15_000,
  });
}

/** The open payment link for one record, or null. */
export function useActivePaymentLink(sourceType, sourceId) {
  const { data } = useActivePaymentLinks();
  return (sourceId && data?.[linkKey(sourceType, sourceId)]) || null;
}

export function useInvalidatePaymentLinks() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [PAYMENT_LINKS_QUERY_KEY] });
}

const formatAmount = (amount, currency) =>
  `${Number(amount || 0).toFixed(2)} ${currency || ""}`.trim();

/**
 * Create / Copy / Regenerate controls for an invoice or bill of sale.
 *
 * - No open link → "Create link" (creates it; does not copy).
 * - Open link → "Copy link" copies that existing link, and "Regenerate"
 *   cancels it and makes a new one for the current balance (e.g. after a
 *   manual partial payment).
 *
 * @param {"sales_invoice"|"repair_invoice"|"sale"} sourceType
 * @param {string} sourceId
 * @param {number} amountDue what the server will charge (used to flag a
 *   link whose amount no longer matches the balance)
 * @param {boolean} canTakePayment false when settled / nothing due
 * @param {"icon"|"sm"} [size] icon-only ghost buttons, or labelled buttons
 */
export default function PaymentLinkActions({
  sourceType,
  sourceId,
  amountDue,
  currency,
  canTakePayment,
  size = "sm",
  className = "",
}) {
  const link = useActivePaymentLink(sourceType, sourceId);
  const invalidate = useInvalidatePaymentLinks();
  const [busy, setBusy] = useState(null); // "create" | "regenerate" | null

  if (!sourceId) return null;

  const stale =
    !!link && Math.abs(Number(link.amount || 0) - Number(amountDue || 0)) > 0.005;

  const run = async (kind) => {
    setBusy(kind);
    try {
      await createPaymentLink(sourceType, sourceId, { force: kind === "regenerate" });
      await invalidate();
      toast.success(
        kind === "regenerate"
          ? `New payment link created for ${formatAmount(amountDue, currency)}. The previous link no longer works. Use Copy link to share it.`
          : "Payment link created. Use Copy link to share it.",
      );
    } catch (error) {
      toast.error(error?.message || "Could not create payment link");
    } finally {
      setBusy(null);
    }
  };

  const handleRegenerate = () => {
    const ok = window.confirm(
      `Create a new payment link for the current balance (${formatAmount(amountDue, currency)})?\n\n` +
        "The current link will be cancelled, so anyone who has it won't be able to pay with it.",
    );
    if (ok) run("regenerate");
  };

  const handleCopy = async () => {
    const copied = await copyToClipboard(link.url);
    if (!copied) {
      toast.info(link.url);
      return;
    }
    if (stale) {
      toast.warning(
        `Copied, but this link is for ${formatAmount(link.amount, link.currency)} and the balance is now ${formatAmount(amountDue, currency)}. Use Regenerate to get a link for the balance.`,
      );
    } else {
      toast.success("Payment link copied to clipboard");
    }
  };

  const icon = size === "icon";
  const btn = icon
    ? { size: "icon", variant: "ghost" }
    : { size: "sm", variant: "outline" };
  const spin = <Loader2 className={`w-4 h-4 animate-spin ${icon ? "" : "mr-1"}`} />;

  if (!link) {
    return (
      <Button
        {...btn}
        className={className}
        onClick={() => run("create")}
        disabled={!canTakePayment || !!busy}
        title={canTakePayment ? "Create a secure eFinMoney payment link" : "Nothing due"}
      >
        {busy ? spin : <Link2 className={`w-4 h-4 ${icon ? "" : "mr-1"}`} />}
        {!icon && (busy ? "Creating..." : "Create link")}
      </Button>
    );
  }

  return (
    <>
      <Button
        {...btn}
        className={`${stale ? "text-amber-600" : ""} ${className}`}
        onClick={handleCopy}
        disabled={!!busy}
        title={
          stale
            ? `Link is for ${formatAmount(link.amount, link.currency)}; balance is ${formatAmount(amountDue, currency)}`
            : `Copy payment link (${formatAmount(link.amount, link.currency)})`
        }
      >
        <Copy className={`w-4 h-4 ${icon ? "" : "mr-1"}`} />
        {!icon && "Copy link"}
      </Button>
      <Button
        {...btn}
        className={className}
        onClick={handleRegenerate}
        disabled={!canTakePayment || !!busy}
        title="Cancel this link and create a new one for the current balance"
      >
        {busy === "regenerate" ? spin : <RefreshCw className={`w-4 h-4 ${icon ? "" : "mr-1"}`} />}
        {!icon && (busy === "regenerate" ? "Regenerating..." : "Regenerate")}
      </Button>
    </>
  );
}
