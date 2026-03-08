---
name: LeetTok Build Plan
overview: Build LeetTok mobile-first with React Native/Expo, starting with the TikTok-style video feed UI using sample clips, then layering in backend, auth, and the auto-clipping pipeline incrementally. Every small step gets its own well-described commit.
todos:
  - id: phase1-init
    content: "Phase 1: Initialize Expo project, configure structure, NativeWind, expo-router, linting (commits 1-5)"
    status: completed
  - id: phase2-feed
    content: "Phase 2: Build TikTok-style video feed MVP with snap-scroll, auto-play, overlay UI, action buttons (commits 6-15)"
    status: completed
  - id: phase3-nav
    content: "Phase 3: Build tab navigation, Explore, Bookmarks, Profile screens, search (commits 16-20)"
    status: completed
  - id: phase4-backend
    content: "Phase 4: Set up Supabase, define schema, add auth, connect feed to real data (commits 21-26)"
    status: completed
  - id: phase5-polish
    content: "Phase 5: Recommendations, onboarding, theming, app icon, performance audit, TestFlight (commits 27-32)"
    status: completed
isProject: false
---

# LeetTok: Iterative Build Plan

Remote repo: `https://github.com/mbron64/LeetTok.git`

---

## Phase 1: Project Foundation

Goal: A clean, well-structured Expo project pushed to GitHub with all tooling configured.

**Commits:**

1. **Initialize Expo SDK 55 project with TypeScript** -- `npx create-expo-app@latest --template default@sdk-55` (SDK 55 uses React Native 0.83, React 19.2, New Architecture mandatory). Clean out boilerplate.
2. **Configure project structure** -- SDK 55 uses a `/src` folder structure (`src/app/`, `src/components/`, `src/lib/`, `src/constants/`, `src/types/`). Set up the directory skeleton.
3. **Set up NativeWind v5 (Tailwind CSS v4.1 for RN)** -- Install `nativewind@preview`, `react-native-css`, `@tailwindcss/postcss`. NativeWind v5 is required for SDK 55 / New Architecture / Reanimated v4.
4. **Add expo-router for file-based navigation** -- SDK 55 includes the Native Tabs API for platform-native tab experiences. Set up tab-based layout with placeholder screens (Feed, Explore, Bookmarks, Profile).
5. **Add ESLint + Prettier** -- Consistent code formatting from day one

---

## Phase 2: Video Feed MVP

Goal: A TikTok-style full-screen vertical scroll of videos that auto-play. This is the core UX -- it needs to feel snappy.

We'll use **sample videos** initially (a few publicly available short coding clips, or even stock videos) so we can perfect the scrolling/playback experience without needing the pipeline yet.

**Commits:**

