import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Terminal, ChevronRight, SquareTerminal } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);

  return (
    <div className="min-h-screen bg-terminal-bg text-terminal-text font-mono">
      {/* Header */}
      <header className="border-b border-terminal-border sticky top-0 z-50 bg-terminal-bg/95 backdrop-blur safe-top">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2 min-w-0">
          <Link to="/" className="flex items-center gap-2 text-terminal-green hover:opacity-80 transition-opacity">
            <Terminal size={18} strokeWidth={2} />
            <span className="text-sm font-semibold tracking-wide">kali-learn</span>
          </Link>

          {parts.length > 0 && (
            <div className="flex items-center gap-1 text-terminal-dim text-xs overflow-hidden flex-1 min-w-0">
              {parts.map((part, i) => (
                <React.Fragment key={i}>
                  <ChevronRight size={12} className="shrink-0" />
                  <span className="truncate">{part}</span>
                </React.Fragment>
              ))}
            </div>
          )}

          <div className="ml-auto flex items-center gap-3">
            <Link
              to="/terminal"
              className="text-terminal-dim hover:text-terminal-green transition-colors"
              title="SSH Terminal"
            >
              <SquareTerminal size={16} />
            </Link>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-terminal-red" />
              <span className="w-2.5 h-2.5 rounded-full bg-terminal-yellow" />
              <span className="w-2.5 h-2.5 rounded-full bg-terminal-green" />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 pb-safe">
        <Outlet />
      </main>
    </div>
  );
}
