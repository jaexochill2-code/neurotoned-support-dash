// delete-old-vercel-deployments.mjs
// Deletes all Vercel deployments EXCEPT the current production one.
// Get your token from: https://vercel.com/account/tokens

import https from 'https';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_NAME = 'neurotoned-support-dash'; // your project slug

if (!VERCEL_TOKEN) {
  console.error('❌ Set VERCEL_TOKEN env var first:\n   $env:VERCEL_TOKEN="your_token_here"\n   node delete-old-vercel-deployments.mjs');
  process.exit(1);
}

function api(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.vercel.com',
      path,
      method,
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  // 1. Get all deployments for the project (paginate if needed)
  console.log(`Fetching deployments for "${PROJECT_NAME}"...`);
  let all = [];
  let next = null;

  do {
    const qs = `?projectId=${PROJECT_NAME}&limit=100${next ? `&until=${next}` : ''}`;
    const res = await api('GET', `/v6/deployments${qs}`);
    if (res.error) { console.error('API error:', res.error); process.exit(1); }
    all = all.concat(res.deployments || []);
    next = res.pagination?.next ?? null;
  } while (next);

  console.log(`Found ${all.length} total deployments.\n`);

  // 2. Find the current production deployment (state = READY + target = production)
  const prod = all.find(d => d.target === 'production' && d.state === 'READY');
  if (!prod) {
    console.log('⚠️  Could not identify current production deployment. Aborting for safety.');
    process.exit(1);
  }
  console.log(`✓ Keeping production: ${prod.uid} (${prod.url})`);

  // 3. Delete everything else
  const toDelete = all.filter(d => d.uid !== prod.uid);
  console.log(`Deleting ${toDelete.length} old deployments...\n`);

  let deleted = 0, failed = 0;
  for (const d of toDelete) {
    const res = await api('DELETE', `/v13/deployments/${d.uid}`);
    if (res.state === 'DELETED' || res.uid) {
      deleted++;
      process.stdout.write(`  [${deleted + failed}/${toDelete.length}] ✓ ${d.uid}\r`);
    } else {
      failed++;
      console.log(`  ❌ Failed to delete ${d.uid}:`, res.error?.message ?? JSON.stringify(res).slice(0, 60));
    }
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\n\nDone. Deleted: ${deleted} | Failed: ${failed} | Production kept: 1`);
}

run().catch(console.error);
