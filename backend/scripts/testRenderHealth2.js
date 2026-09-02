const https = require('https');

https.get('https://omvik-crm-dy3u.onrender.com/health', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Render Health:', body));
});
