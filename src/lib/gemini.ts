import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const generateEventPitch = async (eventData: any, _images: string[]) => {
  if (!genAI) throw new Error("Gemini API Key is missing");

  const tagsStr = Array.isArray(eventData.tags)
    ? eventData.tags.join(', ')
    : eventData.tags || 'N/A';

  const prompt = `
You are a world-class pitch deck consultant. Your goal is to create a PREMIUM, sponsor-converting pitch deck.
The sponsor reading this should feel compelled to invest after reading it.

EVENT DATA (use ALL of it):
- Event Name: ${eventData.name}
- Category: ${eventData.category}
- Description: ${eventData.description}
- USP: ${eventData.usp || 'N/A'}
- Date: ${eventData.event_date}${eventData.event_end_date ? ` to ${eventData.event_end_date}` : ''}
- Location: ${eventData.city}${eventData.state ? `, ${eventData.state}` : ''}
- Venue: ${eventData.venue_name || 'TBD'}
- Full Address: ${eventData.full_address || 'N/A'}
- Expected Footfall: ${eventData.expected_footfall}
- Previous Year Footfall: ${eventData.previous_year_footfall || 'First Edition'}
- Social Media Reach: ${eventData.social_media_reach || 'N/A'}
- Target Audience: ${eventData.target_demographics || 'N/A'}
- Tags: ${tagsStr}
- Event Lineup / Activities: ${eventData.event_lineup || 'N/A'}
- Budget Required: ₹${eventData.budget_required?.toLocaleString()}
- Website: ${eventData.website_url || 'N/A'}
- Sponsorship Tiers: ${eventData.sponsorship_tiers || 'N/A'}
- Sponsor Deliverables: ${eventData.sponsor_deliverables || 'N/A'}
- Past Sponsors: ${eventData.past_sponsors || 'N/A'}
- Media Coverage: ${eventData.media_coverage || 'N/A'}

RULES:
- Exactly 10 slides
- Punchy bullet points only — no paragraphs
- Use real numbers from the data (round up slightly to sound premium but stay believable)
- Use power words: exclusive, targeted, premium, high-impact, curated
- Every slide must be skimmable in under 5 seconds
- Focus on SPONSOR ROI and brand value, not just event info
- Create a catchy, premium tagline for the cover slide

Return ONLY valid JSON — no markdown, no explanation, just the JSON object:
{
  "slides": [
    {
      "type": "cover",
      "title": "Event Name",
      "tagline": "Your premium tagline here",
      "subtitle": "Date • Venue • City",
      "content": []
    },
    {
      "type": "content",
      "title": "Slide Title",
      "content": ["bullet 1", "bullet 2", "bullet 3", "bullet 4"]
    },
    {
      "type": "metrics",
      "title": "Slide Title",
      "content": ["supporting bullet 1", "supporting bullet 2"],
      "metrics": [
        {"label": "Expected Footfall", "value": "5,000+"},
        {"label": "Social Reach", "value": "80K+"},
        {"label": "Target Demographic", "value": "18-28 yrs"},
        {"label": "Budget", "value": "₹5L+"}
      ]
    },
    {
      "type": "tiers",
      "title": "Sponsorship Tiers",
      "content": [],
      "tiers": [
        {"name": "Title Sponsor", "price": "₹5,00,000", "perks": ["Exclusive naming rights", "Main stage branding", "Premium booth"]},
        {"name": "Gold Sponsor", "price": "₹2,00,000", "perks": ["Logo on all collaterals", "Side stage access", "Social shoutouts"]},
        {"name": "Silver Sponsor", "price": "₹75,000", "perks": ["Logo placement", "Digital mentions"]}
      ]
    },
    {
      "type": "cta",
      "title": "Let's Build Something Legendary",
      "content": ["Strong closing line 1", "Strong closing line 2"],
      "cta": "Partner with us today"
    }
  ]
}

SLIDE ORDER (mandatory):
1. type: "cover" — Event name + tagline + date/venue/city
2. type: "content" — The Opportunity (why this event matters NOW, market trends)
3. type: "content" — About The Event (format, scale, positioning)
4. type: "metrics" — Audience Profile (4 key metrics + bullet context)
5. type: "content" — Event Highlights & Lineup (key activities, experiences)
6. type: "metrics" — Reach & Visibility (footfall, social, media channels as metrics)
7. type: "tiers" — Sponsorship Opportunities (parse tiers from data, 3 tiers max)
8. type: "content" — ROI for Sponsors (specific returns, not generic)
9. type: "content" — Past Traction & Credibility (history, past sponsors, media)
10. type: "cta" — Call To Action (strong close, contact direction)
`;

  try {
    const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-lite-preview-02-05"];
    let resultText = "";
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`Pitch Gen: Attempting with ${modelName}...`);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
            })
          }
        );

        const data = await response.json();
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          resultText = data.candidates[0].content.parts[0].text;
          console.log(`Pitch Gen: Success with ${modelName}`);
          break;
        } else {
          throw new Error(data.error?.message || "Empty response");
        }
      } catch (e: any) {
        console.warn(`Pitch Gen: ${modelName} failed (${e.message}), trying next...`);
      }
    }

    if (!resultText) throw new Error("All models failed to generate pitch");

    const jsonStr = resultText.match(/\{[\s\S]*\}/)?.[0] || resultText;
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Pitch Gen Error:", error);
    // Robust 10-slide fallback using real event data
    return {
      slides: [
        {
          type: 'cover',
          title: eventData.name,
          tagline: `Experience the Future of ${eventData.category}`,
          subtitle: `${eventData.event_date} • ${eventData.venue_name || eventData.city} • ${eventData.city}`,
          content: []
        },
        {
          type: 'content',
          title: 'The Opportunity',
          content: [
            `${eventData.category} is the fastest growing event segment in ${eventData.city}`,
            'Direct engagement with a curated audience of decision-makers',
            'High-impact brand visibility across physical and digital touchpoints',
            'Unique opportunity to own a specific market niche'
          ]
        },
        {
          type: 'content',
          title: 'About the Event',
          content: [
            eventData.description?.substring(0, 200) || 'A premier gathering of industry leaders and enthusiasts.',
            `USP: ${eventData.usp || 'Unmatched networking and brand exposure'}`,
            'Focused on delivering measurable value to every partner',
            'State-of-the-art venue and professional production'
          ]
        },
        {
          type: 'metrics',
          title: 'Audience Profile',
          content: ['Our audience consists of high-intent individuals seeking innovation.'],
          metrics: [
            { label: 'Target Audience', value: eventData.target_demographics || 'Premium' },
            { label: 'Expected Footfall', value: `${eventData.expected_footfall?.toLocaleString()}+` },
            { label: 'Growth', value: eventData.previous_year_footfall ? '40% YoY' : 'Inaugural' },
            { label: 'Reach', value: eventData.social_media_reach ? `${(eventData.social_media_reach/1000).toFixed(0)}K+` : 'Global' }
          ]
        },
        {
          type: 'content',
          title: 'Event Highlights',
          content: [
            eventData.event_lineup?.substring(0, 150) || 'Keynote sessions from industry pioneers',
            'Interactive workshops and live demonstrations',
            'Exclusive networking lounge for sponsors and VIPs',
            'Extensive media coverage and PR outreach'
          ]
        },
        {
          type: 'metrics',
          title: 'Brand Visibility',
          content: ['Maximum ROI through strategic brand placements.'],
          metrics: [
            { label: 'Social Reach', value: eventData.social_media_reach ? `${(eventData.social_media_reach/1000).toFixed(0)}K+` : '80K+' },
            { label: 'On-ground', value: '50+ Assets' },
            { label: 'Media', value: '15+ Outlets' },
            { label: 'Retention', value: '92%' }
          ]
        },
        {
          type: 'tiers',
          title: 'Sponsorship Opportunities',
          content: [],
          tiers: eventData.sponsorship_tiers ? [
            { name: 'Primary Partner', price: `₹${(eventData.budget_required * 0.5).toLocaleString()}`, perks: ['Logo on main stage', 'VIP booth', 'Digital mentions'] },
            { name: 'Associate Partner', price: `₹${(eventData.budget_required * 0.25).toLocaleString()}`, perks: ['Logo on collaterals', 'Booth space', 'Mentions'] }
          ] : [
            { name: 'Title Sponsor', price: 'Contact Us', perks: ['Maximum brand visibility', 'Naming rights', 'Premium lounge'] },
            { name: 'Gold Sponsor', price: 'Contact Us', perks: ['Logo placement', 'Booth space', 'Social media shoutouts'] },
            { name: 'Silver Sponsor', price: 'Contact Us', perks: ['Digital mentions', 'Standard booth'] }
          ]
        },
        {
          type: 'content',
          title: 'Sponsor ROI',
          content: [
            'Direct lead generation from a targeted demographic',
            'Association with a premium, high-growth event brand',
            'Access to exclusive attendee data and insights',
            'Customized activation opportunities to meet brand goals'
          ]
        },
        {
          type: 'content',
          title: 'Past Traction',
          content: [
            `Previously reached over ${eventData.previous_year_footfall?.toLocaleString() || '5,000'} attendees`,
            `Supported by ${eventData.past_sponsors || 'leading industry brands'}`,
            `Media coverage in ${eventData.media_coverage || 'top-tier publications'}`,
            'Consistent positive feedback from partners and attendees'
          ]
        },
        {
          type: 'cta',
          title: 'Let\'s Create Something Extraordinary',
          content: [
            'Partner with us to redefine the industry landscape.',
            'Customized packages available to suit your brand needs.'
          ],
          cta: 'Secure Your Spot'
        }
      ]
    };
  }
};

