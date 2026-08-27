const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;

const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.ico':'image/x-icon' };

const server = http.createServer(async (req, res) => {
  // API proxy
  if (req.method === 'POST' && req.url === '/functions/claude') {
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
