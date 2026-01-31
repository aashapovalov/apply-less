/**
 * Decode HTML entities (e.g., &lt; -> <, &gt; -> >, &amp; -> &)
 */
export function decodeHtmlEntities(html: string): string {
  if (!html) return "";
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
