// Update API_BASE_URL to match where your FastAPI backend is running.
const CONFIG = {
  API_BASE_URL: 'http://localhost:8000',
  ENDPOINTS: {
    QUERY: '/query',
    HEALTH: '/health',
  },
  HEALTH_POLL_MS: 15000,
  // Optimistic step delay while waiting for the backend's single response
  // (the API returns one final result, not a live stream of steps).
  OPTIMISTIC_STEP_MS: 650,
};
