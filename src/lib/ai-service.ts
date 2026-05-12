import { jsPDF } from "jspdf";

const apiKey = import.meta.env.VITE_OPENAI_API_KEY?.trim();

/**
 * Helper to call OpenAI Chat Completions API using fetch
 */
async function callOpenAI(messages: any[], model: string = "gpt-4o-mini", temperature: number = 0.7) {
  if (!apiKey) throw new Error("OpenAI API Key is missing");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "OpenAI API request failed");
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

const cleanDemographics = (demographics: any): string => {
  if (!demographics) return 'N/A';
  
  // Handle object
  if (typeof demographics === 'object') {
    const d = demographics;
    return `${d.gender?.join(', ') || 'All'} | Age ${d.ageRange?.join('-') || '18-40'} | ${d.profession?.join(', ') || d.customProfession || 'Various'}`;
  }

  // Handle JSON string
  if (typeof demographics === 'string' && (demographics.startsWith('{') || demographics.startsWith('['))) {
    try {
      const d = JSON.parse(demographics);
      return `${d.gender?.join(', ') || 'All'} | Age ${d.ageRange?.join('-') || '18-40'} | ${d.profession?.join(', ') || d.customProfession || 'Various'}`;
    } catch (e) {
      // Not valid JSON, return as is
    }
  }

  return String(demographics);
};

