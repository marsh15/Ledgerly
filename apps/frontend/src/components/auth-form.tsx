"use client";

import { AlertCircle, Loader2, LockKeyhole, Mail, Play, UserRound } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [demoPending, setDemoPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const name = String(form.get("name") || email.split("@")[0]);

    try {
      if (mode === "register") {
        await registerAccount({ name, email, password });
      }

      await signInWithCredentials(email, password, mode === "register" ? "Account created" : "Signed in");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  async function onDemo() {
    setDemoPending(true);
    setError(null);

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const email = `demo-${suffix}@ledgerly.demo`;
    const password = `Demo-${suffix}!`;

    try {
      await registerAccount({ name: "Demo User", email, password });
      await signInWithCredentials(email, password, "Demo workspace ready");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start demo";
      setError(message);
      toast.error(message);
    } finally {
      setDemoPending(false);
    }
  }

  async function registerAccount(input: { name: string; email: string; password: string }) {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "Registration failed" }));
      throw new Error(typeof payload.error === "object" ? payload.error.message : payload.error ?? "Registration failed");
    }
  }

  async function signInWithCredentials(email: string, password: string, successMessage: string) {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    });

    if (result?.error) throw new Error("Invalid email or password");

    toast.success(successMessage);
    router.push("/");
    router.refresh();
  }

  return (
    <Card className="border-slate-200/80 bg-card/95 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <CardHeader className="gap-3 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm shadow-emerald-950/20">
            <LockKeyhole className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">Ledgerly</p>
            <CardTitle className="mt-1 text-2xl">{mode === "login" ? "Log in" : "Create account"}</CardTitle>
          </div>
        </div>
        <CardDescription>
          {mode === "login" ? "Continue to your private transaction workspace." : "Create a private organization for your ledger data."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {mode === "register" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="name" name="name" autoComplete="name" placeholder="Asha Demo" className="pl-9" />
              </div>
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" name="email" type="email" autoComplete="email" required placeholder="asha@example.com" className="pl-9" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={8}
                className="pl-9"
              />
            </div>
          </div>
          {error ? (
            <div className="flex gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          ) : null}
          <Button type="submit" disabled={pending || demoPending} className="mt-1 h-11">
            {pending ? <Loader2 data-icon="inline-start" className="size-4 animate-spin" /> : null}
            {mode === "login" ? "Log in" : "Create account"}
          </Button>
          <Button type="button" variant="outline" disabled={pending || demoPending} className="h-11" onClick={onDemo}>
            {demoPending ? <Loader2 data-icon="inline-start" className="size-4 animate-spin" /> : <Play data-icon="inline-start" className="size-4" />}
            Try demo
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
