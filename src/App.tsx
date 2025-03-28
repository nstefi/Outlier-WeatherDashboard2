import React from 'react';
import { Search, MapPin, Thermometer, Wind, Droplets, Gauge, Sun, Clock, Cloud } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
  description: string;
  sunrise: string;
  sunset: string;
  forecast: Array<{
    date: string;
    temp: number;
    description: string;
    humidity: number;
  }>;
  hourlyData: Array<{
    time: string;
    temp: number;
    feelsLike: number;
  }>;
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
  const [searchCity, setSearchCity] = React.useState('Toronto');
  const [weather, setWeather] = React.useState<Weather | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [unit, setUnit] = React.useState<'C' | 'F'>('C');
  const [lastUpdated, setLastUpdated] = React.useState<string>('');

  const fetchWeather = async (city: string) => {
    if (!city) return;
    
    try {
      setLoading(true);
      setError('');
      
      // First, get coordinates for the city
      const geocodingUrl = `${config.weatherApi.geocodingUrl}/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
      console.log('Fetching geocoding data from:', geocodingUrl);
      
      const geocodingResponse = await fetch(geocodingUrl);
      
      if (!geocodingResponse.ok) {
        const errorText = await geocodingResponse.text();
        console.error('Geocoding API error:', errorText);
        throw new Error(`City not found (${geocodingResponse.status})`);
      }
      
      const geocodingData = await geocodingResponse.json();
      if (!geocodingData.results?.length) {
        throw new Error('City not found in geocoding results');
      }
      
      const location: GeocodingResult = geocodingData.results[0];
      console.log('Location found:', location);
      
      // Then fetch weather data using coordinates
      const weatherUrl = `${config.weatherApi.baseUrl}/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,pressure_msl&hourly=temperature_2m,apparent_temperature&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,relative_humidity_2m_max&timezone=auto&past_hours=24&forecast_hours=24`;
      console.log('Fetching weather data from:', weatherUrl);
      
      const weatherResponse = await fetch(weatherUrl);
      
      if (!weatherResponse.ok) {
        const errorText = await weatherResponse.text();
        console.error('Weather API error:', errorText);
        throw new Error(`Failed to fetch weather data (${weatherResponse.status})`);
      }
      
      const data = await weatherResponse.json();
      console.log('Weather data received:', data);

      // Process hourly data for the temperature trend
      const now = new Date();
      const hourlyData = data.hourly.time
        .map((time: string, index: number) => {
          const date = new Date(time);
          return {
            time: date.toLocaleString('en-US', { 
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              hour12: false,
              minute: '2-digit'
            }).replace(',', ''),
            temp: Math.round(data.hourly.temperature_2m[index]),
            feelsLike: Math.round(data.hourly.apparent_temperature[index]),
            timestamp: date
          };
        })
        .filter((item: { timestamp: Date }) => item.timestamp > now)
        .map(({ time, temp, feelsLike }: { time: string; temp: number; feelsLike: number }) => ({ 
          time, 
          temp, 
          feelsLike 
        }));
      
      // Process 5-day forecast
      const forecast = data.daily.time.slice(0, 5).map((date: string, index: number) => ({
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        temp: Math.round(data.daily.temperature_2m_max[index]),
        description: getWeatherDescription(data.daily.temperature_2m_max[index], data.daily.relative_humidity_2m_max[index]),
        humidity: Math.round(data.daily.relative_humidity_2m_max[index])
      }));

      setWeather({
        city: `${location.name}${location.admin1 ? `, ${location.admin1}` : ''}, ${location.country}`,
        temp: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(data.current.apparent_temperature),
        tempMin: Math.round(data.daily.temperature_2m_min[0]),
        tempMax: Math.round(data.daily.temperature_2m_max[0]),
        humidity: Math.round(data.current.relative_humidity_2m),
        windSpeed: Math.round(data.current.wind_speed_10m),
        windDeg: Math.round(data.current.wind_direction_10m),
        pressure: Math.round(data.current.pressure_msl),
        description: getWeatherDescription(data.current.temperature_2m, data.current.relative_humidity_2m),
        sunrise: new Date(data.daily.sunrise[0]).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        sunset: new Date(data.daily.sunset[0]).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        forecast,
        hourlyData
      });
      
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error fetching weather data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherDescription = (temp: number, humidity: number) => {
    if (humidity > 80) return 'Overcast Clouds';
    if (temp > 30) return 'Clear Sky';
    if (temp < 10) return 'Few Clouds';
    return 'Scattered Clouds';
  };

  const convertTemp = (temp: number): number => {
    if (unit === 'F') {
      return Math.round((temp * 9/5) + 32);
    }
    return temp;
  };

  React.useEffect(() => {
    fetchWeather(searchCity);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWeather(searchCity);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <Sun className="w-8 h-8 text-yellow-400" />
          <h1 className="text-2xl font-bold">Weather Dashboard</h1>
        </div>

        <div className="grid md:grid-cols-[300px,1fr] gap-4">
          <div className="bg-gray-800/50 rounded-xl p-6">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <input
                  type="text"
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  placeholder="Enter city name..."
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-gray-700/50 border border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <Search className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </form>

            <div className="mt-6">
              <h2 className="text-lg mb-4">Temperature Unit</h2>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="unit"
                    checked={unit === 'C'}
                    onChange={() => setUnit('C')}
                    className="form-radio text-blue-500"
                  />
                  <span>Celsius (°C)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="unit"
                    checked={unit === 'F'}
                    onChange={() => setUnit('F')}
                    className="form-radio text-blue-500"
                  />
                  <span>Fahrenheit (°F)</span>
                </label>
              </div>
            </div>

            <div className="mt-6 hidden md:block">
              <h2 className="text-lg mb-2">Scan QR code to check the app on your mobile:</h2>
              <div className="bg-white p-3 rounded-xl inline-block">
                <QRCodeSVG value={config.qrCode.url} size={160} />
              </div>
            </div>
          </div>

          <div>
            {error && (
              <div className="bg-red-500/10 text-red-400 p-4 rounded-xl mb-4">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">Loading...</div>
            ) : weather ? (
              <div className="space-y-4">
                <div className="bg-gray-800/50 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <h2 className="text-xl">Current Weather in {weather.city}</h2>
                  </div>
                  <div className="text-sm text-gray-400 mb-4">Last updated: {lastUpdated}</div>

                  <div className="flex items-center gap-8 mb-8">
                    <Cloud className="w-24 h-24 text-gray-400" />
                    <div>
                      <div className="text-6xl font-bold">
                        {convertTemp(weather.temp)}°{unit}
                      </div>
                      <p className="text-gray-400">{weather.description}</p>
                      <p className="text-sm text-gray-400">
                        Feels like {convertTemp(weather.feelsLike)}°{unit}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-400 mb-2">
                        <Thermometer className="w-4 h-4" />
                        <span>Min/Max</span>
                      </div>
                      <div className="text-xl">
                        {convertTemp(weather.tempMin)}°/{convertTemp(weather.tempMax)}°{unit}
                      </div>
                    </div>

                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-400 mb-2">
                        <Wind className="w-4 h-4" />
                        <span>Wind</span>
                      </div>
                      <div className="text-xl">{weather.windSpeed} m/s</div>
                      <div className="text-sm text-gray-400">
                        Direction: {weather.windDeg}°
                      </div>
                    </div>

                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-400 mb-2">
                        <Droplets className="w-4 h-4" />
                        <span>Humidity</span>
                      </div>
                      <div className="text-xl">{weather.humidity}%</div>
                    </div>

                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-400 mb-2">
                        <Gauge className="w-4 h-4" />
                        <span>Pressure</span>
                      </div>
                      <div className="text-xl">{weather.pressure} hPa</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-400 mb-2">
                        <Clock className="w-4 h-4" />
                        <span>Sunrise</span>
                      </div>
                      <div className="text-xl">{weather.sunrise}</div>
                    </div>

                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-400 mb-2">
                        <Clock className="w-4 h-4" />
                        <span>Sunset</span>
                      </div>
                      <div className="text-xl">{weather.sunset}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-4 md:p-6">
                  <h2 className="text-xl mb-4">5-Day Forecast</h2>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                    {weather.forecast.map((day, index) => (
                      <div key={index} className="bg-gray-700/50 rounded-lg p-3 md:p-4">
                        <div className="text-sm text-gray-400 mb-1 md:mb-2">{day.date}</div>
                        <Cloud className="w-6 h-6 md:w-8 md:h-8 text-gray-400 mb-1 md:mb-2" />
                        <div className="text-lg md:text-xl">{convertTemp(day.temp)}°{unit}</div>
                        <div className="text-xs md:text-sm text-gray-400">{day.description}</div>
                        <div className="text-xs md:text-sm text-gray-400">Humidity: {day.humidity}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-6">
                  <h2 className="text-xl mb-4">Temperature Trend (48 hours)</h2>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={weather.hourlyData}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 30,
                          bottom: 100
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                          dataKey="time"
                          stroke="#9CA3AF"
                          angle={-45}
                          textAnchor="end"
                          height={60}
                          interval={2}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis
                          stroke="#9CA3AF"
                          tickFormatter={(value) => `${value}°C`}
                          domain={['auto', 'auto']}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1F2937',
                            border: 'none',
                            borderRadius: '0.5rem',
                            color: '#F3F4F6'
                          }}
                          formatter={(value: number) => [`${value}°${unit}`, '']}
                          labelFormatter={(label) => label}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={60}
                          wrapperStyle={{
                            paddingTop: 20
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="temp"
                          name="Temperature"
                          stroke="#3B82F6"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="feelsLike"
                          name="Feels Like"
                          stroke="#EF4444"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;