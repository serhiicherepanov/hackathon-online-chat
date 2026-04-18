import { Centrifuge } from "centrifuge";

export type CentrifugeFactoryOptions = {
  wsUrl: string;
};

/**
 * Centrifugo is configured with a connect proxy that validates the browser cookie.
 * The WebSocket is same-origin via Traefik, so session cookies are available.
 */
export function createCentrifuge({ wsUrl }: CentrifugeFactoryOptions): Centrifuge {
  return new Centrifuge(wsUrl, {});
}
