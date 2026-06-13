import Link from "next/link";
import { LockKeyhole, ReceiptText, ShieldCheck } from "lucide-react";
import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  return (
    <main className="grid min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--secondary))_0,transparent_34rem),linear-gradient(180deg,hsl(var(--background)),#fff_48rem)] px-4 py-10 lg:grid-cols-[1fr_minmax(24rem,30rem)] lg:px-12">
      <section className="mx-auto flex w-full max-w-3xl flex-col justify-center py-8 lg:pr-12">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm shadow-emerald-950/20">
            <ReceiptText className="size-5" />
          </div>
          <div>
            <p className="text-2xl font-semibold tracking-normal">Ledgerly</p>
            <p className="text-sm text-muted-foreground">Private finance workspace</p>
          </div>
        </div>
        <div className="max-w-xl">
          <h1 className="text-4xl font-semibold leading-tight text-foreground text-balance">Create your isolated transaction ledger.</h1>
          <p className="mt-4 max-w-prose text-base leading-7 text-muted-foreground">
            Ledgerly creates a personal organization for every user so saved transactions stay bound to the authenticated tenant.
          </p>
        </div>
        <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-card/80 p-4">
            <LockKeyhole className="size-5 text-primary" />
            <p className="mt-3 text-sm font-semibold">Password auth</p>
            <p className="mt-1 text-sm text-muted-foreground">Better Auth handles hashing and seven-day sessions.</p>
          </div>
          <div className="rounded-lg border bg-card/80 p-4">
            <ShieldCheck className="size-5 text-primary" />
            <p className="mt-3 text-sm font-semibold">Private by default</p>
            <p className="mt-1 text-sm text-muted-foreground">Client-supplied ownership fields are never trusted.</p>
          </div>
        </div>
      </section>
      <section className="mx-auto flex w-full max-w-md flex-col justify-center">
        <AuthForm mode="register" />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
