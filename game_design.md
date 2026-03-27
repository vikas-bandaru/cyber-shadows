# Cyber-Shadows: System Design & Operational Protocols

## 🕯️ The Concept
"Cyber-Shadows" is a social deduction game set in a high-stakes neural breach in a neon-drenched digital underworld. The Overlord AI has offered a collective bounty (`Data-Vault`) to its most loyal Glitch-Runners. However, the connection has been infiltrated by System-Spies whose goal is to sabotage the breach and steal the credits for themselves.

## 🎭 Visual Identity: Neon Obsidian
The game features a premium, cinematic aesthetic defined by:
- **Palette**: Obsidian backgrounds with Neon Cyan (`#00F3FF`) accents.
- **Typography**: High-Tech Monospace (JetBrains Mono) for headings to evoke a "Command Terminal" feel.
- **Atmosphere**: Glassmorphism, subtle cyan glows, and smooth transitions.

## 🕹️ Gameplay Loop

### 1. Neural Breach Phase (The Technical Challenge)
- **Neural Breach:** Missions to bypass the Overlord AI's firewalls.
    - **Sub-Phases:** A single Mission is divided into two distinct neural sub-phases:
        - **Neural Isolation (60s):** Players (except System-Spies) are blindfolded. System-Spies use this window to view their private assignment and coordinate.
        - **Encryption Solving (90s):** All players open their eyes. The group works together to solve the technical/logical challenge before the timer hits 0.
- **Sabotage:** System-Spies can secretly trigger a "Sabotage" signal. If verified by the Overlord, the mission is considered "Sabotaged" even if it later succeeds.
    - **Unanimous Requirement:** In multi-spy sessions, a sabotage signal only becomes verifiable by the Overlord when **all active System-Spies** have triggered their signal.
    - **The Breach Penalty:** If a mission succeeds while sabotaged, only **1000 Credits** is added to the `Data-Vault` (instead of 2000).
    - **The System Leak Reward:** Any System-Spy who signaled a verified sabotage immediately receives **1000 Credits** in their `private_credits`, regardless of whether the mission succeeds or fails.
    - **Visual Feedback:** The synchronization process is visual-first. Any change in the database results in an immediate transition in the UI across all clients.

---

## 🔌 Data Flow Architecture (The Nervous System)
The Cyber-Shadows project follows a **Hub-and-Spoke Interaction Model**, with Supabase acting as the central intelligence hub for all distributed terminals.

### 1. The Interaction Model
- **Centralized Hub (Supabase)**: A single PostgreSQL instance manages the global state. 
- **Spokes (Terminals)**: The Overlord Dashboard (Host), Glitch-Runner Clients (Players), and System Matrix (Display) are all thin clients that subscribe to the Hub.
- **Synchronization Protocol**: 
    - **Real-time CDC**: Uses Postgres Change Data Capture (via Supabase Realtime) to broadcast state changes (e.g., phase shifts, votes) to all clients within milliseconds.
    - **Heartbeat Polling**: A 5-second polling fallback in `useGameState` ensures eventual consistency if the WebSocket connection is interrupted.

### 2. State Transition Lifecycle
- **Outbound Data (Action Phase)**: User actions (e.g., "Signal Sabotage" or "Cast Vote") are pushed directly to the Hub via `supabase-js` API calls.
- **Inbound Data (Observation Phase)**: Clients react to state changes by updating local state via the `useGameState` and `usePlayers` hooks. 
- **Atomic Processing**: Complex logic (like liquidating the Data-Vault and resetting all nodes) is executed via **PostgreSQL Functions (RPC)** to ensure data integrity and prevent race conditions.

---

## 🧊 Data Entities (UML Candidates)
For the purpose of creating UML Class and Sequence diagrams, the following entities represent the core data structures:

### GameRoom (GameState)
| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary unique identifier for the room. |
| `current_phase` | Enum | The global status: `lobby`, `reveal`, `mission`, `majlis`, `night`, `end`, `payout`. |
| `eidi_pot` | Integer | The current value of the Data-Vault. |
| `current_round` | Integer | The current mission iteration count. |
| `mission_timer_end` | Timestamp | ISO string for global timer synchronization. |
| `tie_protocol` | Enum | Protocol for resolving deadlocks: `none`, `decree`, `revote`, `spin`. |

