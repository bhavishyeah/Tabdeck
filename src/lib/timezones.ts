/**
 * IANA timezone list via Intl.supportedValuesOf('timeZone') with a small
 * fallback for engines that don't expose it. Used by the clock timezone picker.
 */
const FALLBACK = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Africa/Cairo', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Shanghai',
  'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney', 'Pacific/Auckland',
];

let cache: string[] | null = null;

function allZones(): string[] {
  if (cache) return cache;
  try {
    const withValues = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
    cache = withValues.supportedValuesOf ? withValues.supportedValuesOf('timeZone') : FALLBACK;
  } catch {
    cache = FALLBACK;
  }
  return cache;
}

/** Filter timezones by a free-text query (matches city or region, case-insensitive). */
export function searchTimezones(query: string): { value: string; label: string; sublabel?: string }[] {
  const q = query.trim().toLowerCase();
  const zones = allZones();
  const matched = q
    ? zones.filter((z) => z.toLowerCase().replace(/_/g, ' ').includes(q))
    : zones.slice(0, 12);
  return matched.map((z) => ({
    value: z,
    label: z.replace(/_/g, ' '),
    sublabel: currentTimeIn(z),
  }));
}

/** Current local time string in the given zone, e.g. "3:42 PM". */
export function currentTimeIn(tz: string): string {
  try {
    return new Intl.DateTimeFormat([], { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date());
  } catch {
    return '';
  }
}
