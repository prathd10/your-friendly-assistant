import { supabase } from '@/lib/supabase';

const DEMO_PASSWORD = 'Demo@12345';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown error';

const organizers = [
  { email: 'techfest@kjsce.demo', full_name: 'Arjun Mehta', organization_name: 'KJSCE TechFest', city: 'Mumbai', latitude: 19.0456, longitude: 72.8899 },
  { email: 'moksha@nmims.demo', full_name: 'Priya Sharma', organization_name: 'NMIMS Moksha', city: 'Mumbai', latitude: 19.1095, longitude: 72.8370 },
  { email: 'umang@nmu.demo', full_name: 'Rohan Patil', organization_name: 'NMU Umang Fest', city: 'Mumbai', latitude: 19.0760, longitude: 72.8777 },
  { email: 'technovanza@vjti.demo', full_name: 'Sneha Kulkarni', organization_name: 'VJTI Technovanza', city: 'Mumbai', latitude: 19.0222, longitude: 72.8561 },
  { email: 'malhar@xaviers.demo', full_name: 'Aarav Deshmukh', organization_name: "Xavier's Malhar", city: 'Mumbai', latitude: 18.9432, longitude: 72.8310 },
];

const sponsors = [
  { email: 'sponsor@redbull.demo', full_name: 'Vikram Singh', organization_name: 'RedBull India', city: 'Mumbai', latitude: 19.0760, longitude: 72.8777, preferences: { categories: ['Sports', 'College Fest', 'Music'], max_budget: 400000, cities: ['Mumbai', 'Pune'], min_audience: 500 } },
  { email: 'sponsor@boatlifestyle.demo', full_name: 'Neha Gupta', organization_name: 'Boat Lifestyle', city: 'Mumbai', latitude: 19.1136, longitude: 72.8697, preferences: { categories: ['Music', 'College Fest', 'Tech'], max_budget: 250000, cities: ['Mumbai', 'Bangalore'], min_audience: 800 } },
  { email: 'sponsor@zomato.demo', full_name: 'Karan Joshi', organization_name: 'Zomato', city: 'Mumbai', latitude: 19.0896, longitude: 72.8656, preferences: { categories: ['Cultural', 'Music', 'Food', 'College Fest'], max_budget: 300000, cities: ['Mumbai', 'Delhi', 'Pune'], min_audience: 300 } },
  { email: 'sponsor@tcs.demo', full_name: 'Ananya Rao', organization_name: 'TCS', city: 'Mumbai', latitude: 19.0665, longitude: 72.8679, preferences: { categories: ['Tech', 'Startup', 'Corporate'], max_budget: 1000000, cities: ['Mumbai', 'Bangalore', 'Hyderabad'], min_audience: 1000 } },
  { email: 'sponsor@slicepay.demo', full_name: 'Rahul Nair', organization_name: 'Slice', city: 'Mumbai', latitude: 19.0540, longitude: 72.8400, preferences: { categories: ['College Fest', 'Tech', 'Startup'], max_budget: 200000, cities: ['Mumbai', 'Pune'], min_audience: 400 } },
];

