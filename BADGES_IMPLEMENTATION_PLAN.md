# Badges Implementation Plan

## Overview

A badges system to reward and motivate family engagement with three types:
- **Weekly Badges** - Earned fresh each week based on weekly performance
- **Achievement Badges** - Earned through specific behaviors/patterns
- **Milestone Badges** - Permanent badges earned at point thresholds

---

## Phase 1: Database Schema & Easy Badges (2-3 hours)

### Database Changes

```sql
-- Badges definition table
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT NOT NULL,
  badge_type TEXT CHECK (badge_type IN ('weekly', 'achievement', 'milestone')) NOT NULL,
  criteria JSONB, -- Store criteria for automated checking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User's earned badges
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  week_number INTEGER, -- For weekly badges, NULL for milestone/achievement
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id, week_number)
);

-- RLS Policies
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges" ON badges FOR SELECT USING (true);

CREATE POLICY "Users can view family badges" ON user_badges
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE family_id IN (
        SELECT family_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "System can award badges" ON user_badges
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Seed badge definitions
INSERT INTO badges (name, description, icon, badge_type, criteria) VALUES
  -- Weekly Leaderboard
  ('Gold', '1st place in weekly family leaderboard', '🥇', 'weekly', '{"rank": 1}'),
  ('Silver', '2nd place in weekly family leaderboard', '🥈', 'weekly', '{"rank": 2}'),
  ('Bronze', '3rd place in weekly family leaderboard', '🥉', 'weekly', '{"rank": 3}'),

  -- Milestone Badges
  ('Century Club', 'Earned 100 total points', '💯', 'milestone', '{"points_total": 100}'),
  ('High Roller', 'Earned 500 total points', '🎰', 'milestone', '{"points_total": 500}'),
  ('Legend', 'Earned 1000 total points', '👑', 'milestone', '{"points_total": 1000}'),

  -- Achievement Badges (Easy)
  ('Streak Master', 'Maintained a 4+ week streak', '🔥', 'achievement', '{"streak_days": 4}'),
  ('Perfect Week', 'Completed all challenges in a week', '⭐', 'achievement', '{"perfect_week": true}'),
  ('Most Improved', 'Biggest point increase vs previous week', '📈', 'weekly', '{"most_improved": true}'),
  ('Comeback Kid', 'Returned after missing a week', '💪', 'achievement', '{"comeback": true}'),

  -- Achievement Badges (Medium)
  ('Storyteller', 'Shared 5+ posts in a single week', '📖', 'achievement', '{"posts_per_week": 5}'),
  ('Cheerleader', 'Reacted to every family member''s post in a week', '🎉', 'achievement', '{"reacted_to_all": true}'),
  ('Early Bird', 'Posted before 8am 3+ times in a week', '🐦', 'achievement', '{"early_posts": 3}'),
  ('Night Owl', 'Posted after 10pm 3+ times in a week', '🦉', 'achievement', '{"night_posts": 3}'),
  ('Conversation Starter', 'First to post 5+ days in a week', '🌅', 'achievement', '{"first_post_days": 5}'),
  ('Gratitude Guru', 'Completed Grateful challenge 4 weeks in a row', '🙏', 'achievement', '{"gratitude_streak": 4}'),
  ('Vulnerability Victor', 'Shared a struggle 3 weeks in a row', '💜', 'achievement', '{"struggle_streak": 3}'),

  -- Achievement Badges (Harder - need target_user_id)
  ('Connector', 'Called 3+ different family members in a week', '📞', 'achievement', '{"unique_calls": 3}'),
  ('Visitor', 'Visited 2+ family members in a week', '🏠', 'achievement', '{"unique_visits": 2}'),

  -- Special
  ('Founding Member', 'Joined within first month of family creation', '🏅', 'milestone', '{"founding": true}');
```

### Files to Create/Modify

1. **`src/lib/badges.js`** - Badge calculation logic
2. **`src/components/BadgeDisplay.jsx`** - Component to show badges
3. **`src/components/BadgeDisplay.css`** - Badge styling
4. **`src/pages/Profile.jsx`** - Add badges section
5. **`src/pages/Leaderboard.jsx`** - Show weekly badges next to names

### Implementation Steps

1. Create badge tables and seed data
2. Create `checkAndAwardBadges()` function in `src/lib/badges.js`
3. Call badge check after:
   - Challenge completion
   - Post creation
   - Reaction added
4. Display badges on Profile page
5. Show weekly badges on Leaderboard

---

