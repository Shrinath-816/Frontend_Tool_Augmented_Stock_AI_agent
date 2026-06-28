const Api = (() => {
  async function sendQuery(query, sessionId) {
    const res = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.QUERY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, session_id: sessionId }),
    });

    if (!res.ok) {
      let detail = `Request failed with status ${res.status}`;
      try {
        const body = await res.json();
        detail = body.detail || detail;
      } catch (_) { /* ignore parse failure */ }
      throw new Error(detail);
    }
    return res.json();
  }

  async function checkHealth() {
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.HEALTH}`);
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  return { sendQuery, checkHealth };
})();
