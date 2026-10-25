import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { efinMoneyApi } from "@/api/efinmoney";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function EfinMoneyCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Finishing connection...");
  const [error, setError] = useState(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const state = params.get("state");
    const session_id = params.get("session_id");
    const code = params.get("code");

    const run = async () => {
      try {
        if (error === "access_denied") {
          if (state) await efinMoneyApi.cancel(state).catch(() => {});
          setStatus("Connection cancelled");
          setError("You cancelled the eFinMoney connection.");
          return;
        }
        if (!state || !session_id || !code) {
          setStatus("Connection failed");
          setError("Missing parameters from eFinMoney.");
          return;
        }
        await efinMoneyApi.complete(state, session_id, code);
        navigate("/Banking?tab=efinmoney&connected=1", { replace: true });
      } catch (e) {
        setStatus("Connection failed");
        setError(e.message || "Failed to complete connection");
      }
    };
    run();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center space-y-3">
          <p className="text-lg font-semibold">{status}</p>
          {error && <p className="text-sm text-gray-600">{error}</p>}
          <div className="flex justify-center gap-2">
            <Button onClick={() => navigate("/Banking?tab=efinmoney", { replace: true })}>Back to Banking</Button>
            {error && error.includes("cancel") === false && <Button variant="outline" onClick={() => navigate("/Banking?tab=efinmoney", { replace: true })}>Try again</Button>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
