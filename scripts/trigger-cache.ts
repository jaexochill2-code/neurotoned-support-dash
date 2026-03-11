import { updateContextCache } from '../src/lib/gemini-cache-manager';

async function run() {
  console.log("Triggering cache creation manually...");
  await updateContextCache();
  console.log("Done.");
}

run();
