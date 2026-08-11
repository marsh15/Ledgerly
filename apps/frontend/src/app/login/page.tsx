import Link from "next/link";
import { ReceiptText, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthForm } from "@/components/auth-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.backendToken) redirect("/overview");

  return (
    <main className="grid min-h-screen bg-background px-4 py-10 lg:grid-cols-[1fr_minmax(24rem,30rem)] lg:px-12">
      <section className="mx-auto flex w-full max-w-3xl flex-col justify-center py-8 lg:pr-12">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm shadow-emerald-950/20">
            <ReceiptText className="size-5" />
          </div>
          <div>
            <p className="text-2xl font-semibold tracking-normal">Ledgerly</p>
            <p className="text-sm text-muted-foreground">Secure transaction extraction</p>
          </div>
        </div>
        <div className="max-w-xl">
          <h1 className="text-4xl font-semibold leading-tight tracking-[-0.025em] text-foreground text-balance">Turn raw bank text into a private ledger.</h1>
          <p className="mt-4 max-w-prose text-base leading-7 text-muted-foreground">
            Paste transaction snippets, save structured records, and keep every row scoped to your own authenticated workspace.
          </p>
        </div>
        <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-card/80 p-4">
            <ShieldCheck className="size-5 text-primary" />
            <p className="mt-3 text-sm font-semibold">Tenant isolated</p>
            <p className="mt-1 text-sm text-muted-foreground">Ownership is derived from verified auth context.</p>
          </div>
          <div className="rounded-lg border bg-card/80 p-4">
            <ReceiptText className="size-5 text-primary" />
            <p className="mt-3 text-sm font-semibold">Deterministic parser</p>
            <p className="mt-1 text-sm text-muted-foreground">No bank linking, OCR, or external extraction calls.</p>
          </div>
        </div>
      </section>
      <section className="mx-auto flex w-full max-w-md flex-col justify-center">
        <AuthForm mode="login" />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
