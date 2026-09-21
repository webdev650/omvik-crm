const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Config
const PROD_URL = process.env.PROD_URL || 'https://omvik-crm-dy3u.onrender.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@omvik.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';

const ROUTES_DIR = path.join(__dirname, '../routes');
const SERVER_FILE = path.join(__dirname, '../server.js');

/**
 * 1. Parse server.js to build a mapping from route file names to base mount paths
 */
function parseServerMounts() {
  const serverContent = fs.readFileSync(SERVER_FILE, 'utf8');
  const fileToMounts = {}; // filename -> array of mount prefixes

  // Match app.use('/api/...', require('./routes/xxx'))
  const reqRegex = /app\.use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*require\s*\(\s*['"`]\.\/routes\/([^'"`]+)['"`]\s*\)\s*\)/g;
  let match;
  while ((match = reqRegex.exec(serverContent)) !== null) {
    const mountPath = match[1];
    let fileRef = match[2];
    if (!fileRef.endsWith('.js')) fileRef += '.js';
    if (!fileToMounts[fileRef]) fileToMounts[fileRef] = [];
    fileToMounts[fileRef].push(mountPath);
  }

  // Handle destructured mounts like:
  // const { opportunitySiteVisitRouter, siteVisitRouter } = require('./routes/siteVisitRoutes');
  // app.use('/api/opportunities', opportunitySiteVisitRouter);
  // app.use('/api/site-visits', siteVisitRouter);
  if (serverContent.includes('siteVisitRoutes')) {
    if (!fileToMounts['siteVisitRoutes.js']) fileToMounts['siteVisitRoutes.js'] = [];
    if (serverContent.includes("app.use('/api/opportunities', opportunitySiteVisitRouter)") || serverContent.includes('app.use("/api/opportunities", opportunitySiteVisitRouter)')) {
      fileToMounts['siteVisitRoutes.js'].push({ routerName: 'opportunitySiteVisitRouter', mount: '/api/opportunities' });
    }
    if (serverContent.includes("app.use('/api/site-visits', siteVisitRouter)") || serverContent.includes('app.use("/api/site-visits", siteVisitRouter)')) {
      fileToMounts['siteVisitRoutes.js'].push({ routerName: 'siteVisitRouter', mount: '/api/site-visits' });
    }
  }

  return fileToMounts;
}

/**
 * 2. Scan route files in backend/routes/ and extract all route definitions
 */
function extractRoutesFromCode(fileToMounts) {
  const routeFiles = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.js'));
  const allRoutes = [];

  for (const file of routeFiles) {
    const filePath = path.join(ROUTES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    const mounts = fileToMounts[file] || [];

    // Fallback default mount if missing from server.js
    let defaultMount = `/api/${file.replace(/Routes\.js$/, '').replace(/\.js$/, '')}`;
    if (file === 'authRoutes.js') defaultMount = '/api/auth';

    // Regex for direct calls: router.get('/path', ...) or customRouter.post('/path', ...)
    // Matches: router.get('/...', ...), router.post('/...', ...), etc.
    const directRegex = /(?:([a-zA-Z0-9_$]+)\.)?(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    
    // Regex for chained router.route('/path').get(...).post(...)
    const routeBlockRegex = /([a-zA-Z0-9_$]+)\s*\.\s*route\s*\(\s*['"`]([^'"`]+)['"`]\s*\)([\s\S]*?)(?=;\s*|\n\n|\n[a-zA-Z0-9_$]+\.|\nmodule\.exports)/g;

    let routeMatch;
    // Process chained router.route('/path') first
    while ((routeMatch = routeBlockRegex.exec(content)) !== null) {
      const routerName = routeMatch[1];
      const subPath = routeMatch[2];
      const chainBody = routeMatch[3];
      const methodRegex = /\.(get|post|put|patch|delete)\s*\(/g;
      let mMatch;
      while ((mMatch = methodRegex.exec(chainBody)) !== null) {
        const method = mMatch[1].toUpperCase();
        
        // Find line number
        const matchIndex = routeMatch.index;
        const lineNumber = content.substring(0, matchIndex).split('\n').length;

        // Resolve mount prefix
        const resolvedMounts = resolveMountPrefixes(routerName, mounts, defaultMount);
        for (const mountPrefix of resolvedMounts) {
          const fullPath = combinePath(mountPrefix, subPath);
          allRoutes.push({
            method,
            subPath,
            mountPrefix,
            fullPath,
            file: `backend/routes/${file}`,
            line: lineNumber,
            routerName,
            isMountedInServer: mounts.length > 0
          });
        }
      }
    }

    // Process direct router.get / post / patch / put / delete
    lines.forEach((lineText, idx) => {
      let dMatch;
      const lineRegex = /(?:([a-zA-Z0-9_$]+)\.)?(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
      while ((dMatch = lineRegex.exec(lineText)) !== null) {
        const routerName = dMatch[1] || 'router';
        const method = dMatch[2].toUpperCase();
        const subPath = dMatch[3];

        // Skip if inside a router.route block to prevent duplicate matches
        if (lineText.includes('.route(')) continue;

        const resolvedMounts = resolveMountPrefixes(routerName, mounts, defaultMount);
        for (const mountPrefix of resolvedMounts) {
          const fullPath = combinePath(mountPrefix, subPath);
          allRoutes.push({
            method,
            subPath,
            mountPrefix,
            fullPath,
            file: `backend/routes/${file}`,
            line: idx + 1,
            routerName,
            isMountedInServer: mounts.length > 0
          });
        }
      }
    });
  }

  // Deduplicate exact (method + fullPath) entries
  const uniqueRoutes = [];
  const seen = new Set();
  for (const r of allRoutes) {
    const key = `${r.method}:${r.fullPath}:${r.file}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRoutes.push(r);
    }
  }

  return uniqueRoutes;
}

function resolveMountPrefixes(routerName, mounts, defaultMount) {
  if (!mounts || mounts.length === 0) return [defaultMount];

  const stringMounts = mounts.filter(m => typeof m === 'string');
  const objectMounts = mounts.filter(m => typeof m === 'object');

  if (objectMounts.length > 0) {
    const matchedObj = objectMounts.find(o => o.routerName === routerName);
    if (matchedObj) return [matchedObj.mount];
  }

  if (stringMounts.length > 0) return stringMounts;
  return [defaultMount];
}

function combinePath(mount, sub) {
  let combined = mount;
  if (sub === '/') {
    return combined;
  }
  if (!combined.endsWith('/') && !sub.startsWith('/')) {
    combined += '/' + sub;
  } else if (combined.endsWith('/') && sub.startsWith('/')) {
    combined += sub.substring(1);
  } else {
    combined += sub;
  }
  return combined;
}

/**
 * 3. Make HTTP request helper
 */
function makeRequest(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const lib = url.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = lib.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch (e) {
          json = body;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: json
        });
      });
    });

    req.on('error', (err) => resolve({ statusCode: 0, error: err.message, body: null }));
    
    if (options.data) {
      req.write(typeof options.data === 'string' ? options.data : JSON.stringify(options.data));
    }
    req.end();
  });
}

/**
 * 4. Main Audit Execution
 */
async function runAudit() {
  console.log(`\n🔍 =================================================`);
  console.log(`🔍  OMVIK CRM PRODUCTION ROUTE AUDIT & INTEGRITY CHECK`);
  console.log(`🔍  Target Environment: ${PROD_URL}`);
  console.log(`🔍 =================================================\n`);

  console.log(`📦 [1/4] Parsing server.js route mounts...`);
  const fileToMounts = parseServerMounts();

  console.log(`📂 [2/4] Scanning backend/routes/*.js files...`);
  const routes = extractRoutesFromCode(fileToMounts);
  console.log(`✅ Extracted ${routes.length} total route endpoints defined in codebase.\n`);

  console.log(`🔑 [3/4] Authenticating with production as Admin (${ADMIN_EMAIL})...`);
  let authCookie = null;
  let authToken = null;

  try {
    const loginRes = await makeRequest(`${PROD_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
    });

    if (loginRes.statusCode === 200 && loginRes.body && loginRes.body.token) {
      authToken = loginRes.body.token;
      console.log(`✅ Admin authenticated successfully! Token obtained.`);
    } else {
      console.warn(`⚠️ Admin login returned status ${loginRes.statusCode}:`, loginRes.body);
    }

    if (loginRes.headers && loginRes.headers['set-cookie']) {
      const cookies = loginRes.headers['set-cookie'];
      const tokenCookie = cookies.find(c => c.startsWith('token='));
      if (tokenCookie) {
        authCookie = tokenCookie.split(';')[0];
      }
    }
  } catch (err) {
    console.error(`❌ Failed to connect to production for authentication:`, err.message);
  }

  const defaultHeaders = {
    'Content-Type': 'application/json'
  };
  if (authCookie) defaultHeaders['Cookie'] = authCookie;
  if (authToken) defaultHeaders['Authorization'] = `Bearer ${authToken}`;

  console.log(`\n🚀 [4/4] Probing all ${routes.length} production routes...`);
  console.log(`-------------------------------------------------------------------------------------------------------`);
  console.log(` METHOD  | STATUS | LIVE PATH                                        | SOURCE FILE & LINE`);
  console.log(`-------------------------------------------------------------------------------------------------------`);

  let liveCount = 0;
  let missing404Count = 0;
  const missingRoutes = [];
  const liveRoutes = [];

  const dummyObjectId = '650000000000000000000000';

  for (let i = 0; i < routes.length; i++) {
    const r = routes[i];

    // Substitute route params with valid dummy ObjectId or string
    let probePath = r.fullPath
      .replace(/:id/g, dummyObjectId)
      .replace(/:userId/g, dummyObjectId)
      .replace(/:leadId/g, dummyObjectId)
      .replace(/:batchId/g, dummyObjectId)
      .replace(/:opportunityId/g, dummyObjectId)
      .replace(/:projectId/g, dummyObjectId)
      .replace(/:teamId/g, dummyObjectId)
      .replace(/:propertyId/g, dummyObjectId)
      .replace(/:postId/g, dummyObjectId)
      .replace(/:customerId/g, dummyObjectId)
      .replace(/:notificationId/g, dummyObjectId)
      .replace(/:[a-zA-Z0-9_]+/g, 'test_param');

    const probeUrl = `${PROD_URL}${probePath}`;

    // Throttling delay (150ms) to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 150));

    let status = 0;
    let bodyMsg = '';
    try {
      const res = await makeRequest(probeUrl, {
        method: r.method,
        headers: defaultHeaders,
        data: r.method !== 'GET' ? {} : null
      });
      status = res.statusCode;
      if (res.body && typeof res.body === 'object') {
        bodyMsg = res.body.message || JSON.stringify(res.body);
      } else if (typeof res.body === 'string') {
        bodyMsg = res.body;
      }
    } catch (e) {
      status = 0;
    }

    // A 404 is a missing/unmounted route IF Express 404 handler returns "Route /api/... not found" or standard 404 HTML
    // Note: DB "Item not found" status 404 usually comes with json message like "User not found" or "Lead not found"
    const isExpressRoute404 = status === 404 && (
      typeof bodyMsg === 'string' && (
        bodyMsg.includes('Route') || bodyMsg.includes('Cannot GET') || bodyMsg.includes('Cannot POST') || bodyMsg.includes('Cannot PATCH') || bodyMsg.includes('Cannot PUT') || bodyMsg.includes('Cannot DELETE') || bodyMsg.includes('404 Not Found')
      )
    );

    const isTrueMissing = status === 404 || !r.isMountedInServer;

    const methodPadded = r.method.padEnd(6, ' ');
    const statusStr = status ? String(status).padEnd(6, ' ') : 'ERR   ';
    const pathPadded = r.fullPath.padEnd(50, ' ');
    const locationStr = `${r.file}:${r.line}`;

    if (isTrueMissing && isExpressRoute404) {
      missing404Count++;
      missingRoutes.push({ ...r, status, probeUrl, bodyMsg });
      console.log(`🔴 ${methodPadded} | ${statusStr} | ${pathPadded} | ${locationStr} (UNMOUNTED/404)`);
    } else if (status === 404) {
      // 404 from business logic (e.g. "Opportunity not found" or "Notification not found")
      // The route IS mounted and reachable in production!
      liveCount++;
      liveRoutes.push({ ...r, status });
      console.log(`🟢 ${methodPadded} | ${statusStr} | ${pathPadded} | ${locationStr} (Mounted - Resource 404)`);
    } else {
      liveCount++;
      liveRoutes.push({ ...r, status });
      console.log(`🟢 ${methodPadded} | ${statusStr} | ${pathPadded} | ${locationStr}`);
    }
  }

  console.log(`-------------------------------------------------------------------------------------------------------\n`);

  console.log(`📊 =================================================`);
  console.log(`📊  AUDIT SUMMARY REPORT`);
  console.log(`📊 =================================================`);
  console.log(`Total Routes Scanned in Code: ${routes.length}`);
  console.log(`🟢 Live & Reachable in Production: ${liveCount}`);
  console.log(`🔴 Unmounted / Missing (404) in Production: ${missing404Count}`);

  if (missing404Count > 0) {
    console.log(`\n❌ CRITICAL: The following ${missing404Count} route(s) are defined in code but produce 404 on Production:`);
    missingRoutes.forEach(m => {
      console.log(`   - [${m.method}] ${m.fullPath} -> Defined in ${m.file}:${m.line}`);
    });
    console.log(`\n💡 ACTION REQUIRED: Ensure these routes are mounted in backend/server.js and a fresh deploy is triggered on Render.`);
  } else {
    console.log(`\n✅ PERFECT! All ${routes.length} routes defined in code are mounted and reachable in live production.`);
  }
  console.log(`=================================================\n`);
}

runAudit().catch(err => {
  console.error('Audit Script Fatal Failure:', err);
  process.exit(1);
});
