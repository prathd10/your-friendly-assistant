
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual env parsing since dotenv is missing
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addSampleEvents() {
  const email = 'prathamdesai002@gmail.com';
  
  console.log('Attempting to sign in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email,
    password: 'Pratham@10',
  });

  if (authError) {
    console.error('Error signing in:', authError.message);
    return;
  }

  const userId = authData.user.id;
  console.log('Successfully signed in. User ID:', userId);

  const sampleEvents = [
    {
      organizer_id: userId,
      name: 'Global Tech Summit 2024',
      category: 'Tech',
      description: "India's largest technology gathering focusing on AI, Blockchain, and Future Tech. A premier destination for sponsors looking to reach 5000+ tech decision makers.",
      city: 'Mumbai',
      venue_name: 'Jio World Convention Centre',
      budget_required: 500000,
      expected_footfall: 5000,
      audience_size: 5000,
      event_date: '2024-11-15',
      status: 'active',
      tags: ['AI', 'Networking', 'Innovation'],
      usp: 'Exclusive access to C-level executives from top Indian tech firms.',
      sponsorship_tiers: 'Title Sponsor: ₹5,00,000 | Gold: ₹2,00,000 | Silver: ₹75,000',
      event_lineup: '9:00 AM: Keynote by Industry Leaders\n11:00 AM: AI Panel Discussion\n2:00 PM: Product Launches\n5:00 PM: Networking Soiree'
    },
    {
      organizer_id: userId,
      name: 'Pune Music Festival',
      category: 'Music',
      description: 'An open-air music festival featuring top indie artists and electronic music. Targeting a vibrant youth demographic in the student hub of Pune.',
      city: 'Pune',
      venue_name: 'Oxford Golf Resort',
      budget_required: 250000,
      expected_footfall: 3000,
      audience_size: 3000,
      event_date: '2024-12-20',
      status: 'active',
      tags: ['Music', 'Youth', 'Live'],
      usp: 'Highest student engagement rate in Western India.',
      past_sponsors: 'Red Bull, Monster Energy, Bacardi',
      sponsorship_tiers: 'Stage Partner: ₹2,50,000 | Lounge Sponsor: ₹1,00,000'
    },
    {
      organizer_id: userId,
      name: 'Startup Bharat 2024',
      category: 'Startup',
      description: 'Connecting founders with investors and mentors across the Indian ecosystem. A high-value event for B2B brands and financial services.',
      city: 'Bangalore',
      venue_name: 'KTPO Whitefield',
      budget_required: 150000,
      expected_footfall: 1500,
      audience_size: 1500,
      event_date: '2024-10-05',
      status: 'active',
      tags: ['Startup', 'Funding', 'Growth'],
      usp: 'Curated matchmaking between 200+ startups and 50+ VCs.'
    }
  ];

  for (const event of sampleEvents) {
    console.log(`Inserting event: ${event.name}...`);
    const { data, error } = await supabase
      .from('events')
      .insert([event])
      .select();

    if (error) {
      console.error(`Error inserting event "${event.name}":`, error.message);
    } else {
      console.log(`Successfully added event: ${event.name}`);
    }
  }
  
  console.log('All sample events processed.');
}

addSampleEvents();
