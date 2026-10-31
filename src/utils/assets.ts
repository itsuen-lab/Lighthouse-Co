/**
 * Converts any Google Drive sharing, view, or download link into a high-performance,
 * fast-loading thumbnail URL:
 * https://drive.google.com/thumbnail?id={FILE_ID}&sz=w1920
 *
 * Supported link formats:
 * - https://drive.google.com/file/d/{FILE_ID}/view?usp=sharing
 * - https://drive.google.com/file/d/{FILE_ID}/...
 * - https://drive.google.com/open?id={FILE_ID}
 * - https://drive.google.com/uc?id={FILE_ID}
 * - https://drive.google.com/thumbnail?id={FILE_ID}
 * - docs.google.com equivalents
 */
export function formatGoogleDriveImageUrl(url?: string, sz: string = "w1920"): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.replace(/^['"]|['"]$/g, "").trim();

  // If not a Google Drive / Docs URL, return untouched
  if (!trimmed.includes("drive.google.com") && !trimmed.includes("docs.google.com")) {
    return trimmed;
  }

  let fileId = "";

  // 1. Matches /file/d/{FILE_ID}
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    fileId = fileDMatch[1];
  }

  // 2. Matches ?id={FILE_ID} or &id={FILE_ID}
  if (!fileId) {
    const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idParamMatch && idParamMatch[1]) {
      fileId = idParamMatch[1];
    }
  }

  // 3. Matches /d/{FILE_ID}
  if (!fileId) {
    const dMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (dMatch && dMatch[1]) {
      fileId = dMatch[1];
    }
  }

  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=${sz}`;
  }

  return trimmed;
}

/**
 * Resolves static asset paths so they work reliably on any deployment target:
 * - Local dev server
 * - AI Studio preview
 * - GitHub Pages (both root domain and /repository-name/ subpaths)
 * - Custom domain deployments
 * Also auto-converts Google Drive share links into fast-loading thumbnail URLs.
 */
export function resolveAssetUrl(url?: string): string {
  if (!url) return "";
  const trimmed = url.trim();

  // Auto-normalize Google Drive URLs to fast thumbnail format
  const normalized = formatGoogleDriveImageUrl(trimmed);

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:")
  ) {
    return normalized;
  }
  const cleanPath = normalized.replace(/^\/+/, "");
  const base = import.meta.env.BASE_URL || "./";
  const cleanBase = base.endsWith("/") ? base : `${base}/`;
  return `${cleanBase}${cleanPath}`;
}

