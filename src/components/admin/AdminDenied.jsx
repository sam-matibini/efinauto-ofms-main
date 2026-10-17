import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminDenied() {
  return (
    <div className="p-6">
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
            <div>
              <h2 className="font-semibold text-red-900">Admin access only</h2>
              <p className="text-sm text-red-700">
                Companies, pricing, taxes, and settings are limited to administrators. User and client accounts cannot open this area.
              </p>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex h-9 items-center justify-center rounded-md border border-red-300 bg-white px-4 text-sm font-medium text-red-900 hover:bg-red-100"
          >
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
