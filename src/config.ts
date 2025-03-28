// Configuration file for environment variables
const getApiKey = () => {
  // Try to get from runtime environment first
  const runtimeKey = (window as any)._env_?.VITE_WEATHER_API_KEY;
  if (runtimeKey) {
    return runtimeKey;
  }
  
  // Fallback to build-time env if runtime is not available
  const buildTimeKey = import.meta.env.VITE_WEATHER_API_KEY;
  if (!buildTimeKey) {
    console.warn('Weather API key is not set');
  }
  return buildTimeKey;
};

export const config = {
  weatherApiKey: getApiKey(),
}; 