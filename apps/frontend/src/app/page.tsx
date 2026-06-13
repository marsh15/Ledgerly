import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Dashboard } from "@/components/dashboard";

export default async function HomePage() {
  const session = await auth();
  if (!session?.backendToken) redirect("/login");

  return <Dashboard token={session.backendToken} userName={session.user?.name ?? "there"} />;
}