const events = [
  { name: 'KJSCE Hackathon 2026', category: 'Tech', description: 'A 36-hour hackathon bringing together 500+ developers to build innovative solutions. Mentored by industry experts from Google, Microsoft, and startups.', city: 'Mumbai', latitude: 19.0456, longitude: 72.8899, budget_required: 250000, audience_size: 2000, target_demographics: 'Engineering students aged 18-24', tags: ['hackathon', 'coding', 'tech', 'innovation'], event_date: '2026-04-15', status: 'active' },
  { name: 'Moksha Music Night', category: 'Music', description: 'Annual flagship music festival featuring indie bands, DJ night, and battle of bands competition. Three stages, food stalls, and merch zone.', city: 'Mumbai', latitude: 19.1095, longitude: 72.8370, budget_required: 180000, audience_size: 3000, target_demographics: 'College students 17-25', tags: ['music', 'concert', 'indie', 'college fest'], event_date: '2026-03-22', status: 'active' },
  { name: 'Umang Cultural Carnival', category: 'Cultural', description: 'Three-day cultural extravaganza with dance, drama, art exhibitions, and fashion show. Features inter-college competitions with cash prizes.', city: 'Mumbai', latitude: 19.0760, longitude: 72.8777, budget_required: 150000, audience_size: 1500, target_demographics: 'Students and young professionals 18-28', tags: ['cultural', 'dance', 'drama', 'fashion'], event_date: '2026-05-10', status: 'active' },
  { name: 'Technovanza Startup Summit', category: 'Startup', description: 'India\'s largest student-run startup summit. Pitch competitions, VC panels, founder talks, and networking sessions with 50+ startups.', city: 'Mumbai', latitude: 19.0222, longitude: 72.8561, budget_required: 500000, audience_size: 2500, target_demographics: 'Aspiring entrepreneurs 20-30', tags: ['startup', 'entrepreneurship', 'tech', 'VC'], event_date: '2026-06-05', status: 'active' },
  { name: "Malhar Sports Fest", category: 'Sports', description: "Xavier's annual inter-college sports tournament. Cricket, football, basketball, athletics, and e-sports competitions across 3 days.", city: 'Mumbai', latitude: 18.9432, longitude: 72.8310, budget_required: 200000, audience_size: 1800, target_demographics: 'College athletes 18-25', tags: ['sports', 'cricket', 'football', 'esports', 'college fest'], event_date: '2026-04-28', status: 'active' },
];

async function createUser(
  email: string,
  metadata: Record<string, any>,
  onProgress: (msg: string) => void
): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: DEMO_PASSWORD,
      options: { data: metadata },
    });

    if (error) {
      onProgress(`⚠️ ${email}: ${error.message}`);
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: DEMO_PASSWORD,
      });

      if (signInError) {
        onProgress(`⚠️ ${email}: ${signInError.message}`);
        return null;
      }

      return signInData?.user?.id || null;
    }

    return data?.user?.id || null;
  } catch (error) {
    onProgress(`❌ ${email}: ${getErrorMessage(error)}`);
    return null;
  }
}

