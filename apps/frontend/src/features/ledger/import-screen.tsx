"use client";

import { AlertTriangle, ArrowLeft, Check, FileText, RotateCcw, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { autoMapCsvHeaders, isAmbiguousCsvDate, normalizeCsvRows, parseCsv, transactionInputSchema, type CsvColumn, type CsvDateFormat, type CsvMapping, type TransactionDraft } from "@ledgerly/shared";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useImports, useLedgerMutations } from "./queries";
import type { TransactionInput } from "./types";
import { money, ScreenHeading } from "./presentation";

type PreviewRow = { index: number; record: TransactionInput; duplicate: boolean; duplicateOfId: string | null; withinFileDuplicateOf: number | null; include: boolean };

export function ImportScreen({ token, userId }: { token: string; userId: string }) {
  const [mode, setMode] = useState<"csv" | "text">("csv");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [filename, setFilename] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [sourceRows, setSourceRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<CsvMapping>({});
  const [dateFormat, setDateFormat] = useState<CsvDateFormat | "">("");
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [working, setWorking] = useState(false);
  const imports = useImports(token, userId);
  const mutations = useLedgerMutations(token, userId);
  const ambiguous = useMemo(() => sourceRows.some((row) => mapping.date && isAmbiguousCsvDate(row[mapping.date] ?? "")), [mapping.date, sourceRows]);
  const selectedCount = previewRows.filter((row) => row.include).length;

  if (mode === "text") return <TextImport token={token} userId={userId} setMode={setMode} />;

  async function chooseFile(file?: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("CSV files must be 5 MB or smaller");
    if (!file.name.toLowerCase().endsWith(".csv")) return toast.error("Choose a UTF-8 CSV file");
    const parsed = parseCsv(await file.text());
    if (parsed.rows.length > 1000) return toast.error("CSV imports are limited to 1,000 rows");
    if (!parsed.headers.length || !parsed.rows.length) return toast.error("This CSV does not contain any data rows");
    setFilename(file.name); setHeaders(parsed.headers); setSourceRows(parsed.rows); setMapping(autoMapCsvHeaders(parsed.headers)); setDateFormat(""); setStep(1);
  }

  async function buildPreview() {
    if (!mapping.date || !mapping.description || !mapping.amount || !mapping.type || !mapping.currencyCode) return toast.error("Map the date, description, amount, type, and currency columns");
    if (ambiguous && !dateFormat) return toast.error("Choose the date format for ambiguous dates");
    const format = dateFormat || "YYYY-MM-DD";
    const normalized = normalizeCsvRows(sourceRows, mapping, format);
    const invalid = normalized.filter((row) => !row.record);
    if (invalid.length) return toast.error(`${invalid.length} row${invalid.length === 1 ? "" : "s"} could not be normalized`);
    setWorking(true);
    try {
      const result = await apiFetch<{ rows: PreviewRow[] }>("/api/imports/preview", token, { method: "POST", body: JSON.stringify({ filename, records: normalized.flatMap((row) => row.record ? [row.record] : []) }) });
      setPreviewRows(result.rows); setStep(2);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to preview import"); }
    finally { setWorking(false); }
  }

  async function commitImport() {
    setWorking(true);
    try {
      await mutations.importTransactions.mutateAsync({ filename, records: previewRows.map((row) => ({ ...row.record, duplicateOfId: row.duplicateOfId, include: row.include })) });
      setStep(3); toast.success(`${selectedCount} transactions imported`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to import transactions"); }
    finally { setWorking(false); }
  }

  async function rollback(id: string) {
    try { await mutations.rollbackImport.mutateAsync(id); toast.success("Import rolled back"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to roll back import"); }
  }

  return <>
    <ScreenHeading title="Import transactions" description="Upload a CSV or paste transaction text, then review every draft before it reaches your ledger." />
    <ImportTabs mode={mode} setMode={setMode} />
    <ol className="mb-8 grid grid-cols-3 border bg-white" aria-label="Import progress">{([[1,"Upload & map"],[2,"Review rows"],[3,"Import"]] as const).map(([number,label]) => <li key={number} className={`flex items-center gap-3 border-r px-4 py-4 last:border-r-0 ${step === number ? "bg-secondary text-primary" : "text-muted-foreground"}`}><span className={`grid size-7 place-items-center rounded-full border text-xs font-semibold ${step > number ? "border-primary bg-primary text-white" : ""}`}>{step > number ? <Check className="size-3.5" /> : number}</span><span className="hidden text-sm font-semibold sm:block">{label}</span></li>)}</ol>
    {step === 1 ? <section className="border bg-white">
      {!sourceRows.length ? <label className="grid cursor-pointer place-items-center px-6 py-20 text-center hover:bg-slate-50"><Upload className="size-8 text-primary" /><strong className="mt-4">Choose a CSV statement</strong><span className="mt-2 text-sm text-muted-foreground">UTF-8 CSV · up to 5 MB · up to 1,000 rows</span><input className="sr-only" type="file" accept=".csv,text/csv" onChange={(e) => chooseFile(e.target.files?.[0])} /></label> : <>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4"><div className="flex items-center gap-3"><FileText className="size-5 text-primary" /><div><p className="text-sm font-semibold">{filename}</p><p className="text-xs text-muted-foreground">{sourceRows.length} rows · raw file is not uploaded or stored</p></div></div><label className="cursor-pointer text-sm font-semibold text-primary">Choose another<input className="sr-only" type="file" accept=".csv,text/csv" onChange={(e) => chooseFile(e.target.files?.[0])} /></label></div>
        <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-4"><MappingSelect label="Date" field="date" headers={headers} mapping={mapping} setMapping={setMapping} required /><MappingSelect label="Description" field="description" headers={headers} mapping={mapping} setMapping={setMapping} required /><MappingSelect label="Amount" field="amount" headers={headers} mapping={mapping} setMapping={setMapping} required /><MappingSelect label="Type" field="type" headers={headers} mapping={mapping} setMapping={setMapping} required /><MappingSelect label="Currency" field="currencyCode" headers={headers} mapping={mapping} setMapping={setMapping} required /><MappingSelect label="Category" field="category" headers={headers} mapping={mapping} setMapping={setMapping} /><MappingSelect label="Account" field="accountLabel" headers={headers} mapping={mapping} setMapping={setMapping} />
          <label className="space-y-1.5"><span className="text-sm font-medium">Date format {ambiguous ? <span className="text-amber-700">· required</span> : null}</span><select className="form-control" value={dateFormat} onChange={(e) => setDateFormat(e.target.value as CsvDateFormat)}><option value="">Select format</option><option value="YYYY-MM-DD">YYYY-MM-DD</option><option value="DD/MM/YYYY">DD/MM/YYYY</option><option value="MM/DD/YYYY">MM/DD/YYYY</option></select></label>
        </div>{ambiguous ? <div className="mx-5 mb-5 flex gap-3 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><p>Dates such as 06/07/2026 are ambiguous. Choose whether day or month comes first.</p></div> : null}<div className="flex justify-end border-t px-5 py-4"><Button disabled={working} onClick={buildPreview}>{working ? "Checking rows…" : "Review rows"}</Button></div>
      </>}
    </section> : null}
    {step === 2 ? <section className="border bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4"><div><p className="font-semibold">{filename}</p><p className="text-xs text-muted-foreground">{previewRows.length} rows · {previewRows.filter((row) => row.duplicate).length} possible duplicates skipped by default</p></div><span className="text-sm font-semibold text-primary">{selectedCount} selected</span></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs text-muted-foreground"><tr><th className="px-4 py-3">Import</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y">{previewRows.map((row) => <tr key={row.index} className={row.duplicate ? "bg-amber-50/60" : ""}><td className="px-4 py-3"><input type="checkbox" checked={row.include} onChange={(e) => setPreviewRows((current) => current.map((item) => item.index === row.index ? { ...item, include: e.target.checked } : item))} aria-label={`Include ${row.record.description}`} /></td><td className="px-4 py-3 text-muted-foreground">{row.record.date}</td><td className="max-w-[300px] px-4 py-3 font-medium"><span className="block truncate">{row.record.description}</span></td><td className="px-4 py-3 text-muted-foreground">{row.record.type}</td><td className="px-4 py-3 font-semibold tabular-nums">{money(Math.abs(Number(row.record.amount)), String(row.record.currencyCode))}</td><td className="px-4 py-3 text-muted-foreground">{String(row.record.category ?? "Uncategorized")}</td><td className="px-4 py-3">{row.duplicate ? <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle className="size-3.5" />Duplicate</span> : "Ready"}</td></tr>)}</tbody></table></div><div className="flex justify-between border-t px-5 py-4"><Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="size-4" />Back</Button><Button disabled={!selectedCount || working} onClick={commitImport}>{working ? "Importing…" : `Import ${selectedCount} selected`}</Button></div></section> : null}
    {step === 3 ? <section className="border bg-white px-6 py-16 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-secondary text-primary"><Check className="size-6" /></span><h2 className="mt-5 text-xl font-semibold">Import complete</h2><p className="mt-2 text-sm text-muted-foreground">{selectedCount} transactions were added to your ledger.</p><div className="mt-6 flex justify-center gap-3"><Button variant="outline" onClick={() => { setStep(1); setSourceRows([]); }}>Import another file</Button><Button asChild><a href="/transactions">Review transactions</a></Button></div></section> : null}
    <section className="mt-8 border bg-white"><div className="border-b px-5 py-4"><h2 className="font-semibold">Import history</h2><p className="mt-1 text-xs text-muted-foreground">Only metadata is stored, never the original CSV file.</p></div>{imports.data?.batches.length ? <div className="divide-y">{imports.data.batches.map((batch) => <div key={batch.id} className="flex flex-wrap items-center gap-4 px-5 py-4"><FileText className="size-4 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{batch.filename}</p><p className="text-xs text-muted-foreground">{new Date(batch.createdAt).toLocaleDateString()} · {batch.importedRows} imported · {batch.skippedRows} skipped</p></div><Button variant="ghost" size="sm" disabled={mutations.rollbackImport.isPending} onClick={() => rollback(batch.id)}><RotateCcw className="size-4" />Roll back</Button></div>)}</div> : <p className="px-5 py-10 text-center text-sm text-muted-foreground">Completed imports will appear here.</p>}</section>
  </>;
}

type TextDraft = TransactionDraft & { duplicate: { isDuplicate: boolean; existingId: string | null }; include: boolean };

function TextImport({ token, userId, setMode }: { token: string; userId: string; setMode: (mode: "csv" | "text") => void }) {
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<TextDraft[]>([]);
  const [working, setWorking] = useState(false);
  const mutations = useLedgerMutations(token, userId);

  async function preview() {
    setWorking(true);
    try {
      const result = await apiFetch<{ drafts: Array<Omit<TextDraft, "include">> }>("/api/transactions/preview", token, { method: "POST", body: JSON.stringify({ text }) });
      setDrafts(result.drafts.map((draft) => ({ ...draft, include: !draft.duplicate.isDuplicate })));
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to extract transactions"); }
    finally { setWorking(false); }
  }

  function edit(index: number, field: "date" | "description" | "amount" | "type" | "currencyCode", value: string) {
    setDrafts((current) => current.map((draft, draftIndex) => {
      if (draftIndex !== index) return draft;
      const updated = { ...draft, [field]: field === "amount" ? (value === "" ? null : Number(value)) : value || null };
      return { ...updated, issues: validationIssues(updated) };
    }));
  }

  async function save() {
    const selected = drafts.filter((draft) => draft.include);
    if (!selected.length) return toast.error("Select at least one valid draft");
    const parsed = selected.map(parseTextDraft);
    if (selected.some((draft) => draft.issues.length) || parsed.some((result) => !result.success)) {
      return toast.error("Resolve every issue in selected drafts before saving");
    }
    setWorking(true);
    try {
      await mutations.saveTextDrafts.mutateAsync(parsed.flatMap((result) => result.success ? [result.data] : []));
      toast.success(`${selected.length} transaction${selected.length === 1 ? "" : "s"} saved`);
      setText(""); setDrafts([]);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save drafts"); }
    finally { setWorking(false); }
  }

  return <>
    <ScreenHeading title="Import transactions" description="Upload a CSV or paste transaction text, then review every draft before it reaches your ledger." />
    <ImportTabs mode="text" setMode={setMode} />
    {!drafts.length ? <section className="border bg-white p-5"><label className="space-y-2"><span className="text-sm font-semibold">Transaction text</span><textarea className="form-control min-h-56" value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste one or more transactions. Separate multiple entries with a blank line." /></label><div className="mt-4 flex justify-end"><Button disabled={working || text.trim().length < 8} onClick={preview}>{working ? "Extracting…" : "Review drafts"}</Button></div></section> :
      <section className="space-y-4">{drafts.map((draft, index) => <article key={draft.draftId} className="border bg-white p-5"><div className="mb-4 flex items-center justify-between"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={draft.include} onChange={(event) => setDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, include: event.target.checked } : item))} />Save draft {index + 1}</label>{draft.duplicate.isDuplicate ? <span className="text-sm text-amber-700">Possible duplicate</span> : null}</div><div className="grid gap-4 md:grid-cols-5"><DraftField label="Date" value={draft.date ?? ""} onChange={(value) => edit(index, "date", value)} /><DraftField label="Description" value={draft.description ?? ""} onChange={(value) => edit(index, "description", value)} /><DraftField label="Amount" type="number" value={draft.amount?.toString() ?? ""} onChange={(value) => edit(index, "amount", value)} /><label className="space-y-1.5"><span className="text-sm font-medium">Type</span><select className="form-control" value={draft.type ?? ""} onChange={(event) => edit(index, "type", event.target.value)}><option value="">Choose</option><option value="DEBIT">Debit</option><option value="CREDIT">Credit</option></select></label><DraftField label="Currency" value={draft.currencyCode ?? ""} onChange={(value) => edit(index, "currencyCode", value.toUpperCase())} /></div>{draft.issues.length ? <ul className="mt-4 space-y-1 text-sm text-amber-800">{draft.issues.map((issue) => <li key={`${issue.field}-${issue.code}`}>{issue.message}</li>)}</ul> : <p className="mt-4 text-sm text-emerald-700">Ready to save · retained for review</p>}</article>)}<div className="flex justify-between"><Button variant="outline" onClick={() => setDrafts([])}>Back</Button><Button disabled={working || !drafts.some((draft) => draft.include)} onClick={save}>{working ? "Saving…" : "Save selected"}</Button></div></section>}
  </>;
}

function parseTextDraft(draft: TextDraft) {
  return transactionInputSchema.safeParse({
    date: draft.date, description: draft.description, amount: draft.amount, type: draft.type, currencyCode: draft.currencyCode,
    balanceAfter: draft.balanceAfter, category: draft.category, confidence: draft.confidence, status: "NEEDS_REVIEW",
    accountLabel: draft.accountLabel, duplicateOfId: draft.duplicate.existingId, sourceText: draft.sourceText, source: "TEXT"
  });
}

function validationIssues(draft: TextDraft): TextDraft["issues"] {
  const result = parseTextDraft(draft);
  if (result.success) return [];
  const fields = new Set(["date", "description", "amount", "type", "currencyCode"]);
  return result.error.issues.flatMap((issue) => {
    const field = String(issue.path[0] ?? "");
    return fields.has(field) ? [{ field: field as TextDraft["issues"][number]["field"], code: issue.code, message: issue.message }] : [];
  });
}

function DraftField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="space-y-1.5"><span className="text-sm font-medium">{label}</span><input className="form-control" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function ImportTabs({ mode, setMode }: { mode: "csv" | "text"; setMode: (mode: "csv" | "text") => void }) {
  return <div className="mb-6 flex border bg-white p-1" role="tablist"><button className={`flex-1 px-4 py-2 text-sm font-semibold ${mode === "csv" ? "bg-secondary text-primary" : "text-muted-foreground"}`} onClick={() => setMode("csv")}>CSV</button><button className={`flex-1 px-4 py-2 text-sm font-semibold ${mode === "text" ? "bg-secondary text-primary" : "text-muted-foreground"}`} onClick={() => setMode("text")}>Paste text</button></div>;
}

function MappingSelect({ label, field, headers, mapping, setMapping, required = false }: { label: string; field: CsvColumn; headers: string[]; mapping: CsvMapping; setMapping: (mapping: CsvMapping) => void; required?: boolean }) {
  return <label className="space-y-1.5"><span className="text-sm font-medium">{label}{required ? " *" : ""}</span><select className="form-control" value={mapping[field] ?? ""} onChange={(e) => setMapping({ ...mapping, [field]: e.target.value || undefined })}><option value="">Not mapped</option>{headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>;
}
