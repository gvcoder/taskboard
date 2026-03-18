"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { makeQueryClient } from "@/lib/query-client";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  // useState ensures the QueryClient is only created once per component lifecycle
  // and is stable across re-renders, avoiding hydration mismatches
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
