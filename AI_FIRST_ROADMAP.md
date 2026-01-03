# AI-First FamBam Roadmap

## Vision
Transform FamBam into an AI-first app where AI acts as a "family connection co-founder" - proactively helping users stay connected with the people they care about.

---

## Current State
FamBam already has basic AI features:
- Comment suggestions
- Post idea prompts

These are **passive** - users must seek them out. The goal is to make AI **proactive and personal**.

---

## AI-First Features Analysis

### Quick Overview

| Feature | Difficulty | Time Est. | Dependencies | Priority |
|---------|------------|-----------|--------------|----------|
| AI Chat Assistant | Medium-High | 3-5 days | OpenAI, new DB table | High |
| Proactive Nudges | Medium | 2-3 days | Push notifs, cron jobs | High |
| AI Insights Dashboard | Medium | 2-3 days | Data aggregation, UI | Medium |
| Smart Challenge Recs | Low-Medium | 1-2 days | Existing data | Medium |
| Conversation Starters | Low | 1 day | OpenAI (have it) | Quick win |
| AI-Generated Content | Medium | 2-3 days | OpenAI Vision API | Medium |
| Family Memory AI | Medium | 2-3 days | Existing posts data | Medium |
| AI Personality | Low | 0.5-1 day | Prompt engineering | Quick win |

---

## Detailed Feature Breakdown

### 1. AI Chat Assistant
**Difficulty: Medium-High** | **3-5 days**

The flagship AI feature - a dedicated chat where users can interact with their AI co-founder.

**Example interactions:**
- "What should I share today?"
- "Help me write something nice for my sister's graduation"
- "Give me a fun question to ask at family dinner"
- "Summarize what I missed this week"

**Technical requirements:**
```
├── New DB table: ai_conversations (messages, context)
├── Chat UI component (message bubbles, input)
├── Backend: Conversation context management
├── OpenAI integration with family context
└── Mobile-friendly chat interface
```

**Challenges:**
- Maintaining conversation context across sessions
- Injecting relevant family data into prompts
- Token management for long conversations

**Already have:** OpenAI setup, user/family data

---

### 2. Proactive AI Nudges
**Difficulty: Medium** | **2-3 days**

Smart, contextual reminders that help users stay connected without being annoying.

**Example nudges:**
- "You haven't connected with Dad in 12 days - quick call or text?"
- "Mom just posted something - she'd love to hear from you!"
- "It's Grandma's birthday next week - want to plan something?"

**Technical requirements:**
```
├── Activity tracking (last_post, last_reaction, etc.)
├── Scheduled job (Supabase Edge Function or cron)
├── Nudge logic (rules + AI personalization)
├── Push notification triggers
└── User preferences (nudge frequency)
```

**Challenges:**
- Scheduling infrastructure (Supabase Edge Functions)
- Not being annoying (smart throttling)
- Timezone handling

**Already have:** Push notifications, activity data

---

### 3. AI Insights Dashboard
**Difficulty: Medium** | **2-3 days**

Weekly/monthly summaries that help users understand their connection patterns.

**Example insights:**
- "Your family shared 23 moments this week - up 40%!"
- "Connection strength: Strong with Mom, needs attention with siblings"
- "Best engagement day: Sundays at 7pm"

**Technical requirements:**
```
├── Data aggregation queries
├── AI summary generation
├── New UI page/component
├── Weekly/monthly calculations
└── Connection "health" algorithm
```

**Challenges:**
- Defining "connection health" metrics
- Making insights actionable, not just stats

**Already have:** All the underlying data, OpenAI

---

### 4. Smart Challenge Recommendations
**Difficulty: Low-Medium** | **1-2 days**

Personalized challenge suggestions based on user behavior and preferences.

**Example recommendations:**
- "You love photos - try the 7-day photo streak!"
- "You haven't called anyone this month - small step: 5-minute call?"

**Technical requirements:**
```
├── User behavior analysis (what they complete)
├── Simple recommendation algorithm
├── UI to show "Recommended for you"
└── Optional: AI-personalized suggestions
```

**Challenges:**
- Cold start for new users
- Balancing variety vs. comfort zone

**Already have:** Challenge data, completion history

---

### 5. Conversation Starters
**Difficulty: Low** | **1 day** ⭐ **Quick Win**

Context-aware suggestions to spark meaningful conversations.

**Example starters:**
- "Dad mentioned fishing - ask him how the lake was!"
- "Your sister just got back from vacation - ask about highlights!"

