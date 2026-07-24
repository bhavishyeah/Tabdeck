import { useEffect, useState } from 'react';
import { Cloud, CloudRain, Sun, CloudSnow, Wind } from 'lucide-react';

interface WeatherData {
  temp: number;
  description: string;
  city: string;
  icon: string;
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Try to get location and fetch weather
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Using open-meteo (free, no API key needed)
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`
          );
          const data = await res.json();
          const current = data.current;
          const weatherCode = current.weather_code;

          let description = 'Clear';
          let icon = 'sun';
          if (weatherCode >= 1 && weatherCode <= 3) { description = 'Cloudy'; icon = 'cloud'; }
          if (weatherCode >= 51 && weatherCode <= 67) { description = 'Rainy'; icon = 'rain'; }
          if (weatherCode >= 71 && weatherCode <= 77) { description = 'Snow'; icon = 'snow'; }
          if (weatherCode >= 80 && weatherCode <= 82) { description = 'Showers'; icon = 'rain'; }
          if (weatherCode >= 95) { description = 'Stormy'; icon = 'wind'; }

          setWeather({
            temp: Math.round(current.temperature_2m),
            description,
            city: data.timezone?.split('/')[1]?.replace('_', ' ') || 'Your location',
            icon,
          });
        } catch {
          setError('Failed to load weather');
        }
        setLoading(false);
      },
      () => {
        setError('Location access denied');
        setLoading(false);
      },
      { timeout: 5000 }
    );
  }, []);

  const getIcon = (icon: string) => {
    switch (icon) {
      case 'cloud': return <Cloud size={24} />;
      case 'rain': return <CloudRain size={24} />;
      case 'snow': return <CloudSnow size={24} />;
      case 'wind': return <Wind size={24} />;
      default: return <Sun size={24} />;
    }
  };

  if (loading) {
    return <div className="td-weather-widget"><span className="td-weather-loading">Loading...</span></div>;
  }

  if (error) {
    return <div className="td-weather-widget"><span className="td-weather-error">{error}</span></div>;
  }

  if (!weather) return null;

  return (
    <div className="td-weather-widget">
      <div className="td-weather-icon">{getIcon(weather.icon)}</div>
      <div className="td-weather-info">
        <span className="td-weather-temp">{weather.temp}°C</span>
        <span className="td-weather-desc">{weather.description}</span>
        <span className="td-weather-city">{weather.city}</span>
      </div>
    </div>
  );
}
