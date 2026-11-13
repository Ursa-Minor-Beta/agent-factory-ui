// Hide the secret token (last path segment) in the displayed URL
export function maskWebhookUrl(url: string) {
  const idx = url.lastIndexOf('/');
  if (idx < 0) return url;
  const token = url.slice(idx + 1);
  return `${url.slice(0, idx + 1)}${token.slice(0, 4)}••••`;
}

// Relative webhook paths are resolved against the current origin
export const toAbsoluteUrl = (url: string) =>
  /^https?:\/\//i.test(url) ? url : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;

export const hasHandler = (handler: string | null | undefined) => !!handler?.trim();

// Inserted by "Add handler" / "Custom" source
export const HANDLER_SKELETON = `async function handle(request, ctx) {
  return {
    run: { input: { body: request.body } },
  };
}
`;
