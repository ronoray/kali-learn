import { Router } from 'express';
import { TOOLS, CATEGORIES } from '../data/tools.js';
import { getDb } from '../db.js';

const router = Router();

router.get('/categories', async (req, res) => {
  const db = await getDb();
  const progressRows = await db.all('SELECT tool_id, status FROM progress');
  const progressMap = Object.fromEntries(progressRows.map(r => [r.tool_id, r.status]));

  const cats = CATEGORIES.map(cat => {
    const tools = TOOLS.filter(t => t.category === cat.id);
    const completed = tools.filter(t => progressMap[t.id] === 'completed').length;
    return { ...cat, toolCount: tools.length, completedCount: completed };
  });

  res.json(cats);
});

router.get('/category/:id', async (req, res) => {
  const db = await getDb();
  const cat = CATEGORIES.find(c => c.id === req.params.id);
  if (!cat) return res.status(404).json({ error: 'Category not found' });

  const tools = TOOLS.filter(t => t.category === cat.id);
  const ids = tools.map(t => `'${t.id}'`).join(',');
  const progressRows = ids.length
    ? await db.all(`SELECT tool_id, status, quiz_score FROM progress WHERE tool_id IN (${ids})`)
    : [];
  const progressMap = Object.fromEntries(progressRows.map(r => [r.tool_id, r]));

  const toolsWithProgress = tools.map(t => ({
    ...t,
    status: progressMap[t.id]?.status || 'not_started',
    quiz_score: progressMap[t.id]?.quiz_score ?? null,
  }));

  res.json({ category: cat, tools: toolsWithProgress });
});

router.get('/tool/:id', async (req, res) => {
  const tool = TOOLS.find(t => t.id === req.params.id);
  if (!tool) return res.status(404).json({ error: 'Tool not found' });

  const db = await getDb();
  const progress = await db.get('SELECT * FROM progress WHERE tool_id = ?', tool.id);
  const lessonCache = await db.get('SELECT content FROM lesson_cache WHERE tool_id = ?', tool.id);

  res.json({
    tool,
    progress: progress || { status: 'not_started', quiz_score: null, notes: '' },
    lessonCached: !!lessonCache,
  });
});

router.post('/progress/:toolId', async (req, res) => {
  const { status, quiz_score, notes } = req.body;
  const db = await getDb();

  await db.run(
    `INSERT INTO progress (tool_id, status, quiz_score, notes, quiz_attempts, completed_at)
     VALUES (?, ?, ?, ?, 0, ?)
     ON CONFLICT(tool_id) DO UPDATE SET
       status = COALESCE(excluded.status, status),
       quiz_score = COALESCE(excluded.quiz_score, quiz_score),
       notes = COALESCE(excluded.notes, notes),
       quiz_attempts = quiz_attempts + (CASE WHEN excluded.quiz_score IS NOT NULL THEN 1 ELSE 0 END),
       completed_at = CASE WHEN excluded.status = 'completed' THEN excluded.completed_at ELSE completed_at END`,
    [req.params.toolId, status || 'in_progress', quiz_score ?? null, notes ?? null,
      status === 'completed' ? new Date().toISOString() : null]
  );

  res.json({ ok: true });
});

router.get('/stats', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT status, COUNT(*) as count FROM progress GROUP BY status');
  const total = TOOLS.length;
  const stats = { total, not_started: total, in_progress: 0, completed: 0 };
  for (const r of rows) stats[r.status] = r.count;
  stats.not_started = total - (stats.in_progress + stats.completed);
  res.json(stats);
});

export default router;
