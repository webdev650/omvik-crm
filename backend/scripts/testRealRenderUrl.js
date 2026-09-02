const https = require('https');

function testRealRenderUrl(emailToTest) {
  const data = JSON.stringify({ email: emailToTest });

  const options = {
    hostname: 'omvik-crm-dy3u.onrender.com',
    port: 443,
    path: '/api/auth/forgot-password',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  console.log(`\nTesting REAL Render URL for email: "${emailToTest}"...`);

  const req = https.request(options, (res) => {
    let body = '';
    console.log(`Response Status Code: ${res.statusCode}`);
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      console.log('Response Body:', body);
    });
  });

  req.on('error', (e) => {
    console.error(`HTTP Request Error: ${e.message}`);
  });

  req.write(data);
  req.end();
}

testRealRenderUrl('omvikrealcon@gmail.com');
testRealRenderUrl('aparna@omvikrealcon.com');
