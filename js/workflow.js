const Workflow = (() => {
  const timelineEl = () => Utils.qs('#timelineList');
  const toolCardsEl = () => Utils.qs('#toolCards');
  const ragCardsEl = () => Utils.qs('#ragCards');
  const sourcesEl = () => Utils.qs('#sourcesList');

  let optimisticTimer = null;
  let stepIndex = 0;

  // Generic steps shown while the request is in flight. The backend returns
  // one final response rather than a live stream, so this is an optimistic
  // "thinking" sequence that gets reconciled with real data once it arrives.
  const OPTIMISTIC_STEPS = [
    { label: 'Query submitted' },
    { label: 'Router analyzing query' },
    { label: 'Selecting workflow path' },
  ];

  function buildStep(label, sub, state) {
    const li = Utils.el('li', `t-step is-${state}`);
    const dot = Utils.el('span', 't-dot');
    const body = Utils.el('div', '');
    body.appendChild(Utils.el('div', 't-label', Utils.escapeHtml(label)));
    if (sub) body.appendChild(Utils.el('div', 't-sub', Utils.escapeHtml(sub)));
    li.appendChild(dot);
    li.appendChild(body);
    return li;
  }

  function reset() {
    clearInterval(optimisticTimer);
    stepIndex = 0;
    timelineEl().innerHTML = '';
    toolCardsEl().innerHTML = '<p class="panel-placeholder">No tools called yet.</p>';
    ragCardsEl().innerHTML = '<p class="panel-placeholder">No retrieval performed yet.</p>';
  }

  function start() {
    reset();
    const list = timelineEl();
    list.appendChild(buildStep(OPTIMISTIC_STEPS[0].label, null, 'done'));
    stepIndex = 1;
    list.appendChild(buildStep(OPTIMISTIC_STEPS[1].label, null, 'active'));

    optimisticTimer = setInterval(() => {
      const steps = Utils.qsa('.t-step', list);
      const lastActive = steps[steps.length - 1];
      if (!lastActive) return;
      lastActive.classList.remove('is-active');
      lastActive.classList.add('is-done');
      stepIndex += 1;
      if (stepIndex < OPTIMISTIC_STEPS.length) {
        list.appendChild(buildStep(OPTIMISTIC_STEPS[stepIndex].label, null, 'active'));
      } else {
        clearInterval(optimisticTimer);
      }
    }, CONFIG.OPTIMISTIC_STEP_MS);
  }

  function finalize(response) {
    clearInterval(optimisticTimer);
    const list = timelineEl();
    // mark anything still active/pending as done
    Utils.qsa('.t-step.is-active', list).forEach((n) => {
      n.classList.remove('is-active');
      n.classList.add('is-done');
    });

    const route = response.route || 'direct';
    const finalSteps = [];

    if (route === 'tool' || route === 'both') {
      finalSteps.push({ label: 'Planner generated execution plan', state: 'done' });
      (response.tool_calls || []).forEach((t) => {
        finalSteps.push({
          label: `Calling ${t.tool_name}`,
          sub: t.success ? 'completed' : (t.error || 'failed'),
          state: t.success ? 'done' : 'failed',
        });
      });
    }
    if (route === 'rag' || route === 'both') {
      finalSteps.push({ label: 'Running RAG search', state: 'done' });
      finalSteps.push({ label: 'Searching vector DB (ChromaDB)', state: 'done' });
      const n = (response.rag_chunks || []).length;
      finalSteps.push({ label: 'Retrieving relevant chunks', sub: `${n} chunk(s) found`, state: n ? 'done' : 'failed' });
    }
    if (route === 'direct') {
      finalSteps.push({ label: 'Direct route — no tools or retrieval needed', state: 'done' });
    }

    finalSteps.push({ label: 'Sending context to LLM', state: 'done' });
    finalSteps.push({ label: 'Generating final response', state: response.error ? 'failed' : 'done' });
    finalSteps.push({ label: 'Returning answer', state: 'done' });

    finalSteps.forEach((s, i) => {
      const node = buildStep(s.label, s.sub, s.state);
      node.style.animationDelay = `${i * 60}ms`;
      list.appendChild(node);
    });

    renderToolCards(response.tool_calls || []);
    renderRagCards(response.rag_chunks || [], response.sources || []);
    renderSources(response.sources || []);
  }

  function renderToolCards(toolCalls) {
    const root = toolCardsEl();
    if (!toolCalls.length) {
      root.innerHTML = '<p class="panel-placeholder">No tools called for this query.</p>';
      return;
    }
    root.innerHTML = '';
    toolCalls.forEach((t) => {
      const card = Utils.el('div', 'tool-card');
      const head = Utils.el('div', 'tool-card-head');
      head.appendChild(Utils.el('span', 'tool-card-name', Utils.escapeHtml(t.tool_name)));
      head.appendChild(Utils.el('span', `badge ${t.success ? 'badge-success' : 'badge-error'}`, t.success ? 'Completed' : 'Failed'));
      card.appendChild(head);
      if (t.task_id) {
        const row = Utils.el('div', 'tool-card-row');
        row.appendChild(Utils.el('span', '', 'Task ID'));
        row.appendChild(Utils.el('span', '', Utils.escapeHtml(t.task_id)));
        card.appendChild(row);
      }
      const output = t.success ? Utils.prettyJson(t.data) : (t.error || 'Unknown error');
      card.appendChild(Utils.el('div', 'tool-card-output', Utils.escapeHtml(Utils.truncate(output, 600))));
      root.appendChild(card);
    });
  }

  function renderRagCards(ragChunks, sources) {
    const root = ragCardsEl();
    if (ragChunks.length) {
      root.innerHTML = '';
      ragChunks.forEach((c) => {
        const card = Utils.el('div', 'rag-card');
        const head = Utils.el('div', 'rag-card-head');
        head.appendChild(Utils.el('span', 'rag-card-name', Utils.escapeHtml(c.source)));
        head.appendChild(Utils.el('span', 'rag-card-score', `sim ${c.score}`));
        card.appendChild(head);
        card.appendChild(Utils.el('div', 'rag-card-preview', Utils.escapeHtml(Utils.truncate(c.snippet || '', 220))));
        root.appendChild(card);
      });
      return;
    }
    // graceful fallback for backends that don't expose rag_chunks yet
    const bookSources = sources.filter((s) => /\.pdf$/i.test(s));
    if (bookSources.length) {
      root.innerHTML = '';
      bookSources.forEach((s) => {
        const card = Utils.el('div', 'rag-card');
        card.appendChild(Utils.el('div', 'rag-card-name', Utils.escapeHtml(s)));
        root.appendChild(card);
      });
    } else {
      root.innerHTML = '<p class="panel-placeholder">No retrieval performed for this query.</p>';
    }
  }

  function renderSources(sources) {
    const root = sourcesEl();
    if (!sources.length) {
      root.innerHTML = '<p class="panel-placeholder">No sources yet — ask a question first.</p>';
      return;
    }
    root.innerHTML = '';
    sources.forEach((s) => root.appendChild(Utils.el('span', 'source-pill', Utils.escapeHtml(s))));
  }

  return { start, finalize, reset };
})();