**Technical requirements:**
```
├── Fetch recent family posts/activity
├── Generate contextual suggestions
├── Display in UI (maybe on home/feed)
└── Refresh mechanism
```

**Already have:** Everything needed - just wire it up

---

### 6. AI-Generated Content
**Difficulty: Medium** | **2-3 days**

Help users create better content with AI assistance.

**Features:**
- Auto-caption photos
- "Help me write a message" drafts
- "Improve my message" suggestions

**Technical requirements:**
```
├── OpenAI Vision API integration
├── Auto-caption on photo upload
├── Caption suggestions UI
├── Message drafting helpers
└── "Improve my message" feature
```

**Challenges:**
- Vision API costs ($0.01-0.03 per image)
- Latency on upload flow

**Already have:** OpenAI setup, post creation flow

---

### 7. Family Memory AI
**Difficulty: Medium** | **2-3 days**

Surface meaningful memories and create compilations.

**Features:**
- "On this day last year..." memories
- AI-curated highlight reels
- Milestone celebrations ("100 posts together!")

**Technical requirements:**
```
├── "On this day" query logic
├── Memory compilation algorithm
├── UI for memories display
├── AI-generated memory summaries
└── Optional: Video/slideshow generation
```

**Challenges:**
- Needs historical data to be useful
- Media compilation complexity

**Already have:** Posts with timestamps, media

---

### 8. AI Personality
**Difficulty: Low** | **0.5-1 day** ⭐ **Quick Win**

Give the AI a consistent personality that feels like a helpful family member.

**Concept:**
- Name: "Fam" - your family's connection coach
- Tone: Warm, encouraging, playful
- Consistent voice across all AI features

**Technical requirements:**
```
├── System prompt crafting
├── Personality config (tone, name)
├── Consistent voice across features
└── Optional: Family customization
```

**Already have:** All AI infrastructure

---

## Recommended Implementation Order

### Phase 1: Quick Wins (2-3 days)
1. **AI Personality** - Define "Fam" as the AI coach
2. **Conversation Starters** - Show on feed/home
3. **Smart Challenge Recs** - "Recommended for you"

### Phase 2: Core AI Experience (5-7 days)
4. **AI Chat Assistant** - The flagship feature
5. **AI Insights Dashboard** - Weekly summaries

### Phase 3: Proactive Intelligence (3-5 days)
6. **Proactive Nudges** - Smart notifications
7. **Family Memory AI** - "On this day" moments

### Phase 4: Polish (2-3 days)
8. **AI-Generated Content** - Photo captions, message helpers

**Total estimated time: 12-18 days**

---

## Cost Considerations

| Feature | Est. Monthly Cost (100 users) |
|---------|-------------------------------|
| Chat (10 msgs/user/day) | ~$15-30 |
| Nudges (AI-generated) | ~$5-10 |
| Insights (weekly per user) | ~$5-10 |
| Photo captions | ~$10-20 |
| **Total** | **~$35-70/month** |

At scale (1000 users): ~$350-700/month

---

## Success Metrics

- **Engagement:** Daily active users, time in app
- **Connection frequency:** Posts, reactions, comments per user
- **AI adoption:** Chat messages, suggestion acceptance rate
- **Retention:** Weekly/monthly retention rates
- **NPS:** User satisfaction with AI features

---

# Multi-Group Support with Unified Feed

## Overview
Allow users to be part of multiple groups (family, friends, coworkers) with a **unified feed** that shows all content by default, with optional filtering.

---

## Design Philosophy

### Unified Feed First
- **Default view:** All posts from all groups in one feed
- **Optional filtering:** Tap to see just one group
- **When posting:** Choose to share to all groups or select specific ones

### Why This Approach?
- Less app-switching friction
- Users don't miss content from any group
- Natural discovery across groups
- Filtering available when you want to focus

---

## User Experience

### Feed with Group Filter Pills

```
┌─────────────────────────────────┐
│  FamBam              69 pts 🔥3 │
├─────────────────────────────────┤
│  [All] [Family] [Friends] [+]   │  <- Filter pills (All = default)
├─────────────────────────────────┤
│  ┌─────────────────────────┐    │
│  │ 👤 Mom    [Family 👨‍👩‍👧]   │    │  <- Group badge on post
│  │ "Made cookies today!"   │    │
│  │ 📷 [photo]              │    │
│  │ ❤️ 3  💬 2              │    │
│  └─────────────────────────┘    │
│                                 │
│  ── Today ──────────────────    │  <- Day separator
│                                 │
│  ┌─────────────────────────┐    │
│  │ 👤 Jake   [Friends 🏀]   │    │  <- Different group
│  │ "Game night tomorrow?"  │    │
│  │ ❤️ 5  💬 8              │    │
│  └─────────────────────────┘    │
│                                 │
│  [Load older posts]             │
└─────────────────────────────────┘
```

