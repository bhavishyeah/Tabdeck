import { useEffect, useState } from 'react';
import { Cloud, CloudRain, Sun, CloudSnow, Wind, MapPin, RefreshCw } from 'lucide-react';
import type { WeatherConfig } from '../../lib/workspaceTypes';

interface WeatherData {
  temp: number;
  description: string;
  city: string;
  icon: string;
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

export function WeatherWidget({ config }: Props) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [state, setState] = useState<WeatherState>('loading');

  const unit = config?.unit ?? 'c';
  const manualLat = config?.lat;
  const manualLon = config?.lon;
  const manualLabel = config?.label;
  const hasManualLocation = typeof manualLat === 'number' && typeof manualLon === 'number';

  useEffect(() => {
    let cancelled = false;

    const loadForCoords = async (lat: number, lon: number, fallbackCity: string) => {
      try {
        const tempUnit = unit === 'f' ? '&temperature_unit=fahrenheit' : '';
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto${tempUnit}`
        );
        const data = await res.json();
        if (cancelled) return;
        const current = data.current;
        const { description, icon } = describeCode(current.weather_code);
        setWeather({
          temp: Math.round(current.temperature_2m),
          description,
          city: fallbackCity || data.timezone?.split('/')[1]?.replace(/_/g, ' ') || 'Your location',
          icon,
        });
        setState('success');
      } catch {
        if (!cancelled) setState('error');
      }
    };

    setState('loading');

    // Manual location bypasses geolocation entirely
    if (hasManualLocation) {
      loadForCoords(manualLat!, manualLon!, manualLabel || 'Location');
      return () => { cancelled = true; };
    }

    if (!navigator.geolocation) {
      setState('error');
      return () => { cancelled = true; };
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        loadForCoords(latitude, longitude, '');
      },
      () => { if (!cancelled) setState('denied'); },
      { timeout: 8000 }
    );

    return () => { cancelled = true; };
    // Re-fetch when unit or manual location changes
  }, [unit, manualLat, manualLon, manualLabel, hasManualLocation]);

  const retry = () => {
    // Force a re-run by toggling state; the effect re-fires on state? No —
    // simplest: re-request geolocation directly.
    setState('loading');
    if (hasManualLocation) {
      const tempUnit = unit === 'f' ? '&temperature_unit=fahrenheit' : '';
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${manualLat}&longitude=${manualLon}&current=temperature_2m,weather_code&timezone=auto${tempUnit}`)
        .then((r) => r.json())
        .then((data) => {
          const { description, icon } = describeCode(data.current.weather_code);
          setWeather({ temp: Math.round(data.current.temperature_2m), description, city: manualLabel || 'Location', icon });
          setState('success');
        })
        .catch(() => setState('error'));
      return;
    }
    if (!navigator.geolocation) { setState('error'); return; }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const tempUnit = unit === 'f' ? '&temperature_unit=fahrenheit' : '';
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto${tempUnit}`);
          const data = await res.json();
          const { description, icon } = describeCode(data.current.weather_code);
          setWeather({ temp: Math.round(data.current.temperature_2m), description, city: data.timezone?.split('/')[1]?.replace(/_/g, ' ') || 'Your location', icon });
          setState('success');
        } catch { setState('error'); }
      },
      () => setState('denied'),
      { timeout: 8000 }
    );
  };

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

  if (state === 'loading') {
    return (
      <div className="f-weather f-weather--loading">
        <div className="f-weather-skeleton f-weather-skeleton--icon" />
        <div className="f-weather-skeleton f-weather-skeleton--temp" />
        <div className="f-weather-skeleton f-weather-skeleton--text" />
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <div className="f-weather f-weather--state">
        <MapPin size={20} strokeWidth={1.5} style={{ opacity: 0.5 }} />
        <span className="f-weather-state-text">Location unavailable</span>
        <button className="f-weather-retry" type="button" onClick={retry}>
          <RefreshCw size={12} strokeWidth={2} /> Retry
        </button>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="f-weather f-weather--state">
        <Cloud size={20} strokeWidth={1.5} style={{ opacity: 0.5 }} />
        <span className="f-weather-state-text">Weather unavailable</span>
        <button className="f-weather-retry" type="button" onClick={retry}>
          <RefreshCw size={12} strokeWidth={2} /> Try again
        </button>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="f-weather">
      <div className="f-weather-icon">{getIcon(weather.icon)}</div>
      <div className="f-weather-body">
        <span className="f-weather-temp">{weather.temp}°{unit === 'f' ? 'F' : 'C'}</span>
        <span className="f-weather-desc">{weather.description}</span>
        <span className="f-weather-city">{weather.city}</span>
      </div>
    </div>
  );
}
