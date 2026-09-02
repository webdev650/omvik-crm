const https = require('https');

const start = Date.now();
const payload = JSON.stringify({ email: 'omvikrealcon@gmail.com' });

const req = https.request({
  hostname: 'omvik-crm-dy3u.onrender.com',
  port: 443,
  path: '/api/auth/forgot-password',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let body = '';
  console.log(`[${Date.now() - start}ms] Status: ${res.statusCode}`);
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log(`[${Date.now() - start}ms] Body:`, body));
});

req.on('error', err => console.error('Error:', err.message));
req.write(payload);
req.end();
