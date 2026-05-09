-- Updated Matching Logic: Creator Matches with Trust Score boosts
-- Run this in Supabase SQL Editor to replace the existing function.

CREATE OR REPLACE FUNCTION calculate_creator_matches(p_user_id UUID, p_role TEXT)
RETURNS TABLE (
  creator_id UUID,
  match_score INT,
  match_reasons TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_profile RECORD;
  v_events RECORD;
BEGIN
  IF p_role NOT IN ('organizer', 'sponsor') THEN
    RETURN;
  END IF;

  SELECT * INTO v_user_profile FROM users WHERE id = p_user_id;

  IF p_role = 'organizer' THEN
    FOR v_events IN SELECT * FROM events WHERE organizer_id = p_user_id AND status = 'active'
    LOOP
      RETURN QUERY
      SELECT 
        u.id AS creator_id,
        (
          -- Base score
          50 +
          -- City match
          CASE WHEN u.city = v_events.city THEN 20 ELSE 0 END +
          -- Niche/Category match
          CASE WHEN u.niche ILIKE '%' || v_events.category || '%' THEN 30 ELSE 0 END +
          -- Budget vs Pricing match
          CASE WHEN u.pricing_per_post <= v_events.budget_required THEN 15 ELSE 0 END +
          -- Trust Score boost: Verified creator
          CASE WHEN u.verification_status = 'verified' THEN 10 ELSE 0 END +
          -- Trust Score boost: High trust (realistic engagement)
          CASE WHEN u.engagement_rate > 0 AND u.engagement_rate <= 15 THEN 5 ELSE 0 END +
          -- Penalty: Flagged / suspicious metrics
          CASE WHEN u.verification_status = 'flagged' THEN -10 ELSE 0 END
        ) AS match_score,
        ARRAY_REMOVE(ARRAY[
           CASE WHEN u.city = v_events.city THEN 'Local to event city' ELSE NULL END,
           CASE WHEN u.niche ILIKE '%' || v_events.category || '%' THEN 'Matches event category' ELSE NULL END,
           CASE WHEN u.pricing_per_post <= v_events.budget_required THEN 'Within event budget' ELSE NULL END,
           CASE WHEN u.verification_status = 'verified' THEN 'Platform verified creator' ELSE NULL END
        ], NULL) AS match_reasons
      FROM users u
      WHERE u.role = 'creator'
        AND u.platform IS NOT NULL;
    END LOOP;
  
  ELSIF p_role = 'sponsor' THEN
    RETURN QUERY
    SELECT 
      u.id AS creator_id,
      (
        50 +
        CASE WHEN u.city = v_user_profile.city THEN 20 ELSE 0 END +
        CASE WHEN v_user_profile.business_description ILIKE '%' || u.niche || '%' THEN 30 ELSE 0 END +
        -- Trust boosts
        CASE WHEN u.verification_status = 'verified' THEN 10 ELSE 0 END +
        CASE WHEN u.engagement_rate > 0 AND u.engagement_rate <= 15 THEN 5 ELSE 0 END +
        -- Penalty
        CASE WHEN u.verification_status = 'flagged' THEN -10 ELSE 0 END
      ) AS match_score,
      ARRAY_REMOVE(ARRAY[
         CASE WHEN u.city = v_user_profile.city THEN 'Same city' ELSE NULL END,
         CASE WHEN v_user_profile.business_description ILIKE '%' || u.niche || '%' THEN 'Industry alignment' ELSE NULL END,
         CASE WHEN u.verification_status = 'verified' THEN 'Platform verified creator' ELSE NULL END
      ], NULL) AS match_reasons
    FROM users u
    WHERE u.role = 'creator'
      AND u.platform IS NOT NULL;
  END IF;
  
  RETURN;
END;
$$;
