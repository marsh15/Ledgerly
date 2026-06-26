"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { PresentedTransaction, TransactionInput } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TransactionForm({ transaction, busy, onCancel, onSubmit }: { transaction?: PresentedTransaction; busy: boolean; onCancel: () => void; onSubmit: (input: TransactionInput) => void }) {
  const [form, setForm] = useState(() => ({
    date: transaction?.date ?? new Date().toISOString().slice(0, 10), description: transaction?.description ?? "", type: transaction?.type ?? "DEBIT",
    amount: String(Math.abs(transaction?.amount ?? 0)), currencyCode: transaction?.currencyCode ?? "INR", category: transaction?.category ?? "", accountLabel: transaction?.accountLabel ?? "Personal", status: transaction?.status ?? "SAVED"
  }));
  const field = (name: keyof typeof form, value: string) => setForm((current) => ({ ...current, [name]: value }));
  function submit(event: FormEvent) {
    event.preventDefault();
    const magnitude = Math.abs(Number(form.amount));
    onSubmit({ date: form.date, description: form.description, type: form.type as "DEBIT" | "CREDIT", amount: form.type === "DEBIT" ? -magnitude : magnitude, currencyCode: form.currencyCode.toUpperCase(), balanceAfter: null, category: form.category || null, confidence: transaction?.confidence ?? 1, status: form.status as "SAVED" | "NEEDS_REVIEW", accountLabel: form.accountLabel, source: transaction?.source ?? "MANUAL" });
  }
  return <form onSubmit={submit} className="flex h-full flex-col"><div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
    <Field id="transaction-date" label="Date"><Input id="transaction-date" type="date" required value={form.date} onChange={(e) => field("date", e.target.value)} /></Field>
    <Field id="transaction-description" label="Description"><Input id="transaction-description" required maxLength={160} value={form.description} onChange={(e) => field("description", e.target.value)} /></Field>
    <div className="grid grid-cols-2 gap-4"><Field id="transaction-type" label="Type"><select id="transaction-type" className="form-control" value={form.type} onChange={(e) => field("type", e.target.value)}><option value="DEBIT">Debit</option><option value="CREDIT">Credit</option></select></Field><Field id="transaction-amount" label="Amount"><Input id="transaction-amount" type="number" required min="0.01" step="0.01" value={form.amount} onChange={(e) => field("amount", e.target.value)} /></Field></div>
    <div className="grid grid-cols-2 gap-4"><Field id="transaction-currency" label="Currency"><Input id="transaction-currency" required pattern="[A-Za-z]{3}" maxLength={3} value={form.currencyCode} onChange={(e) => field("currencyCode", e.target.value)} /></Field><Field id="transaction-status" label="Status"><select id="transaction-status" className="form-control" value={form.status} onChange={(e) => field("status", e.target.value)}><option value="SAVED">Saved</option><option value="NEEDS_REVIEW">Needs review</option></select></Field></div>
    <Field id="transaction-category" label="Category"><Input id="transaction-category" maxLength={60} value={form.category} onChange={(e) => field("category", e.target.value)} /></Field>
    <Field id="transaction-account" label="Account"><Input id="transaction-account" required maxLength={60} value={form.accountLabel} onChange={(e) => field("accountLabel", e.target.value)} /></Field>
  </div><div className="flex justify-end gap-3 border-t px-6 py-4"><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button disabled={busy}>{transaction ? "Save changes" : "Add transaction"}</Button></div></form>;
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) { return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label>{children}</div>; }
