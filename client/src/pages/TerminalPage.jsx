import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Terminal, ArrowLeft, RotateCcw } from 'lucide-react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const LS_TOKEN_KEY = 'kali_terminal_token';

function TokenPrompt({ onSubmit, errorMsg }) {
  const [value, setValue] = useState('');
  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center font-mono px-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex items-center gap-2 text-green-400 mb-6">
          <Terminal size={20} />
          <span className="text-sm font-semibold tracking-wide">kali-learn / terminal</span>
        </div>
        {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}
        <p className="text-gray-400 text-sm">Enter terminal access token:</p>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(value.trim()); }} className="flex gap-2">
          <input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            className="flex-1 bg-[#161b22] border border-gray-700 text-gray-200 text-sm px-3 py-2.5 rounded focus:outline-none focus:border-green-500"
            placeholder="token"
          />
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2.5 rounded transition-colors"
          >
            Connect
          </button>
        </form>
      </div>
    </div>
  );
}

export default function TerminalPage() {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('connecting');
  const [token, setToken] = useState(() => localStorage.getItem(LS_TOKEN_KEY) || null);
  const [forbidden, setForbidden] = useState(false);
  const [connKey, setConnKey] = useState(0);

  const handleTokenSubmit = useCallback((t) => {
    localStorage.setItem(LS_TOKEN_KEY, t);
    setToken(t);
    setForbidden(false);
    setConnKey((k) => k + 1);
  }, []);

  const reconnect = useCallback(() => {
    setStatus('connecting');
    setConnKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!token) return;
    if (!containerRef.current) return;

    setStatus('connecting');

    const term = new XTerm({
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#58a6ff',
        cursorAccent: '#0d1117',
        black: '#0d1117',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#76e3ea',
        white: '#c9d1d9',
        brightBlack: '#6e7681',
        brightRed: '#ffa198',
        brightGreen: '#56d364',
        brightYellow: '#e3b341',
        brightBlue: '#79c0ff',
        brightMagenta: '#d2a8ff',
        brightCyan: '#b3f0ff',
        brightWhite: '#f0f6fc',
      },
      fontFamily: '"JetBrains Mono", "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      allowProposedApi: true,
      scrollback: 5000,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    requestAnimationFrame(() => fit.fit());

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(
      `${proto}://${window.location.host}/terminal/ws?token=${encodeURIComponent(token)}`
    );
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      setStatus('connected');
      fit.fit();
      const dims = fit.proposeDimensions();
      if (dims) ws.send(JSON.stringify({ type: 'resize', rows: dims.rows, cols: dims.cols }));
    };

    ws.onclose = (e) => {
      if (e.code === 4003) {
        setForbidden(true);
        setToken(null);
        localStorage.removeItem(LS_TOKEN_KEY);
        term.dispose();
        return;
      }
      setStatus('disconnected');
      term.write('\r\n\x1b[33m[disconnected — use reconnect button to retry]\x1b[0m\r\n');
    };

    ws.onerror = () => setStatus('error');

    ws.onmessage = (e) => {
      if (e.data instanceof ArrayBuffer) term.write(new Uint8Array(e.data));
    };

    const enc = new TextEncoder();
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(enc.encode(data));
    });

    const handleResize = () => {
      fit.fit();
      const dims = fit.proposeDimensions();
      if (dims && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', rows: dims.rows, cols: dims.cols }));
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      term.dispose();
    };
  }, [token, connKey]);

  if (!token || forbidden) {
    return (
      <TokenPrompt
        onSubmit={handleTokenSubmit}
        errorMsg={forbidden ? 'Invalid token — try again' : null}
      />
    );
  }

  const statusDot = {
    connecting: 'bg-yellow-400 animate-pulse',
    connected: 'bg-green-400',
    disconnected: 'bg-gray-500',
    error: 'bg-red-400',
  }[status] || 'bg-gray-500';

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] font-mono">
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-[#161b22] shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-500 hover:text-gray-300 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <Terminal size={16} className="text-green-400" />
          <span className="text-green-400 text-sm font-semibold">kali terminal</span>
          <span className="text-gray-600 text-xs hidden sm:inline">sundance@192.168.68.115</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${statusDot}`} />
            <span className="text-gray-500 text-xs">{status}</span>
          </div>
          {(status === 'disconnected' || status === 'error') && (
            <button
              onClick={reconnect}
              className="text-gray-500 hover:text-gray-300 transition-colors"
              title="Reconnect"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </header>
      <div ref={containerRef} className="flex-1 overflow-hidden p-1" />
    </div>
  );
}
