import { Link2, ExternalLink, AlertTriangle } from "lucide-react";
import PaymentLinkActions, { useActivePaymentLink } from "@/components/payments/PaymentLinkActions";

const formatAmount = (amount, currency) =>
  `${Number(amount || 0).toFixed(2)} ${currency || ""}`.trim();

const formatDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString();
};

/**
 * Read-only "Payment link" field for record views (invoice preview, bill of
 * sale, repair invoice). Shows the open eFinMoney link (clickable URL,
 * amount, expiry) with Copy / Regenerate, or a Create button when there is
 * no open link. Lives outside the printable document area so the
 * screen-only controls don't end up on prints/PDFs.
 *
 * Props match PaymentLinkActions.
 */
export default function PaymentLinkField({
  sourceType,
  sourceId,
  amountDue,
  currency,
  canTakePayment,
  className = "",
}) {
  const link = useActivePaymentLink(sourceType, sourceId);
  if (!sourceId) return null;

  const stale =
    !!link && Math.abs(Number(link.amount || 0) - Number(amountDue || 0)) > 0.005;
  const expires = formatDate(link?.expires_at);

  return (
    <div className={`rounded-lg border bg-slate-50 p-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Link2 className="w-4 h-4" />
          Payment link
        </div>
        <div className="flex flex-wrap gap-2">
          <PaymentLinkActions
            sourceType={sourceType}
            sourceId={sourceId}
            amountDue={amountDue}
            currency={currency}
            canTakePayment={canTakePayment}
          />
        </div>
      </div>

      {link ? (
        <div className="mt-2 space-y-1">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded border bg-white px-2 py-1.5 font-mono text-xs text-blue-700 hover:underline break-all"
          >
            <span className="flex-1">{link.url}</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </a>
          <p className="text-xs text-slate-500">
            For {formatAmount(link.amount, link.currency)}
            {expires ? ` · Expires ${expires}` : ""}
          </p>
          {stale && (
            <p className="flex items-center gap-1 text-xs text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5" />
              Balance is now {formatAmount(amountDue, currency)}. Regenerate to get a link for the current balance.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-500">
          {canTakePayment ? "No active payment link." : "Nothing due."}
        </p>
      )}
    </div>
  );
}
