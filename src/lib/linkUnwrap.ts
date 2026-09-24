/**
 * linkUnwrap
 *
 * Many links that arrive via VOLT (sent by other users, or captured through
 * FRONTLY's "Send to VOLT" context menu) are not the real destination — they
 * are a wrapper/redirect URL from a search engine, social network, or
 * tracking service that embeds the real URL in a query parameter.
 *
 * This is defense-in-depth: even though FRONTLY's own context menu now
 * unwraps Google Images links before sending, incoming links from other
 * VOLT users/clients are outside our control. Unwrapping at display/open
 * time protects the whole widget regardless of where a link came from.
 *
 * Each entry matches a hostname (+ optional path) and names the query
 * parameter that holds the real URL.
 */

interface WrapperRule {
  /** Hostname to match (without protocol). Matched via endsWith so subdomains work. */
  host: string;
  /** Optional exact pathname to require (e.g. Google's '/imgres' viewer). */
  path?: string;
  /** Query parameter that holds the real destination URL. */
  param: string;
}

const WRAPPER_RULES: WrapperRule[] = [
  // Google Images "view image" wrapper: google.com/imgres?imgurl=<real>&imgrefurl=...
  { host: 'google.com', path: '/imgres', param: 'imgurl' },
  // Google general redirect/search click-through: google.com/url?q=<real>
  { host: 'google.com', path: '/url', param: 'q' },
  // Facebook link shim: l.facebook.com/l.php?u=<real>
  { host: 'l.facebook.com', param: 'u' },
  // Bing image "view image": bing.com/images/search?...&mediaurl=<real>
  { host: 'bing.com', param: 'mediaurl' },
  // Duck Duck Go redirect: duckduckgo.com/l/?uddg=<real>
  { host: 'duckduckgo.com', param: 'uddg' },
  // LinkedIn external redirect: linkedin.com/redir/redirect?url=<real>
  { host: 'linkedin.com', param: 'url' },
  // Twitter/X link shortener redirect page (t.co resolves server-side, but
  // some clients expose the real URL via a query param on share screens)
  { host: 'x.com', path: '/redirect', param: 'url' },
];

/**
 * Return the real destination URL if `url` matches a known wrapper pattern,
 * otherwise return it unchanged. Never throws — invalid URLs pass through.
 */
export function unwrapLinkUrl(url: string): string {
  if (!url) return url;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  for (const rule of WRAPPER_RULES) {
    if (!parsed.hostname.endsWith(rule.host)) continue;
    if (rule.path && parsed.pathname !== rule.path) continue;
    const real = parsed.searchParams.get(rule.param);
    if (real) {
      // The extracted value is itself a URL-encoded string in most cases;
      // URLSearchParams already decodes it. Validate it parses as a URL
      // before trusting it — otherwise fall through to the original.
      try {
        new URL(real);
        return real;
      } catch {
        continue;
      }
    }
  }

  return url;
}

/**
 * True if `url` looks like an unresolved wrapper link (matches a known
 * pattern but we couldn't extract a valid inner URL, or it's a raw data URI).
 * Used to decide whether to show a "this link may not work as expected" hint.
 */
export function isLikelyWrapperUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('data:')) return true;
  const unwrapped = unwrapLinkUrl(url);
  return unwrapped !== url && unwrapped.length < url.length;
}
