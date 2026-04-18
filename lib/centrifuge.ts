import { Centrifuge } from "centrifuge";

export type CentrifugeFactoryOptions = {
  wsUrl: string;
  tokenEndpoint?: string;
};

export function createCentrifuge({
  wsUrl,
  tokenEndpoint = "/api/centrifugo/connect",
}: CentrifugeFactoryOptions): Centrifuge {
  const centrifuge = new Centrifuge(wsUrl, {
    getToken: async () => {
      const res = await fetch(tokenEndpoint, { method: "POST" });
      if (!res.ok) {
        throw new Error(`Failed to fetch Centrifugo token: ${res.status}`);
      }
      const body = (await res.json()) as { token: string };
      return body.token;
    },
  });
  return centrifuge;
}
