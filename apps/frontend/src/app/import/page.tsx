import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LedgerApp } from "@/components/ledger-app";

export default async function ImportPage() {
  const session = await auth();
  if (!session?.backendToken || !session.user?.id) redirect("/login");
  return <LedgerApp section="import" token={session.backendToken} userId={session.user.id} userName={session.user.name ?? "Account"} />;
}
