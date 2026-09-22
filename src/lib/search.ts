/**
 * search — helpers for the toolbar search box's "search the web on Enter"
 * behaviour. Kept tiny and dependency-free so it can be shared by the search
 * input and the Settings UI.
 */
export type SearchEngine = 'google' | 'duckduckgo' | 'bing' | 'brave';

interface EngineDef {
  id: SearchEngine;
  label: string;
  /** Query URL with `%s` replaced by the URL-encoded search term. */
  template: string;
}

export const SEARCH_ENGINES: EngineDef[] = [
  { id: 'google', label: 'Google', template: 'https://www.google.com/search?q=%s' },
  { id: 'duckduckgo', label: 'DuckDuckGo', template: 'https://duckduckgo.com/?q=%s' },
  { id: 'bing', label: 'Bing', template: 'https://www.bing.com/search?q=%s' },
  { id: 'brave', label: 'Brave', template: 'https://search.brave.com/search?q=%s' },
];

/**
 * Whether the given text looks like a URL/host the user probably wants to
 * navigate to directly rather than search for. Matches things like
 * "github.com", "https://x.com/y", "localhost:3000".
 */
export function looksLikeUrl(text: string): boolean {
  const t = text.trim();
  if (!t || /\s/.test(t)) return false; // has whitespace → treat as a query
  if (/^https?:\/\//i.test(t)) return true;
  if (/^localhost(:\d+)?(\/.*)?$/i.test(t)) return true;
  // domain.tld with an optional path, e.g. example.com or example.co.uk/page
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/.*)?$/i.test(t);
}

/** Build the destination URL for a search-box submission. */
export function buildSearchUrl(text: string, engine: SearchEngine): string {
  const term = text.trim();
  if (looksLikeUrl(term)) {
    return /^https?:\/\//i.test(term) ? term : `https://${term}`;
  }
  const def = SEARCH_ENGINES.find((e) => e.id === engine) ?? SEARCH_ENGINES[0];
  return def.template.replace('%s', encodeURIComponent(term));
}