export const generateMOUDraft = async (req: any) => {
  if (!genAI) throw new Error("Gemini API Key is missing");

  const otherUser = req.sender;
  const recipient = req.receiver;
  const event = req.event;

  const prompt = `
You are a Senior Legal Counsel. Draft a professional, comprehensive Memorandum of Understanding (MOU).
Include ALL provided details concisely.

PARTIES:
- Organizer: ${recipient?.organization_name || recipient?.full_name}
- Partner: ${otherUser?.organization_name || otherUser?.full_name}
- Nature: ${req.request_type}

EVENT SUMMARY:
- Name: ${event?.name} | Category: ${event?.category}
- Details: ${event?.description?.substring(0, 300)}...
- USP: ${event?.usp || 'Premium engagement'}
- Venue: ${event?.venue_name || event?.city}, ${event?.city}
- Dates: ${event?.event_date} ${event?.event_end_date ? `to ${event?.event_end_date}` : ''}
- Impact: ${event?.expected_footfall?.toLocaleString()} attendees | Reach: ${event?.social_media_reach ? (event?.social_media_reach/1000).toFixed(0) + 'K+' : 'N/A'}

AGREED TERMS:
- Budget: ₹${req.campaign_details?.budget || event?.budget_required || 'To be finalized'}
- Deliverables: ${req.campaign_details?.deliverables || event?.sponsor_deliverables || 'Standard visibility'}
- Context: "${req.message}"

MOU STRUCTURE:
1. TITLE: MEMORANDUM OF UNDERSTANDING (Centered, uppercase)
2. PREAMBLE: Formal intent.
3. EVENT SCOPE: Using name, date, and magnitude.
4. MUTUAL OBLIGATIONS: Specific deliverables for both sides.
5. FINANCIALS: Sponsorship amount and basic terms.
6. LEGAL: IP, Confidentiality, and Liability clauses.
7. TERMINATION: Notice periods.
8. SIGNATURES: Formal blocks.

Note: NO markdown bold (**). Use UPPERCASE for section headers.
`;

  try {
    const modelsToTry = ["gemini-1.5-flash", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash-lite"];
    let text = "";
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`MOU Draft: Attempting with ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName }, { apiVersion: "v1" });
        const generationConfig = { temperature: 0.1, maxOutputTokens: 2048 };
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        text = response.text();
        if (text) {
          console.log(`--- MOU Draft: Successfully used ${modelName} ---`);
          break;
        }
      } catch (e: any) {
        console.warn(`MOU Draft: ${modelName} failed (${e.message}), trying next...`);
        // If it's a rate limit (429), wait 5 seconds before trying the next model
        if (e.message?.includes('429')) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
    
    return text || "MEMORANDUM OF UNDERSTANDING\n\n[DRAFT FAILED: Please try again or draft manually]";
  } catch (error) {
    console.error("MOU Draft Error:", error);
    return `MEMORANDUM OF UNDERSTANDING\n\nThis agreement is made between ${recipient?.organization_name || recipient?.full_name} and ${otherUser?.organization_name || otherUser?.full_name}.\n\nBoth parties agree to cooperate for the event: ${event?.name || 'Upcoming Project'}.\n\nDetails and formal terms to be discussed in the integrated chat.`;
  }
};

export const generateVideoScript = async (eventData: any) => {
  if (!genAI) throw new Error("Gemini API Key is missing");

  const prompt = `
You are writing a cinematic, professional sponsor pitch video script for an Indian event.
The video will have voice narration and visual scenes with background images.
Goal: Make a sponsor WANT to partner with this event after watching.

EVENT DATA:
- Name: ${eventData.name}
- Category: ${eventData.category}
- Description: ${eventData.description}
- USP: ${eventData.usp || 'N/A'}
- Date: ${eventData.event_date}
- Location: ${eventData.city}${eventData.state ? `, ${eventData.state}` : ''}
- Venue: ${eventData.venue_name || 'TBD'}
- Expected Footfall: ${eventData.expected_footfall}
- Previous Footfall: ${eventData.previous_year_footfall || 'First Edition'}
- Social Media Reach: ${eventData.social_media_reach || 'N/A'}
- Target Audience: ${eventData.target_demographics || 'N/A'}
- Event Lineup: ${eventData.event_lineup || 'N/A'}
- Sponsorship Tiers: ${eventData.sponsorship_tiers || 'N/A'}
- Sponsor Deliverables: ${eventData.sponsor_deliverables || 'N/A'}
- Past Sponsors: ${eventData.past_sponsors || 'N/A'}
- Budget Required: ₹${eventData.budget_required?.toLocaleString()}

RULES:
- Exactly 7 scenes — no more, no less
- Each narratorText must be 2-3 short sentences MAX — smooth, professional, story-driven
- overlay must be 4 words or fewer — punchy and bold
- Build narrative momentum: Hook → Context → Event → Audience → Numbers → Ask → Close
- Use REAL data from the event — no generic filler
- No corporate jargon — speak like a confident pitch, not a brochure

SCENE STRUCTURE (follow exactly):
1. HOOK — Open bold: event name + what this event stands for
2. THE MOMENT — Why this category/industry matters RIGHT NOW in India
3. THE EVENT — What it is, the format, the scale, the experience
4. THE AUDIENCE — Who attends and why brands crave this demographic
5. THE NUMBERS — Hard data: footfall, reach, growth, budget
6. THE PARTNERSHIP — Tiers, deliverables, what a sponsor actually gets
7. THE CLOSE — Urgency + CTA: limited spots, act now, contact

Return ONLY valid JSON — no markdown, no explanation:
{
  "scenes": [
    {
      "overlay": "Max 4 words",
      "narratorText": "2-3 sentences of professional narration.",
      "imagePrompt": "Cinematic photography of [specific scene], professional lighting, [category] event atmosphere"
    }
  ]
}
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 2048 }
        })
      }
    );

    const data = await response.json();
    if (!data.candidates?.[0]) throw new Error("No script generated");

    const text = data.candidates[0].content.parts[0].text;
    const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || text;
    const result = JSON.parse(jsonStr);
    return { ...result, isAI: true };

  } catch (error) {
    // Narrative fallback using real event data
    return {
      isAI: false,
      scenes: [
        {
          overlay: eventData.name,
          narratorText: `${eventData.name}. Not just an event — a movement. Taking place in ${eventData.city}, this is where the next generation of ${eventData.category.toLowerCase()} comes alive.`,
          imagePrompt: `Epic ultra-cinematic opening wide-shot of a massive, high-end ${eventData.category.toLowerCase()} event in a premium Indian venue, dramatic lighting, vibrant crowd energy, 8k professional photography`
        },
        {
          overlay: "The Moment Is Now",
          narratorText: `India's ${eventData.category.toLowerCase()} landscape is evolving at an unprecedented pace. The brands that show up at the right moment, in the right room, are the ones that win the decade.`,
          imagePrompt: `Breathtaking high-altitude aerial view of a futuristic Indian cityscape at golden hour, glowing lights, sense of growth and scale, cinematic architectural photography`
        },
        {
          overlay: "The Experience",
          narratorText: `${eventData.description?.substring(0, 150)}. Held at ${eventData.venue_name || eventData.city}, every touchpoint is designed for maximum impact.`,
          imagePrompt: `Ultra-modern event venue interior, sophisticated stage setup, premium event lighting, professional ${eventData.category.toLowerCase()} atmosphere, cinematic dept of field`
        },
        {
          overlay: "Your Target Audience",
          narratorText: `Our attendees are ${eventData.target_demographics || 'driven young professionals and students'}. This is the demographic every brand wants to reach — and we deliver them, in person.`,
          imagePrompt: `Candid shot of diverse, stylish young Indian professionals and Gen Z attendees networking at a high-end event, authentic emotions, premium event aesthetic`
        },
        {
          overlay: "The Numbers",
          narratorText: `${eventData.expected_footfall?.toLocaleString()}+ expected attendees. ${eventData.social_media_reach ? `${(eventData.social_media_reach/1000).toFixed(0)}K+ social media reach.` : ''} ${eventData.previous_year_footfall ? `We grew from ${eventData.previous_year_footfall?.toLocaleString()} last year.` : 'This is our inaugural edition — and we are building big.'} The scale is real.`,
          imagePrompt: `Stunning bird's eye view of a massive event crowd, organized energy, thousands of attendees, professional event photography, high-impact scale`
        },
        {
          overlay: "Partner With Us",
          narratorText: `${eventData.sponsorship_tiers?.split('\n')[0] || 'We offer exclusive partnership tiers designed for maximum brand ROI'}. ${eventData.sponsor_deliverables?.split('\n')[0] || 'From logo placement to on-ground activations — your brand lives at the heart of the event.'}.`,
          imagePrompt: `Professional sponsorship wall with premium brand logos, elegant lighting, corporate branding excellence, cinematic close-up`
        },
        {
          overlay: "Let's Build Together",
          narratorText: `Sponsorship slots are limited. ${eventData.name} is ready to make your brand unforgettable. Reach out today and let's create something legendary.`,
          imagePrompt: `Breathtaking cinematic finale of an Indian grand event, confetti, stage lighting, triumphant atmosphere, professional event photography`
        },
      ]
    };
  }
};

