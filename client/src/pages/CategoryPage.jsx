import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Clock } from 'lucide-react';
import { api } from '../api.js';

const DIFF_COLOR = {
  beginner: 'text-terminal-green border-terminal-green',
  intermediate: 'text-yellow-400 border-yellow-400',
  advanced: 'text-red-400 border-red-400',
};

const STATUS_ICON = {
  completed: <CheckCircle2 size={16} className="text-terminal-green" />,
  in_progress: <Clock size={16} className="text-yellow-400" />,
  not_started: <Circle size={16} className="text-terminal-dim" />,
};

export default function CategoryPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCategory(id)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading />;
  if (!data) return <div className="text-red-400 text-sm">Category not found.</div>;

  const { category, tools } = data;

  return (
    <div className="animate-fade-in">
      <Link to="/" className="inline-flex items-center gap-1.5 text-terminal-dim text-xs hover:text-terminal-text mb-5 transition-colors">
        <ArrowLeft size={13} />
        back
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">{category.icon}</span>
          <h1 className="text-xl font-bold text-terminal-text">{category.name}</h1>
        </div>
        <p className="text-terminal-dim text-sm ml-12">{category.description}</p>
      </div>

      <div className="flex flex-col gap-2">
        {tools.map(tool => (
          <Link
            key={tool.id}
            to={`/tool/${tool.id}`}
            className="flex items-center gap-3 p-3.5 rounded-lg border border-terminal-border hover:border-terminal-dim bg-terminal-surface/40 hover:bg-terminal-surface transition-all group"
          >
            <div className="shrink-0">{STATUS_ICON[tool.status]}</div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-terminal-text group-hover:text-white transition-colors">
                  {tool.name}
                </span>
                <span className={`text-[10px] border rounded px-1.5 py-0.5 font-mono ${DIFF_COLOR[tool.difficulty] || 'text-terminal-dim border-terminal-dim'}`}>
                  {tool.difficulty}
                </span>
              </div>
              <p className="text-xs text-terminal-dim mt-0.5 truncate">{tool.description}</p>
            </div>

            {tool.quiz_score !== null && (
              <div className="shrink-0 text-xs text-terminal-dim">
                <span className={tool.quiz_score >= 75 ? 'text-terminal-green' : 'text-yellow-400'}>
                  {tool.quiz_score}%
                </span>
              </div>
            )}

            <div className="shrink-0 text-terminal-dim text-xs">›</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-terminal-green text-sm animate-pulse">$ loading...</div>
    </div>
  );
}
