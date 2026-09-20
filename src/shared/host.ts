/**
 * The key a site is enabled under. Normal pages use the hostname; local files
 * have no hostname, so they share the single pseudo host "file://" (that is what
 * lets demo/chat.html be enabled from the popup).
 */
export function hostKeyFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "file:") return "file://";
    return parsed.hostname;
  } catch {
    return "";
  }
}
