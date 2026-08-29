#!/usr/bin/env node
/**
 * Winziger statischer Server – nur für die lokale Entwicklung.
 * Aufruf: npm start   (danach http://localhost:8080 öffnen)
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const wurzel = new URL('..', import.meta.url).pathname;
const port = Number(process.env.PORT) || 8080;

const TYPEN = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

createServer(async (req, res) => {
  const pfad = decodeURIComponent(req.url.split('?')[0]);
  const datei = join(wurzel, normalize(pfad === '/' ? '/index.html' : pfad).replace(/^(\.\.[/\\])+/, ''));
  try {
    const inhalt = await readFile(datei);
    res.writeHead(200, { 'Content-Type': TYPEN[extname(datei)] || 'application/octet-stream' });
    res.end(inhalt);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Nicht gefunden');
  }
}).listen(port, () => console.log(`Runenschlacht läuft auf http://localhost:${port}`));
