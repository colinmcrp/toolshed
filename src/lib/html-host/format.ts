/**
 * Format a byte count into a human-readable string.
 * Consistent with the inline version in secure-zip-creator.tsx.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  // Use toFixed(1) for KB and above to preserve the decimal (e.g. "1.0 KB"),
  // but for plain bytes keep it as an integer.
  if (i === 0) return bytes + " B";
  return (bytes / Math.pow(k, i)).toFixed(1) + " " + sizes[i];
}

/**
 * Return a plain-English relative time string for a given ISO date string.
 * Examples: "just now", "5 min ago", "2 hr ago", "3 days ago".
 */
export function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) {
    return "just now";
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }

  // Fallback to locale date string for older dates.
  // Pin to en-GB so server and client produce the same output (avoids SSR hydration mismatch).
  return new Date(iso).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}
