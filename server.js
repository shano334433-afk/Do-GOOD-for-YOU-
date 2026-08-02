// server.js — minimal Express static server for Replit
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const staticDir = path.join(__dirname, 'public');

// Basic security headers — tune CSP for your app's needs
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  // Permissions-Policy value must be a string and no trailing comma
  res.setHeader('Permissions-Policy', 'geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' https:; img-src 'self' data: https:; script-src 'self' https: 'unsafe-inline'"
  );
  next();
});

// Serve static files
app.use(express.static(staticDir));

// SPA fallback: serve index.html for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
