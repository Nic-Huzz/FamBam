# FamBam Development Session Notes

## Session Date: December 25, 2024

This document covers all changes made during this development session.

---

## 1. Authentication Simplification

### Removed Phone/SMS Authentication
- Removed Twilio SMS OTP authentication (wasn't working for Australian numbers)
- Simplified to **email + password only**

### Single-Page Signup Flow
Combined all signup fields into one page:
- Your Name ("What does your family call you?")
- Email
- Password
- Join/Create family toggle
- Invite code (if joining) or Family name (if creating)

**Files Modified:**
- `src/pages/Login.jsx` - Simplified to email/password only
- `src/pages/Signup.jsx` - Single-page form with all fields

---

## 2. Auto-Complete Challenges on Post

When users post media, the corresponding challenge is automatically completed:

| Post Type | Challenge Completed | Points |
|-----------|-------------------|--------|
| Photo | Share a photo update | 4 |
| Video | Share a vlog update | 5 |
| Voice Note | Share a vlog update | 5 |

**Files Modified:**
- `src/lib/supabase.js` - Added `autoCompleteChallenge()` function
- `src/pages/NewPost.jsx` - Calls auto-complete after posting

---

## 3. Post Type Dropdown

Added a dropdown in "Share an Update" to select post type:
- Just sharing...
- Good news
- Celebrating a win
- Surprise of the week
- Curiosity of the week
- Learning of the week
- Grateful for...
- Weekend plans
- Something I struggled with *(new)*

Each option auto-completes its corresponding challenge.

**Files Modified:**
- `src/pages/NewPost.jsx` - Added `POST_TYPE_OPTIONS` and dropdown UI
- `src/pages/NewPost.css` - Styled the dropdown

---

## 4. Post Type Tags in Feed

Posts now display a colorful tag showing what type of post it is (e.g., "🎉 Good News", "💪 Struggled With").

**Database Migration Required:**
```sql
ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_type TEXT;
```

**Files Modified:**
- `src/components/PostCard.jsx` - Added `POST_TYPE_LABELS` and tag display
- `src/components/PostCard.css` - Styled `.post-type-tag`
- `supabase-schema.sql` - Added `post_type` column

---

## 5. AI Conversation Ideas for Calls

Added AI-powered conversation starters for the "Call a family member" challenge:
- Click "Get conversation ideas" to expand
- Shows 5 AI-generated topics
- "Get new ideas" button to regenerate

**Files Modified:**
- `src/lib/ai.js` - Added `getCallConversationTopics()` function
- `src/components/ChallengeCard.jsx` - Added topics UI and state
- `src/components/ChallengeCard.css` - Styled topics section

---

## 6. Challenge Category Updates

Reorganized challenge categories:

| Category | Challenges |
|----------|-----------|
| **Connect** | Call, Reply, Visit a family member |
| **Share Updates** | Photo, Vlog, Video |
| **Celebrate** | Good news, Win, Grateful, Learning |
| **Reflect & Discover** | Surprise, Curiosity, Weekend, Struggle |

**Files Modified:**
- `src/pages/Challenges.jsx` - Updated `categorizeChallenge()` function

---

## 7. Challenge Points Update

Updated challenge points:

| Challenge | Points |
|-----------|--------|
| Visit a family member | 10 |
| Call a family member | 8 |
| Share a vlog update | 7 |
| Share a video highlight | 7 |
| Share a struggle | 7 |
| Share good news | 5 |
| Celebrate a win | 5 |
| Share a photo update | 4 |
| Surprise of the week | 4 |
| Curiosity of the week | 4 |
| Learning of the week | 4 |
| Share what you're grateful for | 3 |
| Weekend plans check-in | 3 |
| Reply to a post | 2 |

**Database Migration Required:**
```sql
-- Update existing challenge points
UPDATE challenges SET points_value = 10 WHERE title = 'Visit a family member';
UPDATE challenges SET points_value = 8 WHERE title = 'Call a family member';
UPDATE challenges SET points_value = 7 WHERE title = 'Share a vlog update';
UPDATE challenges SET points_value = 7 WHERE title = 'Share a video highlight';
UPDATE challenges SET points_value = 7 WHERE title = 'Share a struggle';
UPDATE challenges SET points_value = 5 WHERE title = 'Share good news';
UPDATE challenges SET points_value = 5 WHERE title = 'Celebrate a win';

-- Add new challenge (if not exists)
INSERT INTO challenges (title, description, points_value, icon, max_completions_per_week, is_active)
VALUES ('Share a struggle', 'Share something you found challenging this week', 7, '💪', 1, true);
```

---

## 8. New Challenge: Share a Struggle

Added a new challenge in the "Reflect & Discover" category:
- **Title:** Share a struggle
- **Description:** Share something you found challenging this week
- **Points:** 7
- **Icon:** 💪
- **Max per week:** 1

---

## 9. Notifications Toggle Improvement

The push notifications toggle in Profile Settings now:
- Always visible (not hidden if push isn't fully supported)
- Shows current status: "Enabled", "Get notified...", or "Not supported"
- Works with basic Notification API even without full VAPID setup

**Files Modified:**
- `src/pages/Profile.jsx` - Updated notification toggle logic and UI

---

## 10. Storage Bucket Fixes

Fixed RLS policies for storage buckets.

**Required Supabase Setup:**

### Posts Bucket
```sql
CREATE POLICY "Users can upload to posts bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'posts');

CREATE POLICY "Anyone can view posts bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'posts');
```

### Avatars Bucket
```sql
-- Create bucket first via Dashboard or:
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

---

## 11. Database Migrations Summary

Run these in Supabase SQL Editor if not already done:

```sql
-- Add post_type column
ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_type TEXT;

-- Add avatar_url to families
ALTER TABLE families ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update challenge points
UPDATE challenges SET points_value = 10 WHERE title = 'Visit a family member';
UPDATE challenges SET points_value = 8 WHERE title = 'Call a family member';
UPDATE challenges SET points_value = 7 WHERE title = 'Share a vlog update';
UPDATE challenges SET points_value = 7 WHERE title = 'Share a video highlight';
UPDATE challenges SET points_value = 7 WHERE title = 'Share a struggle';
UPDATE challenges SET points_value = 5 WHERE title = 'Share good news';
UPDATE challenges SET points_value = 5 WHERE title = 'Celebrate a win';

-- Add Share a struggle challenge (if not exists)
INSERT INTO challenges (title, description, points_value, icon, max_completions_per_week, is_active)
VALUES ('Share a struggle', 'Share something you found challenging this week', 7, '💪', 1, true);
```

---

## Files Changed This Session

| File | Changes |
|------|---------|
| `src/pages/Login.jsx` | Simplified to email/password |
| `src/pages/Signup.jsx` | Single-page form |
| `src/pages/NewPost.jsx` | Post type dropdown, auto-complete |
| `src/pages/NewPost.css` | Dropdown and toast styles |
| `src/pages/Profile.jsx` | Notifications toggle improvements |
| `src/pages/Challenges.jsx` | Category reorganization |
| `src/components/PostCard.jsx` | Post type tags |
| `src/components/PostCard.css` | Tag styles |
| `src/components/ChallengeCard.jsx` | AI conversation topics |
| `src/components/ChallengeCard.css` | Topics section styles |
| `src/lib/supabase.js` | `autoCompleteChallenge()` function |
| `src/lib/ai.js` | `getCallConversationTopics()` function |
| `supabase-schema.sql` | New columns and updated seed data |

---

## Git Commits

1. `Remove phone/SMS auth, simplify to email/password only`
2. `Combine signup into single-page form`
3. `Auto-complete challenges when posting media`
4. `Add post type dropdown + update challenge categories`
5. `Add post type tags in feed + improve error handling`
6. `Add AI conversation ideas for Call challenge`
7. `Add regenerate button for conversation ideas`
8. `Improve notifications toggle visibility on Profile`
9. `Reduce challenge points by 10x + add Share a struggle`

---

## Future Features

Ideas for future implementation:

### Badges System

**Weekly Leaderboard Badges:**
| Badge | Criteria | Icon |
|-------|----------|------|
| Gold | 1st place in weekly points | 🥇 |
| Silver | 2nd place in weekly points | 🥈 |
| Bronze | 3rd place in weekly points | 🥉 |

**Achievement Badges:**
| Badge | Criteria | Icon |
|-------|----------|------|
| Most Improved | Biggest point increase vs previous week | 📈 |
| Perfect Week | Completed all challenges (169 pts) | ⭐ |
| Connector | Called 3+ different family members in a week | 📞 |
| Visitor | Visited 2+ family members in a week | 🏠 |
| Storyteller | Shared 5+ posts in a week | 📖 |
| Cheerleader | Reacted to every family member's post | 🎉 |
| Conversation Starter | First to post each day for 5+ days | 🌅 |
| Night Owl | Posted after 10pm 3+ times | 🦉 |
| Early Bird | Posted before 8am 3+ times | 🐦 |
| Streak Master | 4+ week streak | 🔥 |
| Comeback Kid | Returned after missing a week | 💪 |
| Gratitude Guru | Completed "Grateful for" 4 weeks in a row | 🙏 |
| Vulnerability Victor | Shared a struggle 3 weeks in a row | 💜 |

**Milestone Badges (Lifetime):**
| Badge | Criteria | Icon |
|-------|----------|------|
| Century Club | 100 total points | 💯 |
| High Roller | 500 total points | 🎰 |
| Legend | 1000 total points | 👑 |
| Founding Member | Joined in first month of family | 🏅 |

- Display badges on profile and leaderboard
- Weekly badges reset each week, achievement badges are earned fresh
- Milestone badges are permanent once earned

**Implementation Difficulty:**

*Easy (Use existing data):*
| Badge | Reason |
|-------|--------|
| 🥇🥈🥉 Gold/Silver/Bronze | Already have weekly points - just rank users |
| 💯 Century Club | `points_total` already exists on users |
| 🎰 High Roller | Same - just check threshold |
| 👑 Legend | Same - just check threshold |
| 🔥 Streak Master | `streak_days` already tracked |
| 📈 Most Improved | Compare this week's points to last week's |
| ⭐ Perfect Week | Check if weekly points = 169 |
| 💪 Comeback Kid | Check if `last_challenge_week` has a gap |

*Medium (Need minor schema additions):*
| Badge | What's Needed |
|-------|---------------|
| 📖 Storyteller | Count posts per week (query `posts` table) |
| 🎉 Cheerleader | Check reactions table - did user react to all family posts? |
| 🌅 Conversation Starter | Query first post of each day, check user_id |
| 🦉 Night Owl | Check `created_at` timestamps on posts (after 10pm) |
| 🐦 Early Bird | Same - just different time range (before 8am) |
| 🙏 Gratitude Guru | Track which challenges completed per week (already have `completed_challenges`) |
| 💜 Vulnerability Victor | Same - query `completed_challenges` for streak |
| 🏅 Founding Member | Compare user `created_at` to family `created_at` |

*Harder (Need new schema + tracking):*
| Badge | What's Needed |
|-------|---------------|
| 📞 Connector | Need `target_user_id` column on `completed_challenges` to track which family member |
| 🏠 Visitor | Same - need family member selection feature first |

**Implementation Phases:**

*Phase 1 - Quick Wins (1-2 hours):*
- Create `badges` and `user_badges` tables
- Implement the 8 "Easy" badges
- Display on Profile and Leaderboard

*Phase 2 - Medium Badges (2-3 hours):*
- Add badge calculation logic (run on challenge completion or as weekly job)
- Implement the 8 "Medium" badges

*Phase 3 - Family Member Tracking (3-4 hours):*
- Add family member dropdown to Call/Visit challenges
- Add `target_user_id` to `completed_challenges` table
- Implement Connector/Visitor badges

**Database Schema for Badges:**
```sql
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  badge_type TEXT CHECK (badge_type IN ('weekly', 'achievement', 'milestone'))
);

CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  week_number INTEGER, -- for weekly badges, NULL for milestone
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id, week_number)
);

-- For Connector/Visitor badges
ALTER TABLE completed_challenges ADD COLUMN target_user_id UUID REFERENCES users(id);
```

### Family Member Selection for Challenges
- For "Visit a family member" and "Call a family member" challenges
- Add dropdown to select which family member you connected with
- Track who you've connected with most/least
- Could suggest family members you haven't connected with recently
