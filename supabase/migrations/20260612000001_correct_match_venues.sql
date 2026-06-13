-- Correct match venues to the official FIFA World Cup 2026 stadium assignments.
--
-- The seeded `venue` values were largely incorrect (64 of 72 group-stage matches
-- pointed at the wrong stadium, plus most knockout matches). This migration sets
-- every match to its real venue, keeping the existing "Stadium, City" string
-- style for UI consistency.
--
-- Group-stage venues are matched by team pairing (deterministic — each pair plays
-- exactly once). Knockout venues are assigned by match_number, which runs in
-- chronological order matching the official per-day venue schedule.

-- Group stage (matched by team pair, order-independent).
with ref(a, b, venue) as (
  values
    ('Mexico', 'South Africa', 'Estadio Azteca, Mexico City'),
    ('Korea Republic', 'Czechia', 'Guadalajara Stadium, Guadalajara'),
    ('Canada', 'Bosnia and Herzegovina', 'BMO Field, Toronto'),
    ('United States', 'Paraguay', 'SoFi Stadium, Inglewood'),
    ('Qatar', 'Switzerland', 'Levi''s Stadium, Santa Clara'),
    ('Brazil', 'Morocco', 'MetLife Stadium, East Rutherford'),
    ('Haiti', 'Scotland', 'Gillette Stadium, Foxborough'),
    ('Australia', 'Türkiye', 'BC Place, Vancouver'),
    ('Germany', 'Curaçao', 'NRG Stadium, Houston'),
    ('Netherlands', 'Japan', 'AT&T Stadium, Arlington'),
    ('Côte d''Ivoire', 'Ecuador', 'Lincoln Financial Field, Philadelphia'),
    ('Sweden', 'Tunisia', 'Estadio BBVA, Monterrey'),
    ('Spain', 'Cabo Verde', 'Mercedes-Benz Stadium, Atlanta'),
    ('Belgium', 'Egypt', 'BC Place, Vancouver'),
    ('Saudi Arabia', 'Uruguay', 'Hard Rock Stadium, Miami'),
    ('Iran', 'New Zealand', 'SoFi Stadium, Inglewood'),
    ('France', 'Senegal', 'MetLife Stadium, East Rutherford'),
    ('Iraq', 'Norway', 'Gillette Stadium, Foxborough'),
    ('Argentina', 'Algeria', 'Arrowhead Stadium, Kansas City'),
    ('Austria', 'Jordan', 'Levi''s Stadium, Santa Clara'),
    ('Portugal', 'Congo DR', 'NRG Stadium, Houston'),
    ('England', 'Croatia', 'AT&T Stadium, Arlington'),
    ('Ghana', 'Panama', 'BMO Field, Toronto'),
    ('Uzbekistan', 'Colombia', 'Estadio Azteca, Mexico City'),
    ('Czechia', 'South Africa', 'Mercedes-Benz Stadium, Atlanta'),
    ('Switzerland', 'Bosnia and Herzegovina', 'SoFi Stadium, Inglewood'),
    ('Canada', 'Qatar', 'BC Place, Vancouver'),
    ('Mexico', 'Korea Republic', 'Guadalajara Stadium, Guadalajara'),
    ('United States', 'Australia', 'Lumen Field, Seattle'),
    ('Scotland', 'Morocco', 'Gillette Stadium, Foxborough'),
    ('Brazil', 'Haiti', 'Lincoln Financial Field, Philadelphia'),
    ('Türkiye', 'Paraguay', 'Levi''s Stadium, Santa Clara'),
    ('Netherlands', 'Sweden', 'NRG Stadium, Houston'),
    ('Germany', 'Côte d''Ivoire', 'BMO Field, Toronto'),
    ('Ecuador', 'Curaçao', 'Arrowhead Stadium, Kansas City'),
    ('Tunisia', 'Japan', 'Estadio BBVA, Monterrey'),
    ('Spain', 'Saudi Arabia', 'Mercedes-Benz Stadium, Atlanta'),
    ('Belgium', 'Iran', 'SoFi Stadium, Inglewood'),
    ('Uruguay', 'Cabo Verde', 'Hard Rock Stadium, Miami'),
    ('New Zealand', 'Egypt', 'BC Place, Vancouver'),
    ('Argentina', 'Austria', 'AT&T Stadium, Arlington'),
    ('France', 'Iraq', 'Lincoln Financial Field, Philadelphia'),
    ('Norway', 'Senegal', 'MetLife Stadium, East Rutherford'),
    ('Jordan', 'Algeria', 'Levi''s Stadium, Santa Clara'),
    ('Portugal', 'Uzbekistan', 'NRG Stadium, Houston'),
    ('England', 'Ghana', 'Gillette Stadium, Foxborough'),
    ('Panama', 'Croatia', 'BMO Field, Toronto'),
    ('Colombia', 'Congo DR', 'Guadalajara Stadium, Guadalajara'),
    ('Switzerland', 'Canada', 'BC Place, Vancouver'),
    ('Bosnia and Herzegovina', 'Qatar', 'Lumen Field, Seattle'),
    ('Scotland', 'Brazil', 'Hard Rock Stadium, Miami'),
    ('Morocco', 'Haiti', 'Mercedes-Benz Stadium, Atlanta'),
    ('Czechia', 'Mexico', 'Estadio Azteca, Mexico City'),
    ('South Africa', 'Korea Republic', 'Estadio BBVA, Monterrey'),
    ('Ecuador', 'Germany', 'MetLife Stadium, East Rutherford'),
    ('Curaçao', 'Côte d''Ivoire', 'Lincoln Financial Field, Philadelphia'),
    ('Japan', 'Sweden', 'AT&T Stadium, Arlington'),
    ('Tunisia', 'Netherlands', 'Arrowhead Stadium, Kansas City'),
    ('Türkiye', 'United States', 'SoFi Stadium, Inglewood'),
    ('Paraguay', 'Australia', 'Levi''s Stadium, Santa Clara'),
    ('Norway', 'France', 'Gillette Stadium, Foxborough'),
    ('Senegal', 'Iraq', 'BMO Field, Toronto'),
    ('Cabo Verde', 'Saudi Arabia', 'NRG Stadium, Houston'),
    ('Uruguay', 'Spain', 'Guadalajara Stadium, Guadalajara'),
    ('Egypt', 'Iran', 'Lumen Field, Seattle'),
    ('New Zealand', 'Belgium', 'BC Place, Vancouver'),
    ('Panama', 'England', 'MetLife Stadium, East Rutherford'),
    ('Croatia', 'Ghana', 'Lincoln Financial Field, Philadelphia'),
    ('Colombia', 'Portugal', 'Hard Rock Stadium, Miami'),
    ('Congo DR', 'Uzbekistan', 'Mercedes-Benz Stadium, Atlanta'),
    ('Algeria', 'Austria', 'Arrowhead Stadium, Kansas City'),
    ('Jordan', 'Argentina', 'AT&T Stadium, Arlington')
)
update matches m
set venue = r.venue,
    updated_at = now()
