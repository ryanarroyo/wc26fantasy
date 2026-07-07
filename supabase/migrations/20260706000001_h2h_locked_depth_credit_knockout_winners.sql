-- Credit knockout winners with the round they've securely advanced to.
--
-- h2h_team_locked_depth infers a team's reached round from the deepest match
-- the team's id appears in. Knockout bracket slots are placeholders (null team
-- ids) until football-data.org draws the matchup after the *feeding* round
-- finishes. So between a team winning, say, its R16 tie and the provider drawing
-- the QF, the team's deepest appearance is still that finished R16 match.
--
-- The old function returned that round verbatim for R32/R16/QF/SF, and
-- h2h_team_alive then reads "your match at your deepest round is FINISHED" as
-- "eliminated" — without checking who won. Net effect: every team that wins a
-- knockout tie flickers to "Eliminated" (and its locked/projected points stall
-- a round short) for as long as the next round stays undrawn. This surfaced live
-- when Spain and Belgium, both R16 winners bound for a shared QF slot that the
-- provider hadn't drawn yet, showed as eliminated on the H2H scoreboard.
--
-- The FINAL branch already handled this correctly: a FINAL winner is credited
-- CHAMPION, not left at FINAL. This generalises that same "won your deepest tie
-- => next round is locked" rule to R32/R16/QF/SF. Winning a knockout tie
-- guarantees advancement, so the next round is genuinely locked; a loss (or an
-- unfinished tie) still locks only at the round reached, and h2h_team_alive then
-- reports the loser eliminated exactly as before. No change to group-stage or
-- alive logic is needed — this fixes depth, points, round counts, and the alive
-- flag in one place.

begin;

create or replace function h2h_team_locked_depth(p_team_id int)
returns text
language plpgsql
stable
as $$
declare
  v_max_ko int;
  v_round text;
  v_status text;
  v_winner int;
  v_home int;
  v_away int;
  v_home_pens int;
  v_away_pens int;
  v_won boolean;
  v_team_group text;
  v_group_done int;
begin
  select max(h2h_round_ord(round)) into v_max_ko
  from matches
  where round in ('R32','R16','QF','SF','FINAL')
    and (home_team_id = p_team_id or away_team_id = p_team_id);

  if v_max_ko is not null and v_max_ko >= 1 then
    v_round := case v_max_ko
      when 5 then 'FINAL'
      when 4 then 'SF'
      when 3 then 'QF'
      when 2 then 'R16'
      when 1 then 'R32'
    end;

    select
      status, winner_team_id,
      home_team_id, away_team_id,
      home_penalties, away_penalties
    into
      v_status, v_winner,
      v_home, v_away,
      v_home_pens, v_away_pens
    from matches
    where round = v_round
      and (home_team_id = p_team_id or away_team_id = p_team_id)
    limit 1;

    -- Did the team win its deepest knockout tie? Prefer winner_team_id; fall
    -- back to the penalty shootout when the winner column is unset (mirrors the
    -- prior FINAL-only fallback).
    v_won := false;
    if v_status = 'FINISHED' then
      if v_winner is not null then
        v_won := (v_winner = p_team_id);
      elsif v_home_pens is not null
            and v_away_pens is not null
            and v_home_pens <> v_away_pens then
        v_won := (v_home_pens > v_away_pens and v_home = p_team_id)
              or (v_away_pens > v_home_pens and v_away = p_team_id);
      end if;
    end if;

    if v_won then
      -- Won: securely advanced to the next round, even before it is drawn.
      return case v_round
        when 'FINAL' then 'CHAMPION'
        when 'SF'    then 'FINAL'
        when 'QF'    then 'SF'
        when 'R16'   then 'QF'
        when 'R32'   then 'R16'
      end;
    end if;

    -- Not finished yet, or finished as a loss: locked at the round reached.
    return v_round;
  end if;

  -- No knockout appearance yet — fall back to group standings.
  select group_letter into v_team_group from teams where id = p_team_id;
  if v_team_group is null then
    return 'NOT_ADVANCED';
  end if;

  select count(*) into v_group_done
  from matches
  where round = 'GROUP'
    and status = 'FINISHED'
    and group_letter = v_team_group;

  if v_group_done < 6 then
    return null;
  end if;

  if h2h_team_group_rank(v_team_group, p_team_id) <= 2 then
    return 'R32';
  else
    return 'NOT_ADVANCED';
  end if;
end;
$$;

commit;
