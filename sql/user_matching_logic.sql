-- Generalized Matching Logic: Supports Creators, Performers (Artists), and Vendors
-- Run this in Supabase SQL Editor to enable multi-role discovery.

CREATE OR REPLACE FUNCTION calculate_user_matches(
  p_user_id UUID, 
  p_role TEXT, 
  p_target_role TEXT DEFAULT 'creator'
)
RETURNS TABLE (
  target_id UUID,
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
  -- Security: Only organizers and sponsors can calculate discovery matches
  IF p_role NOT IN ('organizer', 'sponsor') THEN
    RETURN;
  END IF;

  SELECT * INTO v_user_profile FROM users WHERE id = p_user_id;

  IF p_role = 'organizer' THEN
    -- Match an organizer's ACTIVE events to target users of the specified role
    FOR v_events IN SELECT * FROM events WHERE organizer_id = p_user_id AND status = 'active'
    LOOP
      RETURN QUERY
      SELECT 
        u.id AS target_id,
        LEAST(100, (
          50 + -- Base
          CASE WHEN u.city = v_events.city THEN 20 ELSE 0 END +
          CASE WHEN (u.niche ILIKE '%' || v_events.category || '%' OR v_events.category ILIKE '%' || u.niche || '%') THEN 25 ELSE 0 END +
          CASE WHEN COALESCE(u.pricing_per_post, 0) <= v_events.budget_required AND u.pricing_per_post > 0 THEN 15 ELSE 0 END +
          CASE WHEN u.verification_status = 'verified' THEN 10 ELSE 0 END -
          CASE WHEN u.verification_status = 'flagged' THEN 25 ELSE 0 END
        ))::INT AS match_score,
        ARRAY_REMOVE(ARRAY[
           CASE WHEN u.city = v_events.city THEN 'Local to event city' ELSE NULL END,
           CASE WHEN (u.niche ILIKE '%' || v_events.category || '%' OR v_events.category ILIKE '%' || u.niche || '%') THEN 'Matches event category' ELSE NULL END,
           CASE WHEN COALESCE(u.pricing_per_post, 0) <= v_events.budget_required AND u.pricing_per_post > 0 THEN 'Within event budget' ELSE NULL END,
           CASE WHEN u.verification_status = 'verified' THEN 'Verified profile' ELSE NULL END
        ], NULL) AS match_reasons
      FROM users u
      WHERE u.role = p_target_role
        AND u.id != p_user_id; -- Don't match self
    END LOOP;
  END IF;

  RETURN;
END;
$$;
