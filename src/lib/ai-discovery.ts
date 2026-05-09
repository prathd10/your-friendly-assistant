import { supabase } from './supabase';
import { UserProfile } from '@/types/database';

export interface DiscoveryCriteria {
  category: string;
  approximateBudget?: number | null;
  city?: string | null;
  rolesNeeded: string[];
  keywords: string[];
  eventSummary: string;
  date?: string | null;
}

export const findSuggestedPartners = async (criteria: DiscoveryCriteria): Promise<UserProfile[]> => {
  try {
    // 0. Keyword Affinity Safety Check
    // If the AI was too broad, but keywords are very specific, narrow the roles manually.
    const lowerKeywords = criteria.keywords.map(k => k.toLowerCase());
    const performerKeywords = ['singer', 'artist', 'band', 'dj', 'musician', 'performer', 'dancer', 'comedian'];
    const sponsorKeywords = ['brand', 'sponsor', 'funding', 'money', 'investment', 'partner'];
    const vendorKeywords = ['venue', 'lights', 'sound', 'catering', 'food', 'security', 'stage', 'led'];

    let effectiveRoles = [...criteria.rolesNeeded];
    
    // If we have very strong affinity for one role, and multiple roles were suggested
    if (effectiveRoles.length > 1) {
      const hasPerformerKeyword = lowerKeywords.some(k => performerKeywords.includes(k));
      const hasSponsorKeyword = lowerKeywords.some(k => sponsorKeywords.includes(k));
      const hasVendorKeyword = lowerKeywords.some(k => vendorKeywords.includes(k));

      // If ONLY one type of keyword was found, force that role
      if (hasPerformerKeyword && !hasSponsorKeyword && !hasVendorKeyword) effectiveRoles = ['performer'];
      else if (hasSponsorKeyword && !hasPerformerKeyword && !hasVendorKeyword) effectiveRoles = ['sponsor'];
      else if (hasVendorKeyword && !hasPerformerKeyword && !hasSponsorKeyword) effectiveRoles = ['vendor'];
    }

    // 1. Base query for requested roles
    let query = supabase
      .from('users')
      .select('*')
      .in('role', effectiveRoles);

    // 2. City Filter (Primary)
    if (criteria.city) {
      query = query.ilike('city', `%${criteria.city}%`);
    }

    // 3. Category/Niche Filter
    // We fetch a larger pool and then score/filter on client side for better results
    const { data, error } = await query.limit(50);

    if (error) throw error;
    if (!data) return [];

    // 4. Client-side scoring and balancing for vertical diversity
    const scoredResults = data.map(profile => {
      let score = 10; // Base score for being the right role in the right city
      const reasons: string[] = [`Available in ${profile.city || 'your city'}`];

      // Category / Niche Match (Base score)
      const matchesCategory = (category: string, target: string) => 
        target.toLowerCase().includes(category.toLowerCase()) || category.toLowerCase().includes(target.toLowerCase());

      if (profile.role === 'sponsor' && profile.preferences?.categories) {
        if (profile.preferences.categories.some(c => matchesCategory(criteria.category, c))) {
          score += 40;
          reasons.push(`Focuses on ${criteria.category} niche`);
        }
      } else if (profile.role === 'performer' && profile.niche) {
        if (matchesCategory(criteria.category, profile.niche)) {
          score += 40;
          reasons.push(`${criteria.category} artist`);
        }
      } else if (profile.role === 'vendor' && profile.niche) {
        if (matchesCategory(criteria.category, profile.niche)) {
          score += 40;
          reasons.push(`${criteria.category} provider`);
        }
      }

      // Keyword matching (Deep Search)
      if (criteria.keywords && Array.isArray(criteria.keywords)) {
        const searchableText = `${profile.business_description || ''} ${profile.organization_name || ''} ${profile.full_name || ''} ${profile.niche || ''}`.toLowerCase();
        const matches = criteria.keywords.filter(k => searchableText.includes(k.toLowerCase()));
        
        if (matches.length > 0) {
          // Extra boost for exact keyword matches
          score += (matches.length * 20);
          reasons.push(`Matched: ${matches.slice(0, 2).join(', ')}`);
        }
      }

      // Budget Compatibility
      if (profile.role === 'sponsor' && profile.preferences?.max_budget && criteria.approximateBudget) {
        if (profile.preferences.max_budget >= criteria.approximateBudget) {
          score += 20;
          reasons.push('Budget fit');
        }
      }

      return { ...profile, match_score: score, match_reasons: reasons };
    });

    // 5. Group by role for diversity checks
    const grouped: Record<string, any[]> = {};
    scoredResults.forEach(p => {
      if (p.match_score && p.match_score > 0) {
        if (!grouped[p.role]) grouped[p.role] = [];
        grouped[p.role].push(p);
      }
    });

    // Sort each group
    Object.keys(grouped).forEach(role => {
      grouped[role].sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
    });

    // 6. Final Selection Strategy
    // If specific roles are requested (1 or 2), show best matches globally
    if (criteria.rolesNeeded.length <= 2) {
      return scoredResults
        .filter(p => (p.match_score || 0) > 10)
        .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
        .slice(0, 10);
    }

    // Otherwise, interleave results to ensure diversity in broad searches
    const finalResults: UserProfile[] = [];
    const roles = Object.keys(grouped);
    let hasMore = true;
    let index = 0;

    while (finalResults.length < 10 && hasMore) {
      hasMore = false;
      roles.forEach(role => {
        if (grouped[role] && grouped[role][index] && finalResults.length < 10) {
          finalResults.push(grouped[role][index]);
          hasMore = true;
        }
      });
      index++;
    }

    return finalResults;

  } catch (error) {
    console.error('Error in AI Discovery search:', error);
    return [];
  }
};
