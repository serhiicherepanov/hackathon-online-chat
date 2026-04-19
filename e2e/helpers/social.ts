import type { APIRequestContext, BrowserContext } from "@playwright/test";
import { expect, request as pwRequest } from "@playwright/test";
import { e2eBaseURL } from "./auth";

export async function authedApi(browserContext: BrowserContext) {
  return pwRequest.newContext({
    baseURL: e2eBaseURL(),
    storageState: await browserContext.storageState(),
  });
}

export async function getMe(api: APIRequestContext) {
  const res = await api.get("/api/auth/me");
  expect(res.ok()).toBeTruthy();
  const json = (await res.json()) as {
    user: { id: string; email: string; username: string; createdAt: string };
  };
  return json.user;
}

/**
 * R2 gates `POST /api/dm/:username` behind an accepted friendship. Any
 * pre-R2 test that opens a DM between two fresh users must call this first
 * or the DM endpoint will return 403 `friendship_required` and the UI flow
 * (`New DM` dialog) will silently fail.
 */
export async function createAcceptedFriendship(
  requesterApi: APIRequestContext,
  recipientApi: APIRequestContext,
  recipientUserId: string,
) {
  const createRes = await requesterApi.post("/api/friends/requests", {
    headers: { "Content-Type": "application/json" },
    data: { userId: recipientUserId },
  });
  expect(createRes.status()).toBe(201);

  const snapshotRes = await recipientApi.get("/api/friends");
  expect(snapshotRes.ok()).toBeTruthy();
  const snapshot = (await snapshotRes.json()) as {
    inboundRequests: { friendshipId: string }[];
  };
  const requestId = snapshot.inboundRequests[0]?.friendshipId;
  expect(requestId).toBeTruthy();

  const acceptRes = await recipientApi.post(
    `/api/friends/requests/${requestId}/accept`,
  );
  expect(acceptRes.status()).toBe(200);
}

/**
 * Convenience: given two browser contexts that are each already signed in,
 * make them accepted friends of each other. Use from legacy DM-bearing
 * tests (r0 13.3, etc.) to satisfy the R2 friendship gate.
 */
export async function befriendContexts(
  requesterCtx: BrowserContext,
  recipientCtx: BrowserContext,
) {
  const apiA = await authedApi(requesterCtx);
  const apiB = await authedApi(recipientCtx);
  try {
    const recipient = await getMe(apiB);
    await createAcceptedFriendship(apiA, apiB, recipient.id);
  } finally {
    await apiA.dispose();
    await apiB.dispose();
  }
}
