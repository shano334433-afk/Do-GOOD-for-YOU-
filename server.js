// server.js — Express static server + simple acts API with JSON file persistence
const express = require('express');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const staticDir = path.join(__dirname, 'public');
const storageDir = path.join(__dirname, 'storage');
const actsPath = path.join(storageDir, 'acts.json');

// Ensure storage dir exists
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

function readActs() {
  try {
    return JSON.parse(fs.readFileSync(actsPath, 'utf8'));
  } catch (e) {
    return { current: null, history: [] };
  }
}

function writeActs(data) {
  fs.writeFileSync(actsPath, JSON.stringify(data, null, 2), 'utf8');
}

// Middlewares
app.use(compression());
app.use(express.json());

// Basic security headers — tune CSP for your app's needs
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  res.setHeader('Permissions-Policy', 'geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' https:; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:"
  );
  next();
});

// Serve static files with caching
app.use(express.static(staticDir, { maxAge: '1d' }));

// API: get current act
app.get('/api/acts/current', (req, res) => {
  const data = readActs();
  if (!data.current) return res.status(404).json({ error: 'No current act' });
  res.json(data.current);
});

// API: get history
app.get('/api/acts/history', (req, res) => {
  const data = readActs();
  res.json(data.history || []);
});

// API: record a completed act
app.post('/api/acts', (req, res) => {
  const data = readActs();
  const act = data.current;
  if (!act) return res.status(400).json({ error: 'No current act to record' });

  const record = {
    id: uuidv4(),
    actId: act.id,
    title: act.title,
    category: act.category,
    timestamp: new Date().toISOString(),
    note: req.body.note || null
  };

  data.history = data.history || [];
  data.history.unshift(record);
  // keep history to a reasonable length
  if (data.history.length > 1000) data.history = data.history.slice(0, 1000);

  writeActs(data);
  res.status(201).json(record);
});

// Allow client-side routing for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
