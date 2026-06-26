import type { ReactNode } from "react";

export function ScreenHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
    <div><h1 className="text-[2rem] font-semibold tracking-[-0.045em]">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
    {action}
  </div>;
}

export function LoadingBlock() {
  return <div className="space-y-3" aria-label="Loading"><div className="h-24 animate-pulse rounded-md bg-slate-100" /><div className="h-64 animate-pulse rounded-md bg-slate-100" /></div>;
}

export function ErrorBlock({ message }: { message: string }) {
  return <div role="alert" className="border border-red-200 bg-red-50 p-5 text-sm text-red-800"><p className="font-semibold">Something went wrong</p><p className="mt-1">{message}</p></div>;
}

export function money(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: currencyCode, maximumFractionDigits: 2 }).format(value);
}
