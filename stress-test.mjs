// Test the fixed deterministic structure with multiple scenario types
const scenarios = [
  {
    label: "GRIEF + PRODUCT ACCESS (Holly - Tornado)",
    email: `Holly Trapp\n10:07 AM (5 hours ago)\nto me\n\nGood evening,\n\nWe recently had to put my grandpa to rest, unable to bury due to destruction at the cemetery, lived through a tornado wrecking our city, and are now dealing with much damage at our business. That said, we are so grateful everyone is ok! We could all use some techniques to calm down, though.\nI sent that form with her information before I reached out to you, but she never got any link or email. I just did it again, but that would be awesome if you could share the link and I'll give it to her. Thank you very much.\nDoes she get access starting from here I'm at/how long I've already been in the program, or would she get the full 6 months that I got originally? Talk to you soon.`
  },
  {
    label: "CHERISE - Program Access (Non-Refund)",
    email: `Hi Neurotoned Team!\n\nI signed up with such great intention and then life got hard... again. I was only two days' in though and I really don't want this to be another thing I've purchased with self-improvement and soul enrichment in mind, only to have it fail.\n\nWould it be possible to get a run down of exactly what it is I've purchased and if there is a cut off date?\n\nIs it also possible to restart the timeline on your emails to me - of day 1, 2, etc -as if it was day 1 again, so I can stay on track?\n\nI'm sorry to give you extra admin, but for my family and I, I really have to do this :)\n\nThanking you so much in advance. My fingers are crossed you may be able to help!\n- Cherise`
  },
  {
    label: "REFUND REQUEST (Financial Hardship)",
    email: "Things have gotten really tight financially and I just can't afford to keep the program right now. I feel bad about asking but I need a refund. I really wanted this to work. - Cherise"
  },
];

const BANNED = [
  /\bincredibly\b/i, /\bincredible\b/i,
  /\bextremely\b/i, /\bimmensely\b/i, /\bprofoundly\b/i,
  /\babsolutely\b/i, /\butterly\b/i, /\btremendously\b/i,
  /\bfrustrating\b/i, /\bfrustrated\b/i, /\bfrustration\b/i,
  /\bdisheartening\b/i, /\boverwhelming\b/i, /\bdevastating\b/i,
  /\bheartbreaking\b/i, /\bdeeply\b/i, /\btruly\b/i,
  /I understand how/i, /I can only imagine/i,
  /it'?s completely understandable/i, /when life throws/i,
  /\bHi /i, /\bHello /i, /\bDear /i,
];

async function runTest() {
  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    console.log("\n" + "=".repeat(60));
    console.log(`  [${i+1}/${scenarios.length}] ${s.label}`);
    console.log("=".repeat(60));

    try {
      const res = await fetch("http://localhost:3000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: "neurotoned_admin_token=authenticated" },
        body: JSON.stringify({ email: s.email })
      });
      const data = await res.json();
      const reply = data.response || data.error || "NO RESPONSE";
      const words = reply.split(/\s+/).length;
      console.log(`  REPLY (${words}w):\n`);
      console.log(`  ${reply}\n`);

      // Check for violations
      const violations = [];
      for (const pattern of BANNED) {
        if (pattern.test(reply)) violations.push(pattern.toString());
      }
      if (!reply.startsWith("Hey ")) violations.push("GREETING: Does not start with 'Hey'");
      
      // Check structure
      const hasClosingLine = reply.includes("anything else") || reply.includes("done better");
      if (!hasClosingLine) violations.push("STRUCTURE: Missing final closing line");

      // Check for sign-offs
      const signOffs = /\n\n?(Best|Warm regards|Sincerely|With love|Take care|Warmly),?/i;
      if (signOffs.test(reply)) violations.push("SIGN-OFF: Contains sign-off (banned)");

      if (violations.length > 0) {
        console.log(`  ❌ VIOLATIONS FOUND:`);
        violations.forEach(v => console.log(`     - ${v}`));
      } else {
        console.log(`  ✅ CLEAN — Structure Valid`);
      }
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
    }
  }
  console.log("\n" + "=".repeat(60));
  console.log("  Test complete.");
  console.log("=".repeat(60));
}

runTest();
