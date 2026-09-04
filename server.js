const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;

const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.ico':'image/x-icon' };

// FIX (BUG-20, 9/4): the Claude API proxy below had no rate limiting at all -- a runaway
// client-side loop, a stuck retry, or a misbehaving hub could hammer this endpoint with no
// limit, running up the bill on a single shared Anthropic key. This is a simple in-memory
// sliding-window limiter per client IP: no new dependency, and correct for how this app is
// actually deployed -- package.json runs `node server.js` as one long-lived process (not a
// horizontally-scaled or serverless fleet), so one process's memory is the whole picture. If
// that ever changes, this in-memory map would need to move to something shared (e.g. Redis),
// since each instance would otherwise keep its own separate counters.
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20;     // per IP, per window -- generous for real staff usage, tight enough to stop a runaway loop
const rateLimitHits = new Map(); // ip -> array of request timestamps (ms) within the current window

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  let hits = rateLimitHits.get(ip) || [];
  hits = hits.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (hits.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  rateLimitHits.set(ip, hits);
  return false;
}

// Periodic sweep so long-idle IPs don't sit in memory forever. unref() keeps this timer from
// holding the process open on its own.
setInterval(() => {
  const now = Date.now();
  for (const [ip, hits] of rateLimitHits) {
    const fresh = hits.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    if (fresh.length) rateLimitHits.set(ip, fresh);
    else rateLimitHits.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS).unref();

const server = http.createServer(async (req, res) => {
  // API proxy
  if (req.method === 'POST' && req.url === '/functions/claude') {
    const clientIp = getClientIp(req);
    if (isRateLimited(clientIp)) {
      res.writeHead(429, {'Content-Type':'application/json', 'Retry-After': String(RATE_LIMIT_WINDOW_MS / 1000)});
      return res.end(JSON.stringify({error:'Too many requests to the AI proxy from this connection -- please wait a moment and try again.'}));
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.writeHead(500, {'Content-Type':'application/json'});
      return res.end(JSON.stringify({error:'API key not configured on server.'}));
    }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body);
        // Wrap the system prompt as a cacheable content block. Our system
        // prompts (DAP note, risk scan, linkage, treatment plan) are large
        // and identical across repeated calls, so this lets Anthropic cache
        // them instead of reprocessing the full prompt on every request.
        const cachedSystem = typeof parsed.system === 'string'
          ? [{ type: 'text', text: parsed.system, cache_control: { type: 'ephemeral' } }]
          : parsed.system;
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method:'POST',
          headers:{'Content-Type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01'},
          body: JSON.stringify({model:'claude-sonnet-4-6',max_tokens:6000,messages:parsed.messages,system:cachedSystem})
        });
        const data = await r.json();
        res.writeHead(r.status, {'Content-Type':'application/json'});
        res.end(JSON.stringify(data));
      } catch(e) {
        res.writeHead(500, {'Content-Type':'application/json'});
        res.end(JSON.stringify({error:'Server error: '+e.message}));
      }
    });
    return;
  }

  // Static files
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath);
  const ext = path.extname(filePath);
  if (fs.existsSync(filePath)) {
    res.writeHead(200, {'Content-Type': MIME[ext]||'text/plain'});
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => console.log('Thrive Tools running on port ' + PORT));
