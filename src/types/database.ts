export type UserRole = 'organizer' | 'sponsor' | 'creator' | 'admin' | 'performer' | 'vendor';
export type EventStatus = 'draft' | 'active' | 'closed';
export type RequestStatus = 'pending' | 'accepted' | 'rejected';
export type RequestType = 'sponsor_to_organizer' | 'organizer_to_sponsor' | 'organizer_to_creator' | 'sponsor_to_creator' | 'creator_to_organizer' | 'creator_to_sponsor' | 'organizer_to_performer' | 'organizer_to_vendor';

export interface UserProfile {
  id: string;
  role: UserRole;
  full_name: string;
  email?: string;
  organization_name: string;
  city: string;
  phone?: string;
  website_url?: string;
  latitude: number | null;
  longitude: number | null;
  preferences: SponsorPreferences | null;
  business_description: string;
  // Creator specific fields
  platform?: string | null;
  niche?: string | null;
  followers_count?: number;
  engagement_rate?: number;
  average_views?: number;
  audience_demographics?: string | null;
  pricing_per_post?: number;
  media_kit_url?: string | null;
  portfolio_urls?: string[] | null;
  verification_status?: 'unverified' | 'pending_review' | 'verified' | 'rejected' | 'flagged';
  verification_proof_urls?: string[];
  verification_proof_details?: { url: string; fileId: string }[];
  verification_feedback?: string | null;
  match_score?: number;
  match_reasons?: string[];
  // Image / branding fields
  profile_photo?: string | null;
  profile_photo_file_id?: string | null;
  organization_logo?: string | null;
  logo_file_id?: string | null;
  created_at: string;
}

export interface Demographics {
  gender: string[];
  ageRange: number[]; // [min, max]
  profession: string[];
  type: string[];
  customProfession?: string;
  customType?: string;
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
  target_demographics: string | Demographics;
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
  past_event_media: string[] | null;
  past_media_details: any[] | null;
  pitch_deck_file_id: string | null;
  ai_pitch_deck: { slides: any[] } | null;
  ai_video_script: { scenes: any[] } | null;
  created_at: string;
}

export interface ConnectionRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  event_id?: string; // Optional for creator campaigns
  request_type: RequestType;
  status: RequestStatus;
  message: string;
  campaign_details?: {
    campaignType?: string;
    budget?: number;
    deliverables?: string;
  } | null;
  created_at: string;
  sender?: UserProfile;
  receiver?: UserProfile;
  event?: Event;
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
