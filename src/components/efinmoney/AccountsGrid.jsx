import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function maskAccount(num) {
  if (!num) return "-";
  if (num.length <= 4) return num;
  return "•••• " + num.slice(-4);
}

export default function AccountsGrid({ accounts = [] }) {
  const [revealed, setRevealed] = useState({});

  const copy = (val) => {
    if (!val) return;
    navigator.clipboard?.writeText(val);
    toast.success("Copied");
  };

  if (!accounts.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">No virtual accounts found.</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {accounts.map((acc) => (
        <Card key={acc.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{acc.bank_name || acc.account_name}</CardTitle>
                <p className="text-sm text-gray-500">{acc.account_name}</p>
              </div>
              <Badge variant={acc.status === "active" ? "default" : "secondary"}>{acc.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Account number</p>
                <p className="font-mono text-sm">{revealed[acc.id] ? acc.account_number : maskAccount(acc.account_number)}</p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => setRevealed((r) => ({ ...r, [acc.id]: !r[acc.id] }))}>
                  {revealed[acc.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => copy(acc.account_number)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="text-sm">
              <p className="text-xs text-gray-500">Currency</p>
              <p>{acc.currency}</p>
            </div>
            {acc.bank_details && Object.keys(acc.bank_details).length > 0 && (
              <div className="text-sm space-y-1">
                <p className="text-xs text-gray-500">Bank details</p>
                {acc.bank_details.routing_number && <p>Routing: {acc.bank_details.routing_number}</p>}
                {acc.bank_details.swift_code && <p>SWIFT: {acc.bank_details.swift_code}</p>}
                {acc.bank_details.iban && <p>IBAN: {acc.bank_details.iban}</p>}
                {acc.bank_details.sort_code && <p>Sort code: {acc.bank_details.sort_code}</p>}
                {acc.bank_details.bank_code && <p>Bank code: {acc.bank_details.bank_code}</p>}
                {acc.bank_details.transit_number && <p>Transit: {acc.bank_details.transit_number}</p>}
                {acc.bank_details.institution_number && <p>Institution: {acc.bank_details.institution_number}</p>}
                {acc.bank_details.account_type && <p>Type: {acc.bank_details.account_type}</p>}
                {acc.bank_details.bank_address && <p className="text-gray-600">{acc.bank_details.bank_address}</p>}
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <p className="text-xs text-gray-500">Balance</p>
                {acc.balance === null || acc.balance === undefined ? (
                  <p className="text-sm text-gray-500">Wallet not linked</p>
                ) : (
                  <p className="font-semibold">{acc.currency} {Number(acc.balance.amount || acc.balance).toFixed(2)}</p>
                )}
              </div>
              {acc.is_permanent ? <Badge variant="outline">Permanent</Badge> : acc.expires_at ? <Badge variant="outline">Expires {acc.expires_at?.slice(0,10)}</Badge> : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
