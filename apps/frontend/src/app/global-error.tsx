"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Application error", { digest: error.digest }); }, [error]);
  return <html lang="en"><body><main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}><section style={{ maxWidth: 440, textAlign: "center" }}><h1>Ledgerly is temporarily unavailable</h1><p>Reload the application or return to your account in a moment.</p><button onClick={reset}>Reload Ledgerly</button> <a href="/overview">Go to overview</a></section></main></body></html>;
}
