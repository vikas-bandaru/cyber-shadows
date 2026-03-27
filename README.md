# Cyber-Shadows: Distributed Heist Protocol

A real-time, multi-platform social deduction game set in a neon-drenched digital underworld. In Cyber-Shadows, players take on roles as **Glitch-Runners** or **System-Spies** to breach the Overlord AI's Data-Vault.

## 📖 In-Depth Documentation

For detailed information on project-wide UML documentation, Data Flow Architecture, and the Synchronized State Machine, please refer to the **[game_design.md](file:///Users/vikas/Documents/project_experiments/cyber-shadows/game_design.md)**.

## 🕹️ The Architecture of Deception

Cyber-Shadows is designed for a seamless, multi-device experience across three primary entry points:

1.  **Overlord Dashboard (`/host`)**: The central command node for the Host. Monitor the breach, trigger neural overrides, and authenticate system terminations.
2.  **Glitch-Runner Client (`/play`)**: A mobile-optimized player interface for private roles, secure voting, and sabotage signaling. Features **Session Persistence** to survive unintended disconnects.
3.  **System Matrix (`/display`)**: A cinematic public display providing the "Source of Truth" for all players. Includes mission reveals, high-stakes countdowns, and real-time result animations.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher.
- **Supabase Account**: Required for real-time state synchronization.

### 2. Neural Link (Environment Setup)
Create a `.env.local` file in the root directory with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database Initialization
The project uses a clean-slate, optimized PostgreSQL schema. Execute these scripts in your Supabase SQL Editor:
1.  **[clean_init.sql](file:///Users/vikas/Documents/project_experiments/cyber-shadows/supabase/clean_init.sql)**: Establishes all core tables, enums, RLS policies, and the atomic liquidation function.
2.  **[logical_missions.sql](file:///Users/vikas/Documents/project_experiments/cyber-shadows/supabase/logical_missions.sql)**: Seeds the database with high-stakes technical challenges and narrator scripts.

### 4. Running the Protocol
```bash
# Install system dependencies
npm install

# Start the local development server
npm run dev
```
Access the local node at [http://localhost:3000](http://localhost:3000).

---

## 🛠️ System Requirements

- **Framework**: Next.js 16 (App Router + Turbopack)
- **State Engine**: Supabase Realtime (PostgreSQL Subscriptions)
- **UI Architecture**: Tailwind CSS 4 & Vanilla CSS Design System
- **Icons & Branding**: Lucide-React & JetBrains Mono Typography

---

## 🤝 Contribution Protocol

We welcome community-driven neural expansions! To contribute:
1.  **Missions**: Propose new logical/technical challenges in `supabase/logical_missions.sql`.
2.  **Themes**: Modify `src/lib/theme-config.ts` to implement new brand identities or design tokens.
3.  **Core Logic**: Submit improvements to the state machine in `src/lib/game-logic.ts`.

---
> [!TIP]
> For the best experience, host the **System Matrix** on a large screen and have players join via the **QR Code** displayed in the header.
