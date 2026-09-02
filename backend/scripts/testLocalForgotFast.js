const http = require('http');

const start = Date.now();
const payload = JSON.stringify({ email: 'aparna@omvikrealcon.com' });

console.log('Sending request to local backend on port 5000...');

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/forgot-password',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let body = '';
  console.log(`[${Date.now() - start}ms] Local Server Response Status: ${res.statusCode}`);
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`[${Date.now() - start}ms] Response Body:`, body);
  });
});

req.on('error', err => console.error('Error:', err.message));
req.write(payload);
req.end();