export const generateEventPitch = async (eventData: any, _images: string[]) => {
  const tagsStr = Array.isArray(eventData.tags)
    ? eventData.tags.join(', ')
    : eventData.tags || 'N/A';

  const demographics = cleanDemographics(eventData.target_demographics);

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
- Target Audience: ${demographics || 'N/A'}
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
1. type: "cover"
2. type: "content" (The Opportunity)
3. type: "content" (About The Event)
4. type: "metrics" (Audience Profile)
5. type: "content" (Event Highlights & Lineup)
6. type: "metrics" (Reach & Visibility)
7. type: "tiers" (Sponsorship Opportunities)
8. type: "content" (ROI for Sponsors)
9. type: "content" (Past Traction & Credibility)
10. type: "cta" (Call To Action)
`;

  try {
    const resultText = await callOpenAI([
      { role: "system", content: "You are a world-class pitch deck consultant. Return only valid JSON." },
      { role: "user", content: prompt }
    ]);

    const jsonStr = resultText.match(/\{[\s\S]*\}/)?.[0] || resultText;
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Pitch Gen Error:", error);
    // Fallback logic remains the same
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
            { label: 'Target Audience', value: demographics || 'Premium' },
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
  const otherUser = req.sender;
  const recipient = req.receiver;
  const event = req.event;

  const prompt = `
You are a Senior Legal Counsel at a top-tier international law firm. 
Draft an EXHAUSTIVE, high-stakes, and legally robust Memorandum of Understanding (MOU).
Follow the exact structure and tone of a formal, ironclad commercial contract. Do NOT summarize.

PARTIES:
- THE ORGANIZER: ${recipient?.organization_name || recipient?.full_name} (${recipient?.role})
- THE PARTNER: ${otherUser?.organization_name || otherUser?.full_name} (${otherUser?.role})

EVENT DATA:
- NAME: ${event?.name}
- VENUE: ${event?.venue_name || event?.city}, ${event?.city}
- DATE: ${event?.event_date}
- PROJECTIONS: ${event?.expected_footfall?.toLocaleString()} attendees | ${event?.social_media_reach ? (event?.social_media_reach/1000).toFixed(0) + 'K+' : '25K+'} digital reach
- FINANCIALS: ₹${req.campaign_details?.budget || event?.budget_required || 'TBD'}

REQUIRED STRUCTURE:

1. TITLE: MEMORANDUM OF UNDERSTANDING (Centered)
2. PREAMBLE: Use at least three "WHEREAS" clauses defining the intent and nature of the collaboration.
3. EVENT SCOPE: Detailed description of the event, location, and projected impact.
4. MUTUAL OBLIGATIONS:
   - Detailed, numbered obligations for THE ORGANIZER (Logistics, Branding, Support).
   - Detailed, numbered obligations for THE PARTNER (Content creation, Attendance, Reporting).
5. FINANCIAL TERMS:
   - Exact remuneration (₹${req.campaign_details?.budget || event?.budget_required || 'TBD'}).
   - Payment schedule (e.g., 50% advance, 50% post-event) and tax handling.
6. INTELLECTUAL PROPERTY:
   - Pre-existing vs Event-specific IP rights.
   - Licensing of logos and promotional materials.
7. CONFIDENTIALITY & INDEMNIFICATION:
   - Confidentiality obligations.
   - Liability, Indemnification, and Limitation of Liability.
8. TERMINATION & FORCE MAJEURE:
   - Termination for Convenience and Cause.
   - Force Majeure clauses.
9. GOVERNING LAW & SIGNATURES: 
   - Jurisdiction.
   - Formal signature blocks for both parties.

RULES:
- Use highly formal, authoritative legal English.
- UPPERCASE for all major section headers (e.g., "1. EVENT SCOPE").
- DO NOT use markdown bolding (**) or italics. Just plain text with good spacing.
- Ensure the document feels exhaustive, professional, and ready to sign.
- Include placeholders like "[Effective Date]" or "[Assumed Address]" where necessary.
`;

  try {
    const text = await callOpenAI([
      { role: "system", content: "You are a Senior Legal Counsel. Draft a comprehensive, exhaustive legal MOU without any markdown symbols." },
      { role: "user", content: prompt }
    ], "gpt-4o-mini", 0.2);
    
    return text || `MEMORANDUM OF UNDERSTANDING\n\n[DRAFT FAILED]`;
  } catch (error) {
    console.error("MOU Draft Error:", error);
    
    // Exhaustive fallback template
    return `MEMORANDUM OF UNDERSTANDING (MOU)
====================================================================

This Memorandum of Understanding (hereinafter referred to as the "MOU" or "Agreement") is made and entered into on this ____ day of ____________, 20__ (the "Effective Date").

BY AND BETWEEN

${recipient?.organization_name || recipient?.full_name || 'The Organizer'} (hereinafter referred to as "THE ORGANIZER"), having its principal place of operations at [Organizer Address], 

AND

${otherUser?.organization_name || otherUser?.full_name || 'The Partner'} (hereinafter referred to as "THE PARTNER"), having its principal place of operations at [Partner Address].

(THE ORGANIZER and THE PARTNER may individually be referred to as a "Party" and collectively as the "Parties").

====================================================================
PREAMBLE
====================================================================
WHEREAS, THE ORGANIZER is organizing and executing the event known as "${event?.name || 'The Event'}" (hereinafter referred to as "THE EVENT");
WHEREAS, THE EVENT is scheduled to occur on ${event?.event_date || '[Date]'} at ${event?.venue_name || event?.city || '[Venue]'} with an anticipated footfall of ${event?.expected_footfall?.toLocaleString() || '[Footfall]'} attendees and an estimated digital reach of ${event?.social_media_reach ? (event?.social_media_reach/1000).toFixed(0) + 'K+' : '[Reach]'};
WHEREAS, THE PARTNER possesses distinct capabilities, assets, and market presence that align with the objectives of THE EVENT;
WHEREAS, the Parties wish to establish a formal framework for their collaboration to ensure mutual benefit, clear expectations, and the successful execution of THE EVENT;

NOW, THEREFORE, in consideration of the mutual promises and covenants contained herein, the Parties agree as follows:

====================================================================
1. SCOPE AND PURPOSE OF THE COLLABORATION
====================================================================
1.1 Objective: The primary objective of this MOU is to define the roles, responsibilities, and financial obligations of both Parties concerning THE PARTNER's sponsorship, participation, or services rendered for THE EVENT.
1.2 Non-Exclusivity: Unless explicitly stated otherwise in a separate Addendum, this collaboration is non-exclusive, allowing THE ORGANIZER to engage with other partners.

====================================================================
2. OBLIGATIONS OF THE ORGANIZER
====================================================================
THE ORGANIZER shall be responsible for the following deliverables:
2.1 Event Execution: Ensuring THE EVENT is conducted safely, professionally, and in accordance with the proposed schedule.
2.2 Branding & Visibility: Providing THE PARTNER with the agreed-upon brand placements across marketing collaterals and digital campaigns.
2.3 Access & Amenities: Facilitating necessary entry passes, VIP access, and on-ground spatial allocations.
2.4 Reporting: Providing a comprehensive post-event report detailing footfall, digital impressions, and brand reach metrics within thirty (30) days following the conclusion of THE EVENT.

====================================================================
3. OBLIGATIONS OF THE PARTNER
====================================================================
THE PARTNER shall be responsible for the following obligations:
3.1 Timely Deliverables: Providing all high-resolution logos, branding assets, and promotional materials to THE ORGANIZER no later than fourteen (14) days prior to THE EVENT.
3.2 Activation Guidelines: Ensuring any on-ground activation adheres to the safety and aesthetic guidelines provided by THE ORGANIZER.
3.3 Cross-Promotion: Actively promoting THE EVENT across THE PARTNER's official social media channels.
3.4 Financial Commitment: Discharging the agreed-upon financial commitments as detailed in Section 4.

====================================================================
4. FINANCIAL TERMS AND CONSIDERATION
====================================================================
4.1 Total Consideration: In exchange for the deliverables provided by THE ORGANIZER, THE PARTNER agrees to provide a total consideration of ₹${req.campaign_details?.budget || event?.budget_required || '[Amount]'} (the "Consideration").
4.2 Payment Schedule: The Consideration shall be paid in the following tranches:
    a) Fifty percent (50%) as an initial advance upon the execution of this MOU.
    b) Fifty percent (50%) no later than seven (7) days prior to THE EVENT date.
4.3 Taxes: All amounts are exclusive of applicable taxes (e.g., GST), which shall be borne by THE PARTNER.
4.4 Invoicing: THE ORGANIZER shall raise a formal, tax-compliant invoice for all payments.

