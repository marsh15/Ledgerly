"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Route error", { digest: error.digest }); }, [error]);
  return <main className="grid min-h-screen place-items-center bg-background p-6"><section className="max-w-md border bg-white p-8 text-center"><h1 className="text-xl font-semibold">Something went wrong</h1><p className="mt-2 text-sm text-muted-foreground">Ledgerly could not load this page. Your data was not changed.</p><div className="mt-6 flex justify-center gap-3"><Button onClick={reset}>Try again</Button><Button variant="outline" asChild><Link href="/overview">Go to overview</Link></Button></div></section></main>;
}
