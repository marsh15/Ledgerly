import { ProtectedDashboard } from "@/components/protected-dashboard";

export default function TransactionsPage() {
  return <ProtectedDashboard view="transactions" />;
}
