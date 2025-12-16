# FamBam - Spec Sheet (v2 - Reviewed)

## Layer 1: Product Spec

### Problem It Solves
Families struggle to stay meaningfully connected after children leave home — busy schedules, timezone differences, and repetitive conversations lead to surface-level catch-ups instead of deep connection.

### Users
Families (primarily parents with adult children who've moved out) earning $100k-$250k who want consistent, meaningful connection beyond "how are you" calls.

### Success Metric
Users can tick off connection activities to earn points and see their family leaderboard update.

### Core Prompt
**Phase 2 AI Feature — Conversation Prompts:**
```
You are a family connection assistant. Based on recent family updates, suggest conversation starters for {{user_name}}'s next call with {{family_member_name}}.

Recent updates from {{family_member_name}}:
{{recent_posts}}

Generate 3 warm, specific conversation prompts that reference their updates and encourage deeper connection. Keep them casual and natural.
```

**How variables are populated:**
- `{{user_name}}` — Auto-filled from logged-in user's profile (users.name)
- `{{family_member_name}}` — Selected when user taps "Prep for call" on a family member's avatar
- `{{recent_posts}}` — Auto-fetched from posts table (last 5 posts from that family member)

**UI Trigger:** User taps a family member's avatar in the leaderboard or feed → sees "Prep for call" button → AI prompts appear in a modal.

### UI & Flow
Step 1: User logs in (email/password) OR joins via family invite code
Step 2: Lands on Family Feed — sees photo/video/text updates from family, can react/comment, tap + button to create post
Step 3: Taps "Challenges" in bottom nav — sees weekly tasks with checkboxes and point values
Step 4: Completes an activity in real life (calls someone, shares update) and ticks the checkbox (honour system)
Step 5: Confirmation modal shows points earned → leaderboard updates → streak continues

### Design Style
**Theme:** Warm & Playful

**Colors:**
- Coral: #FF6B6B (primary, CTAs, active states)
- Tangerine: #FF8E53 (gradient accent)
- Sunshine: #FFE66D (highlights, badges)
- Cream: #FFF9F5 (page background)
- Blush: #FFF5F5 (light backgrounds, reactions)
- Text: #333333 (headings), #555555 (body), #999999 (muted)

**Gradients:**
- Primary: `linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)`
- Sunset: `linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%)`

**Typography:**
- Font: Nunito (Google Fonts)
- Weights: 400, 600, 700, 800

**Border Radius:**
- Cards: 20px
- Buttons: 30px (fully rounded)
- Inputs: 14px
- Avatars: 50% (circle)

**Feel:** Like a warm hug from family — friendly, optimistic, approachable for all ages

### Test Data Example
**Family:** The Smith Family (invite code: SMITH2024)
- Mum (Margaret) — 180 points, posted garden photo yesterday
- Dad (Tom) — 280 points, leading the leaderboard, posted about shed project
- Sarah (test user) — 95 points, 3-day streak
- James — 60 points, hasn't posted in 5 days

**Test scenario walkthrough:**
1. Sarah opens app → /login → enters email + password → redirected to /feed
2. Sees Mum's garden photo with 🌻 emoji, "2 hours ago", 3 reactions
3. Taps ❤️ to react (reaction count increases)
4. Taps "Challenges" in bottom nav → /challenges loads
5. Sees "Call a family member" challenge worth 50 pts (unchecked)
6. Sarah calls Dad on her phone (outside the app)
7. Returns to app, ticks the checkbox for "Call a family member"
8. Modal appears: "Nice! +50 points 🎉" with confetti animation
9. Taps "View Leaderboard" → /leaderboard shows Sarah now at 145 pts (3rd place)
10. Dad still leads at 280 pts, Mum at 180 pts

**Note:** Challenge completion uses honour system — app doesn't verify calls actually happened.

---

## Layer 2: Technical Spec

### Data Model
| Table | Columns |
|-------|---------|
| users | id (uuid, PK), email (unique), password_hash, name, avatar_url, family_id (FK), points_total (default 0), streak_days (default 0), last_active (timestamp), created_at |
| families | id (uuid, PK), name, invite_code (unique, 8 chars), created_at |
| posts | id (uuid, PK), user_id (FK), family_id (FK), content_type (enum: text/photo/video), content_url (nullable), message (text), created_at |
| reactions | id (uuid, PK), post_id (FK), user_id (FK), emoji (string), created_at |
| comments | id (uuid, PK), post_id (FK), user_id (FK), message (text), created_at |
| challenges | id (uuid, PK), title, description, points_value (int), icon (emoji string), is_active (boolean) |
| completed_challenges | id (uuid, PK), user_id (FK), challenge_id (FK), completed_at (timestamp), week_number (int) |

**Indexes:** 
- posts.family_id + created_at (for feed queries)
- completed_challenges.user_id + week_number (for weekly challenge tracking)

### Pages/Routes
| Page | What's on it |
|------|-------------|
| `/` | Landing page — hero section with app tagline, screenshot mockup, "Get Started" and "Login" buttons |
| `/login` | Email input, password input, "Login" button, "Join a family instead?" link that reveals invite code field |
| `/signup` | Name input, email input, password input, "Create new family" OR "Join existing family" (shows invite code field), submit button |
| `/feed` | **Header:** Family name + user's point total. **Body:** Scrollable post cards (avatar, name, timestamp, content, reactions bar, comment count). **FAB:** Floating + button (bottom right) to create post. **Nav:** Bottom nav with Feed (active), Challenges, Leaderboard, Profile icons |
| `/challenges` | **Header:** "This Week's Challenges" + progress bar (e.g., "4 of 7 complete"). **Body:** List of challenge cards (icon, title, points badge, checkbox). **On checkbox tap:** Confirmation modal with points animation, "View Leaderboard" button. **Nav:** Bottom nav |
| `/leaderboard` | **Header:** "Family Leaderboard" + toggle tabs (This Week / All Time). **Body:** Ranked list of family members (rank number, avatar, name, points). Current user row highlighted. Crown emoji on #1. **On avatar tap:** Shows "Prep for call" button (Phase 2). **Nav:** Bottom nav |
| `/profile` | **Header:** User's avatar (large), name, "Edit" button. **Stats row:** Total points, current streak (with 🔥), challenges completed this week. **Section:** Family info (family name, invite code with copy button). **Section:** Settings (notifications toggle, logout button). **Nav:** Bottom nav |
| `/post/new` | **Header:** "Share an Update" + X close button. **Body:** Textarea for message, photo upload button (shows preview), "Post" button (disabled until content added). On success: redirect to /feed with new post at top |

### Auth Requirements
- **Login required:** Yes, all pages except `/` require authentication
- **Family membership:** Users must belong to exactly one family
- **Visibility:** Users only see posts, challenges, and leaderboard from their own family
- **Family creation:** First user creates family (picks name, auto-generates invite code)
- **Family joining:** Other users enter invite code during signup to join
- **Session:** Persist login with Supabase session (localStorage)

### Integrations
| Service | What for | API key needed? |
|---------|----------|----------------|
| Supabase Auth | User signup, login, session management | No (uses project URL + anon key) |
| Supabase Database | PostgreSQL for all data tables | No (same project) |
| Supabase Storage | Photo uploads for posts + avatars | No (same project, create "posts" bucket) |
| OpenAI API | AI conversation prompts (Phase 2) | Yes (OPENAI_API_KEY) |

### Environment Variables
```env
# Required for MVP
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Required for Phase 2 (AI prompts)
OPENAI_API_KEY=sk-...
```

### Supabase Storage Buckets
| Bucket | Purpose | Public? |
|--------|---------|---------|
| posts | Photo/video uploads for feed posts | Yes (public URLs) |
| avatars | User profile pictures | Yes (public URLs) |

### Row Level Security (RLS) Policies
| Table | Policy |
|-------|--------|
| posts | Users can read posts where post.family_id = user.family_id |
| posts | Users can insert posts where post.user_id = auth.uid() |
| reactions | Users can read/insert reactions on posts they can see |
| users | Users can read other users in same family |
| users | Users can update only their own row |

---

## Quick Start Checklist

### Setup
- [ ] Create Supabase project at supabase.com
- [ ] Run SQL to create tables (copy schema above)
- [ ] Enable Row Level Security on all tables
- [ ] Create storage buckets: `posts`, `avatars`
- [ ] Enable Supabase Auth → Email provider

### Project
- [ ] `npm create vite@latest fambam -- --template react`
- [ ] `npm install @supabase/supabase-js react-router-dom`
- [ ] Add Nunito font to index.html
- [ ] Create `.env` file with Supabase credentials
- [ ] Set up React Router with all routes

### Build Order (recommended)
1. [ ] Auth pages (/login, /signup) — get login working first
2. [ ] Feed page (/feed) — core experience
3. [ ] Post creation (/post/new)
4. [ ] Challenges page (/challenges)
5. [ ] Leaderboard page (/leaderboard)
6. [ ] Profile page (/profile)
7. [ ] Polish: animations, loading states, error handling

### Seed Data
```sql
-- Insert test family
INSERT INTO families (id, name, invite_code) 
VALUES ('family-uuid-here', 'The Smith Family', 'SMITH2024');

-- Insert test challenges
INSERT INTO challenges (title, description, points_value, icon, is_active) VALUES
('Call a family member', 'Have a voice or video call with someone', 50, '📞', true),
('Share a photo update', 'Post a photo of what you''re up to', 30, '📸', true),
('Reply to a post', 'Leave a comment on someone''s update', 20, '💬', true),
('Share a memory', 'Post a throwback photo or story', 40, '🕰️', true),
('Send a voice note', 'Record and share a quick audio message', 25, '🎤', true),
('Plan a future visit', 'Discuss dates for getting together', 60, '🗓️', true),
('Share good news', 'Post something positive happening in your life', 35, '🎉', true);
```

---

## Changelog
- **v2:** Fixed vague page descriptions, added UI trigger for AI prompts, clarified honour system for challenges, added RLS policies, expanded test scenario walkthrough
