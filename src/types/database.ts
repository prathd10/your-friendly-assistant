export type UserRole = 'organizer' | 'sponsor';
export type EventStatus = 'draft' | 'active' | 'closed';

export interface UserProfile {
  id: string;
  role: UserRole;
  full_name: string;
  organization_name: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  preferences: SponsorPreferences | null;
  created_at: string;
}

export interface SponsorPreferences {
  categories: string[];
  max_budget: number;
  cities: string[];
  min_audience: number;
}

export interface Event {
  id: string;
  organizer_id: string;
  name: string;
  category: string;
  description: string;
  city: string;
  state: string;
  venue_name: string;
  full_address: string;
  latitude: number | null;
  longitude: number | null;
  budget_required: number;
  audience_size: number;
  expected_footfall: number;
  previous_year_footfall: number | null;
  target_demographics: string;
  tags: string[];
  event_date: string;
  event_end_date: string | null;
  status: EventStatus;
  pitch_deck_url: string | null;
  website_url: string | null;
  social_media_reach: number | null;
  event_lineup: string;
  past_sponsors: string | null;
  sponsorship_tiers: string | null;
  usp: string | null;
  media_coverage: string | null;
  sponsor_deliverables: string | null;
  created_at: string;
}

export interface Match {
  id: string;
  event_id: string;
  sponsor_id: string;
  match_score: number;
  reason: string;
  created_at: string;
  event?: Event;
  sponsor?: UserProfile;
}

export interface Conversation {
  id: string;
  event_id: string;
  organizer_id: string;
  sponsor_id: string;
  created_at: string;
  event?: Event;
  organizer?: UserProfile;
  sponsor?: UserProfile;
  last_message?: Message;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

export const EVENT_CATEGORIES = [
  'Tech', 'Cultural', 'Startup', 'Sports', 'Music', 'College Fest', 'Corporate', 'Art', 'Food', 'Health'
];
