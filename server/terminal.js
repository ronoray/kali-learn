import { WebSocketServer } from 'ws';
import { Client } from 'ssh2';

export function attachTerminalServer(httpServer) {
  const sshHost = process.env.TERMINAL_SSH_HOST;
  const sshPort = parseInt(process.env.TERMINAL_SSH_PORT || '22', 10);
  const sshUser = process.env.TERMINAL_SSH_USER || 'sundance';
  const sshKeyB64 = process.env.TERMINAL_SSH_PRIVATE_KEY;
  const token = process.env.TERMINAL_TOKEN;

  if (!sshHost || !sshKeyB64) {
    console.log('[terminal] TERMINAL_SSH_HOST or TERMINAL_SSH_PRIVATE_KEY not set — terminal disabled');
    return;
  }

  const privateKey = Buffer.from(sshKeyB64, 'base64').toString('utf8');
  const wss = new WebSocketServer({ server: httpServer, path: '/terminal/ws' });

  wss.on('connection', (ws, req) => {
    if (token) {
      const url = new URL(req.url, 'http://localhost');
      if (url.searchParams.get('token') !== token) {
        ws.close(4003, 'Forbidden');
        return;
      }
    }

    const ssh = new Client();
    let sshStream = null;

    ssh.on('ready', () => {
      ssh.shell({ term: 'xterm-256color', cols: 80, rows: 24 }, (err, stream) => {
        if (err) {
          if (ws.readyState === 1) {
            ws.send(Buffer.from(`\r\n\x1b[31mShell error: ${err.message}\x1b[0m\r\n`));
            ws.close();
          }
          return;
        }
        sshStream = stream;

        stream.on('data', (data) => {
          if (ws.readyState === 1) ws.send(data, { binary: true });
        });
        stream.stderr.on('data', (data) => {
          if (ws.readyState === 1) ws.send(data, { binary: true });
        });
        stream.on('close', () => {
          if (ws.readyState === 1) ws.close();
        });
      });
    });

    ssh.on('error', (err) => {
      if (ws.readyState === 1) {
        ws.send(Buffer.from(`\r\n\x1b[31mSSH error: ${err.message}\x1b[0m\r\n`));
        ws.close();
      }
    });

    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        if (sshStream) sshStream.write(data);
      } else {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'resize' && sshStream) {
            sshStream.setWindow(msg.rows, msg.cols, 0, 0);
          }
        } catch {}
      }
    });

    ws.on('close', () => {
      try { if (sshStream) sshStream.close(); } catch {}
      try { ssh.end(); } catch {}
    });

    ssh.connect({
      host: sshHost,
      port: sshPort,
      username: sshUser,
      privateKey,
      readyTimeout: 10000,
    });
  });

  console.log(`[terminal] WebSocket terminal ready at /terminal/ws (→ ${sshUser}@${sshHost}:${sshPort})`);
}
