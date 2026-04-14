# Phytoclinic — Workspace

## Overview

pnpm workspace monorepo using TypeScript. Agricultural consulting mobile app (Expo) with Express API backend and PostgreSQL database. Fully in Arabic with RTL layout.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Mobile app**: Expo (SDK 54) + Expo Router — `artifacts/agri-connect`
- **API server**: Express 5 + Drizzle ORM — `artifacts/api-server`
- **Database**: PostgreSQL + Drizzle ORM — `lib/db`
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Node.js**: 24 | **TypeScript**: 5.9

## Architecture

### Mobile App (`artifacts/agri-connect`)
- Expo Router file-based navigation with 4 tabs: Consultations, Diseases, Index (Phyto), Profile
- `context/AppContext.tsx` — global state, auth, cloud sync, heartbeat every 30s, rateConversation
- `context/ThemeContext.tsx` — dark mode state (AsyncStorage persistence)
- `services/api.ts` — all API calls (auth, experts, conversations, messages, heartbeat, rating, typing, user status)
- `hooks/useAudioRecorder.ts` — unified audio recording (Web: MediaRecorder, Native: expo-av)
- `hooks/useColors.ts` — theme colors from ThemeContext
- `hooks/usePushNotifications.ts` — Expo push notification token registration
- RTL layout, Arabic language throughout

### Tabs
- `app/(tabs)/index.tsx` — consultation list with search bar + pull-to-refresh + skeleton loading + stats + WalkthroughModal for new farmers
- `app/(tabs)/diseases.tsx` — disease library (25 Moroccan diseases, search/filter/detail modal, FlatList, pull-to-refresh)
- `app/(tabs)/phyto.tsx` — phytosanitary product index (4,686 entries)
- `app/(tabs)/profile.tsx` — user profile, dark mode toggle, logout, admin link

### Conversation Screen
- `app/conversation/[id].tsx` — real-time polling every 5s, pull-to-refresh, in-conversation search, expert online indicator, typing indicator, long-press on messages, rating banner
- `components/MessageBubble.tsx` — read receipts (✓/✓✓), image/audio/video, voice speed control (1×/1.5×/2×), long-press support
- `components/SkeletonCard.tsx` — animated skeleton loading placeholder for conversation list
- `components/WalkthroughModal.tsx` — 4-step onboarding walkthrough for first-time farmers (AsyncStorage persisted)

### API Server (`artifacts/api-server/src/routes/`)
- `auth.ts` — POST /register, POST /login, PUT /push-token, PUT /heartbeat (last_seen), GET /users/:id/status (online indicator)
- `experts.ts` — CRUD for experts, protected by X-Admin-Key header
- `conversations.ts` — conversations + messages CRUD, PUT /:id/rating, PUT /:id/typing (typing indicator)
- `health.ts` — GET /api/health
- `admin.ts` — admin panel endpoints (users, conversations, assign)
- `preliminary-diagnosis.ts` — POST /preliminary-diagnosis — keyword-based text pre-diagnosis
- `diagnose-image.ts` — POST /diagnose-image — Claude Vision AI photo diagnosis (Anthropic via Replit AI Integrations)

### AI Photo Diagnosis
- Endpoint: `POST /api/diagnose-image` accepts `{ imageBase64, mimeType, culture?, region?, description?, lang }` 
- Uses Claude Sonnet 4.6 Vision to identify up to 3 diseases with confidence scores, recommendations, urgency
- Fallback JSON returned if Claude API fails
- App: `new-consultation.tsx` — "Diagnostic IA" button appears after first photo is added; shows loading state, disease cards with confidence bars, include-in-consultation toggle
- Client sends `expo-file-system` base64 on native; `FileReader` on web
- Timeout: 30 seconds (extended from default 10s)
- Env vars: `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`, `AI_INTEGRATIONS_ANTHROPIC_API_KEY` (auto-set via Replit AI Integrations)

## Database Tables
- `experts` — agricultural experts managed by admin
- `users` — registered users (farmers & experts) with phone + password, push_token, last_seen
- `conversations` — consultation threads; columns: rating INT, response_time_ms BIGINT, typing_user_id TEXT, typing_at BIGINT
- `messages` — individual messages (text, image, audio, video) in conversations

## Access Codes
- **Expert registration**: `Thd5yimo` (company code)
- **Admin panel**: `Thd5yimo` (admin panel lock + API X-Admin-Key header)
- **Phone placeholder**: +212 (Morocco)

## Key Commands
- `pnpm run typecheck` — full typecheck
- `pnpm run build` — build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/api-server run dev` — API server locally

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — session secret
- `EXPO_PUBLIC_API_URL` — API base URL (auto-set from Replit domain)

## Dev Notes
- Do NOT use `react-native-keyboard-controller` — use built-in `KeyboardAvoidingView`
- Do NOT import `expo-image-picker` at module top level — use `hooks/useImagePicker.ts` lazy-loading
- Always use `safeHaptics` from `utils/haptics.ts`
- All media must be base64 data URIs — `blob:` URLs expire on native
- Web full-screen overlay fix: must use `ReactDOM.createPortal` into `document.body`
- Logout pattern: `signOut()` clears state → layout `useEffect` (guarded by `sessionLoaded`) handles redirect
- `useColors` uses `ThemeContext` — app MUST be wrapped in `ThemeProvider` (done in `_layout.tsx`)
