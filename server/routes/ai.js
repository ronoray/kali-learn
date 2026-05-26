import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { TOOLS, CATEGORIES } from '../data/tools.js';
import { getDb } from '../db.js';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getUserContext(db) {
  const rows = await db.all('SELECT tool_id, status, quiz_score FROM progress WHERE status != "not_started"');
  if (!rows.length) return 'User is a complete beginner — this is their first lesson.';
  const completed = rows.filter(r => r.status === 'completed').map(r => r.tool_id);
  const inProgress = rows.filter(r => r.status === 'in_progress').map(r => r.tool_id);
  return [
    completed.length ? `Completed tools: ${completed.join(', ')}` : '',
    inProgress.length ? `In progress: ${inProgress.join(', ')}` : '',
  ].filter(Boolean).join('. ');
}

router.get('/lesson/:toolId', async (req, res) => {
  const tool = TOOLS.find(t => t.id === req.params.toolId);
  if (!tool) return res.status(404).json({ error: 'Tool not found' });

  const db = await getDb();

  const cached = await db.get('SELECT content FROM lesson_cache WHERE tool_id = ?', tool.id);
  if (cached && !req.query.refresh) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Cached', 'true');
    res.write(`data: ${JSON.stringify({ type: 'content', text: cached.content, cached: true })}\n\n`);
    res.write('data: [DONE]\n\n');
    return res.end();
  }

  const userContext = await getUserContext(db);
  const category = CATEGORIES.find(c => c.id === tool.category);

  const systemPrompt = `You are a hands-on cybersecurity instructor teaching ethical hacking using Kali Linux.
Your student's context: ${userContext}
Keep lessons practical, direct, and example-driven. No fluff. Use markdown formatting.`;

  const userPrompt = `Teach me about ${tool.name} (category: ${category?.name}).

Structure your lesson exactly like this:

## What is it?
One paragraph — what the tool does and when an attacker/pentester would use it.

## How it works
Brief technical explanation of the underlying mechanism (e.g., "sends SYN packets and analyzes responses").

## Key flags
${tool.commonFlags.length ? tool.commonFlags.map(f => `- \`${f.flag}\` — ${f.desc}`).join('\n') : 'Cover the most important flags and options.'}

## Hands-on Example
Use one of these real targets in the example command:
- LAN targets: 192.168.68.115 (Kali box), 192.168.68.123 (homeserver), 192.168.68.1 (router)
- Internet target: 64.227.137.98 (personal VPS running Traefik + Docker)
- Web tools: use hungrytimes.in or learn.hungrytimes.in as demo domains
Pick whichever target makes the most sense for this tool. Show the command and explain what the output means.

## When NOT to use it
One common mistake or scenario where a different tool is better.

## CTF / Real-world tip
One practical tip that would come in handy in a CTF or real pentest.`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let fullContent = '';

  try {
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        fullContent += chunk.delta.text;
        res.write(`data: ${JSON.stringify({ type: 'delta', text: chunk.delta.text })}\n\n`);
      }
    }

    await db.run(
      `INSERT INTO lesson_cache (tool_id, content, generated_at) VALUES (?, ?, ?)
       ON CONFLICT(tool_id) DO UPDATE SET content = excluded.content, generated_at = excluded.generated_at`,
      [tool.id, fullContent, new Date().toISOString()]
    );

    await db.run(
      `INSERT INTO progress (tool_id, status, quiz_attempts) VALUES (?, 'in_progress', 0)
       ON CONFLICT(tool_id) DO UPDATE SET status = CASE WHEN status = 'not_started' THEN 'in_progress' ELSE status END`,
      [tool.id]
    );

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
});

router.get('/quiz/:toolId', async (req, res) => {
  const tool = TOOLS.find(t => t.id === req.params.toolId);
  if (!tool) return res.status(404).json({ error: 'Tool not found' });

  const db = await getDb();
  const progress = await db.get('SELECT * FROM progress WHERE tool_id = ?', tool.id);
  const attempts = progress?.quiz_attempts || 0;

  const cached = await db.get('SELECT questions FROM quiz_cache WHERE tool_id = ?', tool.id);
  if (cached && attempts === 0) {
    return res.json(JSON.parse(cached.questions));
  }

  const userContext = await getUserContext(db);
  const difficulty = attempts === 0 ? 'beginner' : attempts === 1 ? 'intermediate' : 'advanced';

  const prompt = `Generate exactly 4 multiple-choice quiz questions about ${tool.name} for a ${difficulty}-level student.
Student context: ${userContext}
${attempts > 0 ? `This is attempt ${attempts + 1} — make questions different from previous attempts, harder.` : ''}

Return ONLY a JSON array, no other text:
[
  {
    "id": 1,
    "question": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correct": "A",
    "explanation": "Brief explanation of why this answer is correct"
  }
]`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].text.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Invalid JSON from AI');
    const questions = JSON.parse(jsonMatch[0]);

    await db.run(
      `INSERT INTO quiz_cache (tool_id, questions, generated_at) VALUES (?, ?, ?)
       ON CONFLICT(tool_id) DO UPDATE SET questions = excluded.questions, generated_at = excluded.generated_at`,
      [tool.id, JSON.stringify(questions), new Date().toISOString()]
    );

    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/quiz/:toolId/grade', async (req, res) => {
  const tool = TOOLS.find(t => t.id === req.params.toolId);
  if (!tool) return res.status(404).json({ error: 'Tool not found' });

  const { answers, questions } = req.body;
  if (!answers || !questions) return res.status(400).json({ error: 'answers and questions required' });

  let correct = 0;
  const results = questions.map((q, i) => {
    const userAnswer = answers[i];
    const isCorrect = userAnswer === q.correct;
    if (isCorrect) correct++;
    return {
      question: q.question,
      userAnswer,
      correct: q.correct,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const score = Math.round((correct / questions.length) * 100);
  const passed = score >= 75;

  const db = await getDb();
  await db.run(
    `INSERT INTO progress (tool_id, status, quiz_score, quiz_attempts, completed_at)
     VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(tool_id) DO UPDATE SET
       quiz_score = MAX(COALESCE(quiz_score, 0), excluded.quiz_score),
       quiz_attempts = quiz_attempts + 1,
       status = CASE WHEN excluded.quiz_score >= 75 THEN 'completed' ELSE status END,
       completed_at = CASE WHEN excluded.quiz_score >= 75 AND completed_at IS NULL THEN excluded.completed_at ELSE completed_at END`,
    [tool.id, passed ? 'completed' : 'in_progress', score,
      passed ? new Date().toISOString() : null]
  );

  res.json({ score, passed, correct, total: questions.length, results });
});

router.post('/hint', async (req, res) => {
  const { toolId, question, context } = req.body;
  const tool = TOOLS.find(t => t.id === toolId);
  if (!tool) return res.status(404).json({ error: 'Tool not found' });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Give me a hint for this ${tool.name} quiz question without revealing the answer directly:
Question: ${question}
Context: ${context || ''}
Keep hint under 2 sentences.`,
      }],
    });
    res.json({ hint: response.content[0].text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/cache', async (req, res) => {
  const db = await getDb();
  await db.run('DELETE FROM lesson_cache');
  await db.run('DELETE FROM quiz_cache');
  res.json({ ok: true, message: 'Lesson and quiz cache cleared' });
});

export default router;
