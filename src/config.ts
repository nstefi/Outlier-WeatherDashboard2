// Configuration file for environment variables
const getApiKey = () => {
  const key = import.meta.env.VITE_WEATHER_API_KEY;
  if (!key) {
    console.warn('Weather API key is not set');
  }
  return key;
};

export const config = {
  weatherApiKey: getApiKey(),
}; 