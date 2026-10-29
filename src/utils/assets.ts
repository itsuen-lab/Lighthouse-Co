/**
 * Resolves static asset paths so they work reliably on any deployment target:
 * - Local dev server
 * - AI Studio preview
 * - GitHub Pages (both root domain and /repository-name/ subpaths)
 * - Custom domain deployments
 */
export function resolveAssetUrl(url?: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  const cleanPath = trimmed.replace(/^\/+/, "");
  const base = import.meta.env.BASE_URL || "./";
  const cleanBase = base.endsWith("/") ? base : `${base}/`;
  return `${cleanBase}${cleanPath}`;
}