### Player (Node)
| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary unique identifier for the player node. |
| `name` | String | User-defined terminal designation. |
| `role` | Enum | Designation: `sukhan_war` (Runner) or `naqal_baaz` (Spy). |
| `status` | Enum | Connection State: `alive`, `silenced`, `banished`. |
| `private_gold` | Integer | Current game earnings (Private Credits). |
| `gathering_gold`| Integer | Cumulative session earnings (Session Credits). |
| `has_signaled` | Boolean | Tracking flag for unanimous sabotage coordination. |

### Vote (Signal)
| Field | Type | Description |
|---|---|---|
| `room_id` | UUID | Foreign Key to the GameRoom. |
| `voter_id` | UUID | Foreign Key to the Player node. |
| `target_id` | UUID | The destination node for the signal (suspect or self-sabotage). |
| `round_id` | Integer | Index for the specific mission/council round. (`0` = Sabotage Signal). |

---

## 💾 Client-Side Persistence (Refresh Guard)
To handle unintended disconnects and "Neural Link Recovery," the terminal state is cached in `localStorage`:
- `playerId`: The persistent anchor for a player's session identity.
- `cyber_shadows_role_revealed_${roomId}`: A local safety flag to ensure roles are not accidentally re-revealed after a neural link recovery.

---

## 🎡 Synchronized State Machine (Master Control)
The core of Cyber-Shadows is a **Synchronized State Machine** where the database acts as the sovereign source of truth for the game's operational state.

### 1. The Master State Vector
The `game_rooms.current_phase` column serves as the **Master State**. Any change to this column triggers a global re-rendering of all connected terminals instantly:
- `lobby`: Global node registration and synchronization.
- `reveal`: Secure neural identity assignment.
- `mission`: Active data breach with sub-second timer tracking.
- `majlis`: System termination and voting consensus.
- `night`: Blackout coordination for anomalous System-Spies.
- `end`: Operations conclusion and victory evaluation.
- `payout`: Credit liquidation and neural link reset.

### 2. The Trigger-Broadcast Loop (Postgres CDC)
1. **Interaction**: A terminal (Host or Player) pushes an `UPDATE` or `RPC` request to the Hub.
2. **Commit**: PostgreSQL validates the logic (including RLS and Constraints) and commits the delta.
3. **CDC Broadcast**: Supabase Realtime detects the change and pushes the precise delta to all listening `useGameState` hooks via WebSockets (< 100ms latency).
4. **Universal Reaction**: Every terminal (Overlord, Runner, Display) re-renders its specific view based on the authoritative `current_phase` and metadata.

---

## 📈 State Transition Matrix
The following matrix defines the logic for all primary state transitions, providing the foundation for DFD and Sequence diagrams.

| Trigger Action | Request State | Side Effects (Secondary Writes) | Final State | Authority |
|---|---|---|---|---|
| **Initialize Room** | `N/A` | `INSERT game_room`, `Set lobby` | `lobby` | Host |
| **Assign Roles** | `lobby` | `UPDATE players.role`, `Reset signals` | `reveal` | Host |
| **Pick Mission** | `reveal` | `SELECT random mission`, `Set phase` | `mission` | Host |
| **Start Breach** | `mission` | `UPDATE mission_timer`, `DELETE previous votes` | `mission` | Host |
| **Signal Sabotage**| `mission` | `INSERT votes (round_id: 0)`, `UPDATE players.has_signaled` | `mission` | Player (Spy) |
| **Verify Sabotage**| `mission` | `UPDATE game_room.sabotage_used`, `ADD private credits` | `mission` | Host |
| **Initiate Council**| `mission` | `Clear mission timers`, `Sync terminals` | `majlis` | Host |
| **Log Vote** | `majlis` | `INSERT votes (target_id)` | `majlis` | Player |
| **Deactivate Node** | `majlis` | `UPDATE player.status: banished` | `night` / `end` | Host |
| **Sync Payout** | `end` | `RPC liquidate_gathering_pot`, `Consolidate credits` | `payout` | Host |
| **Reset Matrix** | `payout` | `RESET room columns`, `Set phase` | `lobby` | Host |

---

