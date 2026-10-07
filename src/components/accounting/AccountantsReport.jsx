import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Eraser, FileText, ImagePlus, Loader2, Mail, Plus, Printer, Send, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/api/supabaseClient";
import { useCompany } from "@/components/shared/CompanyContext";
import useFinancialBooks from "@/components/accounting/useFinancialBooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildAccountantsPackage, chunkNotes, packageRows } from "@/lib/accountantsReport";
import {
  formatSignedAt,
  resolveAccountantSignature,
  saveAccountantSignature,
} from "@/lib/accountantSignature";
import { useAuth } from "@/lib/AuthContext";
import { downloadCsv } from "@/lib/reportFormat";
import { loadReportLogo, prepareLogoForPdf, readLogoFile, saveReportLogo } from "@/lib/reportLogo";
import { downloadAccountantsPdf } from "@/lib/reportPdf";

function StatementTable({ columns, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px] leading-5">
        <thead>
          <tr className="border-b border-slate-300 text-left">
            <th className="py-1 pr-3 font-semibold">Account</th>
            {columns.map((column) => (
              <th key={column.label} className="py-1 pl-3 text-right font-semibold">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((line) => (
            <tr key={line.label} className={line.total ? "border-t border-slate-300 font-semibold" : ""}>
              <td className="py-0.5 pr-3" style={{ paddingLeft: `${line.indent * 12}px` }}>{line.label}</td>
              {line.amounts.map((value, index) => (
                <td key={`${line.label}-${index}`} className="py-0.5 pl-3 text-right tabular-nums">{value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportPage({ company, title, period, page, total, footer, cover = false, children }) {
  return (
    <section className="accountants-page mx-auto mb-6 flex min-h-[11in] w-full max-w-[8.5in] flex-col bg-white px-8 py-7 text-[#0A1F44] shadow-md print:mb-0 print:max-w-none print:shadow-none">
      {cover ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">{children}</div>
      ) : (
        <>
          <header className="mb-4 border-b border-slate-300 pb-2">
            <div className="flex items-start justify-between gap-4 text-[11px] uppercase tracking-wide text-slate-500">
              <span>{company}</span>
              <span className="text-right">{period}</span>
            </div>
            <h3 className="mt-1 text-center text-lg font-semibold">{title}</h3>
          </header>
          <div className="flex-1">{children}</div>
        </>
      )}
      <footer className="mt-6 flex items-center justify-between border-t border-slate-200 pt-2 text-[11px] text-slate-500">
        <span>{footer}</span>
        <span>Page {page} of {total}</span>
      </footer>
    </section>
  );
}

function CoverLogo({ logo, companyLogo, onInsert, onRemove, onUseCompany }) {
  return (
    <div className="mb-8 flex flex-col items-center">
      {logo ? <img src={logo} alt="Company logo" className="mb-3 max-h-20 max-w-[240px] object-contain" /> : null}
      <div className="flex flex-col items-center gap-2 print:hidden">
        {!logo ? (
          <div className="flex h-20 w-48 items-center justify-center rounded-md border border-dashed border-slate-300 text-sm text-slate-400">
            Insert a logo
          </div>
        ) : null}
        <div className="flex flex-wrap justify-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-[#0A1F44]">
            <ImagePlus className="h-4 w-4" />
            {logo ? "Replace logo" : "Insert logo"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={onInsert} />
          </label>
          {logo ? (
            <button type="button" className="rounded-md px-3 py-1.5 text-sm text-slate-500 underline" onClick={onRemove}>
              Remove
            </button>
          ) : null}
          {!logo && companyLogo ? (
            <button type="button" className="rounded-md px-3 py-1.5 text-sm text-[#0A1F44] underline" onClick={onUseCompany}>
              Use company logo
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SignatureBlock({ signature }) {
  const signed = formatSignedAt(signature.signedAt);
  return (
    <div className="mt-8">
      {signature.image ? (
        <img src={signature.image} alt="Accountant signature" className="h-16 w-auto" />
      ) : (
        <p className="text-3xl text-[#0A1F44]" style={{ fontFamily: '"Segoe Script", "Brush Script MT", cursive' }}>
          {signature.name || "Accountant"}
        </p>
      )}
      <div className="mt-1 w-64 border-t border-slate-800" />
      <p className="mt-1 text-sm font-semibold">{signature.name || "Accountant"}</p>
      <p className="text-sm text-slate-600">{signature.designation || "Accountant"}</p>
      {signed ? <p className="text-xs text-slate-500">Signed {signed}</p> : null}
    </div>
  );
}

function canvasHasInk(canvas) {
  const { data } = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] !== 0) return true;
  }
  return false;
}

export default function AccountantsReport({ dateRange, periods = [], reportBasis = "accrual", kind = "interim", onKindChange }) {
  const { user } = useAuth();
  const { selectedCompanyId } = useCompany();
  const { ledger } = useFinancialBooks(reportBasis);
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [recipients, setRecipients] = useState([]);
  const [newRecipient, setNewRecipient] = useState("");
  const [sending, setSending] = useState(false);
  const [signature, setSignature] = useState(() => resolveAccountantSignature(user));
  const [logoRecord, setLogoRecord] = useState(() => loadReportLogo(selectedCompanyId));
  const userRef = useRef(user);
  userRef.current = user;
  const userId = user?.id;

  useEffect(() => {
    setSignature(resolveAccountantSignature(userRef.current));
  }, [userId]);

  useEffect(() => {
    setLogoRecord(loadReportLogo(selectedCompanyId));
  }, [selectedCompanyId]);

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

  const signedPackage = useMemo(() => (pack ? { ...pack, signature } : null), [pack, signature]);
  const notePages = useMemo(() => (pack ? chunkNotes(pack.notes) : []), [pack]);
  const pageCount = pack ? 2 + pack.sections.length + notePages.length : 0;
  const logoSrc = logoRecord?.hidden ? "" : (logoRecord?.image || company?.logo_url || "");
  const pageFooter = pack?.basis === "cash" ? "Cash basis — special purpose report" : "Prepared under ASPE — unaudited";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext("2d");
    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#0A1F44";
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!signature.image) return undefined;
    const image = new Image();
    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      context.strokeStyle = "#0A1F44";
      context.lineWidth = 2;
    };
    image.src = signature.image;
    return undefined;
  }, [signature.image]);

  const updateSignature = (patch) => {
    setSignature((current) => {
      const next = saveAccountantSignature(user?.id, {
        ...current,
        ...patch,
        signedAt: new Date().toISOString(),
      });
      return next;
    });
  };

  const pointerPoint = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const startDraw = (event) => {
    const canvas = canvasRef.current;
    drawing.current = true;
    canvas.setPointerCapture(event.pointerId);
    const context = canvas.getContext("2d");
    const point = pointerPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const draw = (event) => {
    if (!drawing.current) return;
    const context = canvasRef.current.getContext("2d");
    const point = pointerPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const endDraw = (event) => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    updateSignature({ image: canvasHasInk(canvas) ? canvas.toDataURL("image/png") : "" });
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    updateSignature({ image: "" });
  };

  const chooseKind = (next) => onKindChange?.(next);

  const exportCsv = () => {
    if (!signedPackage) return;
    downloadCsv(`accountants-report-${format(new Date(), "yyyy-MM-dd")}.csv`, packageRows(signedPackage));
  };

  const insertLogo = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose a PNG or JPEG logo");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be 2 MB or smaller");
      return;
    }
    try {
      const image = await readLogoFile(file);
      setLogoRecord(saveReportLogo(selectedCompanyId, { image, hidden: false }));
    } catch {
      toast.error("That image could not be read");
    }
  };

  const removeLogo = () => {
    setLogoRecord(saveReportLogo(selectedCompanyId, { image: "", hidden: true }));
  };

  const useCompanyLogo = () => {
    setLogoRecord(saveReportLogo(selectedCompanyId, { image: "", hidden: false }));
  };

  const exportPdf = async () => {
    if (!pack) return;
    let logo = "";
    try {
      logo = await prepareLogoForPdf(logoSrc);
    } catch {
      logo = "";
    }
    if (logoSrc && !logo) toast.error("The logo could not be embedded, so the cover was saved without it");
    downloadAccountantsPdf(pack, signature, { logo });
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
    if (!signedPackage || recipients.length === 0) {
      toast.error("Add at least one recipient");
      return;
    }
    setSending(true);
    const escape = (value) => String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const rows = packageRows(signedPackage).map((row) => `<p>${row.map((cell) => escape(cell)).join(" ")}</p>`).join("");
    const signatureHtml = signature.image
      ? `<p><img src="${signature.image}" alt="Signature" style="height:64px" /></p>`
      : `<p style="font-family:cursive;font-size:28px">${escape(signature.name)}</p>`;
    const logoHtml = logoSrc ? `<p style="text-align:center"><img src="${logoSrc}" alt="Logo" style="max-height:72px" /></p>` : "";
    const coverHtml = `<div style="text-align:center;margin-bottom:24px">${logoHtml}<h1>${escape(signedPackage.companyName)}</h1><p>${escape(signedPackage.title)}</p><p>${escape(signedPackage.periodText)}</p></div>`;
    const body = `<div style="font-family:Arial,sans-serif;color:#0A1F44">${coverHtml}${signatureHtml}${rows}</div>`;
    let failed = 0;
    for (const recipient of recipients) {
      try {
        await supabase.integrations.Core.SendEmail({
          to: recipient,
          subject: `${signedPackage.companyName} - Accountant's Report - ${signedPackage.reportingDate}`,
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

  let pageNumber = 0;

  return (
    <Card className="print:border-0 print:bg-white print:shadow-none">
      <CardContent className="space-y-6 p-6 print:p-0">
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

        <div className="signature-pad grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 print:hidden md:grid-cols-[1fr_auto]">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="accountant-name">Accountant name</Label>
              <Input
                id="accountant-name"
                value={signature.name}
                onChange={(event) => updateSignature({ name: event.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="accountant-designation">Designation</Label>
              <Input
                id="accountant-designation"
                value={signature.designation}
                onChange={(event) => updateSignature({ designation: event.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Draw signature</Label>
            <canvas
              ref={canvasRef}
              width={560}
              height={120}
              className="mt-1 h-[60px] w-[280px] cursor-crosshair touch-none rounded border border-slate-300 bg-white"
              onPointerDown={startDraw}
              onPointerMove={draw}
              onPointerUp={endDraw}
              onPointerLeave={endDraw}
            />
            <Button type="button" variant="ghost" size="sm" className="mt-1" onClick={clearSignature}>
              <Eraser className="mr-1 h-4 w-4" />
              Clear drawing
            </Button>
          </div>
        </div>

        {pack && (
          <div id="accountants-report" className="bg-slate-200/80 p-4 print:bg-white print:p-0">
            <ReportPage
              cover
              company={pack.companyName}
              title={pack.title}
              period={pack.periodText}
              page={pageNumber += 1}
              total={pageCount}
              footer={pageFooter}
            >
              <CoverLogo
                logo={logoSrc}
                companyLogo={company?.logo_url}
                onInsert={insertLogo}
                onRemove={removeLogo}
                onUseCompany={useCompanyLogo}
              />
              <h2 className="text-2xl font-semibold uppercase tracking-tight">{pack.companyName}</h2>
              <div className="my-4 h-px w-24 bg-[#0A1F44]" />
              <p className="text-lg font-semibold">{pack.title}</p>
              <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-500">{pack.periodText}</p>
            </ReportPage>

            <ReportPage
              company={pack.companyName}
              title="Accountant's Report"
              period={pack.periodText}
              page={pageNumber += 1}
              total={pageCount}
              footer={pageFooter}
            >
              <p className="text-center text-base font-semibold">{pack.title}</p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-800">
                {pack.preface.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              <div className="mt-3">
                {pack.inBalance ? (
                  <Badge className="bg-emerald-100 text-emerald-800 print:border print:border-emerald-700 print:bg-white">In balance</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800 print:border print:border-red-700 print:bg-white">Out of balance</Badge>
                )}
              </div>
              <SignatureBlock signature={signature} />
            </ReportPage>

            {pack.sections.map((section) => (
              <ReportPage
                key={section.title}
                company={pack.companyName}
                title={section.title}
                period={pack.periodText}
                page={pageNumber += 1}
                total={pageCount}
                footer={pageFooter}
              >
                <StatementTable columns={pack.columns} rows={section.rows} />
              </ReportPage>
            ))}

            {notePages.map((notes, index) => (
              <ReportPage
                key={notes[0]?.number || index}
                company={pack.companyName}
                title={index === 0 ? "Notes to the Financial Statements" : "Notes to the Financial Statements (continued)"}
                period={pack.periodText}
                page={pageNumber += 1}
                total={pageCount}
                footer={pageFooter}
              >
                <ol className="space-y-4">
                  {notes.map((note) => (
                    <li key={note.number}>
                      <p className="text-sm font-semibold">{note.number}. {note.title}</p>
                      {note.paragraphs.map((paragraph) => (
                        <p key={paragraph} className="mt-1 text-sm leading-6 text-slate-700">{paragraph}</p>
                      ))}
                    </li>
                  ))}
                </ol>
              </ReportPage>
            ))}
          </div>
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
      <style>{`
        @media print {
          .accountants-page {
            min-height: 10in;
            break-after: page;
            page-break-after: always;
          }
          .accountants-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }
      `}</style>
    </Card>
  );
}
