import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, CreditCard, Building2, Wifi, WifiOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

export default function BankAccountsList({ accounts, onEdit, onDelete }) {
  const accountTypeIcons = {
    checking: <CreditCard className="w-5 h-5" />,
    savings: <Building2 className="w-5 h-5" />,
    credit_card: <CreditCard className="w-5 h-5" />,
    line_of_credit: <CreditCard className="w-5 h-5" />,
    money_market: <Building2 className="w-5 h-5" />,
  };

  const statusColors = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
    closed: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-4">
      {accounts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No bank accounts found</p>
            <p className="text-sm text-gray-500 mt-1">Add your first bank account to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <Card key={account.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                      {accountTypeIcons[account.account_type]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{account.account_name}</h3>
                      <p className="text-sm text-gray-600">{account.institution_name}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => onEdit(account)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(account.id)} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[account.status]}>
                      {account.status}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      {account.connection_status === 'connected' ? (
                        <><Wifi className="w-3 h-3" /> Connected</>
                      ) : (
                        <><WifiOff className="w-3 h-3" /> Manual</>
                      )}
                    </Badge>
                  </div>

                  {account.account_number && (
                    <p className="text-sm text-gray-600">****{account.account_number}</p>
                  )}

                  <div className="pt-3 border-t">
                    <p className="text-xs text-gray-500">Current Balance</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {account.currency} ${(account.current_balance || 0).toLocaleString()}
                    </p>
                  </div>

                  {account.reconciliation_date && (
                    <p className="text-xs text-gray-500">
                      Last reconciled: {new Date(account.reconciliation_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}