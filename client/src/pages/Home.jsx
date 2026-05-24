import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const COLOR_MAP = {
  emerald: 'border-emerald-500 text-emerald-400',
  blue: 'border-blue-500 text-blue-400',
  purple: 'border-purple-500 text-purple-400',
  yellow: 'border-yellow-500 text-yellow-400',
  red: 'border-red-500 text-red-400',
  orange: 'border-orange-500 text-orange-400',
  cyan: 'border-cyan-500 text-cyan-400',
  pink: 'border-pink-500 text-pink-400',
  teal: 'border-teal-500 text-teal-400',
  slate: 'border-slate-500 text-slate-400',
};

const PROGRESS_COLOR = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  cyan: 'bg-cyan-500',
  pink: 'bg-pink-500',
  teal: 'bg-teal-500',
  slate: 'bg-slate-500',
};

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getCategories(), api.getStats()])
      .then(([cats, s]) => { setCategories(cats); setStats(s); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;

  const overallPct = stats ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-terminal-dim text-xs mb-3">
          <span className="text-terminal-green">root@kali</span>
          <span>:</span>
          <span className="text-blue-400">~</span>
          <span>$</span>
          <span className="text-terminal-text">whoami</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-terminal-green mb-1">
          Kali Learn
        </h1>
        <p className="text-terminal-dim text-sm">
          Hands-on ethical hacking curriculum — tool by tool, quiz by quiz.
        </p>

        {stats && (
          <div className="mt-4 flex flex-wrap gap-4 text-xs">
            <Stat label="total tools" value={stats.total} />
            <Stat label="completed" value={stats.completed} color="text-terminal-green" />
            <Stat label="in progress" value={stats.in_progress} color="text-yellow-400" />
            <Stat label="mastery" value={`${overallPct}%`} color="text-terminal-blue" />
          </div>
        )}

        {stats && (
          <div className="mt-3 h-1.5 bg-terminal-surface rounded-full overflow-hidden w-full max-w-md">
            <div
              className="h-full bg-terminal-green rounded-full transition-all duration-700"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map(cat => {
          const pct = cat.toolCount ? Math.round((cat.completedCount / cat.toolCount) * 100) : 0;
          const colorClass = COLOR_MAP[cat.color] || 'border-terminal-border text-terminal-text';
          const progressColor = PROGRESS_COLOR[cat.color] || 'bg-terminal-green';

          return (
            <Link
              key={cat.id}
              to={`/category/${cat.id}`}
              className={`block border rounded-lg p-4 hover:bg-terminal-surface transition-all duration-200 group ${colorClass.split(' ')[0]} border-opacity-40 hover:border-opacity-80 bg-terminal-surface/40`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl">{cat.icon}</span>
                <span className={`text-xs ${colorClass.split(' ')[1]} font-semibold`}>
                  {cat.completedCount}/{cat.toolCount}
                </span>
              </div>
              <div className={`text-sm font-semibold mb-1 ${colorClass.split(' ')[1]} group-hover:brightness-125 transition-all`}>
                {cat.name}
              </div>
              <div className="text-xs text-terminal-dim mb-3">{cat.description}</div>
              <div className="h-1 bg-terminal-border rounded-full overflow-hidden">
                <div
                  className={`h-full ${progressColor} rounded-full transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, color = 'text-terminal-text' }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`text-base font-bold ${color}`}>{value}</span>
      <span className="text-terminal-dim">{label}</span>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-terminal-green text-sm animate-pulse">
        <span className="mr-2">$</span>loading tools...
      </div>
    </div>
  );
}
