import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileText, Loader2, Mail, Plus, Printer, Send, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/api/supabaseClient";
import { useCompany } from "@/components/shared/CompanyContext";
import useFinancialBooks from "@/components/accounting/useFinancialBooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildAccountantsPackage, packageRows } from "@/lib/accountantsReport";
import { downloadCsv } from "@/lib/reportFormat";
import { downloadReportPdf } from "@/lib/reportPdf";

function StatementTable({ title, columns, rows }) {
  return (
    <section className="mb-8">
      <h3 className="mb-2 text-base font-semibold text-[#0A1F44]">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-slate-300 text-left">
              <th className="py-2 pr-3 font-semibold">Account</th>
              {columns.map((column) => (
                <th key={column.label} className="py-2 pl-3 text-right font-semibold">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((line) => (
              <tr key={line.label} className={line.total ? "border-t border-slate-300 font-semibold" : ""}>
                <td className="py-1.5 pr-3" style={{ paddingLeft: `${line.indent * 16}px` }}>{line.label}</td>
                {line.amounts.map((value, index) => (
                  <td key={`${line.label}-${index}`} className="py-1.5 pl-3 text-right tabular-nums">{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function AccountantsReport({ dateRange, periods = [], reportBasis = "accrual", kind = "interim", onKindChange }) {
  const { selectedCompanyId } = useCompany();
  const { ledger } = useFinancialBooks(reportBasis);
  const [recipients, setRecipients] = useState([]);
  const [newRecipient, setNewRecipient] = useState("");
  const [sending, setSending] = useState(false);

  const { data: company } = useQuery({
    queryKey: ["company", selectedCompanyId],
    queryFn: async () => {
      const companies = await supabase.entities.Company.filter({ id: selectedCompanyId });
      return companies[0];
    },
    enabled: !!selectedCompanyId,
  });

  const pack = useMemo(() => {
    if (!ledger || !dateRange?.from || !dateRange?.to) return null;
    return buildAccountantsPackage({
      ledger,
      companyName: company?.name || "Company",
      from: dateRange.from,
      to: dateRange.to,
      kind,
      basis: reportBasis,
      extraPeriods: periods.slice(1),
    });
  }, [ledger, company?.name, dateRange?.from, dateRange?.to, kind, reportBasis, periods]);

  const chooseKind = (next) => onKindChange?.(next);

  const exportCsv = () => {
    if (!pack) return;
    downloadCsv(`accountants-report-${format(new Date(), "yyyy-MM-dd")}.csv`, packageRows(pack));
  };

  const exportPdf = () => {
    if (!pack) return;
    downloadReportPdf({
      filename: `accountants-report-${format(new Date(), "yyyy-MM-dd")}.pdf`,
      title: "Accountant's Report",
      company: pack.companyName,
      subtitle: pack.periodText,
      paragraphs: pack.preface,
      sections: [
        ...pack.sections.map((section) => ({ ...section, columns: pack.columns.map((column) => column.label) })),
        {
          title: "Notes to the Financial Statements",
          columns: [],
          rows: pack.notes.flatMap((note) => [
            { label: `${note.number}. ${note.title}`, amounts: [], total: true },
            ...note.paragraphs.map((paragraph) => ({ label: paragraph, amounts: [] })),
          ]),
        },
      ],
    });
  };

  const addRecipient = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newRecipient)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!recipients.includes(newRecipient)) setRecipients([...recipients, newRecipient]);
    setNewRecipient("");
  };

  const emailPackage = async () => {
    if (!pack || recipients.length === 0) {
      toast.error("Add at least one recipient");
      return;
    }
    setSending(true);
    const rows = packageRows(pack).map((row) => `<p>${row.map((cell) => cell || "").join(" ")}</p>`).join("");
    const body = `<div style="font-family:Arial,sans-serif;color:#0A1F44">${rows}</div>`;
    let failed = 0;
    for (const recipient of recipients) {
      try {
        await supabase.integrations.Core.SendEmail({
          to: recipient,
          subject: `${pack.companyName} - Accountant's Report - ${pack.reportingDate}`,
          body,
        });
      } catch (error) {
        console.error(error);
        failed += 1;
      }
    }
    setSending(false);
    if (failed === 0) toast.success(`Accountant's report sent to ${recipients.length} recipient(s)`);
    else toast.warning(`Sent to ${recipients.length - failed} recipient(s), ${failed} failed`);
  };

  if (!selectedCompanyId) {
    return <Card><CardContent className="py-8 text-center text-slate-500">Select a company to prepare the accountant's report.</CardContent></Card>;
  }

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <div className="flex flex-col gap-4 print:hidden lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-[#0A1F44]">
              <FileText className="h-5 w-5" />
              Accountant's Report
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Generates an interim or financial year-end package from the same books as the other statements, with notes, in accordance with ASPE.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={kind === "interim" ? "default" : "outline"} onClick={() => chooseKind("interim")}>Interim</Button>
            <Button type="button" variant={kind === "year_end" ? "default" : "outline"} onClick={() => chooseKind("year_end")}>Financial year end</Button>
            <Button type="button" variant="outline" onClick={exportCsv}>CSV</Button>
            <Button type="button" variant="outline" onClick={exportPdf}>PDF</Button>
            <Button type="button" variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        {pack?.adjusted && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 print:hidden">
            The selected dates are not a complete financial year. This year-end package uses January 1 to December 31, {pack.period.to.getFullYear()}.
          </p>
        )}

        {pack && (
          <article id="accountants-report" className="rounded-lg border border-slate-200 bg-white p-4 md:p-6">
            <header className="mb-6 text-center">
              <p className="text-sm uppercase tracking-wide text-slate-500">Accountant's Report</p>
              <h2 className="mt-1 text-2xl font-bold text-[#0A1F44]">{pack.companyName}</h2>
              <p className="text-lg">{pack.title}</p>
              <p className="text-sm text-slate-600">{pack.periodText}</p>
              <p className="text-xs text-slate-500">
                {pack.basis === "cash" ? "Cash basis" : "Accounting Standards for Private Enterprises"} · Generated {format(new Date(), "MMMM d, yyyy")}
              </p>
              {pack.inBalance ? (
                <Badge className="mt-3 bg-emerald-100 text-emerald-800">In balance</Badge>
              ) : (
                <Badge className="mt-3 bg-red-100 text-red-800">Out of balance</Badge>
              )}
            </header>

            <section className="mb-8 space-y-3 text-sm leading-6 text-slate-800">
              {pack.preface.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>

            {pack.sections.map((section) => (
              <StatementTable key={section.title} title={section.title} columns={pack.columns} rows={section.rows} />
            ))}

            <section>
              <h3 className="mb-3 text-base font-semibold text-[#0A1F44]">Notes to the Financial Statements</h3>
              <ol className="space-y-4">
                {pack.notes.map((note) => (
                  <li key={note.number}>
                    <p className="font-semibold">{note.number}. {note.title}</p>
                    {note.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="mt-1 text-sm leading-6 text-slate-700">{paragraph}</p>
                    ))}
                  </li>
                ))}
              </ol>
            </section>
          </article>
        )}

        <div className="border-t pt-4 print:hidden">
          <Label className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Mail className="h-4 w-4" />
            Email this package
          </Label>
          <div className="mb-3 flex gap-2">
            <Input
              type="email"
              placeholder="Enter email address"
              value={newRecipient}
              onChange={(event) => setNewRecipient(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && addRecipient()}
            />
            <Button type="button" variant="outline" onClick={addRecipient}>
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {recipients.map((email) => (
              <Badge key={email} variant="secondary">
                {email}
                <button type="button" className="ml-2" onClick={() => setRecipients(recipients.filter((item) => item !== email))}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Button type="button" onClick={emailPackage} disabled={sending || recipients.length === 0} className="bg-[#0A1F44] hover:bg-[#132c5c]">
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Email package
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
