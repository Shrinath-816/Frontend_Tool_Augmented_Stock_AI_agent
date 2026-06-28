# Financial Research AI — Frontend

Vanilla HTML/CSS/JS dashboard for the Financial Research Agent backend. No frameworks.

## Run it

Just open `index.html` in a browser, or serve it locally to avoid any CORS quirks:

```bash
cd frontend
python -m http.server 5500
# then visit http://localhost:5500
```

Make sure the backend (`financial_research_agent`) is running first:
```bash
python run.py api
```

## Point it at your backend

Edit `js/config.js`:
```js
API_BASE_URL: 'http://localhost:8000',
```
That's the only place an API URL lives.

If the backend runs on a different host/port, the browser will block requests unless
FastAPI's CORS middleware allows your frontend's origin. If you hit CORS errors, add this
to `app/main.py` on the backend:
```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
```

## Honest note on the workflow timeline

The backend's `/query` endpoint returns **one final response**, not a live stream of
intermediate steps. So the timeline you see is two-phase:

1. **While waiting**: a generic "thinking" sequence (query submitted → router analyzing →
   selecting path) animates optimistically, since the real steps aren't known yet.
2. **Once the response arrives**: the timeline is filled in for real — which tools were
   actually called (and whether each succeeded or failed), whether RAG ran, and how many
   chunks it found — all from the real `tool_calls` / `rag_chunks` / `route` fields in the
   response. Nothing here is fabricated after that point.

To get a truly live, step-by-step timeline, the backend would need to stream intermediate
LangGraph node updates (e.g. via Server-Sent Events or WebSockets) instead of returning a
single JSON object. That's a backend change beyond this frontend's scope, but the timeline
code in `js/workflow.js` is written so swapping in a real event stream later is a small
change (replace `Workflow.start()` + `Workflow.finalize()` with incremental `Workflow`
calls per event).

## Small backend addition

One additive field, `rag_chunks`, was added to `QueryResponse` (in
`financial_research_agent/schemas/response.py` and `graphs/workflow.py`) so the RAG panel
can show real similarity scores and text snippets instead of nothing. It's backwards
compatible — older clients that don't read it are unaffected. If you're running an
unmodified backend, the RAG panel falls back to listing source filenames only.

## Folder structure

```
frontend/
├── index.html
├── css/
│   ├── style.css        layout, sidebar, variables, typography
│   ├── components.css   chat bubbles, composer, timeline, cards, pills
│   └── animations.css   keyframes (respects prefers-reduced-motion)
├── js/
│   ├── config.js        API_BASE_URL lives here only
│   ├── utils.js         DOM helpers, escaping, uuid, ripple effect
│   ├── api.js            fetch wrappers for /query and /health
│   ├── render.js         markdown → HTML, message bubble builders
│   ├── workflow.js       timeline / tool cards / RAG cards (the signature panel)
│   ├── ui.js             nav, sidebar toggle, health polling, textarea autosize
│   └── chat.js           wires it all together
└── assets/               icons/images (currently unused — text/CSS-only UI)
```
