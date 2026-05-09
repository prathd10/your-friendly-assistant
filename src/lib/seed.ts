import { supabase } from '@/lib/supabase';

const DEMO_PASSWORD = 'Demo@12345';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const REQUEST_TIMEOUT_MS = 15000;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown error';

const withTimeout = async <T>(promise: Promise<T>, label: string): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout while trying to ${label}`)), REQUEST_TIMEOUT_MS);
  });

  return Promise.race([promise, timeoutPromise]);
};

const organizers = [
  { email: 'techfest@kjsce.demo', full_name: 'Arjun Mehta', organization_name: 'KJSCE TechFest', city: 'Mumbai', latitude: 19.0456, longitude: 72.8899 },
  { email: 'moksha@nmims.demo', full_name: 'Priya Sharma', organization_name: 'NMIMS Moksha', city: 'Mumbai', latitude: 19.1095, longitude: 72.8370 },
  { email: 'umang@nmu.demo', full_name: 'Rohan Patil', organization_name: 'NMU Umang Fest', city: 'Mumbai', latitude: 19.0760, longitude: 72.8777 },
  { email: 'technovanza@vjti.demo', full_name: 'Sneha Kulkarni', organization_name: 'VJTI Technovanza', city: 'Mumbai', latitude: 19.0222, longitude: 72.8561 },
  { email: 'malhar@xaviers.demo', full_name: 'Aarav Deshmukh', organization_name: "Xavier's Malhar", city: 'Mumbai', latitude: 18.9432, longitude: 72.8310 },
];

const admin = { email: 'admin@eventsphere.demo', full_name: 'Super Admin', organization_name: 'EventSphere HQ', city: 'Mumbai' };

const sponsors = [
  { email: 'sponsor@redbull.demo', full_name: 'Vikram Singh', organization_name: 'RedBull India', city: 'Mumbai', latitude: 19.0760, longitude: 72.8777, preferences: { categories: ['Sports', 'College Fest', 'Music'], max_budget: 400000, cities: ['Mumbai', 'Pune'], min_audience: 500 } },
  { email: 'sponsor@boatlifestyle.demo', full_name: 'Neha Gupta', organization_name: 'Boat Lifestyle', city: 'Mumbai', latitude: 19.1136, longitude: 72.8697, preferences: { categories: ['Music', 'College Fest', 'Tech'], max_budget: 250000, cities: ['Mumbai', 'Bangalore'], min_audience: 800 } },
  { email: 'sponsor@zomato.demo', full_name: 'Karan Joshi', organization_name: 'Zomato', city: 'Mumbai', latitude: 19.0896, longitude: 72.8656, preferences: { categories: ['Cultural', 'Music', 'Food', 'College Fest'], max_budget: 300000, cities: ['Mumbai', 'Delhi', 'Pune'], min_audience: 300 } },
  { email: 'sponsor@tcs.demo', full_name: 'Ananya Rao', organization_name: 'TCS', city: 'Mumbai', latitude: 19.0665, longitude: 72.8679, preferences: { categories: ['Tech', 'Startup', 'Corporate'], max_budget: 1000000, cities: ['Mumbai', 'Bangalore', 'Hyderabad'], min_audience: 1000 } },
  { email: 'sponsor@oneplus.demo', full_name: 'Aryan Verma', organization_name: 'OnePlus India', city: 'Bangalore', latitude: 12.9716, longitude: 77.5946, preferences: { categories: ['Tech', 'Gaming', 'Music'], max_budget: 600000, cities: ['Bangalore', 'Delhi', 'Mumbai'], min_audience: 1200 } },
  { email: 'sponsor@myntra.demo', full_name: 'Ishita Shah', organization_name: 'Myntra', city: 'Bangalore', latitude: 12.9716, longitude: 77.5946, preferences: { categories: ['Fashion', 'Lifestyle', 'Cultural'], max_budget: 450000, cities: ['Bangalore', 'Mumbai', 'Delhi'], min_audience: 1000 } },
  { email: 'sponsor@coca-cola.demo', full_name: 'Rajiv Khanna', organization_name: 'Coca-Cola India', city: 'Delhi', latitude: 28.6139, longitude: 77.2090, preferences: { categories: ['Food', 'Sports', 'Music', 'Cultural'], max_budget: 800000, cities: ['Delhi', 'Mumbai', 'Bangalore', 'Pune'], min_audience: 2000 } },
];

const creators = [
  { 
    email: 'tech.tanya@demo.com', 
    full_name: 'Tanya Singh', 
    organization_name: 'Tech With Tanya', 
    city: 'Mumbai', 
    niche: 'Tech, Unboxing, Gadgets', 
    business_description: 'Top tech influencer in India. Specialist in unboxing, gadgets reviews and tech event coverage.',
    verification_status: 'pending_review',
    platform: 'YouTube',
    followers_count: 500000,
    engagement_rate: 4.5,
    average_views: 120000,
    pricing_per_post: 25000,
    verification_proof_urls: ['https://images.unsplash.com/photo-1460925895917-afdab827c52f']
  },
  { email: 'style.sahil@demo.com', full_name: 'Sahil Kapoor', organization_name: 'Style By Sahil', city: 'Mumbai', niche: 'Fashion, Lifestyle', business_description: 'Fashion and lifestyle creator. Helping brands reach Gen Z through aesthetic content.' },
  { email: 'gamer.pro@demo.com', full_name: 'Rohan Sharma', organization_name: 'Elite Esports', city: 'Mumbai', niche: 'Gaming, Sports', business_description: 'Pro gamer and esports commentator. Reaches millions of gaming enthusiasts across India.' },
  { email: 'foodie.ankita@demo.com', full_name: 'Ankita Das', organization_name: 'Taste of India', city: 'Delhi', niche: 'Food, Travel', business_description: 'Culinary explorer and travel vlogger. Bringing authentic Indian flavors to the global audience.' },
  { 
    email: 'fitness.rahul@demo.com', 
    full_name: 'Rahul Fit', 
    organization_name: 'FitLife India', 
    city: 'Bangalore', 
    niche: 'Health, Fitness, Sports', 
    business_description: 'Certified trainer and fitness motivator. Helping India get fit one day at a time.',
    verification_status: 'pending_review',
    platform: 'Instagram',
    followers_count: 150000,
    engagement_rate: 6.2,
    average_views: 45000,
    pricing_per_post: 15000,
    verification_proof_urls: ['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b']
  },
];

const performers = [
  { email: 'midnight.jazz@demo.com', full_name: 'Leo & The Band', organization_name: 'The Midnight Jazz Trio', city: 'Mumbai', business_description: 'Sophisticated live jazz performances for corporate dinners, cocktail parties, and social fests.' },
  { email: 'bolly.beats@demo.com', full_name: 'Raj & Simran', organization_name: 'BollyBeats Dance Troupe', city: 'Mumbai', business_description: 'High-energy Bollywood dance performances for large-scale college festivals and celebrity weddings.' },
  { email: 'standup.sid@demo.com', full_name: 'Siddharth V', organization_name: 'Siddharth Standup', city: 'Mumbai', business_description: 'Relatable observational comedy and clean humor. Perfect for corporate and university gigs.' },
  { email: 'sufi.soul@demo.com', full_name: 'Zoya Khan', organization_name: 'Sufi Soul Ensemble', city: 'Delhi', business_description: 'Soulful Sufi and fusion music. Captivating audiences with mystical melodies and modern rhythms.' },
  { email: 'dj.electron@demo.com', full_name: 'DJ Electron', organization_name: 'EDM India', city: 'Bangalore', business_description: 'Award-winning EDM producer and DJ. Headlining major festivals and clubs across the country.' },
  { email: 'rock.rebel@demo.com', full_name: 'The Rebels', organization_name: 'Rock Rebel Band', city: 'Pune', business_description: 'High-octane Indian rock band. Known for explosive live shows and chart-topping originals.' },
];

const vendors = [
  { email: 'royal.cater@demo.com', full_name: 'Chef Amit', organization_name: 'Royal Gourmet Catering', city: 'Mumbai', business_description: 'Exquisite multi-cuisine catering services. Specialist in high-end hospitality and large-scale buffet setups.' },
  { email: 'stage.pro@demo.com', full_name: 'Vijay Lights', organization_name: 'StageMaster Solutions', city: 'Mumbai', business_description: 'Comprehensive sound, lighting, and stage production. We build the base for legendary concerts and events.' },
  { email: 'pixel.perfect@demo.com', full_name: 'Anushka Rao', organization_name: 'Pixel Perfect Media', city: 'Mumbai', business_description: 'Professional event photography and cinematic aftermovies. Capturing the soul of your event in 4K.' },
  { email: 'delhi.decor@demo.com', full_name: 'Suresh Decor', organization_name: 'Delhi Event Decors', city: 'Delhi', business_description: 'Grand wedding and corporate event decorations. From traditional themes to modern floral art.' },
  { email: 'bangalore.av@demo.com', full_name: 'AV Systems', organization_name: 'Bangalore Sound & Vision', city: 'Bangalore', business_description: 'State-of-the-art audiovisual solutions for tech conferences and large-scale summits.' },
  { email: 'pune.photo@demo.com', full_name: 'Rahul Ph', organization_name: 'Pune Photo Studio', city: 'Pune', business_description: 'Specialist in candid photography and drone videography for outdoor festivals.' },
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
    const { data, error } = await withTimeout(
      supabase.auth.signUp({
        email,
        password: DEMO_PASSWORD,
        options: { data: metadata },
      }),
      `sign up ${email}`
    );

    if (error) {
      onProgress(`⚠️ ${email}: ${error.message}`);
      const { data: signInData, error: signInError } = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password: DEMO_PASSWORD,
        }),
        `sign in ${email}`
      );

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
  onProgress('Starting focused seeding...');
  await withTimeout(supabase.auth.signOut(), 'sign out current session');
  
  onProgress('Creating admin account...');
  await createUser(admin.email, {
    role: 'admin',
    full_name: admin.full_name,
    organization_name: admin.organization_name,
    city: admin.city,
  }, onProgress);
  
  onProgress('Creating creator accounts for verification...');
  for (const cr of creators) {
    onProgress(`Creating creator: ${cr.email}`);
    const id = await createUser(cr.email, {
      role: 'creator',
      full_name: cr.full_name,
      organization_name: cr.organization_name,
      city: cr.city,
    }, onProgress);
    if (id) {
      await supabase.from('users').update({
        niche: cr.niche,
        business_description: cr.business_description,
        verification_status: (cr as any).verification_status || 'verified',
        platform: (cr as any).platform || 'Instagram',
        followers_count: (cr as any).followers_count || 10000,
        engagement_rate: (cr as any).engagement_rate || 3.0,
        average_views: (cr as any).average_views || 5000,
        pricing_per_post: (cr as any).pricing_per_post || 2000,
        verification_proof_urls: (cr as any).verification_proof_urls || []
      }).eq('id', id);
    }
    await sleep(500);
  }

  onProgress('✅ Seed complete! Admin and Creators are ready.');
  await supabase.auth.signOut();
}
