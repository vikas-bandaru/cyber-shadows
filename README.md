# Cyber-Shadows: Distributed Heist Protocol

A real-time, multi-platform social deduction game set in a high-stakes Neo-Tokyo 2099. Inspired by "The Traitors," players take on roles as **Runners** (Poets) or **Plagiarists** (Spies) to breach the Overlord AI's Data-Vault.

## 🚀 Terminal Initialization

### 1. Prerequisites
- **Node.js**: v18 or later.
- **Supabase**: Access to a project with `game_rooms`, `players`, `votes`, and `night_votes` tables.

### 2. Neural Link (Environment Variables)
Create a `.env.local` file in the root directory and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Dependency Injection
```bash
npm install
```

### 4. Running the Protocol
```bash
# Start the development server
npm run dev
```
Access the node at [http://localhost:3000](http://localhost:3000).

## 🎭 Roles & Neural Sync
Cyber-Shadows is designed for multi-device synchronization:
- **Neo-Tokyo Entry**: A premium, high-tech portal for both Runners and Overlords.
- **Overlord Dashboard (`/host`)**: The central command node to control the matrix flow.
- **Neural Node Sync (QR Code)**: Instant mobile entry via QR code scanning directly from the public display.
- **Runner Mobile Client**: Optimized for touch, featuring session persistence (Refresh Guard) and real-time status updates.
- **Public Display (`/display`)**: The high-fidelity "Source of Truth" for the entire heist team.

## ⚡ Global Systems
- **Neural Node Sync**: Distributed QR generation for effortless mobile player boarding.
- **Atomic Transitions**: Flicker-free phase advancement protocols ensuring a smooth mission experience.
- **Emergency Termination**: Global room deletion with real-time client reset synchronization.
- **Distributed Potter**: Scalable support for up to **20 Runners** with adaptive UI layouts.

## ✨ Thematic Interface
- **Cyber-Net Aesthetic**: A premium obsidian interface with high-contrast Neon Cyan (`#00F3FF`) accents.
- **Neural Overrides**: Interactive spin-animations and randomized decryption algorithms.
- **Monospace Typography**: A technical, low-latency visual identity using modern fonts like **Outfit** and **Inter**.
- **Real-time Feedback**: Immediate button states with "SIGNALING..." and "COPIED!" indicators.

## 🛠️ Tech Stack
- **Framework**: Next.js 16+ (App Router, Turbopack)
- **Icons**: Lucide-React
- **Neural Sync**: qrcode.react
- **Database/Real-time**: Supabase
- **Styling**: Vanilla CSS (Premium "Neural-Net" Design System)
- **State Management**: React Hooks + Supabase Realtime Subscriptions
