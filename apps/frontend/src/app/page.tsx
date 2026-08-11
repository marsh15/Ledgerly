import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, Code2, FileCheck2, LockKeyhole, ReceiptText, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await auth();
  if (session?.backendToken) redirect("/overview");

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="inline-flex items-center gap-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ReceiptText className="size-5" />
            </span>
            <span>
              <span className="block text-lg leading-tight">Ledgerly</span>
              <span className="block text-xs font-medium text-muted-foreground">Private transaction workspace</span>
            </span>
          </Link>
          <nav aria-label="Account" className="flex items-center gap-2">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Create account</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="border-b">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)] lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-semibold text-primary">
              <LockKeyhole className="size-4" />
              Deterministic parsing, tenant-scoped storage
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl">
              Turn bank alerts into a ledger you can inspect.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Paste raw transaction text, review every extracted field, and save only the rows you approve. Your raw finance text is never sent to an AI provider.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild className="h-12 px-5">
                <Link href="/register">
                  Create private ledger
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 px-5">
                <Link href="/login">Open existing workspace</Link>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" />Preview before save</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" />Duplicate checks</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" />Currency-safe totals</li>
            </ul>
          </div>

          <div className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between border-b px-3 py-3">
              <div>
                <p className="text-sm font-semibold">Parser preview</p>
                <p className="mt-1 text-xs text-muted-foreground">Nothing is saved in this step</p>
              </div>
              <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-primary">100% local rules</span>
            </div>
            <div className="grid gap-3 p-3 sm:grid-cols-2">
              <div className="rounded-md bg-muted/70 p-4 font-mono text-xs leading-6 text-muted-foreground">
                <p>Date: 11 Dec 2025</p>
                <p>Description: STARBUCKS COFFEE MUMBAI</p>
                <p>Amount: -420.00</p>
                <p>Balance: 18,420.50</p>
              </div>
              <dl className="divide-y rounded-md border bg-background px-4">
                <PreviewRow label="Date" value="2025-12-11" />
                <PreviewRow label="Amount" value="-₹420.00" />
                <PreviewRow label="Type" value="Debit" />
                <PreviewRow label="Category" value="Dining" />
              </dl>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-secondary/70 px-4 py-3 text-sm text-secondary-foreground">
              <ShieldCheck className="size-4 shrink-0 text-primary" />
              Ownership comes from the verified session, never from pasted text.
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-card">
        <div className="mx-auto grid max-w-7xl divide-y px-5 sm:px-8 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          <ProofPoint icon={<FileCheck2 className="size-5" />} title="Review-first ingestion">
            Low-confidence fields and possible duplicates stay visible before persistence.
          </ProofPoint>
          <ProofPoint icon={<ShieldCheck className="size-5" />} title="Server-enforced isolation">
            User and organization ownership are derived from Better Auth context on every protected route.
          </ProofPoint>
          <ProofPoint icon={<Code2 className="size-5" />} title="Explainable by design">
            The parser is deterministic, the API is typed, and finance totals never combine currencies.
          </ProofPoint>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.025em] text-balance">A small product with serious boundaries.</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              Ledgerly focuses on one workflow and carries it through authentication, parsing, review, persistence, analytics, export, and tenant isolation.
            </p>
          </div>
          <ol className="divide-y border-y">
            <WorkflowStep number="01" title="Paste raw text" description="Use a single alert or a blank-line-separated batch of transaction snippets." />
            <WorkflowStep number="02" title="Correct the draft" description="Review date, amount, currency, type, balance, category, confidence, and duplicate state." />
            <WorkflowStep number="03" title="Save and understand" description="Filter the private ledger, export CSV, inspect trends, and request aggregate-only insights when configured." />
          </ol>
        </div>
      </section>

      <section className="border-y bg-foreground text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-14 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-200">Ready to inspect the workflow?</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.025em]">Start with an empty, isolated workspace.</h2>
          </div>
          <Button asChild className="h-12 bg-white px-5 text-foreground hover:bg-emerald-50">
            <Link href="/register">Create account <ArrowRight className="size-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>Ledgerly, a portfolio-grade full-stack finance project.</p>
        <p>Next.js · Hono · Better Auth · Prisma · PostgreSQL</p>
      </footer>
    </main>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function ProofPoint({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="py-8 lg:px-8 lg:first:pl-0 lg:last:pr-0">
      <div className="flex size-10 items-center justify-center rounded-md bg-secondary text-primary">{icon}</div>
      <h2 className="mt-5 text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{children}</p>
    </div>
  );
}

function WorkflowStep({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <li className="grid gap-3 py-6 sm:grid-cols-[3rem_12rem_1fr] sm:items-baseline">
      <span className="font-mono text-sm font-semibold text-primary">{number}</span>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </li>
  );
}