### Posting Flow with Group Selection

```
┌─────────────────────────────────┐
│  New Post                    X  │
├─────────────────────────────────┤
│                                 │
│  Share to:                      │
│  ┌─────────────────────────┐    │
│  │ ● All my groups (3)     │    │  <- Default option
│  │ ○ Select groups:        │    │
│  │   ☑️ Family  👨‍👩‍👧         │    │
│  │   ☐ Friends  🏀         │    │
│  │   ☐ Work     💼         │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ What's on your mind?    │    │
│  └─────────────────────────┘    │
│                                 │
│  [📷 Photo] [🎥 Video] [🎤 Audio]│
│                                 │
│         [Post]                  │
└─────────────────────────────────┘
```

### Group Management (in Profile)

```
┌─────────────────────────────────┐
│  My Groups                      │
├─────────────────────────────────┤
│  ┌─────────────────────────┐    │
│  │ 👨‍👩‍👧 Fam Bam              │    │
│  │    4 members • Admin    │    │
│  │    [Primary Group ⭐]   │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ 🏀 Basketball Buddies   │    │
│  │    8 members • Member   │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ 💼 Work Team            │    │
│  │    12 members • Member  │    │
│  └─────────────────────────┘    │
│                                 │
│  [+ Create Group] [Join Group]  │
└─────────────────────────────────┘
```

---

## Current Architecture

```
users
├── id
├── family_id (single FK) ← LIMITATION
└── ...

families
├── id
├── name
├── invite_code
└── created_by

posts
├── id
├── family_id (single FK) ← LIMITATION
└── ...
```

**Problem:** Users can only belong to ONE group.

---

## New Architecture

### Database Schema

```sql
-- =====================
-- GROUPS TABLE
-- =====================
-- Replaces/extends 'families' table
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'family' CHECK (type IN ('family', 'friends', 'work', 'custom')),
  icon TEXT DEFAULT '👨‍👩‍👧',  -- Emoji icon for the group
  invite_code TEXT UNIQUE,
  avatar_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================
-- GROUP MEMBERS (Junction Table)
-- =====================
-- Many-to-many: users <-> groups
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  nickname TEXT,  -- Optional: different display name per group
  is_primary BOOLEAN DEFAULT false,  -- User's "main" group for defaults
  notifications TEXT DEFAULT 'all' CHECK (notifications IN ('all', 'mentions', 'none')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- =====================
-- POST GROUPS (Junction Table)
-- =====================
-- Many-to-many: posts <-> groups (supports cross-posting)
CREATE TABLE post_groups (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, group_id)
);

-- =====================
-- UPDATED POSTS TABLE
-- =====================
-- Remove single group_id, use post_groups instead
ALTER TABLE posts DROP COLUMN IF EXISTS family_id;
-- Posts now linked via post_groups junction table
```

### Why Junction Tables?

**For group_members:**
- Users can be in multiple groups
- Different roles per group (admin in Family, member in Friends)
- Per-group notification preferences

**For post_groups:**
- One post can appear in multiple groups
- No data duplication
- Shared reactions/comments (social feel)
- "All groups" view works naturally

---

## Key Queries

### Get User's Groups
```sql
SELECT g.*, gm.role, gm.is_primary, gm.notifications,
       (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
FROM groups g
JOIN group_members gm ON g.id = gm.group_id
WHERE gm.user_id = $user_id
ORDER BY gm.is_primary DESC, g.name;
```

### Get Unified Feed (All Groups)
```sql
SELECT DISTINCT p.*,
       array_agg(DISTINCT g.id) as group_ids,
       array_agg(DISTINCT g.name) as group_names,
       array_agg(DISTINCT g.icon) as group_icons
FROM posts p
JOIN post_groups pg ON p.id = pg.post_id
JOIN group_members gm ON pg.group_id = gm.group_id
JOIN groups g ON pg.group_id = g.id
WHERE gm.user_id = $user_id
GROUP BY p.id
ORDER BY p.created_at DESC
LIMIT $limit OFFSET $offset;
```

