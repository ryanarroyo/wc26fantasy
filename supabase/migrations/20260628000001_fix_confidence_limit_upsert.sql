-- Fix the confident-pick cap so it survives upserts.
--
-- Predictions are saved from the client with an upsert
-- (INSERT ... ON CONFLICT (user_id, match_id) DO UPDATE). On the INSERT attempt
-- of that upsert, Postgres assigns NEW.id a fresh identity value *before* the
-- BEFORE INSERT trigger runs. The previous self-exclusion check,
-- `p.id IS DISTINCT FROM NEW.id`, therefore failed to exclude the row actually
-- being updated: the existing saved row (with its old id) was still counted.
--
-- Net effect: once a user had 3 confident picks in a round, re-saving ANY pick
-- in that round (the client re-upserts every open pick at once) tripped the cap
-- and the whole save was rejected. This first surfaced on R32 — the only round
-- currently open for picks (group kickoffs are past; R16+ have no teams yet).
--
-- Fix: exclude the current row by its natural key (user_id is already filtered;
-- match_id uniquely identifies the row within the user's picks), which is stable
-- across the upsert. INSERT of a new match excludes nothing; re-saving an
-- existing confident pick correctly excludes itself.

CREATE OR REPLACE FUNCTION public.check_confidence_limit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_round text;
  v_count integer;
BEGIN
  IF NOT NEW.is_confident THEN
    RETURN NEW;
  END IF;

  SELECT round INTO v_round FROM public.matches WHERE id = NEW.match_id;

  SELECT COUNT(*) INTO v_count
  FROM public.predictions p
  JOIN public.matches m ON m.id = p.match_id
  WHERE p.user_id = NEW.user_id
    AND p.is_confident = true
    AND m.round = v_round
    AND p.match_id IS DISTINCT FROM NEW.match_id;

  IF v_count >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 confident picks per round. You already have 3 in the % round.', v_round;
  END IF;

  RETURN NEW;
END;
$function$;
