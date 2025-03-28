// Configuration file for environment variables
const getApiKey = () => {
  // Get from runtime environment
  const runtimeKey = (window as any)._env_?.VITE_WEATHER_API_KEY;
  if (!runtimeKey) {
    console.warn('Weather API key is not set');
  }
  return runtimeKey;
};

export const config = {
  weatherApiKey: getApiKey(),
}; 