# FamBam Release Notes

## December 2025 Update

### Badges System

Added a comprehensive badge system to reward family engagement.

#### Weekly Badges (Reset each week)
| Badge | Icon | How to Earn |
|-------|------|-------------|
| Gold | 🥇 | 1st place in weekly family leaderboard |
| Silver | 🥈 | 2nd place in weekly family leaderboard |
| Bronze | 🥉 | 3rd place in weekly family leaderboard |
| Most Improved | 📈 | Biggest point increase vs previous week |
| Perfect Week | ⭐ | Complete every challenge in a week |
| Round Robin | 🎯 | Connect with every family member in one week |
| Bridge Builder | 🌉 | Most connected person in the family this week |

#### Achievement Badges (Permanent)
| Badge | Icon | How to Earn |
|-------|------|-------------|
| Streak Master | 🔥 | Maintain a 4+ week streak |
| Comeback Kid | 💪 | Return after missing a week |
| Storyteller | 📖 | Share 3 posts in a single week |
| Visitor | 🏠 | Visit 3 different family members (all-time) |
| Connector | 📞 | Call 5 different family members (all-time) |
| Inner Circle | 💫 | Connect with same person 4 weeks in a row |

#### Milestone Badges (Permanent)
| Badge | Icon | How to Earn |
|-------|------|-------------|
| Century Club | 💯 | Earn 100 total points |
| High Roller | 🎰 | Earn 500 total points |
| Legend | 👑 | Earn 1000 total points |

---

### Connection Tracking

A new **Connections** tab in the Profile page helps users track their family relationships.

#### Features
- **Round Robin Progress**: Shows how many family members you've connected with this week
- **Family Connections List**: Each family member displayed with:
  - Total connection count
  - Visual progress bar
  - Relationship streak (consecutive weeks)
  - Days since last connection
  - Warning indicator for members needing reconnection (14+ days)
- **Your Impact**: Shows total connections made and your family ranking

#### What Counts as a Connection
Connections are tracked when completing:
- **Visit a family member** challenge
- **Call a family member** challenge

The `target_user_id` field stores who was visited/called, enabling relationship tracking.

---

### Smart Nudges

When completing Visit or Call challenges, the app now suggests who to connect with:

- **Least Recently Connected**: Family members you haven't connected with recently appear first
- **Warning Indicators**: Members not contacted in 14+ days show ⚠️
- **Streak Display**: Shows current streak with each family member (e.g., "🔥 4 weeks")
- **Quick Select**: One-tap button to select the suggested member

---

### Push Notifications

Real-time push notifications for family activity.

#### Notification Triggers
| Event | Who Gets Notified |
|-------|-------------------|
| New post | All family members (except poster) |
| New comment | Post author |
| New reaction | Post author |

#### Setup Requirements
1. **VAPID Keys**: Generated and stored in `.env`
2. **Edge Function**: `send-notification` deployed to Supabase
3. **Database Webhooks**: Configured for posts, comments, reactions tables
4. **User Permission**: Users must enable notifications in Profile → Settings

---

### Photo Features

#### Multi-Photo Posts
- Upload up to 10 photos per post
- Photo carousel with swipe navigation
- Dot indicators and arrow navigation
- Grid preview when composing

#### Image Lightbox
- Tap any photo to view full-screen
- Click outside or tap X to close
- Smooth fade animations

---

### Performance Optimizations

- **Code Splitting**: Route-based lazy loading with React.lazy()
- **Terser Minification**: Smaller production bundles
- **Manual Chunks**: Separate vendor bundles for React and Supabase
- **Reduced Font Weight**: Removed unused font weight (800)

---

### Database Changes

#### New Tables
- `badges` - Badge definitions
- `user_badges` - Earned badges per user
- `post_media` - Multiple photos per post

#### Schema Updates
- `completed_challenges.target_user_id` - Tracks who was visited/called

#### SQL Migration
```sql
-- Add target_user_id for connection tracking
ALTER TABLE completed_challenges
ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add new badges (if badges table exists)
INSERT INTO badges (name, description, icon, badge_type, criteria) VALUES
  ('Storyteller', 'Shared 3 posts in a single week', '📖', 'achievement', '{"posts_per_week": 3}'),
  ('Visitor', 'Visited 3 different family members', '🏠', 'achievement', '{"unique_visits": 3}'),
  ('Connector', 'Called 5 different family members', '📞', 'achievement', '{"unique_calls": 5}'),
  ('Perfect Week', 'Completed every challenge in a week', '⭐', 'weekly', '{"perfect": true}'),
  ('Round Robin', 'Connected with every family member in one week', '🎯', 'weekly', '{"all_members": true}'),
  ('Bridge Builder', 'Most connected person in the family this week', '🌉', 'weekly', '{"most_connected": true}'),
  ('Inner Circle', 'Connected with same person 4 weeks in a row', '💫', 'achievement', '{"streak_weeks": 4}');
```

---

### File Structure

```
src/
├── components/
│   ├── BadgeDisplay.jsx      # Badge grid component
│   ├── BadgeDisplay.css
│   ├── ConnectionsTab.jsx    # Connection dashboard
│   ├── ConnectionsTab.css
│   ├── Lightbox.jsx          # Full-screen image viewer
│   └── Lightbox.css
├── lib/
│   ├── badges.js             # Badge calculation logic
│   └── connections.js        # Connection tracking utilities
└── pages/
    ├── Profile.jsx           # Added Badges/Connections tabs
    └── Challenges.jsx        # Added smart nudges

supabase/
└── functions/
    └── send-notification/    # Push notification edge function
        └── index.ts
```

---

### Environment Variables

```env
# Push Notifications (VAPID keys)
VITE_VAPID_PUBLIC_KEY=your-public-key
# VAPID_PRIVATE_KEY=your-private-key (for edge function secrets)
```

---

### Deployment Checklist

- [ ] Run SQL migration in Supabase
- [ ] Deploy edge function: `supabase functions deploy send-notification`
- [ ] Set secrets: `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...`
- [ ] Configure webhooks in Supabase Dashboard (posts, comments, reactions)
- [ ] Verify Vercel deployment succeeds
