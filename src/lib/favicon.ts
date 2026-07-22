export function getFaviconUrl(url?: string, size = 32) {
  if (!url) return '';
  return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url)}&sz=${size}`;
}