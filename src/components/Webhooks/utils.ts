// Hide the secret token (last path segment) in the displayed URL
export function maskWebhookUrl(url: string) {
  const idx = url.lastIndexOf('/');
  if (idx < 0) return url;
  const token = url.slice(idx + 1);
  return `${url.slice(0, idx + 1)}${token.slice(0, 4)}••••`;
}

export const hasHandler = (handler: string | null | undefined) => !!handler?.trim();

// Inserted by "Add handler" / "Custom" source
export const HANDLER_SKELETON = `async function handle(request, ctx) {
  return {
    run: { input: { body: request.body } },
  };
}
`;

export const HANDLER_CONTRACT = `// request: { method, headers (lower-case), query, body (parsed JSON/form/text), rawBody }
// ctx: { secrets, vars, hmacSha256(secret, data), safeEqual(a, b), now() }
async function handle(request, ctx) {
  return {
    run: { input: { ... } },                 // omit -> no run is started
    response: { status, headers, body },     // default: 202 { runId }, or 200 if no run
    dedupeKey: '...',                        // repeats within 10 minutes don't start runs
  };
}`;
