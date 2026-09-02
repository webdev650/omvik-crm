const https = require('https');

const payload = JSON.stringify({ email: 'omvikrealcon@gmail.com' });

const options = {
  hostname: 'omvik-crm-dy3u.onrender.com',
  port: 443,
  path: '/api/auth/forgot-password',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'Origin': 'https://omvik-crm.vercel.app'
  }
};

console.log('Sending request to live Render backend...');

const req = https.request(options, (res) => {
  let body = '';
  console.log(`HTTP STATUS CODE: ${res.statusCode}`);
  console.log('HEADERS:', res.headers);
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('RESPONSE BODY:', body);
  });
});

req.on('error', (err) => {
  console.error('HTTPS ERROR:', err);
});

req.write(payload);
req.end();