### Get Filtered Feed (Single Group)
```sql
SELECT p.*,
       array_agg(g.id) as group_ids,
       array_agg(g.name) as group_names,
       array_agg(g.icon) as group_icons
FROM posts p
JOIN post_groups pg ON p.id = pg.post_id
JOIN groups g ON pg.group_id = g.id
WHERE pg.group_id = $group_id
GROUP BY p.id
ORDER BY p.created_at DESC
LIMIT $limit OFFSET $offset;
```

### Create Post to Multiple Groups
```sql
-- 1. Insert the post
INSERT INTO posts (id, user_id, message, content_type, ...)
VALUES ($post_id, $user_id, $message, $content_type, ...)
RETURNING id;

-- 2. Link to selected groups
INSERT INTO post_groups (post_id, group_id)
SELECT $post_id, unnest($group_ids::uuid[]);
```

---

## Migration Plan

### Step 1: Create New Tables (Non-Breaking)
```sql
-- Run these migrations - they don't affect existing functionality
CREATE TABLE groups (...);
CREATE TABLE group_members (...);
CREATE TABLE post_groups (...);
```

### Step 2: Migrate Existing Data
```sql
-- Copy families to groups
INSERT INTO groups (id, name, type, invite_code, avatar_url, created_by, created_at)
SELECT id, name, 'family', invite_code, avatar_url, created_by, created_at
FROM families;

-- Create group memberships from family_id
INSERT INTO group_members (group_id, user_id, role, is_primary, joined_at)
SELECT
  u.family_id,
  u.id,
  CASE WHEN f.created_by = u.id THEN 'admin' ELSE 'member' END,
  true,
  u.created_at
FROM users u
JOIN families f ON u.family_id = f.id
WHERE u.family_id IS NOT NULL;

-- Link existing posts to groups
INSERT INTO post_groups (post_id, group_id)
SELECT id, family_id FROM posts WHERE family_id IS NOT NULL;
```

### Step 3: Update Application Code
See Implementation Plan below.

### Step 4: Deprecate Old Columns (Optional)
```sql
-- After confirming everything works
ALTER TABLE users DROP COLUMN family_id;
ALTER TABLE posts DROP COLUMN family_id;
DROP TABLE families;
```

---

## Implementation Plan

### Phase 1: Database Setup (Day 1)
**Files:** SQL migrations only

- [ ] Create `groups` table
- [ ] Create `group_members` table
- [ ] Create `post_groups` table
- [ ] Run data migration
- [ ] Update RLS policies for new tables
- [ ] Test queries in Supabase dashboard

### Phase 2: Auth Context & Data Layer (Day 2)
**Files:** `AuthContext.jsx`, `supabase.js`

- [ ] Fetch user's groups on login
- [ ] Add `groups` and `activeGroupFilter` to context
- [ ] Add `setGroupFilter(groupId | 'all')` function
- [ ] Create `getUserGroups()` helper
- [ ] Create `getUnifiedFeed()` helper
- [ ] Create `getFilteredFeed(groupId)` helper

### Phase 3: Feed Updates (Day 3)
**Files:** `Feed.jsx`, `Feed.css`

- [ ] Add group filter pills component
- [ ] Update feed query to use unified/filtered
- [ ] Add group badge to PostCard
- [ ] Handle "all" vs specific group filter
- [ ] Maintain pagination with filters

### Phase 4: Post Creation (Day 4)
**Files:** `NewPost.jsx`, `NewPost.css`

- [ ] Add group selector UI (radio: all/select)
- [ ] Checkbox list for group selection
- [ ] Default to "all groups" or primary group
- [ ] Update post creation to use `post_groups`
- [ ] Show selected groups summary

### Phase 5: Group Management (Day 5-6)
**Files:** `Profile.jsx`, new `GroupManagement.jsx`, `GroupSettings.jsx`

- [ ] "My Groups" section in profile
- [ ] Create group flow (name, type, icon)
- [ ] Join group flow (invite code)
- [ ] Leave group flow (with confirmation)
- [ ] Group settings (name, avatar, icon)
- [ ] Transfer ownership
- [ ] Set primary group

### Phase 6: Polish & Edge Cases (Day 7)
**Files:** Various

- [ ] Update Challenges page for multi-group
- [ ] Update Leaderboard (global vs per-group toggle?)
- [ ] Per-group notification settings
- [ ] Empty states (no groups, new group)
- [ ] Invite code sharing for groups
- [ ] Group member management

---

## File Changes Summary

