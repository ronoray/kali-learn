import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import toolsRouter from './routes/tools.js';
import aiRouter from './routes/ai.js';
import { attachTerminalServer } from './terminal.js';

const envPath = process.env.NODE_ENV === 'production'
  ? '/opt/kali-learn/.env'
  : '.env';
dotenv.config({ path: envPath });

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY not set');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4500;

app.use(cors());
app.use(express.json());

app.use('/api/tools', toolsRouter);
app.use('/api/ai', aiRouter);

app.get('/api/health', (req, res) => res.json({
  ok: true,
  ts: new Date().toISOString(),
  sha: process.env.COMMIT_SHA || 'dev',
}));

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const server = createServer(app);
attachTerminalServer(server);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`kali-learn server running on port ${PORT}`);
});
