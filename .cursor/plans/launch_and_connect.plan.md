---
name: Launch and Connect
overview: "Get LeetTok running in the iOS Simulator, then connect it to the real Supabase backend. Two paths: (A) quick UI preview with sample data, (B) full Supabase connection with auth, database, and Edge Functions."
todos:
  - id: launch-install
    content: "Step 1: npm install to pull all dependencies"
    status: pending
  - id: launch-preview
    content: "Step 2: Start Expo and open in iOS Simulator (sample data mode)"
    status: pending
  - id: connect-config
    content: "Step 3: Plug real Supabase URL + anon key into config.ts"
    status: pending
  - id: connect-migrations
    content: "Step 4: Run all 10 database migrations on Supabase"
    status: pending
  - id: connect-seed
    content: "Step 5: Run seed data (problems with test cases, MadLeets challenges)"
    status: pending
  - id: connect-edge
    content: "Step 6: Deploy Edge Functions (chat-tutor, run-code, feed, generate-embedding)"
    status: pending
  - id: connect-secrets
    content: "Step 7: Set Edge Function secrets (OPENAI_API_KEY, JUDGE0_URL, etc.)"
    status: pending
  - id: connect-test
    content: "Step 8: Restart app, test auth flow, feed, and features with real backend"
    status: pending
isProject: false
---

# Launch and Connect

Get LeetTok running in the simulator, then wire it up to the real Supabase backend.

---

## How the App Handles Missing Backend

The app checks `isSupabaseConfigured` (in `src/constants/config.ts`) at every data boundary:

