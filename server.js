const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8001;
const API_KEY = 'sk_d35341aacb2113314516800c03737ab2';

http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
    }

    // Handle Vercel-style API path locally
    if (req.url === '/api/proxy' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const parsed = JSON.parse(body);
                const link = parsed.link;
                if (!link) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ ok: false, error: 'No link provided' }));
                }

                const postData = JSON.stringify({ url: link });

                const options = {
                    hostname: 'xapiverse.com',
                    port: 443,
                    path: '/api/terabox',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'xAPIverse-Key': API_KEY,
                        'Content-Length': Buffer.byteLength(postData)
                    }
                };

                const proxyReq = https.request(options, (proxyRes) => {
                    let proxyData = '';
                    proxyRes.on('data', chunk => { proxyData += chunk; });
                    proxyRes.on('end', () => {
                        res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
                        res.end(proxyData);
                    });
                });

                proxyReq.on('error', (e) => {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: false, error: 'Proxy error: ' + e.message }));
                });

                proxyReq.write(postData);
                proxyReq.end();
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: 'Error: ' + e.message }));
            }
        });
        return;
    }

    // Serve static files
    let urlPath = req.url.split('?')[0];
    let filePath = path.join(__dirname, urlPath === '/' ? 'index.html' : urlPath);
    
    // Prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        return res.end('Forbidden');
    }

    const extname = path.extname(filePath);
    let contentType = 'text/html';
    switch (extname) {
        case '.js': contentType = 'text/javascript'; break;
        case '.css': contentType = 'text/css'; break;
        case '.json': contentType = 'application/json'; break;
        case '.png': contentType = 'image/png'; break;
        case '.jpg': contentType = 'image/jpg'; break;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });

}).listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
