import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { efinMoneyApi } from "@/api/efinmoney";
import { useAuth } from "@/lib/AuthContext";
import { isAdminUser } from "@/lib/access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Landmark, RefreshCw, Unlink, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import AccountsGrid from "./AccountsGrid";
import BalancesGrid from "./BalancesGrid";

export default function EfinMoneyTab({ companyId }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const [starting, setStarting] = useState(false);

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['efinmoney', 'status', companyId],
    queryFn: () => efinMoneyApi.status(companyId),
    enabled: !!companyId,
    staleTime: 30000,
  });

  const connected = status?.status === 'connected';

  const { data: accounts = [], isLoading: accountsLoading, refetch: refetchAccounts } = useQuery({
    queryKey: ['efinmoney', 'accounts', companyId],
    queryFn: () => efinMoneyApi.accounts(companyId),
    enabled: !!companyId && connected,
    staleTime: 30000,
    refetchInterval: connected ? 60000 : false,
    refetchOnWindowFocus: connected,
  });

  const { data: balances = [], isLoading: balancesLoading, refetch: refetchBalances } = useQuery({
    queryKey: ['efinmoney', 'balances', companyId],
    queryFn: () => efinMoneyApi.balances(companyId),
    enabled: !!companyId && connected,
    staleTime: 30000,
    refetchInterval: connected ? 60000 : false,
    refetchOnWindowFocus: connected,
  });

  const disconnectMutation = useMutation({
    mutationFn: () => efinMoneyApi.disconnect(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efinmoney'] });
      toast.success('eFinMoney disconnected');
    },
    onError: (e) => toast.error(e.message || 'Failed to disconnect'),
  });

  const connect = async () => {
    if (!isAdmin) return;
    setStarting(true);
    try {
      const res = await efinMoneyApi.start(companyId);
      if (res?.link_url) {
        window.location.href = res.link_url;
      } else {
        toast.error('Failed to start connection');
      }
    } catch (e) {
      toast.error(e.message || 'Failed to start connection');
    } finally {
      setStarting(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([refetchAccounts(), refetchBalances(), queryClient.invalidateQueries({ queryKey: ['efinmoney', 'status', companyId] })]);
    toast.success('Refreshed');
  };

  if (!companyId) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">Select a company to manage eFinMoney.</CardContent>
      </Card>
    );
  }

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">Loading eFinMoney status...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Landmark className="w-5 h-5" />
              <CardTitle>eFinMoney</CardTitle>
              {connected ? <Badge>Connected</Badge> : <Badge variant="secondary">Not connected</Badge>}
            </div>
            <div className="flex flex-wrap gap-2">
              {connected && (
                <>
                  <Button size="sm" variant="outline" onClick={refreshAll}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  {isAdmin && (
                    <Button size="sm" variant="outline" onClick={() => disconnectMutation.mutate()} disabled={disconnectMutation.isPending}>
                      <Unlink className="w-4 h-4 mr-2" />
                      Disconnect
                    </Button>
                  )}
                </>
              )}
              {!connected && isAdmin && (
                <Button size="sm" onClick={connect} disabled={starting}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {starting ? 'Starting...' : 'Connect eFinMoney'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {connected ? (
            <div className="text-sm text-gray-600 space-y-1">
              <p>Linked account: {status.account?.legal_name || status.account?.name || '—'} {status.account?.type ? `(${status.account.type})` : ''} {status.account?.country ? `• ${status.account.country}` : ''}</p>
              {status.connected_at && <p>Connected: {new Date(status.connected_at).toLocaleString()}</p>}
              {status.reconnect_required && (
                <Alert className="mt-2">
                  <AlertDescription>This connection needs to be reconnected. Please click Connect eFinMoney.</AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              <p>Connect your eFinMoney account to view virtual bank accounts and wallet balances.</p>
              {!isAdmin && <p className="mt-1 text-gray-500">Only admins can connect or disconnect eFinMoney.</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {connected && (
        <>
          <div>
            <h3 className="text-base font-semibold mb-2">Virtual accounts</h3>
            {accountsLoading ? <Card><CardContent className="p-6 text-center text-gray-500">Loading accounts...</CardContent></Card> : <AccountsGrid accounts={accounts} />}
          </div>
          <div>
            <h3 className="text-base font-semibold mb-2">Wallet balances</h3>
            {balancesLoading ? <Card><CardContent className="p-6 text-center text-gray-500">Loading balances...</CardContent></Card> : <BalancesGrid balances={balances} />}
          </div>
        </>
      )}
    </div>
  );
}
