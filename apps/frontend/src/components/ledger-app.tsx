import { LedgerShell } from "./ledger-shell";
import { ImportScreen } from "@/features/ledger/import-screen";
import { OverviewScreen } from "@/features/ledger/overview-screen";
import { RulesScreen } from "@/features/ledger/rules-screen";
import { TransactionsScreen } from "@/features/ledger/transactions-screen";
import type { LedgerSection } from "@/features/ledger/types";

export function LedgerApp({ section, token, userId, userName }: { section: LedgerSection; token: string; userId: string; userName: string }) {
  return <LedgerShell active={section} userId={userId} userName={userName}>
    {section === "overview" ? <OverviewScreen token={token} userId={userId} /> : null}
    {section === "transactions" ? <TransactionsScreen token={token} userId={userId} /> : null}
    {section === "import" ? <ImportScreen token={token} userId={userId} /> : null}
    {section === "rules" ? <RulesScreen token={token} userId={userId} /> : null}
  </LedgerShell>;
}
