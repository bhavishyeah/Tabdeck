import { useEffect, useState } from 'react';
import { Cloud, CloudRain, Sun, CloudSnow, Wind, MapPin, RefreshCw } from 'lucide-react';

interface WeatherData {
  temp: number;
  description: string;
  city: string;
  icon: string;
}

type WeatherState = 'loading' | 'success' | 'error' | 'denied';

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [state, setState] = useState<WeatherState>('loading');

  const fetchWeather = () => {
    setState('loading');

    if (!navigator.geolocation) {
      setState('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`
          );
          const data = await res.json();
          const current = data.current;
          const weatherCode = current.weather_code;

          let description = 'Clear sky';
          let icon = 'sun';
          if (weatherCode >= 1 && weatherCode <= 3) { description = 'Partly cloudy'; icon = 'cloud'; }
          if (weatherCode >= 45 && weatherCode <= 48) { description = 'Foggy'; icon = 'cloud'; }
          if (weatherCode >= 51 && weatherCode <= 67) { description = 'Rainy'; icon = 'rain'; }
          if (weatherCode >= 71 && weatherCode <= 77) { description = 'Snowing'; icon = 'snow'; }
          if (weatherCode >= 80 && weatherCode <= 82) { description = 'Showers'; icon = 'rain'; }
          if (weatherCode >= 95) { description = 'Thunderstorm'; icon = 'wind'; }

          setWeather({
            temp: Math.round(current.temperature_2m),
            description,
            city: data.timezone?.split('/')[1]?.replace(/_/g, ' ') || 'Your location',
            icon,
          });
          setState('success');
        } catch {
          setState('error');
        }
      },
      () => setState('denied'),
      { timeout: 8000 }
    );
  };

  useEffect(() => { fetchWeather(); }, []);

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

  // Loading skeleton
  if (state === 'loading') {
    return (
      <div className="f-weather f-weather--loading">
        <div className="f-weather-skeleton f-weather-skeleton--icon" />
        <div className="f-weather-skeleton f-weather-skeleton--temp" />
        <div className="f-weather-skeleton f-weather-skeleton--text" />
      </div>
    );
  }

  // Location denied
  if (state === 'denied') {
    return (
      <div className="f-weather f-weather--state">
        <MapPin size={20} strokeWidth={1.5} style={{ opacity: 0.5 }} />
        <span className="f-weather-state-text">Location unavailable</span>
        <button className="f-weather-retry" type="button" onClick={fetchWeather}>
          <RefreshCw size={12} strokeWidth={2} /> Retry
        </button>
      </div>
    );
  }

  // Error
  if (state === 'error') {
    return (
      <div className="f-weather f-weather--state">
        <Cloud size={20} strokeWidth={1.5} style={{ opacity: 0.5 }} />
        <span className="f-weather-state-text">Weather unavailable</span>
        <button className="f-weather-retry" type="button" onClick={fetchWeather}>
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
        <span className="f-weather-temp">{weather.temp}°</span>
        <span className="f-weather-desc">{weather.description}</span>
        <span className="f-weather-city">{weather.city}</span>
      </div>
    </div>
  );
}
