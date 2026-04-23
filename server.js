#!/usr/bin/env node
/**
 * Korea Days Tracker — Server
 * Run:  node server.js
 * Then open:  http://localhost:3000
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT      = process.env.PORT || 3000;
const ROOT      = __dirname;
const DATA_FILE = path.join(ROOT, 'korea-data.json');

const MIME = {
  '.html': 'text/html',
  '.js':   'text/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
};

// ── Data helpers ──────────────────────────────────────────────────
const DEFAULT_DATA = { trips: null, overrides: [] };

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ── Request handler ───────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  // GET /api/korea-data
  if (req.method === 'GET' && url === '/api/korea-data') {
    const data = readData();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }

  // POST /api/korea-data
  if (req.method === 'POST' && url === '/api/korea-data') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        writeData(data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end('{"error":"Invalid JSON"}');
      }
    });
    return;
  }

  // Serve static files
  let filePath = url === '/' ? '/korea-days.html' : url;
  filePath = path.join(ROOT, filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext  = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Korea Days server running at http://localhost:${PORT}`);
});
