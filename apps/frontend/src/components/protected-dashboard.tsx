import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Dashboard, type DashboardView } from "@/components/dashboard";

export async function ProtectedDashboard({ view }: { view: DashboardView }) {
  const session = await auth();
  const token = session?.backendToken;
  if (!token) redirect(`/login?callbackUrl=/${view}`);

  return <Dashboard token={token} userName={session?.user?.name ?? "there"} view={view} />;
}
