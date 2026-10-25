import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function BalancesGrid({ balances = [] }) {
  if (!balances.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">No wallet balances found.</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {balances.map((b, idx) => (
        <Card key={idx}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{b.currency_name || b.currency}</p>
                <p className="text-xl font-semibold">
                  {Number(b.balance || 0).toLocaleString("en-US", {
                    style: "currency",
                    currency: b.currency || "USD",
                  })}
                </p>              
              </div>
              <div className="flex flex-col items-end gap-1">
                {b.is_default && <Badge>Default</Badge>}
                {b.status && <Badge variant="secondary">{b.status}</Badge>}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
