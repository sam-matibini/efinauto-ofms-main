import { useLocation, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

/**
 * Public, unauthenticated page shown after a Stripe Checkout redirect.
 * Rendered outside ProtectedRoute (see App.jsx). The webhook is the source
 * of truth for recording the payment — this page is only a confirmation, so
 * it deliberately does not fetch or mutate anything.
 */
export default function PaySuccess({ variant = "success" }) {
  const { search } = useLocation();
  const sessionId = new URLSearchParams(search).get("session_id");

  const variants = {
    success: {
      icon: <CheckCircle2 className="w-14 h-14 text-green-500" />,
      title: "Thank you — your payment was received!",
      message:
        "Your payment was processed securely. A receipt has been emailed to you, and the invoice has been marked as paid.",
    },
    cancelled: {
      icon: <XCircle className="w-14 h-14 text-slate-400" />,
      title: "Payment cancelled",
      message:
        "No charge was made. You can return to the invoice email anytime to complete your payment.",
    },
    pending: {
      icon: <Clock className="w-14 h-14 text-amber-500" />,
      title: "Payment is processing",
      message:
        "Your payment is being confirmed. Once it clears, the invoice will be marked as paid automatically and a receipt will be emailed to you.",
    },
  };

  const { icon, title, message } = variants[variant] ?? variants.success;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border p-10 text-center">
        <div className="flex justify-center mb-6">{icon}</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-3">{title}</h1>
        <p className="text-slate-600 leading-relaxed">{message}</p>
        {sessionId && variant === "success" && (
          <p className="mt-6 text-xs text-slate-400 break-all">
            Reference: {sessionId}
          </p>
        )}
        <Link
          to="/"
          className="inline-block mt-8 px-6 py-2.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Go to eFinAuto
        </Link>
      </div>
    </div>
  );
}
