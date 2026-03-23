-- ==========================================
-- PROJECT: MEHFIL-E-KHAAS (Database Schema)
-- ==========================================

-- 1. Custom Enums (The Domain Logic)
CREATE TYPE game_phase AS ENUM ('lobby', 'reveal', 'mission', 'majlis', 'night', 'end');
CREATE TYPE player_role AS ENUM ('sukhan_war', 'naqal_baaz');
CREATE TYPE player_status AS ENUM ('alive', 'silenced', 'banished');

-- 2. The Game Room (The State Machine)
CREATE TABLE game_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_code VARCHAR(6) UNIQUE NOT NULL,
    current_phase game_phase DEFAULT 'lobby' NOT NULL,
    eidi_pot INTEGER DEFAULT 0 NOT NULL,
    current_round INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. The Players (The Actors)
CREATE TABLE players (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(50) NOT NULL,
    role player_role NOT NULL,
    status player_status DEFAULT 'alive' NOT NULL,
    private_gold INTEGER DEFAULT 0 NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. The Missions (The Static Seed Data)
CREATE TABLE missions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    public_goal TEXT NOT NULL,
    secret_sabotage TEXT NOT NULL
);

-- 5. The Votes (The Alliance Tracker)
CREATE TABLE votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE NOT NULL,
    round_id INTEGER NOT NULL,
    voter_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
    target_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(room_id, round_id, voter_id) -- Prevents double voting in the same round
);

-- ==========================================
-- REALTIME & SECURITY CONFIGURATION
-- ==========================================
-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- Disable RLS for ease of use in a local physical gathering
-- (Alternatively, you can add 'Allow All' policies)
ALTER TABLE game_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE missions DISABLE ROW LEVEL SECURITY;
ALTER TABLE votes DISABLE ROW LEVEL SECURITY;

-- ==========================================
-- SEED DATA: THE 8 MISSIONS
-- ==========================================
INSERT INTO missions (title, public_goal, secret_sabotage) VALUES
('The Ghalib Gambit', 'Find the second line to: "Hazaron khwaishen aisi ke har khwaish pe dam nikle..."', 'Force the group to debate using the word "Hum" instead of "Kam" for at least 20 seconds.'),
('The Lughat Riddle', 'Define these three words correctly: Wasl, Gurez, Aatish-fishan.', 'Convince the group with absolute conviction that "Wasl" means separation/heartbreak.'),
('The Iqbal Insight', 'Find and recite a famous verse containing the word "Khudi".', 'Use the word "Aina" (Mirror) in a sentence at least twice while discussing the poetry.'),
('The Bait-Baazi Blitz', 'Play 3 rounds of Antakshari. Start with a verse ending in the letter Noon (N).', 'When it is your turn to help, stall and pretend to think deeply for 15 seconds to drain the clock.'),
('The Tashreeh Trap', 'Agree on a one-sentence English summary for: "Bas-ke dushvaar hai har kaam ka aasaan hona".', 'Ensure the word "Impossible" is included in the final English summary.'),
('The Qafiya Quest', 'Find 5 verses where the rhyming word (Qafiya) rhymes with "Dil".', 'Confidently suggest a false rhyme (like "Gul") and defend it for 30 seconds before backing down.'),
('The Zamana Search', 'Order these poets chronologically: Mir Taqi Mir, Faiz Ahmed Faiz, Allama Iqbal.', 'Adamantly claim that Faiz Ahmed Faiz lived and wrote before Allama Iqbal.'),
('The Visual Verse', 'Decode this emoji poem and recite it: 👣 + 🏠 + 🚫 + 💔', 'Offer a completely hilarious, distracting interpretation of the emojis to waste 45 seconds of their time.');

-- Supabase Schema for Mehfil-e-Khaas

-- 1. GameState Table
-- CREATE TABLE IF NOT EXISTS GameState (
--     room_code TEXT PRIMARY KEY,
--     current_phase TEXT NOT NULL DEFAULT 'Lobby', -- Lobby, Reveal, Mission, Majlis, Night, End
--     eidi_pot INTEGER DEFAULT 0,
--     active_mission_id INTEGER, -- Link to Missions table
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- 2. Missions Table
-- CREATE TABLE IF NOT EXISTS Missions (
--     id SERIAL PRIMARY KEY,
--     title TEXT NOT NULL,
--     public_goal TEXT NOT NULL,
--     secret_sabotage TEXT NOT NULL
-- );

-- 3. Players Table
-- CREATE TABLE IF NOT EXISTS Players (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     room_code TEXT REFERENCES GameState(room_code) ON DELETE CASCADE,
--     name TEXT NOT NULL,
--     role TEXT, -- 'Sukhan-war' (Poet/Faithful) or 'Naqal-baaz' (Plagiarist/Traitor)
--     status TEXT NOT NULL DEFAULT 'Alive', -- 'Alive', 'Silenced', 'Banished'
--     private_gold INTEGER DEFAULT 0,
--     is_host BOOLEAN DEFAULT FALSE,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- 4. Votes Table
-- CREATE TABLE IF NOT EXISTS Votes (
--     id SERIAL PRIMARY KEY,
--     room_code TEXT REFERENCES GameState(room_code) ON DELETE CASCADE,
--     phase_id TEXT NOT NULL, -- e.g., 'Majlis_Round_1'
--     voter_id UUID REFERENCES Players(id) ON DELETE CASCADE,
--     target_id UUID REFERENCES Players(id) ON DELETE CASCADE,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- Enable Realtime for all tables
-- ALTER PUBLICATION supabase_realtime ADD TABLE GameState;
-- ALTER PUBLICATION supabase_realtime ADD TABLE Players;
-- ALTER PUBLICATION supabase_realtime ADD TABLE Missions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE Votes;

-- Seed Missions
-- INSERT INTO Missions (title, public_goal, secret_sabotage) VALUES
-- ('The Ghalib Gambit', 'Find the second line to "Hazaron khwaishen aisi...".', 'Force the group to debate using the word "Hum" instead of "Kam".'),
-- ('The Lughat Riddle', 'Define ''Wasl'', ''Gurez'', ''Aatish-fishan''.', 'Convince the group ''Wasl'' means separation.'),
-- ('The Iqbal Insight', 'Recite a verse with the word ''Khudi''.', 'Use the word "Aina" (Mirror) twice during the search.'),
-- ('The Bait-Baazi Blitz', '3 rounds of Antakshari starting with ''Noon''.', 'Stall for 15 seconds to drain the clock.'),
-- ('The Tashreeh Trap', 'Summarize a complex Ghalib poem in English.', 'Ensure the word "Impossible" is in the final summary.'),
-- ('The Qafiya Quest', 'Find 5 verses rhyming with ''Dil''.', 'Defend a false rhyme (like ''Gul'') for 30 seconds.'),
-- ('The Zamana Search', 'Order Mir, Iqbal, and Faiz chronologically.', 'Claim Faiz lived before Iqbal.'),
-- ('The Visual Verse', 'Decode emoji poetry.', 'Give a hilarious false translation to waste 45 seconds.');