| File | Changes | Priority |
|------|---------|----------|
| `supabase.js` | Add group queries, update post queries | P0 |
| `AuthContext.jsx` | Add groups state, filter state | P0 |
| `Feed.jsx` | Filter pills, unified feed logic | P0 |
| `Feed.css` | Filter pills styling | P0 |
| `PostCard.jsx` | Group badge display | P0 |
| `PostCard.css` | Group badge styling | P0 |
| `NewPost.jsx` | Group selector | P0 |
| `NewPost.css` | Group selector styling | P0 |
| `Profile.jsx` | My Groups section | P1 |
| `GroupManagement.jsx` | New component | P1 |
| `GroupSettings.jsx` | New component | P1 |
| `Challenges.jsx` | Multi-group support | P2 |
| `Leaderboard.jsx` | Global vs per-group | P2 |
| `SettingsSection.jsx` | Group notifications | P2 |

---

## Component Specifications

### GroupFilterPills Component
```jsx
// src/components/GroupFilterPills.jsx
function GroupFilterPills({ groups, activeFilter, onFilterChange }) {
  return (
    <div className="group-filter-pills">
      <button
        className={`filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
        onClick={() => onFilterChange('all')}
      >
        All
      </button>
      {groups.map(group => (
        <button
          key={group.id}
          className={`filter-pill ${activeFilter === group.id ? 'active' : ''}`}
          onClick={() => onFilterChange(group.id)}
        >
          {group.icon} {group.name}
        </button>
      ))}
      <button className="filter-pill add-group" onClick={onAddGroup}>
        +
      </button>
    </div>
  )
}
```

### GroupBadge Component
```jsx
// src/components/GroupBadge.jsx
function GroupBadge({ groups }) {
  if (!groups || groups.length === 0) return null

  // Show first group, +N if multiple
  const primary = groups[0]
  const extra = groups.length - 1

  return (
    <span className="group-badge">
      {primary.icon} {primary.name}
      {extra > 0 && <span className="group-badge-extra">+{extra}</span>}
    </span>
  )
}
```

### GroupSelector Component (for NewPost)
```jsx
// src/components/GroupSelector.jsx
function GroupSelector({ groups, selected, onChange }) {
  const [mode, setMode] = useState('all') // 'all' | 'select'

  return (
    <div className="group-selector">
      <label className="selector-option">
        <input
          type="radio"
          checked={mode === 'all'}
          onChange={() => {
            setMode('all')
            onChange(groups.map(g => g.id))
          }}
        />
        All my groups ({groups.length})
      </label>

      <label className="selector-option">
        <input
          type="radio"
          checked={mode === 'select'}
          onChange={() => setMode('select')}
        />
        Select groups:
      </label>

      {mode === 'select' && (
        <div className="group-checkboxes">
          {groups.map(group => (
            <label key={group.id} className="group-checkbox">
              <input
                type="checkbox"
                checked={selected.includes(group.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...selected, group.id])
                  } else {
                    onChange(selected.filter(id => id !== group.id))
                  }
                }}
              />
              {group.icon} {group.name}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## Considerations

### Points & Streaks
**Decision: Keep Global**
- One point total across all groups
- One streak counter (daily activity in ANY group)
- Simpler to understand
- Can add per-group leaderboards later

### Challenges
- Challenges are global (not per-group)
- Some challenges filter by group type:
  - "Call a family member" → only counts for `type='family'` groups
  - "Share a photo" → counts for any group
- Add `applicable_group_types` to challenges table later if needed

### Reactions & Comments
- Shared across all groups the post appears in
- If Mom reacts in Family, Friends group sees it too
- This is intentional - feels more social
- Alternative (not recommended): per-group reactions would duplicate data

### Privacy
- Posts only visible to members of the groups they're shared to
- User profiles visible to people who share at least one group
- Future: "Friends only" profile visibility settings

---

## Timeline Summary

| Phase | Work | Days |
|-------|------|------|
| 1 | Database setup & migration | 1 |
| 2 | Auth context & data layer | 1 |
| 3 | Feed updates & filtering | 1 |
| 4 | Post creation with groups | 1 |
| 5 | Group management UI | 2 |
| 6 | Polish & edge cases | 1 |
| **Total** | | **7 days** |

---

## Success Criteria

- [ ] User can be member of multiple groups
- [ ] Unified feed shows all content by default
- [ ] Filter pills allow focusing on one group
- [ ] Posts can be shared to all or selected groups
- [ ] Group badges clearly identify post origin
- [ ] Create/join/leave group flows work
- [ ] Existing single-family users migrated seamlessly
- [ ] No performance regression on feed load
