const https = require('https');

function checkHealth() {
  https.get('https://omvik-backend.onrender.com/health', (res) => {
    let body = '';
    console.log(`Health Status: ${res.statusCode}`);
    res.on('data', chunk => body += chunk);
    res.on('end', () => console.log('Health Body:', body));
  }).on('error', err => console.error('Health Error:', err.message));
}

checkHealth();
