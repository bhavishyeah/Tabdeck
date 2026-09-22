import { useCallback, useEffect, useRef, useState } from 'react';
import { Cloud, CloudRain, Sun, CloudSnow, Wind, MapPin, RefreshCw } from 'lucide-react';
import type { WeatherConfig } from '../../lib/workspaceTypes';

interface DayForecast {
  day: string;
  hi: number;
  lo: number;
  icon: string;
}

interface WeatherData {
  temp: number;
  feelsLike: number;
  description: string;
  city: string;
  icon: string;
  forecast: DayForecast[];
}

type WeatherState = 'loading' | 'success' | 'error' | 'denied';

interface Props {
  config?: WeatherConfig;
}

function describeCode(weatherCode: number): { description: string; icon: string } {
  let description = 'Clear sky';
  let icon = 'sun';
  if (weatherCode >= 1 && weatherCode <= 3) { description = 'Partly cloudy'; icon = 'cloud'; }
  if (weatherCode >= 45 && weatherCode <= 48) { description = 'Foggy'; icon = 'cloud'; }
  if (weatherCode >= 51 && weatherCode <= 67) { description = 'Rainy'; icon = 'rain'; }
  if (weatherCode >= 71 && weatherCode <= 77) { description = 'Snowing'; icon = 'snow'; }
  if (weatherCode >= 80 && weatherCode <= 82) { description = 'Showers'; icon = 'rain'; }
  if (weatherCode >= 95) { description = 'Thunderstorm'; icon = 'wind'; }
  return { description, icon };
}

function weekdayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, { weekday: 'short' });
}

