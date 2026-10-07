import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { loadImportHistory, markImportReversed, mergeImportHistory, reversalPlan } from "@/lib/statementImport";

async function deleteIds(ids, remove) {
  for (let index = 0; index < ids.length; index += 20) {
    await Promise.all(ids.slice(index, index + 20).map((id) => remove(id)));
  }
}

export default function StatementImportHistory({ companyId, transactions = [], bankAccounts = [], compact = false }) {
  const queryClient = useQueryClient();
  const [records, setRecords] = useState([]);
  const [reversing, setReversing] = useState("");

  useEffect(() => {
    setRecords(mergeImportHistory(loadImportHistory(companyId), transactions, bankAccounts));
  }, [companyId, transactions, bankAccounts]);

  const reverseImport = async (record) => {
    const plan = reversalPlan(transactions, record.id);
    if (plan.blocked) {
      toast.error("This import includes reconciled transactions. Unreconcile them before reversing it.");
      return;
    }
    const confirmed = window.confirm(`Reverse ${record.filename || "this import"}? Its ${plan.bankIds.length} transaction(s) will be removed, including any general-ledger posting from this batch.`);
    if (!confirmed) return;
    setReversing(record.id);
    try {
      await deleteIds(plan.glIds, (id) => supabase.entities.Transaction.delete(id));
      await deleteIds(plan.bankIds, (id) => supabase.entities.BankTransaction.delete(id));
      markImportReversed(companyId, record.id);
      setRecords(mergeImportHistory(loadImportHistory(companyId), transactions.filter((row) => row.import_batch_id !== record.id), bankAccounts));
      queryClient.invalidateQueries({ queryKey: ["bankTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(plan.bankIds.length ? `Reversed ${plan.bankIds.length} transaction(s)` : "Import marked as reversed");
    } catch (error) {
      toast.error(error?.message || "Could not reverse this import");
    }
    setReversing("");
  };

  if (records.length === 0) {
    return <p className="text-sm text-gray-500">No statement imports yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2 pr-3 font-medium">Imported</th>
            <th className="py-2 pr-3 font-medium">File</th>
            {!compact && <th className="py-2 pr-3 font-medium">Account</th>}
            <th className="py-2 pr-3 text-right font-medium">Transactions</th>
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} className="border-b last:border-0">
              <td className="py-2 pr-3">{record.importedAt ? format(new Date(record.importedAt), "MMM d, yyyy") : ""}</td>
              <td className="py-2 pr-3">{record.filename || "Imported statement"}</td>
              {!compact && <td className="py-2 pr-3">{record.accountName || "Bank account"}</td>}
              <td className="py-2 pr-3 text-right tabular-nums">{record.count || 0}</td>
              <td className="py-2 pr-3">
                <Badge variant="outline" className={record.status === "reversed" ? "bg-gray-100 text-gray-700" : "bg-green-100 text-green-800"}>
                  {record.status === "reversed" ? "Reversed" : "Imported"}
                </Badge>
              </td>
              <td className="py-2 text-right">
                {record.status !== "reversed" && (
                  <Button type="button" variant="outline" size="sm" disabled={reversing === record.id} onClick={() => reverseImport(record)}>
                    <Undo2 className="mr-1 h-4 w-4" />
                    {reversing === record.id ? "Reversing" : "Reverse"}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
