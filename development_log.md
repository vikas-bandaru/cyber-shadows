# Development Log - Cyber-Shadows

## 2026-03-26: Database Initialization (Phase 1)

**Status:** Planned -> In Progress

### Goal
Establish a clean-slate PostgreSQL schema specifically optimized for the new "Cyber-Shadows" theme, removing legacy duplications and experimental commands.

### Plan
1. Define enums: `game_phase`, `player_role`, and `player_status`.
2. Create tables: `game_rooms`, `players`, `missions`, `votes`, and `night_votes`.
3. Consolidate columns: `gathering_gold`, `private_gold`, `sabotage_triggered`, `tie_protocol`, etc.
4. Enable Supabase Realtime for the primary active tables.
5. Implement finalized RLS Policies for the `anon` role.
6. Create the `liquidate_gathering_pot` function for atomic payouts.
7. Seed the database with 8 new 'Cyber-Shadows' themed missions.

### Progress (What Worked)
- [x] Researched existing schema and game design.
- [x] Designed 8 new mission concepts.
- [x] Drafted implementation plan.
- [x] Generated `supabase/clean_init.sql` with consolidated schema and policies.
## 2026-03-26: UI Wiring & Global Terminology (Phase 2)

**Status:** Planned

### Goal
Sync the application UI with the new "Cyber-Shadows" theme by updating global terminology, overhauling the landing page, and ensuring session resilience with new storage keys.

### Plan
1. Create/Update `src/lib/theme-config.ts` with new mappings:
    - 'Sukhan-war' -> 'Glitch-Runner'
    - 'Naqal-baaz' -> 'System-Spy'
    - 'Eidi Pot' -> 'Data-Vault'
    - 'The Sultan' -> 'The Overlord AI'
2. Update `src/app/page.tsx` for brand consistency.
3. Update `src/app/host/setup/page.tsx` for room creation and label changes ('Overlord ID').
4. Update `src/hooks/useGameState.ts` and `src/app/play/[roomCode]/page.tsx` to use `cyber_shadows_runner` as the `localStorage` key.

### Progress (What Worked)
- [x] Completed Phase 1 Database Initialization.
- [x] Completed Phase 2 UI Wiring & Global Terminology.
    - Updated landing page, join flow, and player client.
    - Overhauled Host Dashboard with Cyber-Shadows theme.
    - Renamed session keys to `cyber_shadows_runner`.

### Changed/Discarded
- Discarded Urdu-themed poetry missions for the new Cyberpunk/Cyber-Shadows theme.
- Removed redundant `ALTER TABLE` and `DISABLE RLS` commands from the original legacy schema.

## 2026-03-26: Total Thematic Overhaul & Tie-Breaker Fix (Phase 2.1)

**Status:** Completed

### Goal
Refine the "Cyber-Shadows" theme by centralizing narrator scripts, overhauling visual assets in the Display view, and ensuring robust state synchronization for tie-breaker scenarios.

### Plan
1. Centralize `NARRATOR_SCRIPTS` in `src/lib/game-logic.ts`.
2. Overhaul `src/app/display/[roomCode]/page.tsx` with high-tech icons (`Cpu`, `Zap`, `Terminal`) and terminology.
3. Fix the tie-breaker and banishment logic to ensure instant UI updates across all clients.
4. Enrich the `missions` table with high-depth, narrative-driven technical puzzles.
5. Implement a global signal reset (`has_signaled: false`) in `startMission`.

### Progress (What Worked)
- [x] Defined `NARRATOR_SCRIPTS` with 10+ Cyberpunk narratives.
- [x] Replaced all legacy icons in the TV Display view.
- [x] Migrated Host Dashboard to use centralized scripts and new designations (`Glitch-Runner`, `System-Spy`).
- [x] Generated `supabase/enrich_missions.sql` for a high-quality mission library.
- [x] Verified state synchronization for banishments and signal resets.

### Changed/Discarded
- Moved narrator scripts from being inlined in the Host Dashboard component to a dedicated logic file for better maintainability.
- Switched from "Mehfil-e-Khaas" to "Cyber-Shadows" as the primary application title across all views.

### New Plans
- Monitor real-time performance of the state-sync mechanism during multi-player playtests.

## 2026-03-26: Logical Mission Reconstruction (Phase 2.2)

**Status:** Completed

### Goal
Reconstruct the missions database with verifiable logical puzzles (binary, hex, logic gates) to turn the game into a legitimate mental challenge for the Glitch-Runners.

### Progress (What Worked)
- [x] Designed 8 specific logical puzzles (Binary-to-Dec, Prime-ID, XOR Logic, etc.).
- [x] Generated `supabase/logical_missions.sql` with precise Host Answer Keys.

## 2026-03-26: Final UI Cleanup & Phase Renaming (Phase 2.3)

**Status:** Completed

### Goal
Replace all legacy Urdu/Royal phase names and button labels with 100% thematic Cyberpunk equivalents.

### Progress (What Worked)
- [x] Renamed `lobby` -> `System Entry`, `mission` -> `Neural Breach`, `majlis` -> `Breach Council`, `night` -> `Blackout Sync`, `end` -> `Operation Summary`.
- [x] Renamed 'Spin the Pen' protocol to 'Randomized Decryption' (later 'Neural Override').
- [x] Updated Host buttons to 'Initiate Breach Council'.