from ref r, teams ht, teams at
where m.home_team_id = ht.id
  and m.away_team_id = at.id
  and m.round = 'GROUP'
  and (
    (r.a = ht.name and r.b = at.name)
    or (r.a = at.name and r.b = ht.name)
  );

-- Knockout stage (assigned by match_number / chronological venue schedule).
update matches m
set venue = v.venue,
    updated_at = now()
from (
  values
    (73, 'SoFi Stadium, Inglewood'),
    (74, 'NRG Stadium, Houston'),
    (75, 'Gillette Stadium, Foxborough'),
    (76, 'Estadio BBVA, Monterrey'),
    (77, 'AT&T Stadium, Arlington'),
    (78, 'MetLife Stadium, East Rutherford'),
    (79, 'Estadio Azteca, Mexico City'),
    (80, 'Mercedes-Benz Stadium, Atlanta'),
    (81, 'Lumen Field, Seattle'),
    (82, 'Levi''s Stadium, Santa Clara'),
    (83, 'SoFi Stadium, Inglewood'),
    (84, 'BMO Field, Toronto'),
    (85, 'BC Place, Vancouver'),
    (86, 'AT&T Stadium, Arlington'),
    (87, 'Hard Rock Stadium, Miami'),
    (88, 'Arrowhead Stadium, Kansas City'),
    (89, 'NRG Stadium, Houston'),
    (90, 'Lincoln Financial Field, Philadelphia'),
    (91, 'MetLife Stadium, East Rutherford'),
    (92, 'Estadio Azteca, Mexico City'),
    (93, 'AT&T Stadium, Arlington'),
    (94, 'Lumen Field, Seattle'),
    (95, 'Mercedes-Benz Stadium, Atlanta'),
    (96, 'BC Place, Vancouver'),
    (97, 'Gillette Stadium, Foxborough'),
    (98, 'SoFi Stadium, Inglewood'),
    (99, 'Hard Rock Stadium, Miami'),
    (100, 'Arrowhead Stadium, Kansas City'),
    (101, 'AT&T Stadium, Arlington'),
    (102, 'Mercedes-Benz Stadium, Atlanta'),
    (103, 'Hard Rock Stadium, Miami'),
    (104, 'MetLife Stadium, East Rutherford')
) v(mn, venue)
where m.match_number = v.mn
  and m.round <> 'GROUP';
