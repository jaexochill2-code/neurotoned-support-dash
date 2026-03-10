import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

const goldenExamples = [
  {
    concern_category: "Refund",
    customer_email: "Things have gotten really tight financially and I just can't afford to keep the program right now. I feel bad about asking but I need a refund. I really wanted this to work. - Cherise",
    approved_response: "Hey Cherise,\nI can definitely help with your refund.\nI have processed a full refund for your program. You will see the funds returned to your original payment method within 3-5 business days on our end. Your bank will then take 5-10 business days to post the credit to your account.\nI hope things ease up for you soon. Would you care to share any specific feedback about the program?\nI'm really glad you wrote in."
  },
  {
    concern_category: "Product Fit",
    customer_email: "Hi Neurotoned Team! I signed up with such great intention and then life got hard... again. I was only two days' in though and I really don't want this to be another thing I've purchased with self-improvement and soul enrichment in mind, only to have it fail. Would it be possible to get a run down of exactly what it is I've purchased and if there is a cut off date? Is it also possible to restart the timeline on your emails to me - of day 1, 2, etc -as if it was day 1 again, so I can stay on track? I'm sorry to give you extra admin, but for my family and I, I really have to do this :) Thanking you so much in advance. My fingers are crossed you may be able to help! - Cherise",
    approved_response: "Hey Cherise,\nI can help clarify your program access and email timeline.\nThe 30 Day Neurotoned Program is a one-time purchase. You have permanent access to all the content and there is no cut-off date. While the automated daily email sequence cannot be reset to Day 1, you can always find all program videos and materials waiting for you in your personal library here: https://www.neurotoned.com/library. You can log in and start fresh whenever it feels right for you.\nIt is good you are prioritizing your well-being for yourself and your family.\nTake your time with it."
  },
  {
    concern_category: "Cancellation",
    customer_email: "I need to cancel my subscription immediately. It's too expensive.",
    approved_response: "Hey,\nI have taken care of this for you.\nYour recurring subscription has been successfully cancelled. You will not be billed again. You will retain access to your current subscription benefits until the end of this billing cycle.\nThank you for giving the subscription a fair shake. If you have a moment, I would appreciate hearing if there was a specific reason it wasn't a fit for you right now.\nI wish you well on your healing journey."
  },
  {
    concern_category: "Access / Login",
    customer_email: "I bought the program yesterday but I can't figure out how to access it. Where are my videos?",
    approved_response: "Hey,\nI can help you access your programs.\nYour programs are permanently stored in your Neurotoned library. You can log in at any time here: https://www.neurotoned.com/login.\nIf you cannot remember the password you used at checkout, you can reset it instantly using this link: https://www.neurotoned.com/password/new.\nThank you for being part of the Neurotoned family.\nI am here if you need anything else."
  },
  {
    concern_category: "General",
    customer_email: "Can I do the programs on my phone or do I need a computer?",
    approved_response: "Hey,\nI can answer that for you.\nYou can complete all of our programs on either a computer or a smartphone. Our entire platform is fully accessible through your mobile web browser, so you can watch the videos and access the materials wherever you are.\nI hope the program brings you comfort and support.\nI'm glad you reached out."
  }
];

async function seedGoldenExamples() {
  console.log('Seeding Golden Examples into Supabase...');

  // Optional: clear existing golden examples to ensure a clean slate
  const { error: deleteError } = await supabaseAdmin.from('golden_examples').delete().neq('id', 0);
  if (deleteError) {
     console.error('Error clearing old golden examples:', deleteError);
  }

  const { data, error } = await supabaseAdmin
    .from('golden_examples')
    .insert(goldenExamples);

  if (error) {
    console.error('Error seeding golden examples:', error);
  } else {
    console.log(`Successfully seeded ${goldenExamples.length} perfect V7 examples.`);
  }
}

seedGoldenExamples();
