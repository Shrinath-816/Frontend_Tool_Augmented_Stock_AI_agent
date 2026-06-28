(function () {
  const sessionId = Utils.uuid();
  let lastQuery = null;
  let isSending = false;

  function chatWindow() { return Utils.qs('#chatWindow'); }

  function scrollToBottom() {
    const w = chatWindow();
    w.scrollTop = w.scrollHeight;
  }

  function hideEmptyState() {
    const e = Utils.qs('#chatEmpty');
    if (e) e.remove();
  }

  async function handleSend() {
    if (isSending) return;
    const input = Utils.qs('#promptInput');
    const query = input.value.trim();
    if (!query) return;

    hideEmptyState();
    chatWindow().appendChild(Render.userMessage(query));
    input.value = '';
    input.style.height = 'auto';
    scrollToBottom();

    await runQuery(query);
  }

  async function runQuery(query) {
    isSending = true;
    lastQuery = query;
    Utils.qs('#sendBtn').disabled = true;

    const typing = Render.typingBubble();
    chatWindow().appendChild(typing);
    scrollToBottom();

    Workflow.start();

    try {
      const response = await Api.sendQuery(query, sessionId);
      typing.remove();
      chatWindow().appendChild(Render.aiMessage(response.answer, response.sources, response.route));
      Workflow.finalize(response);
    } catch (err) {
      typing.remove();
      chatWindow().appendChild(Render.errorCard(err.message || 'The request failed.', retryLast));
      Workflow.finalize({ route: 'direct', error: err.message, tool_calls: [], rag_chunks: [], sources: [] });
    } finally {
      isSending = false;
      Utils.qs('#sendBtn').disabled = false;
      scrollToBottom();
    }
  }

  function retryLast() {
    if (!lastQuery) return;
    Utils.qsa('.error-card').forEach(function (n) { n.remove(); });
    runQuery(lastQuery);
  }

  function clearChat() {
    chatWindow().innerHTML = '';
    const empty = Utils.el('div', 'chat-empty');
    empty.id = 'chatEmpty';
    empty.innerHTML = '<div class="empty-glyph"></div>' +
      '<h2>What do you want to research?</h2>' +
      '<p>Try asking about a stock price, a company overview, or an investing principle.</p>';
    chatWindow().appendChild(empty);
    Workflow.reset();
  }

  function initComposer() {
    Utils.qs('#sendBtn').addEventListener('click', handleSend);
    Utils.qs('#clearChatBtn').addEventListener('click', clearChat);
    Utils.qs('#promptInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    UI.init();
    initComposer();
  });
})();
