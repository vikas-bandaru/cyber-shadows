-- ======================================================
-- PROJECT: GENERIC SOCIAL DEDUCTION ENGINE
-- VERSION: Theme-Agnostic Schema (Documentation Only)
-- DESCRIPTION: A generic version of the Cyber-Shadows schema.
-- NOTE: DO NOT RUN THIS ON THE LIVE SUPABASE INSTANCE.
-- ======================================================

-- 1. Custom Enums
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_phase') THEN
        CREATE TYPE session_phase AS ENUM ('lobby', 'reveal', 'task', 'council', 'dark_phase', 'end', 'summary');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'participant_role') THEN
        CREATE TYPE participant_role AS ENUM ('innocent', 'infiltrator');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'participant_status') THEN
        CREATE TYPE participant_status AS ENUM ('active', 'restricted', 'eliminated');
    END IF;
END $$;

-- 2. Tables Initialization
CREATE TABLE IF NOT EXISTS sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_code VARCHAR(6) UNIQUE NOT NULL,
    current_phase session_phase DEFAULT 'lobby' NOT NULL,
    current_round INTEGER DEFAULT 1 NOT NULL,
    reward_pool INTEGER DEFAULT 0 NOT NULL,
    last_session_pool INTEGER DEFAULT 0 NOT NULL,
    current_task_id INTEGER,
    task_timer_end TIMESTAMP WITH TIME ZONE,
    action_triggered BOOLEAN DEFAULT FALSE,
    action_used BOOLEAN DEFAULT FALSE,
    winner_team TEXT,
    deadlock_protocol TEXT DEFAULT 'none',
    tied_participant_ids UUID[] DEFAULT '{}',
    reveal_target_id UUID,
    is_revealing BOOLEAN DEFAULT FALSE,
    is_dev_mode BOOLEAN DEFAULT FALSE,
    min_participants_required INTEGER DEFAULT 8,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(50) NOT NULL,
    role participant_role NOT NULL,
    status participant_status DEFAULT 'active' NOT NULL,
    current_reward INTEGER DEFAULT 0 NOT NULL,
    total_reward INTEGER DEFAULT 0 NOT NULL,
    has_interacted BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    public_goal TEXT NOT NULL,
    secret_action TEXT NOT NULL,
    host_answer_key TEXT
);

CREATE TABLE IF NOT EXISTS signals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
    round_id INTEGER NOT NULL,
    sender_id UUID REFERENCES participants(id) ON DELETE CASCADE NOT NULL,
    target_id UUID REFERENCES participants(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(session_id, round_id, sender_id)
);

CREATE TABLE IF NOT EXISTS secret_signals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES participants(id) ON DELETE CASCADE NOT NULL,
    target_id UUID REFERENCES participants(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(session_id, sender_id)
);

-- 3. Add Foreign Keys
ALTER TABLE sessions ADD CONSTRAINT fk_reveal_target FOREIGN KEY (reveal_target_id) REFERENCES participants(id);
ALTER TABLE sessions ADD CONSTRAINT fk_current_task FOREIGN KEY (current_task_id) REFERENCES tasks(id);

-- 4. Supabase Realtime Configuration
-- (Self-documented: These would enable CDC on generic tables)

-- 5. Atomic Reward Distribution Function
CREATE OR REPLACE FUNCTION finalize_session_rewards(session_uuid UUID, winner_ids UUID[], share_amount INTEGER)
RETURNS void AS $$
BEGIN
    -- Add the share to current reward for winners
    UPDATE participants 
    SET current_reward = current_reward + share_amount 
    WHERE id = ANY(winner_ids);

    -- Move all current rewards to the total_reward pool
    UPDATE participants 
    SET total_reward = total_reward + current_reward,
        current_reward = 0
    WHERE session_id = session_uuid;

    -- Record the final pool value before resetting the session
    UPDATE sessions 
    SET last_session_pool = reward_pool,
        reward_pool = 0,
        current_phase = 'lobby',
        action_triggered = FALSE,
        action_used = FALSE
    WHERE id = session_uuid;
END;
$$ LANGUAGE plpgsql;

-- 6. Generic Task Seed Data
TRUNCATE TABLE tasks RESTART IDENTITY CASCADE;

INSERT INTO tasks (title, public_goal, secret_action, host_answer_key) VALUES
('The Sequence Challenge', 'Solve a logical sequence or pattern shared by the host.', 'Provide a subtly incorrect pattern to confuse the group.', 'Example: 1, 1, 2, 3, 5, 8...'),
('Color Synchronization', 'Identify and memorize a specific set of colors.', 'Insert a decoy color into the discussion.', 'Red, Blue, Green.'),
('Logic Paradox', 'Solve a riddle involving group consensus.', 'Give an answer that is technically correct but strategically misleading.', 'The Liar Paradox.'),
('Physical Handshake', 'Establish a sequence of gestures with 3 other participants.', 'Perform a slightly different gesture to break the chain.', 'Nod, Handshake, Clap.');