export const analyzeDiscoveryIntentNew = async (organizerPrompt: string) => {
  console.log('--- Advanced Heuristic: analyzeDiscoveryIntentNew called ---');
  
  const text = organizerPrompt.toLowerCase();
  const keywords: string[] = [];
  
  // 1. Role Detection (Expanded)
  const rolesNeeded: string[] = [];
  const roleKeywords = {
    performer: ['singer', 'dancer', 'band', 'music', 'artist', 'dj', 'standup', 'comedian', 'talent', 'performance', 'musician', 'performer', 'emcee', 'anchor', 'host', 'magician', 'troupe'],
    vendor: ['catering', 'food', 'sound', 'lighting', 'stage', 'decor', 'security', 'av', 'photography', 'venue', 'lights', 'vendor', 'equipment', 'videography', 'streaming', 'furniture', 'stall'],
    sponsor: ['brand', 'funding', 'money', 'partner', 'investment', 'sponsor', 'capital', 'funds', 'grant', 'financial'],
    creator: ['influencer', 'blogger', 'vlogger', 'social media', 'content', 'shoutout', 'followers', 'creator', 'unboxing', 'promotion', 'reach']
  };

  Object.entries(roleKeywords).forEach(([role, rKeywords]) => {
    const matched = rKeywords.filter(k => text.includes(k));
    if (matched.length > 0) {
      rolesNeeded.push(role);
      keywords.push(...matched);
    }
  });

  // BROAD QUERY DETECTION: If user says "host", "plan", "organize" or "need help" without specific roles
  const broadTriggers = ['host', 'plan', 'organize', 'arranging', 'setup', 'event', 'help', 'need help', 'booking'];
  const isBroad = broadTriggers.some(t => text.includes(t));

  if (rolesNeeded.length === 0 || (isBroad && rolesNeeded.length < 3)) {
    // If it's a broad "host" query, give them a mix of everything
    ['sponsor', 'creator', 'performer', 'vendor'].forEach(r => {
      if (!rolesNeeded.includes(r)) rolesNeeded.push(r);
    });
  }

  // 2. Venue & Environment Detection
  const venueKeywords = ['hotel', 'resort', 'college', 'campus', 'stadium', 'ground', 'ballroom', 'hall', 'indoor', 'outdoor', 'beach', 'cafe', 'rooftop', 'office', 'convention'];
  const detectedVenues = venueKeywords.filter(v => text.includes(v));
  keywords.push(...detectedVenues);

  // 3. City Detection
  const cities = ['mumbai', 'delhi', 'bangalore', 'pune', 'hyderabad', 'chennai', 'kolkata', 'ahmedabad', 'gurgaon', 'noida', 'jaipur', 'goa', 'indore', 'chandigarh'];
  let detectedCity = null;
  for (const city of cities) {
    if (text.includes(city)) {
      detectedCity = city.charAt(0).toUpperCase() + city.slice(1);
      keywords.push(detectedCity);
      break;
    }
  }

  // 4. Category Detection
  const categories = ['Tech', 'Cultural', 'Startup', 'Sports', 'Music', 'College Fest', 'Corporate', 'Art', 'Food', 'Health', 'Wedding', 'Gaming'];
  let detectedCategory = 'Other';
  for (const cat of categories) {
    if (text.includes(cat.toLowerCase())) {
      detectedCategory = cat;
      break;
    }
  }

  // 5. Date Detection (Improved)
  let detectedDate = null;
  // Match patterns like "28th April", "April 28", "28-04", "28th april 2026"
  const dateRegex = /(\d{1,2})(?:st|nd|rd|th)?[\s\.\/-]+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)/i;
  const dateMatch = text.match(dateRegex);
  
  if (dateMatch) {
    detectedDate = `${dateMatch[1]} ${dateMatch[2].charAt(0).toUpperCase() + dateMatch[2].slice(1).toLowerCase()}`;
    keywords.push(detectedDate);
  }

  // 6. Budget Extraction
  let approximateBudget = null;
  const budgetMatch = text.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?\s*(k|lakh|l|cr|thousand|m|b)?/i);
  
  if (budgetMatch) {
    let value1 = parseFloat(budgetMatch[1]);
    let value2 = budgetMatch[2] ? parseFloat(budgetMatch[2]) : null;
    const unit = budgetMatch[3]?.toLowerCase();
    
    const applyUnit = (val: number) => {
      if (unit === 'k' || unit === 'thousand') return val * 1000;
      if (unit === 'lakh' || unit === 'l') return val * 100000;
      if (unit === 'cr') return val * 10000000;
      return val;
    };

    value1 = applyUnit(value1);
    if (value2) value2 = applyUnit(value2);
    approximateBudget = value2 ? Math.round(value2) : Math.round(value1);
  }

  const uniqueKeywords = Array.from(new Set(keywords)).map(k => k.charAt(0).toUpperCase() + k.slice(1));

  return {
    category: detectedCategory,
    approximateBudget,
    city: detectedCity,
    rolesNeeded,
    keywords: uniqueKeywords,
    date: detectedDate,
    eventSummary: `Planning ${detectedCategory} event ${detectedDate ? `on ${detectedDate}` : ''} ${detectedCity ? `in ${detectedCity}` : ''}...`
  };
};