- **Auth**: When not configured, `AuthProvider` skips session checks and doesn't redirect to login. The user stays on the feed.
- **Feed**: `useClips()` returns `sampleClips` (8 clips with real playable video URLs from Google's public sample bucket).
- **Explore**: `useProblems()` extracts problems from sample clips.
- **Likes/Bookmarks**: Toggle locally in state (no persistence).
- **MadLeets**: Uses `sampleChallenges` from constants.
- **AI Tutor**: Sheet opens but streaming calls will fail (no Edge Function deployed).
- **Code Editor**: Sheet opens but execution calls will fail (no Judge0 backend).

This means **Path A works immediately** -- the core TikTok-style UI is fully functional with sample data.

---

## Path A: Quick UI Preview (~2 minutes)

### Step 1: Install dependencies

```bash
cd LeetTok
npm install
```

This pulls ~150 packages including Expo SDK 55, React Native 0.83.2, NativeWind v5, expo-video, etc.

### Step 2: Start Expo and open in iOS Simulator

```bash
npx expo start --ios
```

This will:

1. Start the Metro bundler
2. Launch the iOS Simulator (requires Xcode + iOS Simulator installed)
3. Build and install the Expo development client
4. Load the app

**What you'll see:**

- Onboarding screen (pick difficulty + topics)
- After onboarding: full TikTok-style vertical feed with 8 sample clips
- Videos auto-play with sound as you scroll
- Top category bar (For You, MadLeets, NeetCode 150, Trending, New)
- Right sidebar: AI Tutor button, Code Editor button, creator avatar, like/comment/bookmark/share, LeetCode problem badge
- 5-tab bottom bar with MadLeets center button
- Tap to pause/play with icon flash
- MadLeets challenge overlay triggers during video playback
- Explore tab with problem list + difficulty filters
- Profile tab with XP, streaks, progress stats

**What won't work (no backend):**

- Auth screens (accessible but can't actually sign in)
- AI Tutor responses (sheet opens, but no OpenAI streaming)
- Code Editor execution (sheet opens, but no Judge0)
- Data doesn't persist between sessions (likes, bookmarks reset)

---

## Path B: Full Supabase Connection (~15 minutes)

### Step 3: Plug in Supabase credentials

Update `src/constants/config.ts`:

```typescript
export const SUPABASE_URL = "https://zqhbjgioibiyaagjihhx.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_BDfV_eVtgmb4_apS0e5ymw_j6DAjl6_";
```

This flips `isSupabaseConfigured` to `true`, which enables:

- Auth (login/register screens become active, route protection kicks in)
- Supabase data fetching (feed, problems, likes, bookmarks)
- Event tracking (interactions, impressions)

### Step 4: Run database migrations

Run all 10 migration files on the Supabase project. Two options:

**Option A -- Supabase CLI (recommended if CLI is installed):**

```bash
supabase link --project-ref zqhbjgioibiyaagjihhx
supabase db push
```

**Option B -- SQL Editor in Supabase Dashboard:**

Go to [https://supabase.com/dashboard/project/zqhbjgioibiyaagjihhx/sql](https://supabase.com/dashboard/project/zqhbjgioibiyaagjihhx/sql) and run each file in order:

1. `supabase/migrations/001_initial_schema.sql` -- problems, clips, users, bookmarks, likes
2. `supabase/migrations/002_madleets_challenges.sql` -- challenges, challenge_attempts
3. `supabase/migrations/003_tutor_tables.sql` -- tutor_usage, clips.code_snippets
4. `supabase/migrations/004_code_editor_tables.sql` -- code_execution_usage, submissions, problems extensions
5. `supabase/migrations/005_recommendation_tables.sql` -- interactions, impressions
6. `supabase/migrations/006_user_profiles.sql` -- user_profiles
7. `supabase/migrations/007_pgvector_embeddings.sql` -- clip embeddings (requires pgvector extension)
8. `supabase/migrations/008_tutor_conversations.sql` -- tutor_conversations
9. `supabase/migrations/009_solutions_table.sql` -- solutions
10. `supabase/migrations/010_metrics_ab_testing.sql` -- feed_metrics, review_cards

**Note on migration 007**: This requires the `pgvector` extension. Enable it in Supabase Dashboard > Database > Extensions > search "vector" > enable. If it fails, the rest of the app still works -- embeddings are just disabled.

### Step 5: Seed data

Run the seed files to populate initial data:

```sql
-- In Supabase SQL Editor:
-- 1. Run supabase/seed/problem_test_cases.sql (problems with starter code + test cases)
-- 2. Run supabase/seed/madleets_challenges.sql (sample MadLeets challenges)
```

Without seed data, the feed will be empty (all content comes from the clipping pipeline or manual inserts).

### Step 6: Deploy Edge Functions

```bash
supabase functions deploy chat-tutor
supabase functions deploy run-code
supabase functions deploy feed
supabase functions deploy generate-embedding
```

Or deploy all at once:

```bash
supabase functions deploy
```

### Step 7: Set Edge Function secrets

```bash
supabase secrets set OPENAI_API_KEY=sk-...your-key...
supabase secrets set JUDGE0_URL=https://judge0-ce.p.rapidapi.com
supabase secrets set JUDGE0_AUTH_TOKEN=...your-rapidapi-key...
```

- **OPENAI_API_KEY**: Required for AI Tutor (chat-tutor function) and embedding generation
- **JUDGE0_URL**: Required for Code Editor execution. Use Judge0 Cloud (RapidAPI) or self-hosted URL
- **JUDGE0_AUTH_TOKEN**: RapidAPI key for Judge0 Cloud, or empty string for self-hosted

### Step 8: Restart app and test

Kill the Expo dev server and restart:

```bash
npx expo start --ios --clear
```

The `--clear` flag clears the Metro cache so the new config values are picked up.

**Test checklist:**

- Register a new account (email/password)
- Login with the account
- Feed loads (from Supabase if seeded, else empty)
- Like a clip (persists in database)
- Bookmark a clip
- Open AI Tutor (should stream responses if OPENAI_API_KEY is set)
- Open Code Editor, write code, tap Run (should execute if Judge0 is configured)
- MadLeets challenge triggers during video

---

## Prerequisites


| Requirement             | How to check            | Install if missing                   |
| ----------------------- | ----------------------- | ------------------------------------ |
| Node.js 18+             | `node -v`               | `brew install node`                  |
| Xcode + iOS Simulator   | `xcode-select -p`       | Install from App Store               |
| Supabase CLI (optional) | `supabase --version`    | `brew install supabase/tap/supabase` |
| Expo CLI                | Included via `npx expo` | Already in package.json              |


---

## Troubleshooting


| Issue                               | Fix                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| `expo-video` not working in Expo Go | Use development build (`npx expo prebuild && npx expo run:ios`) or use `--dev-client` flag |
| NativeWind styles not applying      | Clear Metro cache: `npx expo start --clear`                                                |
| Supabase connection fails           | Check URL and anon key in config.ts, ensure project is active                              |
| pgvector migration fails            | Enable the vector extension in Supabase Dashboard > Database > Extensions                  |
| OAuth not working                   | Requires dev build (not Expo Go) + GitHub/Google providers configured in Supabase          |
| Edge Functions 401                  | Make sure anon key in app matches the project, and function has correct CORS headers       |