====================================================================
5. INTELLECTUAL PROPERTY RIGHTS (IPR)
====================================================================
5.1 Pre-existing IP: All pre-existing trademarks, logos, and intellectual property belonging to either Party shall remain their sole property.
5.2 Limited License: THE PARTNER grants THE ORGANIZER a non-exclusive, limited license to use its logos solely for the promotion of THE EVENT.
5.3 Event Content: All media generated during THE EVENT remains the intellectual property of THE ORGANIZER, but THE PARTNER is granted a license to use media featuring their own branding for promotional purposes.

====================================================================
6. CONFIDENTIALITY & INDEMNIFICATION
====================================================================
6.1 Confidentiality: Both Parties agree to maintain strict confidentiality regarding the financial terms and proprietary strategies outlined in this MOU.
6.2 Indemnity: Each Party agrees to indemnify the other Party from any third-party claims arising from gross negligence or breach of this MOU.
6.3 Limitation: Maximum liability shall be capped at the total Consideration amount specified in Section 4.1.

====================================================================
7. FORCE MAJEURE & TERMINATION
====================================================================
7.1 Force Majeure: Neither Party shall be held liable for failure in performance resulting from circumstances beyond reasonable control (e.g., acts of God, pandemics, severe weather).
7.2 Termination: This MOU may be terminated by mutual written agreement, or by either Party immediately for a material breach that is not rectified within seven (7) days of notice.

====================================================================
8. GOVERNING LAW AND DISPUTE RESOLUTION
====================================================================
This MOU shall be governed by the laws of India. Disputes shall be resolved through good faith negotiations. If unresolved within thirty (30) days, the dispute shall be subject to the exclusive jurisdiction of the courts in [City/State of Organizer].

====================================================================
SIGNATURES
====================================================================

IN WITNESS WHEREOF, the authorized representatives of the Parties have executed this Memorandum of Understanding as of the Effective Date.

FOR THE ORGANIZER:
Signature: ___________________________
Name:      ${recipient?.full_name || '[Name]'}
Title:     ${recipient?.role || '[Title]'}
Company:   ${recipient?.organization_name || '[Company Name]'}
Date:      ___________________________

FOR THE PARTNER:
Signature: ___________________________
Name:      ${otherUser?.full_name || '[Name]'}
Title:     ${otherUser?.role || '[Title]'}
Company:   ${otherUser?.organization_name || '[Company Name]'}
Date:      ___________________________`;
  }
};

export const generateVideoScript = async (eventData: any) => {
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
- Target Audience: ${cleanDemographics(eventData.target_demographics)}
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

SCENE STRUCTURE (follow exactly):
1. HOOK
2. THE MOMENT
3. THE EVENT
4. THE AUDIENCE
5. THE NUMBERS
6. THE PARTNERSHIP
7. THE CLOSE

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
    const text = await callOpenAI([
      { role: "system", content: "You are a cinematic script writer. Return only valid JSON." },
      { role: "user", content: prompt }
    ], "gpt-4o-mini", 0.8);

    const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] || text;
    const result = JSON.parse(jsonStr);
    return { ...result, isAI: true };

  } catch (error) {
    // Fallback logic remains the same
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
  const prompt = `
Analyze the following event planning request and extract key discovery criteria.
Request: "${organizerPrompt}"

Return ONLY valid JSON:
{
  "category": "Tech|Cultural|Startup|Sports|Music|College Fest|Corporate|Art|Food|Health|Wedding|Gaming|Other",
  "approximateBudget": number | null,
  "city": "City Name" | null,
  "rolesNeeded": [],
  "keywords": ["keyword1", "keyword2"],
  "date": "Date string" | null,
  "eventSummary": "A short, engaging summary of what the user is looking for"
}

CRITICAL: Only include roles in "rolesNeeded" that are EXPLICITLY mentioned.
- If user says "singer" or "band", include ONLY ["performer"].
- If user says "brands" or "funding", include ONLY ["sponsor"].
- If user says "lights" or "sound", include ONLY ["vendor"].
- NEVER include all roles unless the user asks for "everything" or "all types of partners".
- DO NOT be helpful by suggesting roles the user didn't ask for.


Note: Only include roles that are CLEARLY requested (e.g., "singer" -> ["performer"], "brands" -> ["sponsor"]). 
If the user is asking for general help with an event, include all relevant roles.
Return only relevant categories.
`;

  try {
    const resultText = await callOpenAI([
      { role: "system", content: "You are an event discovery assistant. Extract criteria from user prompts." },
      { role: "user", content: prompt }
    ], "gpt-4o-mini", 0.3);

    const jsonStr = resultText.match(/\{[\s\S]*\}/)?.[0] || resultText;
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Discovery Analysis Error:", error);
    // Fallback to a basic interpretation if AI fails
    return {
      category: 'Other',
      approximateBudget: null,
      city: null,
      rolesNeeded: ['sponsor', 'creator', 'performer', 'vendor'],
      keywords: organizerPrompt.split(' ').slice(0, 5),
      date: null,
      eventSummary: `Searching for partners for: ${organizerPrompt.substring(0, 50)}...`
    };
  }
};
