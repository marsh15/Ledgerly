import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Ledgerly | Private transaction workspace",
    template: "%s | Ledgerly"
  },
  description: "Turn raw bank alerts into reviewed, tenant-scoped transaction records with deterministic parsing and currency-safe analytics.",
  applicationName: "Ledgerly",
  keywords: ["personal finance", "transaction parser", "multi-tenant", "Next.js", "PostgreSQL"],
  openGraph: {
    title: "Ledgerly",
    description: "A private, review-first workspace for turning bank text into an inspectable ledger.",
    type: "website"
  },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
        <Toaster richColors />
      </body>
    </html>
  );
}
