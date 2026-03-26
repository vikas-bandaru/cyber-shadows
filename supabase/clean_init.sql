-- ======================================================
-- PROJECT: CYBER-SHADOWS (Clean-Slate Initialization)
-- AUTHOR: Antigravity AI
-- DESCRIPTION: Optimized single-script database setup.
-- ======================================================

-- 1. Custom Enums
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'game_phase') THEN
        CREATE TYPE game_phase AS ENUM ('lobby', 'reveal', 'mission', 'majlis', 'night', 'end', 'payout');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'player_role') THEN
        CREATE TYPE player_role AS ENUM ('sukhan_war', 'naqal_baaz');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'player_status') THEN
        CREATE TYPE player_status AS ENUM ('alive', 'silenced', 'banished');
    END IF;
END $$;

-- 2. Tables Initialization
CREATE TABLE IF NOT EXISTS game_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_code VARCHAR(6) UNIQUE NOT NULL,
    current_phase game_phase DEFAULT 'lobby' NOT NULL,
    current_round INTEGER DEFAULT 1 NOT NULL,
    eidi_pot INTEGER DEFAULT 0 NOT NULL,
    last_game_pot INTEGER DEFAULT 0 NOT NULL,
    current_mission_id INTEGER,
    mission_timer_end TIMESTAMP WITH TIME ZONE,
    sabotage_triggered BOOLEAN DEFAULT FALSE,
    sabotage_used BOOLEAN DEFAULT FALSE,
    winner_faction TEXT,
    tie_protocol TEXT DEFAULT 'none',
    tied_player_ids UUID[] DEFAULT '{}',
    reveal_target_id UUID,
    is_revealing BOOLEAN DEFAULT FALSE,
    is_dev_mode BOOLEAN DEFAULT FALSE,
    min_players_required INTEGER DEFAULT 8,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(50) NOT NULL,
    role player_role NOT NULL,
    status player_status DEFAULT 'alive' NOT NULL,
    private_gold INTEGER DEFAULT 0 NOT NULL,
    gathering_gold INTEGER DEFAULT 0 NOT NULL,
    has_signaled BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS missions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    public_goal TEXT NOT NULL,
    secret_sabotage TEXT NOT NULL,
    host_answer_key TEXT
);

CREATE TABLE IF NOT EXISTS votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE NOT NULL,
    round_id INTEGER NOT NULL,
    voter_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
    target_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(room_id, round_id, voter_id)
);

CREATE TABLE IF NOT EXISTS night_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE NOT NULL,
    voter_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
    target_id UUID REFERENCES players(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(room_id, voter_id)
);

-- 3. Add Foreign Keys for reveal (Circular dependency handled via ALTER)
ALTER TABLE game_rooms ADD CONSTRAINT fk_reveal_target FOREIGN KEY (reveal_target_id) REFERENCES players(id);
ALTER TABLE game_rooms ADD CONSTRAINT fk_current_mission FOREIGN KEY (current_mission_id) REFERENCES missions(id);

-- 4. Supabase Realtime Configuration
BEGIN;
  -- Remove existing if any to avoid errors on clean slate
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE night_votes;

-- 5. Row Level Security (RLS) Policies
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE night_votes ENABLE ROW LEVEL SECURITY;

-- 5.1 Game Rooms Policies
CREATE POLICY "Public Access" ON game_rooms FOR ALL TO anon USING (true) WITH CHECK (true);

-- 5.2 Players Policies
CREATE POLICY "Public Access" ON players FOR ALL TO anon USING (true) WITH CHECK (true);

-- 5.3 Missions Policies
CREATE POLICY "Public Read Access" ON missions FOR SELECT TO anon USING (true);

-- 5.4 Votes Policies
CREATE POLICY "Public Access" ON votes FOR ALL TO anon USING (true) WITH CHECK (true);

-- 5.5 Night Votes Policies
CREATE POLICY "Public Access" ON night_votes FOR ALL TO anon USING (true) WITH CHECK (true);

-- 6. Atomic Liquidation Function
CREATE OR REPLACE FUNCTION liquidate_gathering_pot(room_uuid UUID, winner_ids UUID[], share_amount INTEGER)
RETURNS void AS $$
BEGIN
    -- Add the share to private gold for winners
    UPDATE players 
    SET private_gold = private_gold + share_amount 
    WHERE id = ANY(winner_ids);

    -- Move all private gold to the session-wide gathering_gold
    UPDATE players 
    SET gathering_gold = gathering_gold + private_gold,
        private_gold = 0
    WHERE room_id = room_uuid;

    -- Record the final pot value before resetting the room
    UPDATE game_rooms 
    SET last_game_pot = eidi_pot,
        eidi_pot = 0,
        current_phase = 'lobby',
        sabotage_triggered = FALSE,
        sabotage_used = FALSE
    WHERE id = room_uuid;
END;
$$ LANGUAGE plpgsql;

-- 7. Seed Data: 8 Cyber-Shadows Missions
TRUNCATE TABLE missions RESTART IDENTITY CASCADE;

INSERT INTO missions (title, public_goal, secret_sabotage, host_answer_key) VALUES
('The Data Siphon', 'Decrypt a 4-digit sequence by finding hidden numbers in the room.', 'Convince the group that the sequence is backward or contains a letter.', 'Sequence: 7-2-9-1.'),
('Neon Ghosting', 'Identify 3 "Ghost Signals" (colors mentioned in a specific order).', 'Suggest a fourth color that "must be the master key" to waste time.', 'Cyan, Magenta, Lime.'),
('The Firewall Breach', 'Solve a "Logic Lock" (classic riddle with a tech twist).', 'Intentionally give a wrong answer that sounds technical and logical.', 'Answer: "A Virtual Mirror".'),
('Neural Link Sync', 'Synchronize 3 players - they must say the same word on the count of three.', 'Whisper a different word to one of them just before the count.', 'Synchronized word: "SYNCHRONIZE".'),
('The Binary Betrayal', 'Convert a small binary number (10101) to decimal.', 'Assert that the binary is actually Octal or Hexadecimal.', '10101 binary = 21 decimal.'),
('Megacorp Heist', 'Map out the "Security Layers" (list 5 tech components in alphabetical order).', 'Argue about the spelling of one component to delay the list.', 'Example: BIOS, CPU, Firewall, GPU, RAM.'),
('Synthetic Sabotage', 'Distinguish between "Human" and "Android" quotes (Host reads 3 quotes).', 'Claim the "Human" quote is actually from a famous AI to cause doubt.', 'Quote 1: Human, Quote 2: AI, Quote 3: AI.'),
('The Dark Web Protocol', 'Establish a "Handshake" (a specific physical gesture sequence).', 'Add an extra "unauthorized" gesture into the sequence.', 'Sequence: Nod - Tap - Snap.');
