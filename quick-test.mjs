// End-to-end test: 3 scenarios against the optimized generate API

const scenarios = [
  {
    name: "HOLLY — Grief + Program Access",
    email: `Good evening,

We recently had to put my grandpa to rest, unable to bury due to destruction at the cemetery, lived through a tornado wrecking our city, and are now dealing with much damage at our business. That said, we are so grateful everyone is ok! We could all use some techniques to calm down, though.
I sent that form with her information before I reached out to you, but she never got any link or email. I just did it again, but that would be awesome if you could share the link and I'll give it to her. Thank you very much.
Does she get access starting from here I'm at/how long I've already been in the program, or would she get the full 6 months that I got originally? Talk to you soon.

Thanks,
Holly Trapp`,
    checks: ["empathy", "direct_links"]
  },
  {
    name: "CHERISE — Refund Request",
    email: `Hi, I'd like a refund for the 30 day program please. Money is really tight right now and I just can't afford it. I'm sorry. - Cherise`,
    checks: ["refund_honored", "no_save_attempt"]
  },
  {
    name: "SARAH — Can't Login",
    email: `Hi, I bought the 30 day program but I can't login. My email is sarah@test.com. Please help. - Sarah`,
    checks: ["login_link", "password_link"]
  }
];

async function runTest(scenario, index) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  [${index + 1}/${scenarios.length}] ${scenario.name}`);
  console.log(`${"=".repeat(60)}`);

  try {
    const start = Date.now();
    const res = await fetch("http://localhost:3000/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: "neurotoned_admin_token=authenticated" },
      body: JSON.stringify({ email: scenario.email })
    });

    const elapsed = Date.now() - start;
    const data = await res.json();

    if (data.error) {
      console.log(`  ❌ ERROR: ${data.error}`);
      return;
    }

    const reply = data.response;
    const wordCount = reply.split(/\s+/).length;
    console.log(`  REPLY (${wordCount}w, ${elapsed}ms):\n`);
    console.log(`  ${reply}\n`);

    // Quality checks
    const issues = [];

    // Check for em dashes
    if (reply.includes("—")) issues.push("Contains em dashes (—)");

    // Check for markdown
    if (/\*\*[^*]+\*\*/.test(reply)) issues.push("Contains bold markdown");
    if (/^[-*] /m.test(reply)) issues.push("Contains bullet lists");

    // Check for hallucinated features
    if (/pay what you can/i.test(reply)) issues.push("HALLUCINATED: Pay What You Can");
    if (/subscription/i.test(reply) && !/no.*subscription/i.test(reply) && !/not.*subscription/i.test(reply)) {
      // Only flag if it implies there IS a subscription
      if (/your subscription/i.test(reply) || /cancel.*subscription/i.test(reply)) {
        issues.push("HALLUCINATED: Implies active subscription");
      }
    }

    // Check for generic AI phrases
    if (/I understand how/i.test(reply)) issues.push("Used banned phrase: 'I understand how'");
    if (/I apologize for the inconvenience/i.test(reply)) issues.push("Used banned phrase: 'I apologize for the inconvenience'");

    // Scenario-specific checks
    if (scenario.checks.includes("login_link")) {
      if (!/neurotoned\.com\/login/i.test(reply)) issues.push("MISSING: Login link");
    }
    if (scenario.checks.includes("password_link")) {
      if (!/neurotoned\.com\/password/i.test(reply)) issues.push("MISSING: Password reset link");
    }
    if (scenario.checks.includes("refund_honored")) {
      if (!/refund/i.test(reply)) issues.push("MISSING: Refund confirmation");
      if (!/3.?5 business days/i.test(reply) && !/processed/i.test(reply)) issues.push("MISSING: Refund timeline");
    }

    if (issues.length === 0) {
      console.log("  ✅ ALL CHECKS PASSED");
    } else {
      console.log("  ⚠️  ISSUES:");
      issues.forEach(i => console.log(`     - ${i}`));
    }

  } catch (err) {
    console.log(`  ❌ FETCH FAILED: ${err.message}`);
  }
}

// Run all scenarios sequentially
for (let i = 0; i < scenarios.length; i++) {
  await runTest(scenarios[i], i);
}

console.log(`\n${"=".repeat(60)}`);
console.log("  Tests complete.");
console.log(`${"=".repeat(60)}\n`);