## 2026-03-26: Host Dashboard Restoration & State Flush (Phase 2.4)

**Status:** Completed

### Goal
Restore the 'Verify Sabotage' logic in the Host view, map roles to thematic names, and ensure a "Tabula Rasa" state for every mission.

### Progress (What Worked)
- [x] Mapped `sukhan_war` -> `GLITCH-RUNNER` and `naqal_baaz` -> `SYSTEM-SPY`.
- [x] Implemented unanimous signaling requirement for Sabotage Verification.
- [x] Added `has_signaled` reset in `startMission` function.
- [x] Added race condition guards in `handleVerifySabotage`.

## 2026-03-26: Global Color & Theme Update (Phase 3)

**Status:** Completed

### Goal
Completely overhaul the visual identity of the Host, Player, and Display views to match the Cyberpunk theme.

### Progress (What Worked)
- [x] Replaced Gold (`#D4AF37`) with Neon Cyan (`#00F3FF`).
- [x] Replaced warm backgrounds with Obsidian (`#0A0A0A`).
- [x] Switched global typography to `JetBrains Mono` / `Roboto Mono`.
- [x] Synchronized all component colors (Tailwind classes) to neon equivalents.

## 2026-03-26: Global Sizing & Viewport Correction (Phase 3.1)

**Status:** Completed

### Goal
Subtly scale down the UI to account for the larger monospaced fonts and ensure the application fits perfectly on all screen sizes, especially the TV Display view.

### Progress (What Worked)
- [x] Reduced base `html` font-size to 90%.
- [x] Globally compressed Tailwind `gap` and `padding` utility values.
- [x] Applied `max-h-screen overflow-hidden` to the Display view.
- [x] Optimized Landing Page hero title for mobile devices.

## 2026-03-26: Banishment Terminology Cleanup (Phase 4)

**Status:** Completed

### Goal
Purge all legacy "Banishment" and "Sultan" terminology, replacing them with "System Termination", "Overlord Protocol", and "Neural Override".

### Progress (What Worked)
- [x] Renamed 'Banishment' -> 'System Termination' (Host Dashboard) and 'ID Deactivation' (Player/Display).
- [x] Renamed 'Sultan\'s Decree' -> 'Overlord Protocol'.
- [x] Updated player status labels: 'Banished' -> 'OFFLINE' / 'DEACTIVATED'.
- [x] Verified 100% thematic synchronization across all views.

## 2026-03-26: Neural Override Calibration & Layout Fix (Phase 3.2)

**Status:** Completed

### Goal
Calibrate the "Neural Override" (Spin) animation to ensure it stops accurately at the selected node and fix layout overflows on the Public Display.

### Progress (What Worked)
- [x] Aligned spin hand using a 90° trigonometric offset and `(360 * 12) + targetAngle + 90` calculation.
- [x] Implemented `animate-spin-to-stop` with a 5s cubic-bezier deceleration.
- [x] Scaled down headers and status labels by 15% to prevent TV-view overflow.
- [x] Added a constrained, one-line marquee and a scaled-down footer timer.
- [x] Fixed the `SCANNIG` typo in the Host Dashboard.
- [x] Refined logic triggers to ensure the spin only starts when a `reveal_target_id` is broadcast.

## 2026-03-26: Atomic Sabotage & Signaling Guards (Phase 5)

**Status:** Completed

### Goal
Implement robust sabotage signaling and verification logic to prevent race conditions and ensure a "Tabula Rasa" state for every mission.

### Progress (What Worked)
- [x] Implemented a database-level "Fetch-Before-Insert" guard for sabotage signals in the Player client.
- [x] Introduced a "Fresh-Fetch" strategy in the Host Dashboard to prevent concurrent verification updates.
- [x] Synced `startMission` and `resetGame` logic to explicitly clear all signal records (`round_id: 0`) and reset `has_signaled` flags.
- [x] Updated thematic labels: `VERIFY_SYSTEM_BREACH` (Host) and `⚡ BREACH_SIGNAL_ACTIVE` (Spies).

## 2026-03-26: Signal Jammed Leak Patch (Phase 5.1)

**Status:** Completed

### Goal
Prevent the "Signal Jammed" overlay from leaking to players during the night phase before the Overlord initiates the reveal.

### Progress (What Worked)
- [x] Gated the `silenced` status check in `PlayerClient.tsx` using the `is_revealing` flag and current phase detection.
- [x] Verified that status remains hidden during "Blackout Sync" until the reveal handshake is complete.

## 2026-03-26: Build & Deployment Fix (Phase 6)

**Status:** Completed

### Goal
Resolve Vercel deployment failures and finalize project metadata for the "Cyber-Shadows" launch.

### Progress (What Worked)
- [x] Installed missing `lucide-react` dependency in `package.json`.
- [x] Updated project name to `cyber-shadows` in `package.json`.
- [x] Verified that all imported icons (`Cpu`, `Zap`, `Shield`, etc.) are now resolvable by the build engine.