## Phase 2: Badge Calculation Logic (3-4 hours)

### `src/lib/badges.js`

```javascript
// Badge checking functions

export async function checkMilestoneBadges(userId, profile) {
  const badges = []

  // Century Club (100 points)
  if (profile.points_total >= 100) {
    badges.push({ name: 'Century Club', icon: '💯' })
  }

  // High Roller (500 points)
  if (profile.points_total >= 500) {
    badges.push({ name: 'High Roller', icon: '🎰' })
  }

  // Legend (1000 points)
  if (profile.points_total >= 1000) {
    badges.push({ name: 'Legend', icon: '👑' })
  }

  // Streak Master (4+ week streak)
  if (profile.streak_days >= 4) {
    badges.push({ name: 'Streak Master', icon: '🔥' })
  }

  return badges
}

export async function checkWeeklyBadges(familyId, weekNumber) {
  // Calculate weekly points for all family members
  // Award Gold/Silver/Bronze based on rankings
  // Award Most Improved based on previous week comparison
}

export async function checkAchievementBadges(userId, familyId, weekNumber) {
  // Check Storyteller (5+ posts this week)
  // Check Cheerleader (reacted to all family posts)
  // Check Early Bird / Night Owl (post timestamps)
  // Check Perfect Week (all challenges completed)
}
```

---

## Phase 3: UI Components (2-3 hours)

### Badge Display Component

```jsx
// src/components/BadgeDisplay.jsx
export default function BadgeDisplay({ badges, size = 'md' }) {
  return (
    <div className={`badge-display badge-${size}`}>
      {badges.map(badge => (
        <span
          key={badge.id}
          className="badge-icon"
          title={badge.name}
        >
          {badge.icon}
        </span>
      ))}
    </div>
  )
}
```

### Profile Badges Section

- Show all earned badges grouped by type
- "Weekly" badges show which week earned
- "Milestone" badges show permanent achievements
- Unearned badges shown greyed out with lock icon

### Leaderboard Integration

- Show weekly badges (🥇🥈🥉) next to rankings
- Show streak badge (🔥) if user has 4+ week streak

---

## Phase 4: Weekly Badge Calculation (2 hours)

### When to Calculate

Option A: **Real-time** - Check after each action
- Pros: Immediate feedback
- Cons: More database queries

Option B: **End of week** - Batch calculate Sunday night
- Pros: Efficient, single calculation
- Cons: Delayed gratification

**Recommendation:** Hybrid approach
- Milestone badges: Real-time (on profile update)
- Weekly leaderboard badges: Calculate when viewing leaderboard
- Achievement badges: Check on relevant action (post, reaction, etc.)

### Calculation Flow

```
User completes challenge
  → Update points_total
  → checkMilestoneBadges()
  → If points crossed threshold, award badge

User creates post
  → checkAchievementBadges('storyteller', 'early_bird', 'night_owl')

User views leaderboard
  → If week has ended and badges not calculated
  → calculateWeeklyBadges()
  → Award Gold/Silver/Bronze
```

---

## Implementation Priority

### Must Have (MVP)
1. 🥇🥈🥉 Weekly leaderboard badges
2. 💯🎰👑 Milestone badges (100/500/1000 points)
3. 🔥 Streak Master badge
4. Badge display on Profile

### Nice to Have
5. ⭐ Perfect Week badge
6. 📈 Most Improved badge
7. 📖 Storyteller badge
8. Badge display on Leaderboard

### Future
9. 🎉 Cheerleader badge
10. 🐦🦉 Early Bird / Night Owl
11. 📞🏠 Connector / Visitor (requires target_user_id tracking)
12. Badge notifications/celebrations

---

## Estimated Total Time

| Phase | Time | Description |
|-------|------|-------------|
| Phase 1 | 2-3 hrs | Schema + Easy badges |
| Phase 2 | 3-4 hrs | Badge calculation logic |
| Phase 3 | 2-3 hrs | UI components |
| Phase 4 | 2 hrs | Weekly calculation |
| **Total** | **9-12 hrs** | Full implementation |

### Quick Win Option (3-4 hours)
Just implement:
- Database schema
- Milestone badges (100/500/1000 points)
- Weekly leaderboard badges (Gold/Silver/Bronze)
- Basic badge display on Profile

This gives visible value quickly and can be expanded later.

---

## Database Migration (Run in Supabase)

```sql
-- See full schema above
-- Run badges table creation
-- Run user_badges table creation
-- Run RLS policies
-- Run seed data for badge definitions
```
