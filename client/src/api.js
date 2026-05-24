const BASE = import.meta.env.PROD ? '' : '';

async function get(path) {
  const res = await fetch(`${BASE}/api${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  getCategories: () => get('/tools/categories'),
  getCategory: (id) => get(`/tools/category/${id}`),
  getTool: (id) => get(`/tools/tool/${id}`),
  getStats: () => get('/tools/stats'),
  updateProgress: (toolId, data) => post(`/tools/progress/${toolId}`, data),
  getQuiz: (toolId) => get(`/ai/quiz/${toolId}`),
  gradeQuiz: (toolId, answers, questions) => post(`/ai/quiz/${toolId}/grade`, { answers, questions }),
  getHint: (toolId, question, context) => post('/ai/hint', { toolId, question, context }),
};

export function streamLesson(toolId, onDelta, onDone, onError, refresh = false) {
  const url = `/api/ai/lesson/${toolId}${refresh ? '?refresh=1' : ''}`;
  const es = new EventSource(url);

  es.onmessage = (e) => {
    if (e.data === '[DONE]') {
      es.close();
      onDone?.();
      return;
    }
    try {
      const data = JSON.parse(e.data);
      if (data.type === 'delta') onDelta(data.text);
      if (data.type === 'content') { onDelta(data.text); onDone?.(); }
      if (data.type === 'error') { onError?.(data.message); es.close(); }
    } catch {}
  };

  es.onerror = () => {
    onError?.('Connection error');
    es.close();
  };

  return () => es.close();
}
