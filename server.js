// server.js — Express static server + simple acts API with JSON file persistence
const express = require('express');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');

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
  // atomic write: write to temp file then rename
  const tmpPath = actsPath + '.tmp';
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpPath, actsPath);
  } catch (err) {
    // cleanup temp file if present
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch(e){}
    throw err;
  }
}

// Middlewares
app.use(compression());
app.use(express.json());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "https:"],
      // script-src: no 'unsafe-inline' because JS is now an external file served from the same origin
      scriptSrc: ["'self'", "https:"],
      // keep 'unsafe-inline' for styles for now because index.html contains an inline <style> block and inline style attributes
      // (migrate styles to external CSS later to remove 'unsafe-inline' from style-src)
      styleSrc: ["'self'", "https:", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

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
  try {
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
  } catch (err) {
    console.error('Failed to record act', err);
    res.status(500).json({ error: 'Failed to record act' });
  }
});

// Allow client-side routing for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
