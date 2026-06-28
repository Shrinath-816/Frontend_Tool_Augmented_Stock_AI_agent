const UI = (() => {
  const titles = {
    chat: ['Chat', 'Ask about live market data or timeless investing principles'],
    workflow: ['Workflow', 'Live execution pipeline for the last query'],
    sources: ['Sources', 'Everything the agent has cited this session'],
  };

  function initNav() {
    Utils.qsa('.nav-item[data-view]').forEach((btn) => {
      if (btn.disabled) return;
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });
  }

  function switchView(view) {
    Utils.qsa('.nav-item[data-view]').forEach((b) => b.classList.toggle('is-active', b.dataset.view === view));
    Utils.qsa('.view').forEach((v) => v.classList.toggle('is-active', v.id === `view-${view}`));
    const [title, subtitle] = titles[view] || titles.chat;
    Utils.qs('#viewTitle').textContent = title;
    Utils.qs('#viewSubtitle').textContent = subtitle;
    Utils.qs('#sidebar').classList.remove('is-open');
  }

  function initSidebarToggle() {
    Utils.qs('#sidebarToggle').addEventListener('click', () => {
      Utils.qs('#sidebar').classList.toggle('is-open');
    });
  }

  function initTextareaAutosize() {
    const ta = Utils.qs('#promptInput');
    ta.addEventListener('input', () => {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
    });
  }

  async function pollHealth() {
    const dot = Utils.qs('.status-dot');
    const label = Utils.qs('.status-label');
    const online = await Api.checkHealth();
    dot.classList.toggle('is-online', online);
    dot.classList.toggle('is-offline', !online);
    label.textContent = online ? 'Connected' : 'Backend offline';
    Utils.qs('#modelPill').textContent = online ? 'API: live' : 'API: unreachable';
  }

  function initHealthPolling() {
    pollHealth();
    setInterval(pollHealth, CONFIG.HEALTH_POLL_MS);
  }

  function initRipples() {
    Utils.qsa('.btn').forEach(Utils.attachRipple);
  }

  function init() {
    initNav();
    initSidebarToggle();
    initTextareaAutosize();
    initHealthPolling();
    initRipples();
  }

  return { init, switchView };
})();
