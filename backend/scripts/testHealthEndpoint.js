const https = require('https');

const start = Date.now();
console.log('Sending GET to https://omvik-crm-dy3u.onrender.com/api/health ...');

const req = https.get('https://omvik-crm-dy3u.onrender.com/api/health', (res) => {
  let body = '';
  console.log(`[${Date.now() - start}ms] Status: ${res.statusCode}`);
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`[${Date.now() - start}ms] Response:`, body);
  });
});

req.on('error', err => {
  console.error(`[${Date.now() - start}ms] Error:`, err.message);
});