export function WeatherWidget({ config }: Props) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [state, setState] = useState<WeatherState>('loading');
  // Layout tier by width: 0 = temp only (no emoji), 1 = today details,
  // 2/3/4 = today details + 1/2/3 forecast days.
  const [tier, setTier] = useState(1);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const unit = config?.unit ?? 'c';
  const manualLat = config?.lat;
  const manualLon = config?.lon;
  const manualLabel = config?.label;
  const hasManualLocation = typeof manualLat === 'number' && typeof manualLon === 'number';

  // Responsive tiers: pick how much to show based on the widget's own width.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      setTier(w >= 340 ? 4 : w >= 270 ? 3 : w >= 210 ? 2 : w >= 130 ? 1 : 0);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fetchWeather = useCallback(
    async (lat: number, lon: number, fallbackCity: string, signal?: AbortSignal) => {
      const tempUnit = unit === 'f' ? '&temperature_unit=fahrenheit' : '';
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,apparent_temperature,weather_code` +
          `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
          `&forecast_days=4&timezone=auto${tempUnit}`,
        signal ? { signal } : undefined
      );
      const data = await res.json();
      const current = data.current;
      const { description, icon } = describeCode(current.weather_code);

      const daily = data.daily ?? {};
      const times: string[] = daily.time ?? [];
      const forecast: DayForecast[] = times.slice(1, 4).map((t: string, i: number) => {
        const idx = i + 1;
        return {
          day: weekdayLabel(t),
          hi: Math.round(daily.temperature_2m_max?.[idx] ?? 0),
          lo: Math.round(daily.temperature_2m_min?.[idx] ?? 0),
          icon: describeCode(daily.weather_code?.[idx] ?? 0).icon,
        };
      });

      return {
        temp: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature ?? current.temperature_2m),
        description,
        city: fallbackCity || data.timezone?.split('/')[1]?.replace(/_/g, ' ') || 'Your location',
        icon,
        forecast,
      } as WeatherData;
    },
    [unit]
  );

  const load = useCallback(
    (signal?: AbortSignal) => {
      setState('loading');
      const apply = (p: Promise<WeatherData>) =>
        p.then((w) => { if (!signal?.aborted) { setWeather(w); setState('success'); } })
         .catch(() => { if (!signal?.aborted) setState('error'); });

      if (hasManualLocation) {
        apply(fetchWeather(manualLat!, manualLon!, manualLabel || 'Location', signal));
        return;
      }
      if (!navigator.geolocation) { setState('error'); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => apply(fetchWeather(pos.coords.latitude, pos.coords.longitude, '', signal)),
        () => { if (!signal?.aborted) setState('denied'); },
        { timeout: 8000 }
      );
    },
    [fetchWeather, hasManualLocation, manualLat, manualLon, manualLabel]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    // load() sets a 'loading' state then fetches; the synchronous setState is
    // intentional (accepted pattern shared with RssWidget).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const getIcon = (icon: string, size = 28) => {
    const props = { size, strokeWidth: 1.5 };
    switch (icon) {
      case 'cloud': return <Cloud {...props} />;
      case 'rain': return <CloudRain {...props} />;
      case 'snow': return <CloudSnow {...props} />;
      case 'wind': return <Wind {...props} />;
      default: return <Sun {...props} />;
    }
  };

  const refreshBtn = (
    <button className="f-weather-refresh" type="button" onClick={() => load()} aria-label="Refresh weather" title="Refresh">
      <RefreshCw size={12} strokeWidth={2} />
    </button>
  );

  if (state === 'loading') {
    return (
      <div className="f-weather f-weather--loading" ref={rootRef}>
        <div className="f-weather-skeleton f-weather-skeleton--icon" />
        <div className="f-weather-skeleton f-weather-skeleton--temp" />
        <div className="f-weather-skeleton f-weather-skeleton--text" />
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <div className="f-weather f-weather--state" ref={rootRef}>
        <MapPin size={20} strokeWidth={1.5} style={{ opacity: 0.5 }} />
        <span className="f-weather-state-text">Location unavailable</span>
        <button className="f-weather-retry" type="button" onClick={() => load()}>
          <RefreshCw size={12} strokeWidth={2} /> Retry
        </button>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="f-weather f-weather--state" ref={rootRef}>
        <Cloud size={20} strokeWidth={1.5} style={{ opacity: 0.5 }} />
        <span className="f-weather-state-text">Weather unavailable</span>
        <button className="f-weather-retry" type="button" onClick={() => load()}>
          <RefreshCw size={12} strokeWidth={2} /> Try again
        </button>
      </div>
    );
  }

  if (!weather) return null;
  const deg = unit === 'f' ? 'F' : 'C';
  const tempOnly = tier === 0;              // minimum: just the temperature
  const forecastDays = Math.max(tier - 1, 0); // tier 1 = 0 days, tier 2 = 1 day, ...
  const shownForecast = weather.forecast.slice(0, forecastDays);
  // At 2+ forecast days lay everything out on one horizontal row.
  const wide = tier >= 3;

  return (
    <div className={`f-weather ${wide ? 'f-weather--wide' : ''}`} ref={rootRef}>
      {refreshBtn}
      <div className="f-weather-current">
        {!tempOnly && <div className="f-weather-icon">{getIcon(weather.icon, 28)}</div>}
        <div className="f-weather-body">
          <span className="f-weather-temp">{weather.temp}°{deg}</span>
          {!tempOnly && <span className="f-weather-desc">{weather.description}</span>}
          {!tempOnly && <span className="f-weather-feels">Feels like {weather.feelsLike}°</span>}
          {!tempOnly && <span className="f-weather-city">{weather.city}</span>}
        </div>
      </div>

      {shownForecast.length > 0 && (
        <div className="f-weather-forecast">
          {shownForecast.map((d) => (
            <div className="f-weather-fc-day" key={d.day}>
              <span className="f-weather-fc-label">{d.day}</span>
              <span className="f-weather-fc-icon">{getIcon(d.icon, 15)}</span>
              <span className="f-weather-fc-temp">{d.hi}°<span className="f-weather-fc-lo">{d.lo}°</span></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
