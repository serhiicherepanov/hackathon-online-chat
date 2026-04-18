async function globalSetup() {
  const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3080";
  let res: Response;
  try {
    res = await fetch(`${base}/api/health`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Playwright: cannot reach ${base}/api/health (${msg}). Start the stack: docker compose up`,
    );
  }
  if (!res.ok) {
    throw new Error(
      `Playwright: ${base}/api/health returned ${res.status}. Start the stack: docker compose up`,
    );
  }
}

export default globalSetup;