## 🛡️ State Guards & Validation Logic
- **Authorization Isolation**: Certain database writes are restricted to specific phases (e.g., a "Kill" signal is rejected if the state is not `night`).
- **Sub-State Signals**: `is_revealing` and `tie_protocol` serve as **sub-states** that drive micro-animations without a full phase transition, allowing for complex visual sequences within a single master state.

---

## 🎨 UI/UX Architecture (Mobile Optimization)
Cyber-Shadows is designed for high-stakes, mobile-first environments where focus and layout stability are critical.

### 1. Mobile Standards
- **Touch-Target Compliance**: All primary action nodes (Vote, Signal, Sabotage) are enforced with a **44px minimum touch target** for universal accessibility.
- **Tactile Feedback**: Interactive components use `active:scale-95` to provide immediate physical confirmation on touch devices, reducing latency anxiety.

### 2. Layout Stability
- **Viewport Locking**: Restricted terminal states (Signal Jammed, Terminal Deactivated) employ `h-screen overflow-hidden` and `touch-none` overlays. 
- **Immersion Guard**: These locks prevent browser-default behaviors like "pull-to-refresh" or accidental scrolling from breaking the immersion of being inside an isolated neural node.

---

## 🎞️ Cinematic Presentation
The visual identity of the project is engineered for maximum suspense and high-fidelity feedback.

### 1. Atmospheric Timing
- **Thematic Marquees**: High-stakes text marquees (e.g., Blackout Sync, Payout Conclusion) use a **30-second duration** (`animate-marquee-slow`) to maintain a premium, meditative feel.

### 2. Synchronization Logic
- **Neural Override Timing**: The public display features a synchronized **5-second state delay** during termination reveals to perfectly match the length of the "Neural Override" spin animation.
- **Reactive UI**: The terminal transition logic acts as a reactive layer over the state machine—ensuring that visual effects and state changes always occur in a choreographed, cinematic sequence.

### 2. Breach Council Phase (The System Termination)
- **Objective:** Debate and identify the infiltrators.
- **System Termination:** Players vote on who they suspect to be a System-Spy. 
- **Tie-Breaking Protocols:** If the vote is tied, the Host (Overlord) utilizes one of three protocols:
    - **Overlord Protocol**: Manual selection by the Host to resolve the deadlock.
    - **Re-vote**: The Council conducts a secondary ballot for the tied nodes.
    - **Neural Override**: A randomized, cinematic decryption process.
- **Cinematic Sync:** The public display features a synchronized **5-second animation** during the Neural Override to build cinematic suspense before highlighting the deactivated suspect.
- **Outcome:** Terminated players enter the "Offline Mode" (Spectator State).

### 3. Blackout Sync Phase (The Signal Jamming)
- **Objective:** System-Spies choose a target to jam.
- **The Vote:** System-Spies cast a secret ballot. The Overlord confirms the most-voted target.
- **Signal Jamming:** The victim is "Signal Jammed" and is prohibited from speaking or interacting in the next Breach Council.

### 4. Operation Summary Phase (The Final Reward)
- **Objective:** Showcase the final credits accumulated across the entire session.
- **Trigger:** The Host clicks "End Session & Pay Out" after any game ends.
- **Outcome:** The room transitions to a special "Summary" screen showing a session-wide leaderboard ranked by `Session Credits`.

## ⚙️ Game Engine Design
The engine is built on a **State-Driven Sync** model:
- **Global Phase Manager:** A single `current_phase` flag in the database dictates the UI layout for all participants.
- **Persistent Credit Engine:** `Private Credits` tracks individual earnings (stolen or awarded), while the `Data-Vault` tracks the collective pool and potential shares.
- **Dynamic Scaling:** Role counts are automatically adjusted based on the node count:
    - 4-7 Players: **1 System-Spy**
    - 8-12 Players: **2 System-Spies**
    - 13-20 Players: **3 System-Spies**
- **Win Conditions:**
    - **Glitch-Runners**: Win if all System-Spies are terminated.
    - **System-Spies**: Win if they equal or outnumber the Glitch-Runners.
- **Session Resilience (Refresh Guard):** Identity (`playerId`) and role reveal status are anchored in `localStorage`, allowing the engine to re-sync a player's exact state (including Jammed or Deactivated views) after a browser refresh.
- **Liquidation Logic:** A dedicated function computes and distributes the remaining vault to the winning faction upon victory. 
    - **Eligibility**: Only ***alive*** members of the winning faction receive a share of the Data-Vault.
    - **Session Transfer**: This function moves `private_credits` into `session_credits` (Cumulative Total) before resetting the game.

