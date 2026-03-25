import https from 'https';

export default async function handler(req, res) {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, xAPIverse-Key');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ ok: false, error: 'Method Not Allowed' });
        return;
    }

    const { link } = req.body;
    const API_KEY = 'sk_d35341aacb2113314516800c03737ab2';

    if (!link) {
        res.status(400).json({ ok: false, error: 'No link provided' });
        return;
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

    return new Promise((resolve, reject) => {
        const proxyReq = https.request(options, (proxyRes) => {
            let data = '';
            proxyRes.on('data', (chunk) => { data += chunk; });
            proxyRes.on('end', () => {
                res.status(proxyRes.statusCode).send(data);
                resolve();
            });
        });

        proxyReq.on('error', (e) => {
            res.status(500).json({ ok: false, error: 'Proxy error: ' + e.message });
            resolve();
        });

        proxyReq.write(postData);
        proxyReq.end();
    });
}