1. **Create sample video data** -- Hardcoded array of video objects with URLs to publicly hosted sample clips (we can host a few on R2 or use public URLs), problem metadata (title, difficulty, topics)
2. **Build VideoFeed component with FlatList snap-scroll** -- `FlatList` with `pagingEnabled`, `snapToInterval` set to screen height, `decelerationRate="fast"`. Each item fills the full viewport.
3. **Add video playback with expo-video** -- Use `useVideoPlayer` hook + `<VideoView>` component (expo-av is deprecated as of SDK 54; `expo-video` is the replacement). Handle loading states.
4. **Implement auto-play/pause based on visibility** -- Use `viewabilityConfig` + `onViewableItemsChanged` to track which item is on screen. Only the visible video plays. Others are paused. Note: on Android, multiple `VideoView` components sharing one `VideoPlayer` instance don't work -- each FlatList item needs its own player, or use a single player that swaps source on scroll.
5. **Add tap-to-pause/play gesture** -- Tap the video to toggle playback. Show a brief play/pause icon overlay on tap.
6. **Build top category bar** -- Horizontally scrollable tab row overlaid on top of the video (semi-transparent, like TikTok's). Tabs: **For You** (default, bold + underline) | **MadLeets** | **NeetCode 150** | **Trending** | **New**. Tapping a tab swaps the feed content. Search icon on the far right.
    - **For You**: Personalized feed based on watch history, likes, and topic preferences. Falls back to curated mix for new users.
    - **MadLeets**: Only clips with an attached MadLeets challenge. Challenge auto-triggers at pause timestamp.
    - **NeetCode 150**: Clips organized by NeetCode's curated 150-problem list. Shows progress (e.g., "47/150 seen").
    - **Trending**: Ranked by engagement (likes + bookmarks) over past 7 days.
    - **New**: Reverse chronological, most recently clipped content first.
7. **Build right-side action column** -- Vertical button column on the right edge of the video, matching TikTok's layout (top to bottom):
    - **Creator avatar** (circular thumbnail, tap to see their channel, "+" follow button beneath)
    - **Like** (heart icon + count, tap to toggle, animated fill on like)
    - **Discuss** (comment bubble icon + count, tap to open comment sheet)
    - **Save** (bookmark icon + count, tap to toggle)
    - **Share** (arrow icon + count, tap to open share sheet)
    - **LeetCode problem badge** (bottom element, replaces TikTok's spinning album art): Shows problem number, name, and difficulty color (green/yellow/red). Tap to open the problem on LeetCode.com.
8. **Build bottom-left overlay text** -- Creator name, clip title, and topic tags displayed at the bottom-left of the video (like TikTok's caption area). Truncated with "more" expansion.
9. **Add progress bar** -- Thin progress bar at bottom of each video showing playback position
10. **Preload adjacent videos** -- When a video comes into view, start loading the next 1-2 videos in the background so swiping feels instant
11. **Polish and stress-test the feed** -- Handle edge cases: rapid swiping, backgrounding the app, rotating device, slow network. Make sure memory doesn't leak from video components.

---

## Phase 3: Navigation and Screens

Goal: A real app with multiple screens, not just a single feed.

**Commits:**

1. **Build 5-tab bottom bar** -- Solid black background, 5 tabs matching TikTok's layout:
    - **Home** (house icon) -- The video feed with top category bar
    - **Explore** (search icon) -- Browse problems by topic
    - **[MadLeets]** (center button, branded + prominent, rounded-rectangle with gradient edge like TikTok's "+" button) -- Jumps straight into the next MadLeets challenge
    - **Bookmarks** (bookmark icon) -- Saved clips
    - **Profile** (user icon) -- Stats, XP, streaks, settings
2. **Build Explore screen** -- Grid/list view of LeetCode problems organized by topic (Arrays, Trees, DP, Graphs, etc.). Tap a problem to see its clips in feed format. Filter chips for difficulty. Search bar at top to filter by problem name, number, or topic.
3. **Build Bookmarks screen** -- Saved clips in a grid. Tap to play in feed mode.
4. **Build Profile screen** -- Avatar, XP level, MadLeets streak, stats (clips watched, problems covered, accuracy %), settings gear. Links to [MadLeets progress stats](madleets_interactive_challenges.plan.md) when that plan is implemented.

---

## Phase 4: Backend + Data Layer

Goal: Move from hardcoded data to a real backend. Set up Supabase.

**Commits:**

1. **Set up Supabase project** -- Create project, get connection string and anon key. Add `@supabase/supabase-js` to the Expo app. Create `lib/supabase.ts` client.
2. **Define database schema** -- SQL migrations for tables: `problems` (id, number, title, difficulty, topics[]), `clips` (id, problem_id, video_url, title, duration, transcript, source_video_url, creator, created_at), `users`, `bookmarks`, `likes`
3. **Seed the database** -- Insert sample problem and clip data so the app has something to display
4. **Add auth (sign up / login)** -- Supabase Auth with email/password. Simple auth screens. Persist session with `expo-secure-store`.
5. **Connect feed to Supabase** -- Replace hardcoded data with `supabase.from('clips').select(...)`. Add pagination with cursor-based loading.
6. **Wire up likes and bookmarks** -- Save interactions to Supabase. Optimistic UI updates.

---

---

> **Note**: The content pipeline (auto-clipper) has its own dedicated plan: see [NeetCode Clipping Engine](.cursor/plans/neetcode_clipping_engine.plan.md). It lives in `pipeline/` and can be built in parallel with the mobile app.

> **Note**: The interactive fill-in-the-blank feature has its own dedicated plan: see [MadLeets Interactive Challenges](.cursor/plans/madleets_interactive_challenges.plan.md). It depends on both the mobile app feed (Phase 2) and the clipping pipeline.

---

## Phase 5: Polish and Ship

1. **Recommendation logic** -- Simple algorithm: mix unseen clips, weight by difficulty preference and topics the user engages with
2. **Onboarding flow** -- First-time user picks preferred difficulty and topics
3. **Dark mode + theming** -- Consistent dark theme (video content looks best on dark backgrounds)
4. **App icon + splash screen** -- Branded assets
5. **Performance audit** -- Profile memory usage, video loading times, scroll performance
6. **TestFlight / internal distribution** -- Ship to testers

---

## Key Technical Decisions

- **Expo SDK 55 (managed workflow, New Architecture)** -- Fast iteration, OTA updates, React Native 0.83, React 19.2. New Architecture is mandatory in SDK 55 (no legacy bridge).
- **expo-video for playback** -- The official replacement for the deprecated expo-av. Uses `useVideoPlayer` hook + `<VideoView>`. If we hit limits, we can eject and use `react-native-video` later.
- **NativeWind v5 (Tailwind CSS v4.1)** -- Utility-first styling. v5 is required for SDK 55 / New Architecture / Reanimated v4 compatibility.
- **Supabase (v1.26+) over Firebase** -- Postgres is more flexible for the queries we need (filtering by difficulty, topic, full-text search). Row Level Security keeps auth simple. Official Expo RN integration with `expo-sqlite` for secure storage.
- **Cloudflare R2 over S3** -- Zero egress fees are critical for a video-heavy app. Same S3-compatible API. (15TB delivered for ~$2.)
- **Python pipeline as separate service** -- Keeps concerns separated. The mobile app doesn't need to know how clips are made. Pipeline can run on a cheap VM or as a scheduled GitHub Action.
- **LLM choices for pipeline** -- GPT-4.1-mini ($0.40/$1.60 per 1M tokens) or Claude Haiku 4.5 for cheap segment detection. GPT-5.4 or Claude Opus 4.6 available if we need higher quality for complex prompts.

---

## Risks to Watch

1. **Video playback performance** -- expo-video on Android has a known limitation where multiple VideoView components sharing one VideoPlayer can't be mounted simultaneously. We'll need to architect around this (single player that swaps source, or one player per item with careful lifecycle management).
2. **Copyright** -- Clipping NeetCode content without permission is legally risky. Plan to reach out for a partnership early. Alternatively, pivot to AI-generated original content.
3. **Content quality** -- Auto-clipping may produce mediocre segments. The LLM prompt engineering for segment detection will need iteration.
4. **SDK 55 + NativeWind v5 stability** -- Both are very new (Feb 2026). We may hit edge-case bugs. Keep an eye on NativeWind v5 issues, especially around Reanimated v4 + animated scroll views.
5. **Expo limitations** -- If we need background video processing or advanced codecs, we may need to eject from managed Expo to a development build.