## 🏛️ The Connection Session (Multi-Game Session)
Cyber-Shadows is designed for a full evening of play. A "Session" consists of multiple games played with the same group.

- **Session Credits:** Total credits accumulated across all games in a room. This is the persistent score that defines the ultimate winners of the evening.
- **Game Credits:** Credits earned within a single game through missions or sabotages. This is converted into "Session Credits" at the end of each game and then reset.
- **Vault Share:** At the end of each game, the remaining `Data-Vault` is liquidated and shared with the winning faction, becoming part of their cumulative Session Credits.
- **Verification:** The final vault value from the last game (`Last Game Vault`) is stored so players can verify the distribution was accurate even after the vault is reset for a new round.
- **End of Session:** When the Host decides to conclude the evening, they transition to the `Operation Summary` phase to reveal the Overlord's elite runners.

## 🏗️ System Architecture

Cyber-Shadows is built on a modern, real-time architecture designed for low-latency social deduction gameplay.

### 1. Real-time Synchronization (Supabase)
The application utilizes **Supabase Realtime** (`postgres_changes`) to maintain a synchronized state across three distinct views:
- **Host Dashboard**: Orchestrates game flow and triggers state transitions.
- **Player Client**: Mobile-first interface for private roles, voting, and actions.
- **Public Display**: Cinematic view for entry status, breach reveals, and results.

### 2. Reactive State Machine
The game logic is driven by a centralized state machine in the database:
- **Source of Truth**: The `game_rooms` table tracks the `current_phase`, `vault_pot`, and global timers.
- **Event-Driven UI**: Next.js components subscribe to database changes and reactively update the UI based on phase transitions (e.g., transitioning from `Entry` to `Breach`).

### 3. Client-Side Persistence
To handle accidental browser refreshes, the application anchors critical identity data in `localStorage`:
- **Identity Storage**: `playerId` and `roomCode` are persisted locally.
- **State Recovery**: Upon reload, the `PlayerClient` automatically re-fetches its state and role, ensuring the player can resume gameplay without re-joining.

---

## 📂 Project Folder Structure

The repository follows a standard Next.js directory layout with modular logic for game mechanics and database management.

```text
cyber-shadows/
├── src/
│   ├── app/                # Next.js App Router (Routes & Pages)
│   │   ├── host/           # Host Dashboard & Setup
│   │   ├── play/           # Mobile Player Client
│   │   ├── display/        # Cinematic Public View
│   │   ├── join/           # Player Entrance Portal
│   │   └── layout.tsx      # Global Styles & Analytics
│   ├── lib/                # Core Logic & Utilities
│   │   ├── game-logic.ts   # State Transitions & Calculations
│   │   ├── supabase.ts     # Supabase Client Initialization
│   │   └── theme-config.ts # Global Brand & Styling Tokens
│   ├── hooks/              # Custom React Hooks
│   │   └── useRoomData.ts  # Real-time state synchronization hook
│   └── globals.css         # Tailwind & Vanilla CSS Layer
├── supabase/               # Database Schema & Migrations
│   ├── schema.sql          # Core Table Definitions
│   ├── clean_init.sql      # Fresh room initialization script
│   └── *_missions.sql      # Mission content & logic
└── README.md               # Project Overview
```

---

## 🏰 Parallels with "The Traitors"

| Feature | The Traitors (UK/US) | Cyber-Shadows |
| :--- | :--- | :--- |
| **Loyal Faction** | Faithfuls | Glitch-Runners |
| **Infiltrator Faction** | Traitors | System-Spies |
| **Daily Activity** | Mission (Shield/Money) | Neural Breach (`Data-Vault` / Sabotage) |
| **Termination Ceremony** | The Round Table | The Breach Council |
| **Infiltrator Action** | The Murder | Signal Jamming |
| **Eliminated Players** | Murders/Banishments | Deactivated (Offline Mode) / Jammed |
| **The Reward** | Winning Pool | `Data-Vault` Distribution |
| **Session Goal** | The Full Season | The Connection Session (Up to 20 Players) |