export async function seedDemoData(onProgress: (msg: string) => void) {
  onProgress('Creating organizer accounts...');

  // Sign out current user first
  await supabase.auth.signOut();

  const organizerIds: string[] = [];
  for (const org of organizers) {
    const id = await createUser(org.email, {
      role: 'organizer',
      full_name: org.full_name,
      organization_name: org.organization_name,
      city: org.city,
    }, onProgress);
    if (id) {
      organizerIds.push(id);
      // Update profile with lat/lng
      await supabase.from('users').update({ latitude: org.latitude, longitude: org.longitude }).eq('id', id);
    }
    await sleep(500); // rate limit
  }
  onProgress(`Created ${organizerIds.length} organizers`);
  if (organizerIds.length === 0) {
    throw new Error('No organizer accounts were created. Check Auth settings and try again.');
  }

  onProgress('Creating sponsor accounts...');
  const sponsorIds: string[] = [];
  for (const sp of sponsors) {
    const id = await createUser(sp.email, {
      role: 'sponsor',
      full_name: sp.full_name,
      organization_name: sp.organization_name,
      city: sp.city,
    }, onProgress);
    if (id) {
      sponsorIds.push(id);
      await supabase.from('users').update({
        latitude: sp.latitude,
        longitude: sp.longitude,
        preferences: sp.preferences,
      }).eq('id', id);
    }
    await sleep(500);
  }
  onProgress(`Created ${sponsorIds.length} sponsors`);
  if (sponsorIds.length === 0) {
    throw new Error('No sponsor accounts were created. Check Auth settings and try again.');
  }

  // Sign in as first organizer to create events
  onProgress('Creating events...');
  await supabase.auth.signInWithPassword({ email: organizers[0].email, password: DEMO_PASSWORD });

  const eventIds: string[] = [];
  for (let i = 0; i < events.length; i++) {
    // Sign in as the corresponding organizer
    await supabase.auth.signInWithPassword({ email: organizers[i].email, password: DEMO_PASSWORD });

    const { data: ev, error } = await supabase.from('events').insert({
      organizer_id: organizerIds[i],
      ...events[i],
    }).select('id').single();

    if (ev) {
      eventIds.push(ev.id);
      onProgress(`Created event: ${events[i].name}`);
    } else {
      console.error('Event creation error:', error);
    }
    await sleep(300);
  }

  // Run matching for each event
  onProgress('Running matching algorithm...');
  for (const eid of eventIds) {
    await supabase.rpc('calculate_matches', { p_event_id: eid });
    await sleep(300);
  }
  onProgress('Matches calculated!');

  // Create some conversations and messages
  onProgress('Creating sample conversations...');
  const convPairs = [
    { eventIdx: 0, orgIdx: 0, spIdx: 3 }, // KJSCE Hackathon + TCS
    { eventIdx: 1, orgIdx: 1, spIdx: 1 }, // Moksha Music + Boat
    { eventIdx: 3, orgIdx: 3, spIdx: 3 }, // Technovanza + TCS
  ];

  const sampleMessages = [
    [
      { fromOrg: false, content: "Hi! We're interested in sponsoring the KJSCE Hackathon. What sponsorship tiers do you offer?" },
      { fromOrg: true, content: "Thanks for reaching out! We have 3 tiers - Title Sponsor (₹2L), Gold (₹1L), and Silver (₹50K). Each comes with different branding and engagement perks." },
      { fromOrg: false, content: "Title Sponsor sounds great. Can we get a booth for recruiting interns as well?" },
      { fromOrg: true, content: "Absolutely! Title sponsors get a premium booth, stage time for a tech talk, and access to participant resumes. Want to schedule a call?" },
    ],
    [
      { fromOrg: false, content: "Hey! Boat would love to be part of Moksha Music Night. We could set up an experience zone with our latest products." },
      { fromOrg: true, content: "That would be amazing! Our footfall last year was 2500+. Would you also be interested in sponsoring the DJ night?" },
      { fromOrg: false, content: "Yes! We can provide audio equipment too. Let's discuss the details." },
    ],
    [
      { fromOrg: false, content: "We'd like to sponsor the pitch competition at Technovanza. TCS has a startup acceleration program we'd like to promote." },
      { fromOrg: true, content: "Perfect fit! The pitch comp gets 200+ applications. We can integrate TCS branding into the judging panel and winner prizes." },
    ],
  ];

  for (let i = 0; i < convPairs.length; i++) {
    const pair = convPairs[i];
    if (!eventIds[pair.eventIdx] || !organizerIds[pair.orgIdx] || !sponsorIds[pair.spIdx]) continue;

    // Sign in as organizer to create conversation
    await supabase.auth.signInWithPassword({ email: organizers[pair.orgIdx].email, password: DEMO_PASSWORD });

    const { data: conv } = await supabase.from('conversations').insert({
      event_id: eventIds[pair.eventIdx],
      organizer_id: organizerIds[pair.orgIdx],
      sponsor_id: sponsorIds[pair.spIdx],
    }).select('id').single();

    if (conv) {
      // Insert messages alternating sender
      for (const msg of sampleMessages[i]) {
        const senderId = msg.fromOrg ? organizerIds[pair.orgIdx] : sponsorIds[pair.spIdx];
        const receiverId = msg.fromOrg ? sponsorIds[pair.spIdx] : organizerIds[pair.orgIdx];

        // Sign in as sender to respect RLS
        const senderEmail = msg.fromOrg ? organizers[pair.orgIdx].email : sponsors[pair.spIdx].email;
        await supabase.auth.signInWithPassword({ email: senderEmail, password: DEMO_PASSWORD });

        await supabase.from('messages').insert({
          conversation_id: conv.id,
          sender_id: senderId,
          receiver_id: receiverId,
          content: msg.content,
        });
        await sleep(200);
      }
      onProgress(`Created conversation ${i + 1} with ${sampleMessages[i].length} messages`);
    }
  }

  // Sign out at the end
  await supabase.auth.signOut();
  onProgress('✅ Seed complete! You can now log in with any demo account using password: Demo@12345');
}
