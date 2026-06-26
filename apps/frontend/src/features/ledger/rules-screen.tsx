"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLedgerMutations, useRules } from "./queries";
import { ErrorBlock, LoadingBlock, ScreenHeading } from "./presentation";

export function RulesScreen({ token, userId }: { token: string; userId: string }) {
  const rules = useRules(token, userId);
  const mutations = useLedgerMutations(token, userId);
  const [form, setForm] = useState({ matchText: "", category: "" });
  async function save(event: FormEvent) {
    event.preventDefault();
    try { await mutations.saveRule.mutateAsync(form); setForm({ matchText: "", category: "" }); toast.success("Category rule saved"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save rule"); }
  }
  async function remove(id: string) {
    try { await mutations.deleteRule.mutateAsync(id); toast.success("Rule deleted"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to delete rule"); }
  }
  return <>
    <ScreenHeading title="Rules" description="Automatically categorize recurring merchants and descriptions." />
    <form onSubmit={save} className="grid gap-4 border bg-white p-5 md:grid-cols-[1fr_1fr_auto]"><Input required minLength={2} placeholder="Description contains…" value={form.matchText} onChange={(e) => setForm({ ...form, matchText: e.target.value })} /><Input required minLength={2} placeholder="Assign category…" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /><Button disabled={mutations.saveRule.isPending}><Plus className="size-4" />Add rule</Button></form>
    <section className="mt-4 border bg-white"><div className="border-b px-5 py-4"><h2 className="font-semibold">Category rules</h2></div>{rules.isLoading ? <div className="p-5"><LoadingBlock /></div> : rules.error ? <div className="p-5"><ErrorBlock message={rules.error.message} /></div> : rules.data?.rules.length ? <div className="divide-y">{rules.data.rules.map((rule) => <div key={rule.id} className="flex items-center gap-4 px-5 py-4"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">Contains “{rule.matchText}”</p><p className="mt-1 text-xs text-muted-foreground">Assign {rule.category}</p></div><button className="rounded p-2 text-red-700 hover:bg-red-50" onClick={() => remove(rule.id)} aria-label={`Delete rule for ${rule.matchText}`}><Trash2 className="size-4" /></button></div>)}</div> : <p className="px-5 py-14 text-center text-sm text-muted-foreground">No rules yet. Add one to keep future imports tidy.</p>}</section>
  </>;
}
