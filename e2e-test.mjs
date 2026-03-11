// e2e-test.mjs — full end-to-end simulation against localhost:3000
// Tests 5 email scenarios, checks reply quality, then queries Supabase for analytics data
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';
const AUTH_COOKIE = 'neurotoned_admin_token=authenticated';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TEST_EMAILS = [
  {
    label: '1. Program Refund',
    email: "Hi, I purchased the 30-Day Nervous System Reset program 2 weeks ago and I'm not seeing results. I'd like a refund please. My email is sarah@test.com. - Sarah"
  },
  {
    label: '2. Login / Access Issue',
    email: "Hello, I bought the 6-Program Bundle last month but I cannot find it in my account. When I log in it says no programs available. I need help accessing what I paid for. - James (james@test.com)"
  },
  {
    label: '3. Subscription Cancel',
    email: "Please cancel my subscription right away. I've been charged twice now and I don't want any more charges. My name is Maria, email maria@test.com"
  },
  {
    label: '4. Billing Confusion',
    email: "Hi, I saw a charge from Neurotoned on my bank statement and I'm confused because I thought it was a one-time purchase. Will I keep getting charged? - Tom, tom@test.com"
  },
  {
    label: '5. Content Question',
    email: "Hi, I just started the 30-Day program. Can you tell me how many times per week I should be doing the breathwork sessions? Is it okay to do them daily? - Lisa"
  }
];

async function callApi(email) {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': AUTH_COOKIE
      },
      body: JSON.stringify({ email })
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const data = await res.json();
    return { ok: res.ok, status: res.status, data, elapsed };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function checkReplyQuality(reply) {
  if (!reply) return ['FAIL: No reply'];
  const issues = [];
  if (reply.includes('**') || reply.includes('##') || reply.includes('* ')) issues.push('Contains markdown');
  if (reply.includes('\u2014') || reply.includes(' \u2013 ')) issues.push('Contains em/en dash');
  if (/\n{3,}/.test(reply)) issues.push('Has 3+ consecutive newlines');
  if (/\n[^\n]/.test(reply) && !/\n\n/.test(reply)) issues.push('Single newlines without double spacing');
  if (/absolutely|certainly|please don't hesitate/i.test(reply)) issues.push('Contains banned phrase');
  if (reply.length < 100) issues.push('Reply too short (<100 chars)');
  if (reply.length > 2000) issues.push('Reply very long (>2000 chars)');
  return issues;
}

async function run() {
  console.log('=== Neurotoned E2E Test ===\n');
  console.log('Checking server is up...');
  try {
    const ping = await fetch(`${BASE_URL}/`, { method: 'GET' });
    console.log('Server status:', ping.status === 200 ? 'UP' : `HTTP ${ping.status}`);
  } catch (e) {
    console.log('ERROR: Server not reachable at', BASE_URL);
    console.log('Make sure npm run dev is running');
    process.exit(1);
  }

  const results = [];
  for (const test of TEST_EMAILS) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Testing: ${test.label}`);
    const result = await callApi(test.email);

    if (!result.ok) {
      console.log(`  STATUS: FAIL (${result.status || result.error})`);
      results.push({ label: test.label, pass: false, error: result.error || result.data?.error });
      continue;
    }

    const reply = result.data?.response;
    const issues = checkReplyQuality(reply);

    console.log(`  Time: ${result.elapsed}s`);
    console.log(`  Reply length: ${reply?.length || 0} chars`);
    console.log(`  Quality issues: ${issues.length === 0 ? 'NONE' : issues.join(', ')}`);
    console.log(`  Reply preview: ${reply?.substring(0, 150).replace(/\n/g, '\\n')}...`);

    results.push({ label: test.label, pass: issues.length === 0, elapsed: result.elapsed, issues, reply });

    // Small delay between calls
    await new Promise(r => setTimeout(r, 2000));
  }

  // Check Supabase for saved analytics
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUPABASE ANALYTICS CHECK\n');
  await new Promise(r => setTimeout(r, 3000)); // wait for fire-and-forget saves

  const { data: rows, error } = await supabase
    .from('customer_concerns')
    .select('concern_category, sub_reason, root_cause, urgency, churn_risk, concern_summary, severity_distress_level, customer_name, status')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.log('Supabase query error:', error.message);
  } else if (!rows || rows.length === 0) {
    console.log('WARNING: No rows found in Supabase. Analytics may not be saving (check if SQL migration was run).');
  } else {
    console.log(`Found ${rows.length} rows:\n`);
    for (const row of rows) {
      console.log(`  Category:  ${row.concern_category}`);
      console.log(`  Sub-reason: ${row.sub_reason}`);
      console.log(`  Root cause: ${row.root_cause}`);
      console.log(`  Urgency:   ${row.urgency}`);
      console.log(`  Churn risk: ${row.churn_risk}`);
      console.log(`  Severity:  ${row.severity_distress_level}`);
      console.log(`  Summary:   ${row.concern_summary}`);
      console.log(`  Customer:  ${row.customer_name}`);
      console.log();
    }
  }

  // Final summary
  console.log('='.repeat(60));
  console.log('TEST SUMMARY\n');
  for (const r of results) {
    const icon = r.pass ? '✓' : '✗';
    console.log(`  ${icon} ${r.label} — ${r.elapsed || 'N/A'}s${r.issues?.length ? ' — ' + r.issues.join(', ') : ''}`);
  }
  const passed = results.filter(r => r.pass).length;
  console.log(`\n  ${passed}/${results.length} tests passed`);
}

run();
