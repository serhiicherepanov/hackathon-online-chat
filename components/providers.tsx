"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Centrifuge } from "centrifuge";
import { createCentrifuge } from "@/lib/centrifuge";
import { useConnectionStore } from "@/lib/stores/connection-store";

const CentrifugeContext = createContext<Centrifuge | null>(null);

export function useCentrifuge(): Centrifuge | null {
  return useContext(CentrifugeContext);
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  const centrifugeRef = useRef<Centrifuge | null>(null);
  const [centrifuge, setCentrifuge] = useState<Centrifuge | null>(null);
  const setConnectionState = useConnectionStore((s) => s.setState);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_CENTRIFUGO_WS_URL;
    if (!wsUrl) return;

    const instance = createCentrifuge({ wsUrl });
    centrifugeRef.current = instance;
    setCentrifuge(instance);

    instance.on("connecting", () => setConnectionState("connecting"));
    instance.on("connected", () => setConnectionState("connected"));
    instance.on("disconnected", () => setConnectionState("disconnected"));

    setConnectionState("connecting");
    instance.connect();

    return () => {
      instance.disconnect();
      centrifugeRef.current = null;
      setCentrifuge(null);
      setConnectionState("disconnected");
    };
  }, [setConnectionState]);

  return (
    <QueryClientProvider client={queryClient}>
      <CentrifugeContext.Provider value={centrifuge}>
        {children}
      </CentrifugeContext.Provider>
    </QueryClientProvider>
  );
}
