const Render = (() => {
  // Minimal, dependency-free markdown -> HTML converter.
  function mdToHtml(raw) {
    let text = Utils.escapeHtml(raw || '');

    // fenced code blocks
    const blocks = [];
    text = text.replace(/```([\s\S]*?)```/g, (_, code) => {
      blocks.push(`<pre><code>${code.trim()}</code></pre>`);
      return `\u0000${blocks.length - 1}\u0000`;
    });

    // tables (simple pipe-delimited)
    text = text.replace(/((?:^\|.*\|$\n?)+)/gm, (block) => {
      const rows = block.trim().split('\n').filter((r) => !/^\|?\s*-{2,}/.test(r.replace(/\|/g, '')));
      if (rows.length < 2) return block;
      const cells = rows.map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
      const [head, ...body] = cells;
      const thead = `<thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${body
        .filter((r) => r.some((c) => c.length))
        .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
        .join('')}</tbody>`;
      return `<table>${thead}${tbody}</table>`;
    });

    // headers
    text = text.replace(/^### (.*)$/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.*)$/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.*)$/gm, '<h1>$1</h1>');

    // bold / italic / inline code
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, '<em>$1</em>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // links
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // lists (group consecutive lines)
    text = text.replace(/(^|\n)((?:[-*] .*(?:\n|$))+)/g, (_, lead, block) => {
      const items = block.trim().split('\n').map((l) => `<li>${l.replace(/^[-*]\s+/, '')}</li>`).join('');
      return `${lead}<ul>${items}</ul>`;
    });
    text = text.replace(/(^|\n)((?:\d+\. .*(?:\n|$))+)/g, (_, lead, block) => {
      const items = block.trim().split('\n').map((l) => `<li>${l.replace(/^\d+\.\s+/, '')}</li>`).join('');
      return `${lead}<ol>${items}</ol>`;
    });

    // paragraphs: wrap remaining bare lines
    text = text
      .split(/\n{2,}/)
      .map((chunk) => {
        if (/^\s*<(h1|h2|h3|ul|ol|table|pre)/.test(chunk.trim())) return chunk;
        if (!chunk.trim()) return '';
        return `<p>${chunk.trim().replace(/\n/g, '<br>')}</p>`;
      })
      .join('');

    // restore code blocks
    text = text.replace(/\u0000(\d+)\u0000/g, (_, i) => blocks[i]);

    return text;
  }

  function userMessage(text) {
    const wrap = Utils.el('div', 'msg msg-user');
    wrap.appendChild(Utils.el('div', 'msg-bubble', Utils.escapeHtml(text)));
    return wrap;
  }

  function aiMessage(answer, sources, route) {
    const wrap = Utils.el('div', 'msg msg-ai');
    wrap.appendChild(Utils.el('div', 'msg-bubble', mdToHtml(answer)));
    if (route) wrap.appendChild(Utils.el('div', 'msg-meta', `Route: ${route}`));
    if (sources && sources.length) {
      const row = Utils.el('div', 'msg-sources');
      sources.forEach((s) => row.appendChild(Utils.el('span', 'source-pill', Utils.escapeHtml(s))));
      wrap.appendChild(row);
    }
    return wrap;
  }

  function typingBubble() {
    const wrap = Utils.el('div', 'msg msg-ai');
    wrap.id = 'typingBubble';
    wrap.appendChild(Utils.el('div', 'msg-bubble typing-indicator', '<span></span><span></span><span></span>'));
    return wrap;
  }

  function errorCard(message, onRetry) {
    const wrap = Utils.el('div', 'error-card');
    wrap.appendChild(Utils.el('div', 'error-card-title', 'Something went wrong'));
    wrap.appendChild(Utils.el('div', '', Utils.escapeHtml(message)));
    const btn = Utils.el('button', 'btn btn-ghost', 'Retry');
    btn.addEventListener('click', onRetry);
    Utils.attachRipple(btn);
    wrap.appendChild(btn);
    return wrap;
  }

  return { mdToHtml, userMessage, aiMessage, typingBubble, errorCard };
})();
