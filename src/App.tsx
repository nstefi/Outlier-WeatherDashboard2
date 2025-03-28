import React, { useState, useEffect } from 'react';
import { Search, MapPin, Thermometer, Wind, Droplets, Sun, Cloud, CloudRain, Compass, Clock, Gauge } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { config } from './config';

interface Weather {
  city: string;
  temp: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  windSpeed: number;
  windDeg: number;
  pressure: number;
  visibility: number;
  description: string;
  icon: string;
  sunrise: number;
  sunset: number;
}

interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

function App() {
  const [searchCity, setSearchCity] = useState('London');
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchWeather = async (searchCity: string) => {
    if (!searchCity) return;
    
    try {
      setLoading(true);
      setError('');
      
      // First, get coordinates for the city
      const geocodingResponse = await fetch(
        `${config.weatherApi.geocodingUrl}/search?name=${searchCity}&count=1&language=en&format=json`
      );
      
      if (!geocodingResponse.ok) {
        throw new Error('City not found');
      }
      
      const geocodingData = await geocodingResponse.json();
      if (!geocodingData.results?.length) {
        throw new Error('City not found');
      }
      
      const location: GeocodingResult = geocodingData.results[0];
      
      // Then fetch weather data using coordinates
      const weatherResponse = await fetch(
        `${config.weatherApi.baseUrl}/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,pressure_msl&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min&timezone=auto`
      );
      
      if (!weatherResponse.ok) {
        throw new Error('Failed to fetch weather data');
      }
      
      const data = await weatherResponse.json();
      
      setWeather({
        city: `${location.name}, ${location.country}`,
        temp: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(data.current.apparent_temperature),
        tempMin: Math.round(data.daily.temperature_2m_min[0]),
        tempMax: Math.round(data.daily.temperature_2m_max[0]),
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m),
        windDeg: Math.round(data.current.wind_direction_10m),
        pressure: Math.round(data.current.pressure_msl),
        visibility: 10, // Open-Meteo doesn't provide visibility in free tier
        description: getWeatherDescription(data.current.temperature_2m, data.current.relative_humidity_2m),
        icon: getIconCode(data.current.temperature_2m, data.current.relative_humidity_2m),
        sunrise: 0,
        sunset: 0
      });
      
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine weather description based on temperature and humidity
  const getWeatherDescription = (temp: number, humidity: number) => {
    if (humidity > 80) return 'Humid';
    if (temp > 30) return 'Hot';
    if (temp < 10) return 'Cold';
    return 'Moderate';
  };

  // Helper function to determine icon based on temperature and humidity
  const getIconCode = (temp: number, humidity: number) => {
    if (humidity > 80) return '09d';
    if (temp > 30) return '01d';
    if (temp < 10) return '13d';
    return '02d';
  };

  useEffect(() => {
    if (searchCity) {
      fetchWeather(searchCity);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWeather(searchCity);
  };

  const convertTemp = (temp: number, to: 'C' | 'F') => {
    if (to === 'F') {
      return Math.round((temp * 9/5) + 32);
    }
    return temp;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getWeatherIcon = (iconCode: string, size = 'w-16 h-16') => {
    if (iconCode.includes('01')) return <Sun className={`${size} text-yellow-500`} />;
    if (iconCode.includes('02')) return <Cloud className={`${size} text-gray-400`} />;
    if (iconCode.includes('03') || iconCode.includes('04')) return <Cloud className={`${size} text-gray-600`} />;
    if (iconCode.includes('09') || iconCode.includes('10')) return <CloudRain className={`${size} text-blue-500`} />;
    return <Cloud className={size} />;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Sun className="w-8 h-8 text-yellow-500" />
          <h1 className="text-2xl font-bold">Weather Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="bg-gray-800 rounded-xl p-6">
            <form onSubmit={handleSubmit} className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  placeholder="Enter city name..."
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </form>

            <div className="space-y-4 mb-6">
              <h3 className="font-semibold">Temperature Unit</h3>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={unit === 'C'}
                    onChange={() => setUnit('C')}
                    className="mr-2"
                  />
                  Celsius (°C)
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={unit === 'F'}
                    onChange={() => setUnit('F')}
                    className="mr-2"
                  />
                  Fahrenheit (°F)
                </label>
              </div>
            </div>

            {lastUpdated && (
              <div className="text-sm text-gray-400 mb-6">
                Last updated: {lastUpdated}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm text-gray-400">Scan QR code to check the app on your mobile:</p>
              <div className="bg-white p-4 rounded-lg inline-block">
                <QRCodeSVG
                  value="https://outlier-weatherdashboard.netlify.app/"
                  size={150}
                  level="L"
                  includeMargin={false}
                />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            )}

            {error && (
              <div className="text-red-500 text-center py-4 bg-gray-800 rounded-xl">
                {error}
              </div>
            )}

            {weather && !loading && (
              <>
                {/* Current Weather */}
                <div className="bg-gray-800 rounded-xl p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <MapPin className="w-5 h-5" />
                        <h2 className="text-xl">Current Weather in {weather.city}</h2>
                      </div>
                      <div className="flex items-center gap-6">
                        {getWeatherIcon(weather.icon)}
                        <div>
                          <div className="text-5xl font-bold">
                            {convertTemp(weather.temp, unit)}°{unit}
                          </div>
                          <p className="text-gray-400 capitalize">{weather.description}</p>
                          <p className="text-sm text-gray-400">
                            Feels like {convertTemp(weather.feelsLike, unit)}°{unit}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                          <Thermometer className="w-4 h-4" />
                          <span>Min/Max</span>
                        </div>
                        <div className="text-lg">
                          {convertTemp(weather.tempMin, unit)}°/{convertTemp(weather.tempMax, unit)}°{unit}
                        </div>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                          <Wind className="w-4 h-4" />
                          <span>Wind</span>
                        </div>
                        <div className="text-lg">
                          {weather.windSpeed} m/s
                          <div className="text-sm text-gray-400">Direction: {weather.windDeg}°</div>
                        </div>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                          <Droplets className="w-4 h-4" />
                          <span>Humidity</span>
                        </div>
                        <div className="text-lg">{weather.humidity}%</div>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                          <Gauge className="w-4 h-4" />
                          <span>Pressure</span>
                        </div>
                        <div className="text-lg">{weather.pressure} hPa</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;