const https = require('https');

async function testFullBrowserFlow() {
  console.log('=== SIMULATING EXACT BROWSER POST FROM VERCEL TO RENDER ===\n');

  // Step 1: Send OPTIONS Preflight Request (Chrome sends this first!)
  console.log('Step 1: Sending OPTIONS Preflight Request...');
  const optionsOptions = {
    hostname: 'omvik-crm-dy3u.onrender.com',
    port: 443,
    path: '/api/auth/forgot-password',
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://omvik-crm.vercel.app',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type'
    }
  };

  await new Promise((resolve) => {
    const req = https.request(optionsOptions, (res) => {
      console.log(`OPTIONS Status Code: ${res.statusCode}`);
      console.log('OPTIONS Headers:', res.headers);
      resolve();
    });
    req.on('error', (err) => {
      console.error('OPTIONS Error:', err.message);
      resolve();
    });
    req.end();
  });

  // Step 2: Send Actual POST Request
  console.log('\nStep 2: Sending POST Request with payload { email: "omvikrealcon@gmail.com" }...');
  const payload = JSON.stringify({ email: 'omvikrealcon@gmail.com' });
  const postOptions = {
    hostname: 'omvik-crm-dy3u.onrender.com',
    port: 443,
    path: '/api/auth/forgot-password',
    method: 'POST',
    headers: {
      'Origin': 'https://omvik-crm.vercel.app',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const startTime = Date.now();

  await new Promise((resolve) => {
    const req = https.request(postOptions, (res) => {
      let body = '';
      console.log(`POST Status Code: ${res.statusCode} (took ${Date.now() - startTime}ms)`);
      console.log('POST Headers:', res.headers);
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log('POST Response Body:', body);
        resolve();
      });
    });
    req.on('error', (err) => {
      console.error('POST Error:', err.message);
      resolve();
    });
    req.write(payload);
    req.end();
  });
}

testFullBrowserFlow();
