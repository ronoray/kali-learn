import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, RefreshCw, BookOpen, HelpCircle, Lightbulb, CheckCircle2, XCircle } from 'lucide-react';
import { api, streamLesson } from '../api.js';

const TABS = ['lesson', 'quiz', 'flags'];

export default function ToolPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tool, setTool] = useState(null);
  const [progress, setProgress] = useState(null);
  const [tab, setTab] = useState('lesson');

  useEffect(() => {
    api.getTool(id).then(data => {
      setTool(data.tool);
      setProgress(data.progress);
    }).catch(() => navigate('/'));
  }, [id]);

  if (!tool) return <Loading />;

  return (
    <div className="animate-fade-in">
      <Link
        to={`/category/${tool.category}`}
        className="inline-flex items-center gap-1.5 text-terminal-dim text-xs hover:text-terminal-text mb-5 transition-colors"
      >
        <ArrowLeft size={13} />
        {tool.category}
      </Link>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-terminal-green">{tool.name}</h1>
        <p className="text-terminal-dim text-sm mt-1">{tool.description}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {tool.tags?.map(tag => (
            <span key={tag} className="text-[10px] bg-terminal-surface border border-terminal-border rounded px-2 py-0.5 text-terminal-dim">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border border-terminal-border rounded-lg overflow-hidden mb-5">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              tab === t
                ? 'bg-terminal-green text-terminal-bg'
                : 'text-terminal-dim hover:text-terminal-text hover:bg-terminal-surface'
            }`}
          >
            {t === 'lesson' && <BookOpen size={12} className="inline mr-1.5" />}
            {t === 'quiz' && <HelpCircle size={12} className="inline mr-1.5" />}
            {t === 'flags' && '⚑ '}
            {t}
          </button>
        ))}
      </div>

      {tab === 'lesson' && <LessonTab toolId={id} progress={progress} setProgress={setProgress} />}
      {tab === 'quiz' && <QuizTab toolId={id} toolName={tool.name} progress={progress} setProgress={setProgress} />}
      {tab === 'flags' && <FlagsTab tool={tool} />}
    </div>
  );
}

/* ── Lesson Tab ─────────────────────────────────────────── */

function LessonTab({ toolId, progress, setProgress }) {
  const [content, setContent] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState(false);
  const stopRef = useRef(null);

  const startStream = (refresh = false) => {
    setContent('');
    setDone(false);
    setStreaming(true);
    stopRef.current = streamLesson(
      toolId,
      (text) => setContent(prev => prev + text),
      () => { setStreaming(false); setDone(true); },
      (err) => { setStreaming(false); setContent(prev => prev + `\n\n_Error: ${err}_`); },
      refresh
    );
  };

  useEffect(() => {
    startStream(false);
    return () => stopRef.current?.();
  }, [toolId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-terminal-dim">
          {streaming && <span className="text-yellow-400 animate-pulse">▶ generating...</span>}
          {done && <span className="text-terminal-green">✓ lesson ready</span>}
        </span>
        {done && (
          <button
            onClick={() => startStream(true)}
            className="flex items-center gap-1.5 text-xs text-terminal-dim hover:text-terminal-text transition-colors"
          >
            <RefreshCw size={12} />
            regenerate
          </button>
        )}
      </div>

      <div className="prose-terminal min-h-[200px]">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        {streaming && <span className="inline-block w-2 h-4 bg-terminal-green animate-cursor-blink ml-0.5" />}
      </div>
    </div>
  );
}

/* ── Quiz Tab ───────────────────────────────────────────── */

function QuizTab({ toolId, toolName, progress, setProgress }) {
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hint, setHint] = useState({});

  useEffect(() => {
    setLoading(true);
    api.getQuiz(toolId)
      .then(q => { setQuestions(q); setAnswers({}); setResult(null); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [toolId]);

  const submit = async () => {
    if (Object.keys(answers).length < questions.length) return;
    setSubmitting(true);
    try {
      const r = await api.gradeQuiz(toolId, answers, questions);
      setResult(r);
      setProgress(prev => ({
        ...prev,
        status: r.passed ? 'completed' : 'in_progress',
        quiz_score: Math.max(prev?.quiz_score || 0, r.score),
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getHint = async (q, i) => {
    const h = await api.getHint(toolId, q.question, q.options.join(' | '));
    setHint(prev => ({ ...prev, [i]: h.hint }));
  };

  const retake = () => {
    setLoading(true);
    api.getQuiz(toolId)
      .then(q => { setQuestions(q); setAnswers({}); setResult(null); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  if (loading) return <div className="text-terminal-dim text-xs animate-pulse py-6">$ generating quiz...</div>;

  if (result) {
    return (
      <div className="animate-slide-up">
        <div className={`rounded-lg border p-5 mb-5 ${result.passed ? 'border-terminal-green bg-terminal-green/5' : 'border-yellow-500 bg-yellow-500/5'}`}>
          <div className={`text-2xl font-bold mb-1 ${result.passed ? 'text-terminal-green' : 'text-yellow-400'}`}>
            {result.score}%
          </div>
          <div className="text-sm text-terminal-dim">
            {result.correct}/{result.total} correct —{' '}
            {result.passed ? '✓ passed! tool marked complete.' : 'not quite — try again for a higher score.'}
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          {result.results.map((r, i) => (
            <div key={i} className={`rounded border p-3 text-xs ${r.isCorrect ? 'border-terminal-green/30 bg-terminal-green/5' : 'border-red-500/30 bg-red-500/5'}`}>
              <div className="flex items-start gap-2 mb-1.5">
                {r.isCorrect ? <CheckCircle2 size={13} className="text-terminal-green shrink-0 mt-0.5" /> : <XCircle size={13} className="text-red-400 shrink-0 mt-0.5" />}
                <span className="text-terminal-text">{r.question}</span>
              </div>
              {!r.isCorrect && (
                <div className="ml-5 text-terminal-dim">
                  Your answer: <span className="text-red-400">{r.userAnswer}</span> — Correct: <span className="text-terminal-green">{r.correct}</span>
                </div>
              )}
              <div className="ml-5 mt-1 text-terminal-dim italic">{r.explanation}</div>
            </div>
          ))}
        </div>

        <button
          onClick={retake}
          className="w-full py-2.5 rounded border border-terminal-border text-xs text-terminal-dim hover:text-terminal-text hover:bg-terminal-surface transition-all"
        >
          retake quiz (new questions)
        </button>
      </div>
    );
  }

  return (
    <div>
      {progress?.quiz_score !== null && progress?.quiz_score !== undefined && (
        <div className="text-xs text-terminal-dim mb-4">
          best score: <span className={progress.quiz_score >= 75 ? 'text-terminal-green' : 'text-yellow-400'}>{progress.quiz_score}%</span>
        </div>
      )}

      <div className="flex flex-col gap-5 mb-6">
        {questions?.map((q, i) => (
          <div key={q.id} className="rounded-lg border border-terminal-border bg-terminal-surface/40 p-4">
            <div className="text-sm text-terminal-text mb-3 flex items-start gap-2">
              <span className="text-terminal-green shrink-0 text-xs mt-0.5">Q{i + 1}</span>
              <span>{q.question}</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5 mb-2">
              {q.options.map((opt) => {
                const letter = opt[0];
                const selected = answers[i] === letter;
                return (
                  <button
                    key={opt}
                    onClick={() => setAnswers(prev => ({ ...prev, [i]: letter }))}
                    className={`text-left text-xs px-3 py-2.5 rounded border transition-all ${
                      selected
                        ? 'border-terminal-green bg-terminal-green/10 text-terminal-green'
                        : 'border-terminal-border text-terminal-dim hover:border-terminal-dim hover:text-terminal-text'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {hint[i] ? (
              <div className="text-xs text-yellow-400/80 mt-2 flex items-start gap-1.5">
                <Lightbulb size={11} className="shrink-0 mt-0.5" />
                {hint[i]}
              </div>
            ) : (
              <button
                onClick={() => getHint(q, i)}
                className="text-[10px] text-terminal-dim hover:text-yellow-400 transition-colors flex items-center gap-1 mt-1"
              >
                <Lightbulb size={10} /> hint
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={submit}
        disabled={submitting || Object.keys(answers).length < (questions?.length || 0)}
        className="w-full py-3 rounded-lg bg-terminal-green text-terminal-bg font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all active:scale-[0.99]"
      >
        {submitting ? 'grading...' : 'submit answers'}
      </button>
    </div>
  );
}

/* ── Flags Tab ──────────────────────────────────────────── */

function FlagsTab({ tool }) {
  if (!tool.commonFlags?.length) {
    return <div className="text-terminal-dim text-xs py-4">No flags listed — check the man page.</div>;
  }
  return (
    <div className="rounded-lg border border-terminal-border overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-terminal-border bg-terminal-surface">
            <th className="text-left px-4 py-2.5 text-terminal-green font-semibold">flag</th>
            <th className="text-left px-4 py-2.5 text-terminal-dim font-normal">description</th>
          </tr>
        </thead>
        <tbody>
          {tool.commonFlags.map((f, i) => (
            <tr key={i} className="border-b border-terminal-border/50 last:border-0 hover:bg-terminal-surface/50">
              <td className="px-4 py-2.5">
                <code className="text-blue-400 bg-terminal-surface px-1.5 py-0.5 rounded">{f.flag}</code>
              </td>
              <td className="px-4 py-2.5 text-terminal-dim">{f.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-terminal-green text-sm animate-pulse">$ loading tool...</div>
    </div>
  );
}
