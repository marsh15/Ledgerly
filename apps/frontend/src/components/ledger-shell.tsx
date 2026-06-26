"use client";

import { ArrowUpFromLine, LayoutDashboard, ListTree, LogOut, Menu, ReceiptText, X } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { clearLedgerCache } from "@/features/ledger/queries";
import type { LedgerSection } from "@/features/ledger/types";
import { Button } from "@/components/ui/button";

const navigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "transactions", label: "Transactions", icon: ReceiptText },
  { id: "import", label: "Import", icon: ArrowUpFromLine },
  { id: "rules", label: "Rules", icon: ListTree }
] as const;

export function LedgerShell({ active, userId, userName, children }: { active: LedgerSection; userId: string; userName: string; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const queryClient = useQueryClient();
  async function logout() {
    clearLedgerCache(queryClient, userId);
    await signOut({ callbackUrl: "/login" });
  }
  const nav = (
    <>
      <div className="flex h-20 items-center justify-between px-6">
        <Link href="/overview" className="flex items-center gap-2 text-xl font-semibold tracking-[-0.04em]"><span className="grid size-8 place-items-center rounded-md bg-primary text-sm text-white">L</span>Ledgerly</Link>
        <button className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X className="size-5" /></button>
      </div>
      <nav className="space-y-1 px-3" aria-label="Primary navigation">
        {navigation.map(({ id, label, icon: Icon }) => (
          <Link key={id} href={`/${id}`} onClick={() => setMobileOpen(false)} className={`flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${active === id ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
            <Icon className="size-[18px]" strokeWidth={1.8} />{label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto border-t p-3">
        <div className="mb-2 flex items-center gap-3 rounded-md px-3 py-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold">{initials(userName)}</span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{userName}</span>
        </div>
        <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={logout}><LogOut className="size-4" />Sign out</Button>
      </div>
    </>
  );

  return <div className="min-h-screen bg-background">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r bg-white lg:flex">{nav}</aside>
    {mobileOpen ? <div className="fixed inset-0 z-50 bg-slate-950/30 lg:hidden" onClick={() => setMobileOpen(false)}><aside className="flex h-full w-72 flex-col bg-white" onClick={(event) => event.stopPropagation()}>{nav}</aside></div> : null}
    <div className="lg:pl-60">
      <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-white/95 px-4 backdrop-blur lg:hidden">
        <button onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="size-5" /></button>
        <span className="ml-3 font-semibold">Ledgerly</span>
      </header>
      <main className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-8 lg:px-10 lg:py-10">{children}</main>
    </div>
  </div>;
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
